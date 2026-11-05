# INCENTIFY ERP V12 — GitHub frontend owned by Amogh

**Published frontend:** `https://amoghchowdary.github.io/incentify_ERP/`
**Git repository:** `https://github.com/Amoghchowdary/incentify_ERP`
**Private backend owner:** `incentifyprivatelimited@gmail.com` (Google Apps Script + Google Sheets)

The five original ERP pages, navigation, styling and assets are preserved. Only the transport bootstrap was changed. No full-page redirect to Apps Script and no `Bridge.html` file.

## Release order (critical)
1. INCENTIFY admin backs up and deploys private V12 `Code.js` in the existing Apps Script project.
2. Verify `/exec?health=1` reports `12.0.0` and `ONLINE`; test the runtime transport using the GitHub frontend in a staging environment or after a controlled publication.
3. Copy **contents** of this `GitHub_Frontend` directory into the EXISTING git deployment clone. Do not push `Apps_Script_ADMIN_ONLY` or any data files.
4. In repository Settings → Secrets and variables → Actions → **Variables**, confirm `INCENTIFY_ERP_API_URL` is the existing Apps Script `/exec` URL.
5. `git add -A; git diff --cached --check; git commit -m "Deploy INCENTIFY ERP V12 GitHub frontend"; git push origin main`.
6. GitHub Actions verifies source/build and live V12 backend health BEFORE publishing.
7. Browser smoke-test Admin OTP, Sales OTP, invoice save/reload, Finance, user removal, and Sheets data. Roll back if any fail.

## Windows local validation
`npm run verify`
`npm run test:gateway`
`npm run build`
`npm run test:deploy`

No npm install is required for these Node.js-only checks.
