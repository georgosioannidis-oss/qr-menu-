# Learning guide: how this project works

This doc walks you through the codebase so you can see what each part does and how they fit together.

---

## 1. Project structure (folders and files)

```
QR MENU PROJECT/
├── prisma/
│   ├── schema.prisma    ← Database shape: tables, columns, relations
│   └── seed.ts          ← Script that fills the DB with demo data (restaurant, menu, tables, admin user)
├── src/
│   ├── app/             ← Next.js App Router: every folder = a URL path
│   │   ├── layout.tsx   ← Wraps the whole app (e.g. fonts, providers)
│   │   ├── page.tsx    ← Home page (/)
│   │   ├── globals.css  ← Global styles (Tailwind)
│   │   ├── m/[token]/   ← Guest menu: /m/table-1, /m/table-2, etc.
│   │   ├── dashboard/   ← Restaurant dashboard (login + protected pages)
│   │   └── api/         ← Backend API routes (JSON or binary responses)
│   ├── components/     ← Reusable React components (e.g. Providers)
│   ├── lib/             ← Shared logic: database client, auth config
│   ├── types/           ← TypeScript type definitions (e.g. next-auth)
│   └── middleware.ts    ← Runs before every request; we use it to protect /dashboard
├── package.json         ← Dependencies and npm scripts
├── .env                 ← Secrets (DB URL, Stripe, NextAuth) — never commit
└── LEARNING.md         ← This file
```

**What “App Router” means:** In `src/app/`, the folder path is the URL. So `app/m/[token]/page.tsx` is the page for `/m/table-1` (and any other token). `[token]` is a “dynamic segment”: it can be different for each request.

---

## 2. How the app runs

- **`npm run dev`** – Starts the Next.js dev server. It compiles your code, serves pages, and runs API routes. When you change a file, it hot-reloads.
- **`npm run build`** – Builds the app for production (e.g. for Vercel).
- **`npm run start`** – Runs the production build locally.

Next.js runs both the **frontend** (React pages in the browser) and the **backend** (API routes and server components) in one process. So when you open `/m/table-1`, the server runs `app/m/[token]/page.tsx`, fetches data (e.g. from the DB), and sends HTML. When you click “Place order”, the browser calls `POST /api/orders`, which runs on the server.

---

## 3. Database (Prisma)

**What Prisma does:** It’s the layer between your Node.js app and the database. You define the schema in `prisma/schema.prisma`; Prisma generates a client so you can run queries in TypeScript.

**Main models:**

- **Restaurant** – One per venue (name, slug). For now we have one; later you’ll have many (multi-tenant).
- **RestaurantUser** – Staff who can log in to the dashboard (email, hashed password, linked to one restaurant).
- **Table** – Physical table (name + `token`). The token is in the URL: `/m/table-1` → table with token `table-1`.
- **MenuCategory** – e.g. Starters, Mains, Drinks. Each belongs to a restaurant.
- **MenuItem** – A dish (name, description, price, available). Belongs to a category (and thus a restaurant).
- **Order** – One order per “place order” (table, restaurant, total, status, optional Stripe session id).
- **OrderItem** – One row per line (menu item, quantity, unit price). Belongs to an order.

**Commands:**

- **`npx prisma generate`** – Regenerates the Prisma client after you change the schema.
- **`npx prisma db push`** – Applies the schema to the database (creates/updates tables). Good for local dev.
- **`npx prisma db seed`** – Runs `prisma/seed.ts` to create the demo restaurant, menu, tables, and user `admin@demo.com` / `demo123`.

**Where the DB is used:** In API routes and in Server Components we import `prisma` from `src/lib/prisma.ts` and call things like `prisma.table.findUnique(...)`, `prisma.order.create(...)`, etc.

---

## 4. Guest flow (customer scans QR and orders)

**URL:** Someone scans a QR that points to `https://yoursite.com/m/table-1`. The token is `table-1`.

1. **Page:** `src/app/m/[token]/page.tsx` (Server Component)
   - Receives the `token` from the URL.
   - Loads the table and its restaurant from the DB (and checks the table exists).
   - Loads the restaurant’s menu (categories + available items).
   - Passes that data to the client component `MenuView`.

2. **UI:** `src/app/m/[token]/MenuView.tsx` (Client Component — “use client”)
   - Renders categories as tabs and items as cards with “Add” and price.
   - Keeps **cart** in React state (array of items + quantities).
   - “View cart” opens a drawer; “Place order” sends the cart to the API.

3. **Place order:** Browser sends `POST /api/orders` with `tableToken`, `items` (menu item ids, quantities, prices), and `totalAmount`.
   - **`src/app/api/orders/route.ts`**:
     - Checks that the table exists and gets its restaurant.
     - **Validates every item** (must belong to that restaurant and be available; **prices come from the DB**, not from the client, so customers can’t underpay).
     - Creates an `Order` and `OrderItem` rows.
     - If Stripe is configured, creates a Stripe Checkout session and returns its URL; otherwise returns success without payment.
   - The frontend then either redirects to Stripe (“Pay now”) or shows “Order received”.

4. **After payment:** Stripe redirects back to `/m/table-1?paid=1`. The menu page sees `paid=1` and shows “Payment successful”.

So: **one URL per table** → one menu per restaurant → cart in memory → order and payment via API and Stripe.

---

## 5. Authentication (dashboard login)

**Libraries:** NextAuth (handles login, session, cookies) and bcryptjs (hashes passwords).

1. **Config:** `src/lib/auth.ts`
   - Defines a **Credentials** provider: one strategy that checks email + password.
   - **authorize()** loads `RestaurantUser` by email, compares password with the stored hash; if OK, returns an object with `id`, `email`, `restaurantId`, `restaurantName`. That object is used to build the session.
   - **jwt()** callback stores `restaurantId` and `restaurantName` in the JWT so they’re available in every request.
   - **session()** callback copies those from the token into `session.user` so components can use them.
   - **secret** and **trustHost** are required so the JWT is signed and redirects work.

2. **API route:** `src/app/api/auth/[...nextauth]/route.ts`
   - NextAuth mounts all its endpoints under `/api/auth/*` (signin, signout, callback, session, etc.). This single route handles all of them.

3. **Login page:** `src/app/dashboard/login/page.tsx`
   - Form with email and password. On submit it calls `signIn("credentials", { email, password, callbackUrl, redirect: true })`.
   - NextAuth checks credentials, sets a signed cookie (JWT), and redirects to `callbackUrl` (e.g. `/dashboard`).
   - If login fails, NextAuth redirects back with `?error=CredentialsSignin`; the page shows “Invalid email or password.”

4. **Protecting dashboard:** `src/middleware.ts`
   - Runs on every request. If the path is under `/dashboard` and not `/dashboard/login`, it calls `getToken({ req, secret })`. If there’s no valid token (no cookie or wrong secret), it redirects to `/dashboard/login?callbackUrl=...`.
   - So only logged-in users can open `/dashboard`, `/dashboard/menu`, etc.

5. **Session in the app:** The root layout wraps the app in `<Providers>` (`components/Providers.tsx`), which is `<SessionProvider>` from NextAuth. That lets client components use `useSession()` and `signIn()` / `signOut()`. Server-side we use `getServerSession(authOptions)` to get the same session and e.g. restrict API routes to the logged-in restaurant.

---

## 6. Dashboard (restaurant staff)

**Layout:** `src/app/dashboard/` has a minimal layout; `src/app/dashboard/(app)/layout.tsx` adds the header and nav for all pages under `/dashboard` except login. The `(app)` folder is a “route group”: it doesn’t change the URL, so we still have `/dashboard`, `/dashboard/menu`, etc.

**Pages:**

- **Overview** – `(app)/page.tsx`: Counts of categories, items, tables, and orders today; links to Menu, Tables, Orders.
- **Menu** – `(app)/menu/page.tsx` + `MenuManager.tsx`: Fetches categories (with items) from `GET /api/dashboard/categories`. Add category (POST), delete category (DELETE), add item (POST), edit item (PATCH), delete item (DELETE). All scoped to the logged-in restaurant.
- **Tables** – `(app)/tables/page.tsx` + `TablesManager.tsx`: Lists tables, add table (POST), delete table (DELETE). Shows the menu URL per table and a **“Download QR”** link.
- **Orders** – `(app)/orders/page.tsx` + `OrdersList.tsx`: Fetches `GET /api/dashboard/orders` and shows recent orders; refreshes every 15 seconds.

**Dashboard APIs:** Under `src/app/api/dashboard/`. Every route first calls `getServerSession(authOptions)` and checks `session?.user?.restaurantId`. If missing, it returns 401. Then it only reads/writes data for that `restaurantId`. So each restaurant only sees and edits its own menu, tables, and orders.

---

## 7. Stripe (payments)

- **When the guest places an order:** `POST /api/orders` creates the order, then (if `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_APP_URL` are set) creates a Stripe Checkout Session with line items from the order, success/cancel URLs, and `metadata.orderId`. The frontend gets back a `checkoutUrl` and redirects the user to Stripe.
- **When the customer pays:** Stripe sends a webhook to your app. **`src/app/api/stripe/webhook/route.ts`** receives it, verifies the signature with `STRIPE_WEBHOOK_SECRET`, and if the event is `checkout.session.completed` it updates the order to `status: "paid"` and sets `paidAt`. So the restaurant and your DB stay in sync with Stripe.

Prices in Stripe are always taken from the order we created (which we validated server-side), not from the client.

---

## 8. QR code generation (new feature)

**Goal:** Let the restaurant download a printable QR code image for each table so they can put it on the table.

1. **API route:** `src/app/api/dashboard/tables/[id]/qr/route.ts`
   - **GET** with the table’s **id** (from the dashboard table list).
   - Ensures the user is logged in and that the table belongs to their restaurant (so you can’t get QR codes for someone else’s tables).
   - Builds the menu URL: `NEXT_PUBLIC_APP_URL` + `/m/` + table’s **token**.
   - Uses the `qrcode` library to generate a PNG buffer.
   - Returns that buffer with headers: `Content-Type: image/png` and `Content-Disposition: attachment; filename="qr-Table-1.png"` so the browser downloads a file.

2. **Dashboard:** In `TablesManager.tsx`, each table row has a link `<a href={/api/dashboard/tables/${t.id}/qr} download>Download QR</a>`. Clicking it calls that API (with your session cookie); the server checks you own the table and sends the PNG, and the browser saves it.

So: **Dashboard → Tables → Download QR** gives you a PNG per table that encodes the menu URL. You can print it and put it on the table.

---

## 9. Quick reference: where is X?

| What you want to find              | Where to look                                      |
|-----------------------------------|----------------------------------------------------|
| Database schema                   | `prisma/schema.prisma`                             |
| Demo data / seed user             | `prisma/seed.ts`                                   |
| Guest menu page                   | `src/app/m/[token]/page.tsx` + `MenuView.tsx`      |
| Place order logic                 | `src/app/api/orders/route.ts`                      |
| Login config (email/password)     | `src/lib/auth.ts`                                  |
| Login page                        | `src/app/dashboard/login/page.tsx`                 |
| “Only logged-in users” rule       | `src/middleware.ts`                                |
| Dashboard menu CRUD              | `src/app/dashboard/(app)/menu/` + API under `api/dashboard/categories` and `api/dashboard/items` |
| Dashboard tables + Download QR   | `src/app/dashboard/(app)/tables/TablesManager.tsx` + `api/dashboard/tables/` and `api/dashboard/tables/[id]/qr/route.ts` |
| Stripe checkout creation          | `src/app/api/orders/route.ts` (after creating order) |
| Stripe “payment done” handling    | `src/app/api/stripe/webhook/route.ts`              |
| Env vars (DB, Stripe, NextAuth)   | `.env` (see `.env.example` for names)              |

---

## 10. What to try next (for learning)

- Add a new menu category from the dashboard and see it appear on `/m/table-1` after refresh.
- Add a new table, click “Download QR”, open the PNG in an image viewer and confirm it’s a QR code; scan it with your phone and confirm it opens the menu.
- Place an order as a guest and watch the order show up in Dashboard → Orders.
- In `.env` temporarily break `NEXTAUTH_SECRET` and see that dashboard login stops working (and that the warning in `auth.ts` appears in the terminal).

If you want to go deeper on one part (e.g. “how does the session cookie work?” or “how do we add a new API route?”), we can walk through that step by step next.
