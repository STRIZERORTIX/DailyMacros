# Daily Macros – build plan

Paste this file at the start of a new chat to resume with full context at low token cost.

## Product
Mobile-first calorie tracker for a South Indian vegetarian lifter (183 cm, ~97 kg, goal 86 -> 80 kg).
Indian + international foods, daily/weekly/monthly insights, data stored in MongoDB.

## Stack
- client: Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui (components added with the shadcn CLI, not hand-written)
- server: Express 5 + Mongoose 8 + Zod, Node >= 20
- npm workspaces at the root (`npm install` once, `npm run dev` runs both)

## Food data (there is no public HealthifyMe API; this replicates the approach)
Unified `GET /api/foods/search?q=` returns one normalized shape from 3 sources, cached in Mongo:
1. Local Indian DB (curated South Indian / home-cooked items with serving units, aliases like kadala/sundal/moru), seeded into Mongo with a text index
2. USDA FoodData Central (free API key): international / generic foods
3. Open Food Facts: packaged Indian products + barcode lookup (no key)

Normalized food: `{ id, source, name, aliases[], per100g: {kcal, protein, carbs, fat, fiber}, servings: [{label, grams}], brand? }`

## Stages (do one per chat message; each ends runnable)
1. [DONE] Scaffold: workspaces, Vite + Tailwind v4 + shadcn config, Express + Mongo connection, /api/health
2. [DONE] Server core: models (User, LogEntry, WeightEntry, CustomFood), auth (email+password, JWT), CRUD routes for logs / weights / custom foods (see API contract below)
3. [DONE, chunk 1 of foods] Food API layer: merged search (custom, curated Indian, USDA, Open Food Facts), barcode, recent, USDA servings, Mongo cache (7-day TTL). Indian seed chunk 1 = 86 everyday foods in `server/src/data/indianFoods1.ts`; run `npm run seed`. TODO later: chunk 2+ (more dishes: sweets, restaurant items, vegetables, international veg dishes) as `indianFoods2.ts` etc., then add to `data/index.ts`
4. [DONE] Client shell + diary, dark-only theme (`<html class="dark">`, palette in `client/src/index.css`). No router: `AppShell` switches tabs with state. Files: `components/{LoginScreen,AppShell,TodayView,DaySummary,FoodSheet}.tsx`, `lib/{api,auth,types,date,nutrition,calc}.ts(x)`. `FoodSheet` is a vaul Drawer with 3 steps (search / portion / create custom food) and edit mode for diary entries. Targets come from `lib/calc.ts` `dayTargets(profile, date)` (default 2400 kcal / 150 g protein until the profile is filled in).
5. [DONE] Profile tab (`components/ProfileView.tsx`) with welcome, walkthrough, install, detail sheet, Targets, Weight and Reminders. First-time target setup collects body/activity details, goal (lose/maintain/lean bulk), target weight, asks whether the plan feels manageable, then saves editable targets. Suggested calorie adjustments: -500 kcal cut, 0 maintenance, +250 kcal lean bulk; protein starts at 1.6 g/kg. Shows maintenance and goal calories, protein, fat, total carbs, net-carb estimate, and fibre goal. Fat defaults to 25% of calories; fibre goal is estimated at 14 g/1,000 kcal; carbs fill remaining calories. Saved with `PATCH /api/auth/me`. Weight (`WeightLog.tsx`): log by date, 7-day average vs previous week, goal-direction-aware progress, sparkline, trend advice, history with delete. Maths: client/server `lib/calc.ts` target formulas and client `lib/weight.ts` trend helpers. The Today screen and Insights use the saved goal. Estimates are adjustable and are not medical advice.
6. [DONE] UI redesign + how-to-use walkthrough. Every control is shadcn (Select, Calendar/DatePicker, Switch, ToggleGroup, Dialog, Alert, AlertDialog, ScrollArea, Progress, Tooltip). No native `<select>`, date inputs, or hand-styled buttons. `HowToUse.tsx` modal on first login; Help in the header reopens it.
7. [DONE] Insights. Server: `GET /api/insights?range=day|week|month&end=YYYY-MM-DD` (`server/src/lib/insights.ts` + `routes/insights.ts`). Client: `components/InsightsView.tsx` (day/week/month toggle, calories vs target chart, macros, meal split, streak, best/worst days, weight).
8. [IN PROGRESS] Polish: [DONE] barcode scan in the food drawer (BarcodeDetector with manual entry fallback); [DONE] PWA manifest, offline app shell, add-to-home-screen guidance, and daily Breakfast/Lunch/Dinner push reminders (snacks unscheduled; requires VAPID keys and an always-on API server); TODO deploy (MongoDB Atlas + Render/Railway + Vercel) so Google sign-in works on a phone

## Optional extras (fit around stages 6–8)
- Food batches 2–5 (~85 foods each) in `indianFoods2.ts` etc., then add to `data/index.ts`. Split: (2) sweets, snacks, more tiffin/curry; (3) vegetables, dals, Kerala/Tamil; (4) international vegetarian; (5) leftover gaps after real use. USDA + Open Food Facts + custom foods already cover misses, so later batches are convenience.
- 1–2 phone fix rounds after using Stages 4–5 on a real device.

## API contract (Stage 2). All except health/register/login need `Authorization: Bearer <token>`
Dates are "YYYY-MM-DD" strings in the user's local day. Meals: breakfast | lunch | snack | dinner. Errors: `{ error, issues? }`.
- `POST /api/auth/register {email,password,name?}` / `POST /api/auth/login {email,password}` -> `{ token, user }` (register can be disabled with ALLOW_REGISTRATION=false)
- Google sign-in is the only client sign-in option: `GET /api/auth/config` -> `{ googleClientId }` (public); `POST /api/auth/google { credential }` (Google ID token verified server-side with google-auth-library, links to an existing account with the same verified email, or creates a new Google account on first sign-in) -> `{ token, user, isNewUser }`. Needs `GOOGLE_CLIENT_ID` in server/.env; Google only allows `http://localhost` or https origins, so it will not work on a LAN IP like http://192.168.x.x:5173. Client: `lib/google.ts`, `LoginScreen.tsx`.
- `GET /api/auth/me`, `PATCH /api/auth/me {name?, profile?{sex,age,heightCm,weightKg,goalWeightKg,activityFactor,deficitKcal,sundayMaintenance,proteinPerKg}}` -> `{ user }`
- `GET /api/logs?date=` or `?from=&to=` -> `{ entries, totals, byMeal }` (entries have `_id`, `food{source,externalId,name,brand,per100g}`, `grams`, `servingLabel`, `servings`, `totals{kcal,protein,carbs,fat,fiber}`)
- `POST /api/logs {date,meal,food{source,externalId?,name,brand?,per100g},grams,servingLabel?,servings?}` (server computes totals), `PATCH /api/logs/:id {date?,meal?,grams?,servingLabel?,servings?}`, `DELETE /api/logs/:id`, `POST /api/logs/copy {fromDate,toDate,meal?}` -> `{ copied }`
- `GET /api/weights[?from&to]` -> `{ entries:[{date,weightKg}] }`, `PUT /api/weights/:date {weightKg}`, `DELETE /api/weights/:date`
- `GET/POST /api/custom-foods`, `PATCH/DELETE /api/custom-foods/:id` (`{name, aliases[], per100g, servings[{label,grams}]}`)
- Smoke test: `server/test-api.ps1`

## API contract (Stage 3, food search; auth required)
- `GET /api/foods/search?q=&limit=&sources=custom,local,usda,off` -> `{ results: FoodResult[], warnings: string[] }`. Use `sources=custom,local` as-you-type (fast, offline); call `sources=usda,off` on demand ("search online"), min 3 chars for off.
- `FoodResult`: `{ id, source, externalId, name, brand?, aliases?, category?, per100g{kcal,protein,carbs,fat,fiber}, servings[{label,grams}] }`; local names are searchable (kadala, sundal, moru, nendran...)
- `GET /api/foods/barcode/:code` -> `{ food }` or 404 (Open Food Facts)
- `GET /api/foods/usda/:fdcId/servings` -> `{ servings }` (household measures, fetch when a USDA food is picked)
- `GET /api/foods/recent` -> `{ foods }` (last 20 distinct foods; each has `lastGrams`, `lastServingLabel`, `lastServings`)
- To log a result: POST /api/logs with `food: { source, externalId, name, brand, per100g }` and `grams` (servings * serving grams)
- Setup: `USDA_API_KEY` in server/.env (free key), `npm run seed` after install. Smoke test: `server/test-foods.ps1`

## API contract (Stage 7, insights; auth required)
- `GET /api/insights?range=day|week|month&end=YYYY-MM-DD` -> aggregates logs in the window ending on `end` (pass the phone's local today; if `end` is omitted the server uses UTC today). Day = that date, week = 7 days, month = 30 days.
- Response: `{ range, from, to, days[{date, totals, byMeal, target, logged, hitCalories, hitProtein}], totals, averages{kcal,protein,carbs,fat,fiber}, mealSplit{breakfast,lunch,snack,dinner}, adherence{totalDays,loggedDays,hitCaloriesDays,hitProteinDays,streak}, bestDay, worstDay, weight{latestKg,latestDate,avg7d,avg7dChange,slopePerWeek} }`. Averages are over logged days only. Hit calories = within 10% or 100 kcal of target. Hit protein = at least 90% of target. Streak counts consecutive logged days ending today (or yesterday if today is empty). Best day is closest to calorie target; worst day is the biggest overshoot.

## Rules for keeping token use low
- Next: finish Stage 8 deployment (MongoDB Atlas + Render/Railway + Vercel), then food batches 2–5 as optional extras.
- Ask for one stage at a time; request specific edits instead of whole-file rewrites
- Add UI with `npx shadcn@latest add ...` instead of asking for component code
- Paste only the error message, not whole files
- Big datasets (USDA) are imported by a script, not typed out
