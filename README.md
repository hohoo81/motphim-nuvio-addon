# MotPhim Catalog Addon (Nuvio/Stremio-style)

Prototype providing manifest, catalog/search, and metadata. It does **not** extract or proxy video streams.

## Run locally
1. Install Node.js 18 or newer.
2. In this folder run: `npm install`
3. Run: `npm start`
4. Open `http://localhost:10000/manifest.json`

## Render deployment
1. Upload this folder to a GitHub repository.
2. On Render choose **New > Web Service**, connect the repository.
3. Runtime: Node.
4. Build command: `npm install`
5. Start command: `npm start`
6. Add environment variable `SOURCE_URL` (optional; defaults to `https://ww7.motphimy.com`).
7. Deploy. Test `https://YOUR-SERVICE.onrender.com/manifest.json`.

If the site's HTML or search route differs, selectors and the search URL in `server.js` will need adjustment. Addon installation depends on Nuvio accepting this Stremio-style manifest and endpoint format.
