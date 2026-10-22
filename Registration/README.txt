ISDO 2027 — Manager Portal V2 Pro

Replace:
- Registration/manager.html
- Registration/css/manager.css
- Registration/js/manager.js
- Registration/api/manager-roster.js
- Registration/assets/isdo27-logo.png

No SQL required.
No new serverless function.

Major changes:
- Premium visual redesign.
- Club summary and category-grouped teams.
- Official team roster sheet with ISDO + team/club logo.
- Close and Export PDF buttons side-by-side and highly visible.
- PDF is generated directly with jsPDF as a one-page A4 document.
- Edit participants view: Players / Coaches / Accompanying.
- Edit first name, last name, email, jersey number (players), and all meal choices.
- Existing coach, captain, vice-captain, and roster management preserved.
- 8-language UI maintained.

Notes:
- Team logo uses teams.logo_url; if empty it falls back to clubs.logo_url; then to the ISDO logo.
- PDF generation loads jsPDF and jsPDF-AutoTable from CDN.
