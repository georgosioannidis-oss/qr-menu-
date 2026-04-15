# QR Menu

Scan a QR code at the table to open the menu, add items to your cart, place an order, and pay online.

## What’s included (Phase 1)

- **Guest flow**: Open `/m/{tableToken}` (e.g. `/m/table-1`) → browse menu → add to cart → place order → pay with card (Stripe Checkout).
- **One restaurant**, **tables** with tokens, **menu categories & items**, **orders** stored in the DB.
- **Stripe**: Optional. If `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_APP_URL` are set, “Place order” opens Stripe Checkout; the webhook marks the order **paid**. If those are **not** set (or `DISABLE_ORDER_PAYMENT=true`), orders go **straight to the kitchen** as **confirmed** (`paid` status) with no card step — good for demos or until you’re ready for online payments.

You can add later: restaurant dashboard (edit menu), multiple restaurants, subscriptions, cash option, etc.

**Security:** Orders are validated server-side (items and prices from the DB, not the client). See [SECURITY.md](./SECURITY.md) for what’s in place and what to add when you add auth and more tenants.

**Backups & how restaurants use the app:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for keeping the code safe with Git, backing up successful versions, and how you give the product to restaurants (you host one app; they use it via the web, they don’t get the code).

## Progress & next steps

| Done | Next |
|------|------|
| ✅ Guest menu, cart, place order | **QR generation** – page or script to print QR codes per table |
| ✅ Restaurant dashboard – login, menu, tables, orders | **Multi-tenant signup** – new restaurants can sign up |
| ✅ Stripe Checkout + webhook | |
| ✅ Server-side order validation | **Multi-tenant signup** – new restaurants can sign up; each sees only their data |
| ✅ [SECURITY.md](./SECURITY.md) | **Rate limiting** on order and auth endpoints; **HTTPS** in production |

Suggested order: dashboard first (so restaurants can edit menus), then QR generation (so they can print table QRs), then signup and billing.

**Run locally:** `cd` into this repo, then run `npm run dev`. More commands: **[COMMANDS.md](./COMMANDS.md)**.

## Setup

### Requirements

- **Node.js 20 or 22 (LTS)** — **avoid Node 25+** with webpack dev: Next’s compiled deps use minimal `package.json` files that Node 25 rejects (`Invalid package config … icss-utils`). Use `nvm install 22 && nvm use` (see `.nvmrc`).  
- If you must stay on Node 25, run **`npm install`** after pulling (the `postinstall` script patches those files). **Node 22 is still recommended.**  
- Run commands from the **project folder** (`cd` into this repo), not your home directory.

1. **Install dependencies**

   ```bash
   npm install
   ```

   Styling uses **Tailwind CSS v4** with `@tailwindcss/postcss` (see `postcss.config.mjs` and `src/app/globals.css`). No separate `tailwind.config.ts` — theme colors live in `@theme { … }` in `globals.css`.

### If `globals.css` fails to compile

1. From the project root:

   ```bash
   rm -rf .next node_modules/.cache
   npm install
   npm run dev
   ```

2. If it still fails, delete `node_modules` and `package-lock.json`, then `npm install` again.

### `Cannot find module './lib/source-map-generator'` (globals.css)

Your `source-map-js` folder under `node_modules` is incomplete (install glitch). From the project root:

```bash
rm -rf node_modules .next
npm install
```

The repo pins **`source-map-js@1.2.1`** (direct devDependency + `overrides`) so PostCSS/CSS gets a full copy with the `lib/` files.

2. **Database (Supabase / PostgreSQL)**

   1. In [Supabase](https://supabase.com), create a project and wait until the database is ready.
   2. Open **Project Settings → Database → Connection string** → tab **URI** (use **Direct connection**).
   3. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password.
   4. Create a `.env` in the project root (start from `.env.example`). For **local development**, you can use that **same** URI for both variables:

      ```env
      DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
      DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
      NEXT_PUBLIC_APP_URL=http://localhost:3000
      ```

      (Later, for heavy serverless traffic, use Supabase’s **Transaction pooler** for `DATABASE_URL` with `?pgbouncer=true` and keep `DIRECT_URL` as the direct URI.)

   5. Push the schema and seed demo data:

      ```bash
      npx prisma generate
      npx prisma db push
      npm run db:seed
      ```

   **Note:** If you were using the old SQLite `file:./dev.db` setup, that data stays in `dev.db` only; Supabase starts empty until you run `db push` and `db:seed` (or import data separately).

3. **Kitchen-only (no online payment yet)**

   Leave **`STRIPE_SECRET_KEY`** unset (and you can omit Stripe webhook/publishable keys). Keep **`NEXT_PUBLIC_APP_URL`** for redirects. Guests **place order** → order is confirmed for staff → **Dashboard → Orders**: **Mark preparing → Ready → Delivered**.

   If Stripe keys are in `.env` but you still want to skip checkout (e.g. legal review), set:

   ```env
   DISABLE_ORDER_PAYMENT=true
   ```

3b. **Optional – Stripe (when you’re ready)**

   - Get test keys from [Stripe Dashboard](https://dashboard.stripe.com/apikeys).
   - Add to `.env`:

     ```env
     STRIPE_SECRET_KEY=sk_test_...
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
     ```

   - Remove `DISABLE_ORDER_PAYMENT` or set it to `false`.
   - For local webhook testing, use [Stripe CLI](https://stripe.com/docs/stripe-cli):  
     `stripe listen --forward-to localhost:3000/api/stripe/webhook`  
     and set `STRIPE_WEBHOOK_SECRET=whsec_...` in `.env`.

4. **Run the app**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Try the menu at [http://localhost:3000/m/table-1](http://localhost:3000/m/table-1).

5. **Restaurant dashboard**

   Add to `.env` (required for dashboard login):

   ```env
   NEXTAUTH_SECRET=your-secret-at-least-32-chars
   NEXTAUTH_URL=http://localhost:3000
   ```

   Generate a secret: `openssl rand -base64 32`

   Then open [http://localhost:3000/dashboard](http://localhost:3000/dashboard). You’ll be redirected to login. After seeding: **admin@demo.com** / **demo123** (Owner tab), **kitchen@demo.com** / **demo123** (Team tab — **Orders** only), **waiter@demo.com** / **demo123** (Team tab — **Wait staff**). With **Send new orders to wait staff first** on in **Options** (default for new restaurants), new orders appear under **Wait staff** until someone taps **Send to kitchen**; then they show in **Orders**. Turn that option off if you want the kitchen to see orders immediately. Owners get **Office** for sales and best sellers; kitchen and wait staff cannot access owner-only APIs.

## Database provider

The app targets **PostgreSQL** (e.g. **Supabase**). Connection strings live in `.env` as `DATABASE_URL` and `DIRECT_URL` (see step 2 under **Setup**). For other Postgres hosts (Neon, Railway, etc.), the same Prisma setup applies as long as both URLs are valid.
