ISDO 2027 — FINAL HOT MEAL UPDATE

Final categories:
- Chicken / Poulet
- Pork / Porc
- Fish / Poisson
- Vegetarian / Végétarien

Priority 1 / Priority 2 has been removed everywhere.

The Meal information now clearly states before the examples:
- at least one dish is guaranteed in each category;
- dishes are prepared according to seasonal products;
- examples are non-contractual;
- exact dishes may vary;
- the selected category remains guaranteed.

Database compatibility:
- hot_preference_1 now stores the selected hot-meal category;
- hot_preference_2 is always null;
- old beef_pork values migrate to pork;
- old fish_seafood values migrate to fish.

INSTALLATION
1. Run ONCE in Supabase:
   sql/meal-categories-final.sql

2. Replace the files from this pack in your Registration folder.

This cumulative pack also includes the latest Manager V3.1 Account/dropdown fix,
PDF V3, participant editor and safe meal saving.

No new Vercel function.
