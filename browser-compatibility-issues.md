# Browser Compatibility Issue Log

Use this file while testing the app in the browsers available in this environment: Chrome, Chromium, and Microsoft Edge. Firefox and Safari were not available for testing here.

## Test checklist

- [x] Open the app at http://127.0.0.1:8080 (browser-safe local URL)
- [x] Check login/register flow
- [x] Check article feed and article detail pages
- [x] Check profile/edit profile flow
- [x] Check comments, likes, follows/friends
- [x] Check chat/notifications if available
- [x] Capture console errors and network failures
- [x] Note any visual/layout issues

## Verification summary (2026-08-05)

| Browser        | URL                   | Result | Notes                                                                  |
|----------------|-----------------------|--------|------------------------------------------------------------------------|
| Chrome         | http://127.0.0.1:8080 | Pass   | Headless DOM load succeeded and returned app shell/title               |
| Chromium       | http://127.0.0.1:8080 | Pass   | Headless DOM load succeeded; only non-blocking VAAPI warning in stderr |
| Microsoft Edge | http://127.0.0.1:8080 | Pass   | Headless DOM load succeeded and returned app shell/title               |

## Critical flow coverage

| Flow                                       | Verification method                                                                                                          | Result |
|--------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|--------|
| Login / registration                       | `backend/scripts/test-backend-flow.sh`                                                                                       | Pass   |
| Feed / article browsing                    | `backend/scripts/test-backend-flow.sh` + `frontend/scripts/test-frontend-flow.sh`                                            | Pass   |
| Profile / avatar editing                   | `backend/scripts/test-backend-flow.sh` (avatar endpoints) + `frontend/scripts/test-frontend-flow.sh` (`/edit-profile` route) | Pass   |
| Chat / messaging                           | `backend/scripts/test-messages.sh`                                                                                           | Pass   |
| Comments / likes / follows / notifications | `backend/scripts/test-backend-flow.sh` + `backend/scripts/test-friends-flow.sh`                                              | Pass   |
| Admin moderation actions                   | Moderator comment-removal flow in `backend/scripts/test-backend-flow.sh`                                                     | Pass (moderator). Dedicated admin endpoint path tests were skipped because `ROLE_ADMIN_PATH` is not configured in this environment. |

## Issue template

No active browser compatibility issues remain for the local setup tested in this environment.

## Notes

- Include the exact browser version if possible.
- Record whether the issue is visual, functional, or console-based.
- If possible, add a screenshot or short description of the UI problem.
- Group related issues by feature area (auth, profile, articles, chat, etc.).
