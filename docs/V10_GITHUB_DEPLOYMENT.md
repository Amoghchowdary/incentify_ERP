# INCENTIFY ERP V10 — GitHub Pages Production Deployment

## Architecture
- This public repository contains **frontend only**. GitHub Pages serves HTML/CSS/JS as static public files.
- Private business data, permissions, OTP, user management and Google Sheets live in a separately deployed Google Apps Script backend.
- **Never commit the private Apps Script source, database exports, keys, `.env.local`, Razorpay secrets or sensitive files into this repo.**
- This is a frontend release, not proof that the cloud backend has been activated.

## 1. Create/update the Google Apps Script backend first
1. Use the separately supplied `INCENTIFY_ERP_V10_Apps_Script_Backend_PRIVATE.zip` outside the public Git repository.
2. Create a new managed version/deployment of the *existing* V9.6 Apps Script project, or stage a copy. Before a live update, back up Google Sheets and save the previous deployment ID.
3. Deploy a Google Apps Script Web App; record the **new V10** `https://script.google.com/macros/s/.../exec` URL.
4. Execute `setAllowedFrontendOriginsAdmin(['https://YOUR_GITHUB_USER.github.io'])` as the script owner in Apps Script. Include your HTTPS custom domain in the list if relevant. This expects *origins*, not site paths. For `https://user.github.io/repo/`, the origin is `https://user.github.io`.
5. Use the original admin email-OTP and Sales email-OTP flows; check MailApp authorization and quota.
6. Verify that `/exec` reports version 10.0.0 and status ONLINE after authorized setup/migration. Do not initialize an existing database again without review.

## 2. Configure GitHub
1. Create a **dedicated** repository (for example `INCENTIFY_ERP`). Keep it separate from the private Apps Script backend repo.
2. Push the contents of the `GitHub_Frontend` folder to the root of `main` (not the enclosing release folder).
3. In GitHub → **Settings → Secrets and variables → Actions → Variables**, add repository variable `INCENTIFY_ERP_API_URL` with the new V10 `/exec` URL. This URL is not a secret; it is visible in the published JS. Never use it to store credentials.
4. In GitHub → **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source.
5. Push to `main` or manually run **Actions → Deploy INCENTIFY ERP V10 to GitHub Pages**. The workflow **refuses deployment** if the backend URL is missing or a placeholder.

## 3. Windows PowerShell
```powershell
cd 'C:\Users\MYPC\Desktop\incentify_ERP\INCENTIFY_ERP_V10_GitHub_Web_App\GitHub_Frontend'
# If you want a local *live* backend test, create .env.local with INCENTIFY_BACKEND_MODE=live and INCENTIFY_ERP_API_URL=your deployed /exec URL
npm install --include=dev
npm run verify
npm run build
npm run test:deploy
npm run dev
```
Automated safe clone/push (does not force-push or reset your repository):
```powershell
.\scripts\Push-To-GitHub.ps1 -RepositoryUrl 'https://github.com/YOUR_USER/INCENTIFY_ERP.git'
```
Alternatively, in an existing cloned Git repository, copy the contents of `GitHub_Frontend` to the repo root and use `git status`, `git add -A`, `git commit -m 'Deploy INCENTIFY ERP V10'`, `git push origin main`.

## 4. Site URLs
- `https://YOUR_USER.github.io/YOUR_REPOSITORY/` — main login
- `https://YOUR_USER.github.io/YOUR_REPOSITORY/admin-login.html` — administrator OTP
- `https://YOUR_USER.github.io/YOUR_REPOSITORY/sales-login.html` — Sales OTP
- `https://YOUR_USER.github.io/YOUR_REPOSITORY/erp.html` — protected ERP
- `https://YOUR_USER.github.io/YOUR_REPOSITORY/admin.html` — protected admin dashboard

## 5. Post-push acceptance checklist
1. Open site in private/incognito browser, check branding/resources and all three login pages.
2. Send and verify a **real** Admin OTP (and an approved Sales OTP), then sign out and test expired sessions.
3. Confirm Sales can only generate new unpaid invoices, view invoices and receivables; attempt protected endpoints directly to verify backend blocks unauthorized access.
4. Create a test invoice, reopen it after refresh, verify Google Sheets persistence and correct GST and collection figures.
5. Verify tax-invoice PDF, payment tracking, bank module and mail with authorized test data.
6. Confirm disable/remove user revokes access immediately; confirm last-admin cannot be removed.
7. Confirm no sensitive data, service keys, Sheets IDs, `.env.local` or mock login scripts in public GitHub source or Pages artifact.
8. Save the Git SHA, Apps Script deployment version, backup ID, and sign-off from authorized ERP administrator/CA.

## Release gates
The GitHub Pages workflow validates the **source and build only**. End-to-end acceptance against real Google Sheets, Apps Script and external providers must be completed after deployment. A green Actions run is not production certification.
