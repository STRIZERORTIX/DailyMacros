# Daily Macros — Fuel by Frame

## Setup
1. Install Node 20+.
2. Create a free MongoDB Atlas cluster (M0), add your IP under Network Access, copy the connection string.
3. Run:
   ```bash
   npm install
   cp server/.env.example server/.env   # then edit MONGODB_URI
   npm run dev
   ```
4. Open http://localhost:5173. The page should show API OK and MongoDB connected.
5. On your phone (same Wi-Fi), open `http://<your-computer-ip>:5173`.

## Add shadcn components (run inside `client/`)
```bash
cd client
npx shadcn@latest add button card input label tabs dialog drawer progress badge select sonner
```
Charts later: `npx shadcn@latest add chart`.

## Layout
- `client/` Vite + React + Tailwind v4 + shadcn (`@` = `client/src`)
- `server/` Express + Mongoose (`.env` required)
- `PLAN.md` the stage roadmap

See `PLAN.md` for what comes next.

## Install on a phone
After the app is deployed over HTTPS, use **Add to Home Screen** in the app header or your browser menu. The production build caches the app shell so it can open offline; diary data and sign-in still require a network connection.

## Meal reminders
In **Profile → Reminders**, users can enable daily Breakfast, Lunch, and Dinner notifications and choose a local time for each. Snacks remain unscheduled. Notifications use Web Push and can arrive while the app is closed, provided the browser supports push notifications, the user grants permission, and the server is running.

Generate VAPID keys with `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a contact `VAPID_SUBJECT` (`mailto:you@example.com`) in `server/.env` and the deployed server's environment. Never expose the private key in the client or commit it. The reminder scheduler runs in the API process every 30 seconds, so deploy it on an always-on server; a service that sleeps may miss reminders. Push notifications require HTTPS in production. On iPhone/iPad, install the PWA to the Home Screen and use a supported iOS version before enabling notifications.
