# V12 Release contract

Two owners and two deployments. Backend source `Code.js` belongs ONLY to the INCENTIFY admin Google account. Visible ERP HTML/CSS/JS belongs ONLY to the Amogh GitHub repository. Do not confuse deployment IDs with Apps Script project IDs. No Gmail auth is requested from the GitHub owner.

Source checks are not equivalent to live integration testing. Backend health alone cannot certify the MessagePort handshake, OTP delivery or Sheets persistence; perform all acceptance tasks in `docs/V12_ACCEPTANCE.md`.
