ISDO'27 — Participants / Coaches / Accompanying update
======================================================

IMPORTANT ORDER
1. Run sql/participants-coaches.sql in Supabase SQL Editor.
2. Only after the SQL succeeds, replace all files from this pack in Registration/ in ONE GitHub commit.
3. Wait for the single Vercel deployment, then hard-refresh (Ctrl+F5).

What changes
- Public registration type: Player / Coach / Accompanying or Other.
- Players keep normal team selection and jersey number.
- Coaches and accompanying/other select a club but no team.
- All registration types can order lunches.
- Self-edit supports the same registration types.
- Registered Coach is linked to the club by default.
- Team-specific coach assignments are stored separately.
- A Player can simultaneously be a player and coach of another team.
- Admin can assign any registration as coach of any team.
- Manager can set/remove a roster player as coach of that team.
- Club coaches automatically appear on overlays; once a club coach has team-specific assignments within that club, they appear only on those assigned teams.
- Accompanying/Other never appears on the broadcast overlay unless an admin explicitly assigns that person as a team coach.
- C/VC roster roles remain unchanged.
- Existing registrations are automatically kept as participant_type = player.

Files to replace/add
register.html
edit.html
admin.html
manager.html
js/register.js
js/edit.js
js/admin.js
js/manager.js
js/live-match.js
js/live-court.js
css/admin.css
css/manager.css
css/live-match.css
css/live-court.css
api/register-player.js
api/edit-player.js
api/admin-data.js
api/admin-player.js
api/admin-coach-assignment.js (new)
api/manager-roster.js
api/manager-coach-assignment.js (new)
api/live-match.js
api/live-court.js
sql/participants-coaches.sql (run manually, do not deploy as an execution script)
