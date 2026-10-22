ISDO 2027 — Manager Portal V2.1 Pro

CUMULATIVE PACK.

Replace:
- Registration/manager.html
- Registration/css/manager.css
- Registration/js/manager.js
- Registration/api/manager-roster.js
- Registration/assets/isdo27-logo.png

Database:
- If not already done, run once:
  sql/player-meals-check-v2.sql

Changes included:
- Premium Manager Portal redesign.
- Edit participants (players, coaches, accompanying).
- Safe participant meal saving (no delete-all before insert).
- Professional official roster sheet.
- Team logo / club logo fallback.
- Direct PDF export with jsPDF.
- PDF redesigned as a polished one-page A4 official team roster:
  event header, ISDO logo, team logo, category, team name,
  coaches, captain, vice-captain, player count, alternating roster rows,
  compact footer.

No new Vercel serverless function.
