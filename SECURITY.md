# Security

This doc summarizes what we do today and what to add as you grow (dashboard, multi-tenant, payments).

---

## In place now

- **Orders API**
  - Table is looked up by token; only that restaurant’s table is used.
  - Every line item is validated: `menuItemId` must belong to that restaurant and be available. Prices are taken from the database, not from the client, so users cannot underpay.
  - Limits: max 50 items per order, max quantity 10 per line, note length 500 chars. Inputs are normalized (quantity clamped, notes trimmed).
- **Stripe**
  - Webhook verifies the `Stripe-Signature` header with `STRIPE_WEBHOOK_SECRET`; no verification = webhook is disabled.
  - Payment amounts come from server-validated order data, not from the client.
- **Database**
  - Prisma parameterized queries (no raw SQL with user input), so SQL injection risk is low.
- **Secrets**
  - No API keys or secrets in the repo; use `.env` (and ensure `.env` is in `.gitignore`).

---

## When you add a restaurant dashboard

- **Authentication**
  - Use a proper auth solution (e.g. NextAuth, Clerk, or Supabase Auth) for restaurant staff. No shared or default passwords.
  - Protect all dashboard routes and API routes that change menu/orders/settings; reject unauthenticated or wrong-tenant requests.
- **Authorization**
  - Every dashboard request should be scoped by `restaurantId` (from the logged-in user). Never list or update another restaurant’s data.
  - Prefer server-side checks (e.g. in API routes or server components) over trusting the client (e.g. “my restaurant id” in the request body).
- **Sessions**
  - Prefer HTTP-only, secure cookies for session tokens; avoid storing sensitive tokens in `localStorage` for dashboard users.

---

## When you add signup / multi-tenant

- **Rate limiting**
  - Add rate limiting on signup, login, and “place order” (e.g. by IP or by table/session) so abuse and brute force are limited. Use Vercel KV, Upstash, or your hosting provider’s limits.
- **Input validation**
  - Validate and sanitize all signup/login and menu inputs (length, format). Consider a schema library (e.g. Zod) for request bodies.
- **HTTPS**
  - Use HTTPS only in production; set secure headers (e.g. `Strict-Transport-Security`, `X-Content-Type-Options`).

---

## Good habits

- Keep dependencies updated (`npm audit`, `npm update`).
- Do not log secrets or full payment/order details.
- For Stripe, use test keys in development and restrict live keys to production.
- If you store card data (you shouldn’t need to with Stripe Checkout), you must follow PCI rules; using Stripe Checkout keeps you out of scope.

---

## If something goes wrong

- Rotate any exposed secret (Stripe keys, DB URL, auth secrets) immediately.
- Check logs and Stripe Dashboard for suspicious activity.
- Fix the bug, deploy, then document the incident and what changed.
