ISDO 2027 — Manager Portal redesign

Replace:
Registration/manager.html
Registration/js/manager.js
Registration/css/manager.css
Registration/api/manager-roster.js

No SQL migration required.
No new Vercel serverless function: manager-roster.js replaces the existing endpoint.

Changes:
- 8-language Manager Portal with persistent language selector.
- Club summary counts unique origin-club participants: players, coaches, accompanying people.
- Teams grouped by Men / Women / Mixed.
- Clicking a team opens a match-sheet-style roster.
- Roster sheet: coaches, captain, vice-captain, full player roster.
- Coach management retained and redesigned.
- Player click retains captain / vice-captain / coach / remove controls.
- Print Roster generates an A4-friendly organization sheet.
