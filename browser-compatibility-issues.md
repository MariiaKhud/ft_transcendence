# Browser Compatibility Issue Log

Use this file while testing the app in the browsers available in this environment: Chrome, Chromium, and Microsoft Edge. Firefox and Safari were not available for testing here.

## Test checklist

- [ ] Open the app at https://localhost:8443
- [ ] Check login/register flow
- [ ] Check article feed and article detail pages
- [ ] Check profile/edit profile flow
- [ ] Check comments, likes, follows/friends
- [ ] Check chat/notifications if available
- [ ] Capture console errors and network failures
- [ ] Note any visual/layout issues

## Issue template

| ID | Browser | Area | Steps to reproduce | Expected result | Actual result | Console errors | Screenshot / notes | Severity | Status |
|---|---------|------|-------------------|-----------------|---------------|----------------|-------------------|----------|--------|
| 1 | Chrome | HTTPS / initial load | Open https://localhost:8443 in the browser | The app loads without certificate warnings | Browser blocks the page with a certificate trust error (ERR_CERT_AUTHORITY_INVALID) | `ERR_CERT_AUTHORITY_INVALID` | Self-signed dev certificate used by nginx | High | Open |
| 2 | Chrome | HTTP redirect / browser access | Open http://localhost:8080 or follow the app redirect from HTTP | The app should reach the secure page and continue browsing | HTTP redirects to HTTPS, but the certificate warning still blocks the secure page before UI rendering | `ERR_CERT_AUTHORITY_INVALID` on the HTTPS target | Manual browser testing of the UI is blocked until the certificate is trusted | High | Open |
| 3 | Chromium | HTTPS / initial load | Open https://localhost:8443 in Chromium | The app loads without certificate warnings | Chromium shows a privacy error and fails to load the page because the TLS certificate is not trusted | `net_error -202`, SSL handshake failed | Same root cause as Chrome; available Chromium-based browser also blocked | High | Open |
| 4 | Microsoft Edge | HTTPS / initial load | Open https://localhost:8443 in Microsoft Edge | The app loads without certificate warnings | Edge shows a privacy error and fails to load the page because the TLS certificate is not trusted | `net_error -202`, SSL handshake failed | Same root cause as Chrome; available Edge browser also blocked | High | Open |

## Notes

- Include the exact browser version if possible.
- Record whether the issue is visual, functional, or console-based.
- If possible, add a screenshot or short description of the UI problem.
- Group related issues by feature area (auth, profile, articles, chat, etc.).
