# INCENTIFY ERP V10 — GitHub Pages frontend

This repository contains the **public static frontend only**, preserving the V9.6 approved design. Administrator OTP login, Sales login, finance, reporting and other modules use the **private** Google Apps Script + Google Sheets backend.

**Required:** deploy the V10 backend separately, configure the Apps Script allowed frontend origin and GitHub Actions repository variable `INCENTIFY_ERP_API_URL`, then enable GitHub Pages (Source: GitHub Actions).

Use `npm run verify` to check source; `npm run build` to create a live-only `dist` (requires the `/exec` URL); `npm run test:deploy` to inspect the built website. `npm run dev` is supported after `npm install --include=dev` and creation of `.env.local` containing the URL.

See [deployment instructions](docs/V10_GITHUB_DEPLOYMENT.md).
