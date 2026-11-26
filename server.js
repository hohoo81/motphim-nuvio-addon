const express = require("express");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 10000;
const BASE = (process.env.SOURCE_URL || "https://ww7.motphimy.com").replace(/\\/$/, "");
const ADDON_URL = process.env.ADDON_URL || "";

const manifest = {
  id: "org.example.motphim.catalog",
  version: "1.0.0",
  name: "MotPhim Catalog",
  description: "Catalog and metadata from public MotPhim pages",
  logo: "",
  resources: ["catalog", "meta"],
  types: ["movie", "series"],
  catalogs: [
    { type: "movie", id: "motphim-new", name: "MotPhim - phim mới" },
    { type: "movie", id: "motphim-search", name: "MotPhim - tìm kiếm", extra: [{ name: "search", isRequired: true }] }
  ],
  idPrefixes: ["motphim:"]
};

app.get("/manifest.json", (req, res) => res.json(manifest));

function cleanText(s) {
  return (s || "").replace(/\\s+/g, " ").trim();
}
function slugFromUrl(url) {
  try {
    const u = new URL(url, BASE);
    return u.pathname.replace(/^\\/+|\\/+$/g, "") || "home";
  } catch { return ""; }
}
function absoluteUrl(url) {
  try { return new URL(url, BASE).toString(); } catch { return ""; }
}

// Generic page parser. Site markup may change; selectors are intentionally broad.
function parseCards(html) {
  const $ = cheerio.load(html);
  const found = new Map();
  $("a[href]").each((_, el) => {
    const a = $(el);
    const href = absoluteUrl(a.attr("href"));
    const title = cleanText(a.attr("title") || a.text());
    const img = a.find("img").first();
    const poster = absoluteUrl(img.attr("data-src") || img.attr("data-lazy-src") || img.attr("src") || "");
    const caption = cleanText(img.attr("alt"));
    const name = title || caption;
    if (!href || !name || name.length < 2 || href.includes("#") || href.startsWith("javascript:")) return;
    if (!new URL(href).hostname.endsWith(new URL(BASE).hostname)) return;
    if (!poster && name.length > 120) return;
    const id = "motphim:" + slugFromUrl(href);
    if (!found.has(id) && slugFromUrl(href) !== "home") {
      found.set(id, { id, type: "movie", name, poster, url: href });
    }
  });
  return Array.from(found.values()).slice(0, 100);
}

async function getPage(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CatalogAddon/1.0)", "Accept": "text/html" },
    redirect: "follow"
  });
  if (!r.ok) throw new Error("Nguồn trả về HTTP " + r.status);
  return await r.text();
}

app.get("/catalog/:type/:id.json", async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!["movie", "series"].includes(type)) return res.json({ metas: [] });
    let url = BASE;
    if (id === "motphim-search") {
      const q = cleanText(req.query.search || "");
      if (!q) return res.json({ metas: [] });
      // Search path is a common pattern; adjust if the source uses a different route.
      url = BASE + "/search/" + encodeURIComponent(q);
    } else if (id !== "motphim-new") {
      return res.json({ metas: [] });
    }
    const html = await getPage(url);
    const metas = parseCards(html).map(({ url, ...meta }) => meta);
    res.json({ metas });
  } catch (e) {
    console.error("Catalog error:", e.message);
    res.status(200).json({ metas: [], error: "Catalog lỗi: " + e.message });
  }
});

app.get("/meta/:type/:id.json", async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!id.startsWith("motphim:")) return res.json({ meta: null });
    const slug = id.slice("motphim:".length);
    const pageUrl = BASE + "/" + slug.replace(/^\\/+/, "");
    const html = await getPage(pageUrl);
    const $ = cheerio.load(html);
    const title = cleanText($("h1").first().text() || $("title").text());
    const poster = absoluteUrl($("meta[property='og:image']").attr("content") || $("img").first().attr("src") || "");
    const description = cleanText($("meta[name='description']").attr("content") || $(".description, .content, .detail").first().text());
    const meta = {
      id, type, name: title || slug.replace(/[-_]/g, " "),
      poster, description,
      links: [{ name: "Mở trang nguồn", url: pageUrl }]
    };
    res.json({ meta });
  } catch (e) {
    console.error("Meta error:", e.message);
    res.status(200).json({ meta: null });
  }
});

app.get("/", (req, res) => res.type("text").send("MotPhim catalog addon running. Manifest: /manifest.json"));
app.listen(PORT, "0.0.0.0", () => console.log("Addon listening on port " + PORT));
