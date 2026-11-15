# Release 2 — Nov 2, 2026

This release strengthens safety and account controls, improves browsing and messaging UX, and lays groundwork for theming and future UI work.

## Safety & Account

- **FE-BE-040 / FE-042 (#61):** Block and report users from profiles and My Kins; manage blocked accounts in Settings; subtle hover on message list rows
- **FE-BE-051 (deactivate):** Deactivate account from Security & Privacy (hide profile, pause interactions/notifications, reactivate on sign-in); **FE-052:** Request cards open profiles on click
- **FE-BE-060 (#72):** Live username availability checks on sign-up and profile edit (case-insensitive uniqueness)
- **BE-043 (#73):** Per-user rate limiting on API endpoints

## Profile & Discover UX

- **FE-039:** Discover profile card no longer cut off; Pass/Meet stay reachable
- **FE-041 (#65):** Click profile photos to view full-size in a modal
- **FE-046 (#64):** Country flags beside country names in home/residence dropdowns
- **FE-053 (#69):** Back arrow on profiles opened from My Kins, Requests, or Messages
- **FE-BE-064 (#79):** Refreshed Request cards — photo/name/flags layout, clearer location and tags, Accept/Ignore retained

## Messaging

- **FE-BE-063 (#77):** Paginated message loading (recent batch first, older messages on scroll up)

## Appearance & Forms

- **FE-BE-049 (#71):** Light/Dark mode under Settings → Appearance
- **FE-054 (#68):** Show/hide password toggle on all password fields
- **FE-050 (#67):** CSS system refactor for theming and future extensions
- **FE-BE-051 refactor (#66):** Supporting refactor work for deactivate/account changes

## Stability

- **#74 / #75:** Test suite fixes
