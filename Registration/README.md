# ISDO Registration V1

## Included
- Player registration wizard
- Club of origin
- Category 1 + optional category 2
- Teams filtered by `team_origin_club_access`
- Lunches Friday / Saturday / Sunday
- `No meal`
- Automatic total
- Legal documents from Supabase
- Secure Vercel server endpoint for writing registrations

## Important
The public Supabase publishable key is already in `js/supabase.js`.

Never put the service-role key in frontend code.

In Vercel -> Project Settings -> Environment Variables add:

SUPABASE_URL=https://ukmmqjcrjanirvkxylbn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your secret service role key>

## Before opening registrations
Add the final approved 2027 legal texts to `legal_documents`.

The form intentionally blocks submission if no active legal documents exist.

## Main URL
/register.html
