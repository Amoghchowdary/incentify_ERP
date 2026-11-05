# V12 Exit controls

[ ] Admin confirms Code.js uploaded to correct Apps Script project and active /exec deployment updated.
[ ] /exec?health=1: 12.0.0 / ONLINE / HTML_SERVICE_MESSAGE_PORT.
[ ] GitHub Pages HTML contains actual ERP interface (not redirect pages).
[ ] In incognito, the login shows `Backend connected` within 30 seconds.
[ ] Admin account receives a real OTP and signs in (invalid/expired OTP rejected).
[ ] Sales account receives a real OTP, can create unpaid invoice and review payment tracking ONLY.
[ ] Direct backend attempt to call admin function with Sales session is denied.
[ ] Save invoice, reload, verify record persisted to INCENTIFY-admin Google Sheet.
[ ] Verify Finance journals balanced, bank import duplicate handling, receipts/expenses accuracy.
[ ] Admin creates/disables/removes employee, old session revoked, audit retained.
[ ] Real email delivery (test recipient) and error responses verified.
[ ] Return to previous Apps Script deployment version AND previous Git commit if any gate fails.

Not a certified commercial production release until every live gate is signed off.
