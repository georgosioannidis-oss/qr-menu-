# Keeping your code safe and how restaurants use the app

---

## 1. Keeping the code safe and backing up successful versions

**Use Git.** Git tracks every change and lets you go back to any previous version. You don’t “give” the code to restaurants; you run one copy on your own servers (see section 2).

### One-time setup (if you haven’t already)

In your project folder:

```bash
cd "/Users/charis/Desktop/QR MENU PROJECT"
git init
git add .
git commit -m "Initial: QR menu app with dashboard and QR download"
```

Your `.gitignore` already excludes `node_modules`, `.env`, and the database file, so secrets and dependencies are not committed.

### Backing up every successful version

- **After each good milestone** (e.g. “guest flow works”, “dashboard works”, “QR download works”), commit and push:

  ```bash
  git add .
  git commit -m "Describe what you just finished, e.g. QR download for tables"
  git push origin main
  ```

- **Tag a “release” when you’re happy with a version** (e.g. before you let real restaurants use it):

  ```bash
  git tag -a v1.0 -m "First version for restaurants"
  git push origin v1.0
  ```

  Later you can always check out that tag to get back to that exact code: `git checkout v1.0`.

- **Use a remote (GitHub, GitLab, etc.)** so the code lives in two places: your computer and the remote. If your laptop is lost or broken, you still have the repo. Create a repo (private is fine), then:

  ```bash
  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  git branch -M main
  git push -u origin main
  ```

So: **safe** = Git + remote. **Back up successful versions** = commit often and tag releases (e.g. `v1.0`) before big steps like “push to actual restaurants”.

---

## 2. How do we “give it” to restaurants? (You don’t give them the code)

You don’t give restaurants the source code or a copy of the app. You run **one** app on **your** servers; restaurants and their customers **use** it through the browser.

### How it works

1. **You host the app once**
   - You put the code on a host (e.g. **Vercel** for the Next.js app and **Supabase** or **Neon** for the database).
   - The app gets a public URL, e.g. `https://qrmenu.yourcompany.com` or `https://your-app.vercel.app`.

2. **Restaurants get access, not code**
   - You create an account for each restaurant (or later: they sign up).
   - They get a **login** (e.g. `restaurant@bella-italia.com` / password).
   - They go to `https://your-app.com/dashboard`, log in, and use **your** site to:
     - Edit their menu (categories and items)
     - Add tables and **download QR codes**
     - See orders

3. **Their customers (guests)**
   - The restaurant prints the QR and puts it on the table.
   - Guest scans QR → opens e.g. `https://your-app.com/m/table-5`.
   - That URL is **on your server**; the guest sees the menu, orders, and pays. You and the restaurant never send them “the code”.

So:
- **Restaurants** = use your website (dashboard) to manage menu and tables.
- **Guests** = use your website (menu/order/pay) via the link in the QR.
- **You** = own and run the one codebase and one deployment; you can back it up with Git and tag versions so you never lose a good “successful version” before pushing to real restaurants.

---

## 3. Short checklist before “pushing to actual restaurants”

- [ ] Code in Git, pushed to a remote (e.g. GitHub), and a release tagged (e.g. `v1.0`).
- [ ] App deployed (e.g. Vercel) and database in production (e.g. Supabase/Neon) with a real URL.
- [ ] `.env` in production has real `DATABASE_URL`, `DIRECT_URL` (Postgres direct connection for Prisma migrations), `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and Stripe keys (and `NEXT_PUBLIC_APP_URL` = your production URL).
- [ ] You (or they) create a restaurant account and test: login, menu, tables, QR download, place order, payment.
- [ ] When happy, onboard restaurants by creating their accounts and giving them the dashboard URL and login; they never get the code, only access to the site.

Your code stays with you and in Git; backups and “successful versions” are commits and tags. Restaurants only get access to the live site and their own data.
