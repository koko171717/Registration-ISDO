ISDO'27 cumulative update — Languages + Catering preferences

IMPORTANT ORDER
1. Run sql/meal-preferences.sql in Supabase SQL Editor.
2. Upload/replace the files from this pack in Registration/.
3. Commit once and let Vercel deploy once.

Changes
- Registration Step 1 = Select your language.
- 8 languages: English, Français, Deutsch, Nederlands, Español, Italiano, Čeština, Magyar.
- Registration flow now has 6 steps.
- New catering presentation: common menu + Boulangerie Chabloz-Roten + The Meal.
- Sandwich Cheese is deactivated (not deleted).
- Hot meals: Vegetarian OR Other.
- Vegetarian: no second preference required.
- Other: Priority 1 = Chicken / Beef & Pork / Fish & Seafood; Priority 2 may also be Vegetarian.
- Priority 1 and Priority 2 must be different.
- Edit page supports the new hot-meal preference fields.
- Admin Meals shows hot P1 and P2 counts and exports both.
- Existing old hot-meal selections remain preserved as legacy data.

No new Vercel Serverless Function is added.


LEGAL LANGUAGE NOTE
- The interface and legal acceptance wording are translated in the 8 interface languages.
- The official legal document title/content currently comes from Supabase legal_documents.
- The form now displays a translated disclaimer stating that English remains the official reference.
- Actual translated legal document bodies require the exact legal source text/approved translations; they are not fabricated in this pack.


FINAL CATERING UI UPDATE
- Catering presentation redesigned into separate Sandwich / Hot Meal boxes.
- Body copy no longer uses excessive bold.
- The Meal examples are displayed on separate category rows.
- Examples are restricted to dishes actually provided by The Meal.
- Responsive layout stacks on mobile.
- No additional SQL required if the previous meal-preferences migration has already been run.
