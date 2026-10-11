# Spritz: fintech prototype

A clickable, mobile-first prototype for mindful spending and goal-based savings.
All banking, transfers and data are simulated; nothing leaves your browser.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. On a laptop the app shows in a phone-sized frame; on a phone it fills the screen.

## Demo tips

- **Goals → a goal → Demo controls**: simulate a successful, partial, missed or failed monthly transfer, or an extra contribution. Watch the estimated completion date move, then try **Explore Catch-Up Options**.
- **Home → Coffee Challenge → Demo controls**: fast-forward a week "on target" or on your "usual routine" to finish the challenge, then review it, complete it, and retry it.
- **Edit** in a challenge's Recent activity: mark the $24 Blue Bottle order as shared with an $18 reimbursement.
- **Profile → Reset demo data** restores Alex's original data. **Replay onboarding** shows the setup flow again.

Data persists in `localStorage`.

## Stack

React 19 · TypeScript · Tailwind CSS v4 · Recharts · Lucide icons · Vite
