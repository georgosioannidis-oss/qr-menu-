# Commands

```bash
cd "/Users/charis/Desktop/QR MENU PROJECT"
npm run dev
```

`npm run dev` uses **`-H 127.0.0.1`** so Next.js does not call `os.networkInterfaces()` (that can crash on **Node 25+** or in restricted environments). Open **http://127.0.0.1:3000** (or the port shown in the terminal).

If you see **`EMFILE: too many open files`**, raise the macOS limit: `ulimit -n 10240` in the same terminal, then run `npm run dev` again. Prefer **Node 22 LTS** (see README).

(Adjust the `cd` path if your project folder is somewhere else.)

**Before release:** `npm run typecheck`, `npm test`, `npm run build`, `npm run lint`.

Other scripts: `npm run dev:turbo`, `npm run test:watch`, `npm run start`, `npm run db:push`, `npm run db:seed` — see `package.json`.
