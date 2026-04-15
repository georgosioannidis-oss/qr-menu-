#!/usr/bin/env node
/**
 * Kitchen auto-print agent — run on a PC on the same LAN as your receipt printer (or use Save as PDF).
 *
 * Setup:
 *   1. Dashboard → Options → create a print-agent token.
 *   2. Export env vars (see .env.example) or paste below.
 *   3. npm run print-agent
 *
 * macOS example (list printers: `lpstat -p`):
 *   PRINT_COMMAND="lp -d Your_Printer_Name -o raw"
 *
 * Windows: install printer, then use a tool that reads stdin, or omit PRINT_COMMAND to log only.
 */

import { spawn } from "node:child_process";

const BASE =
  process.env.PRINT_AGENT_BASE_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "";
const TOKEN = process.env.PRINT_AGENT_TOKEN || "";
const POLL_MS = Math.max(3000, parseInt(process.env.PRINT_AGENT_POLL_MS || "5000", 10) || 5000);
const PRINT_CMD = process.env.PRINT_COMMAND || "";

if (!BASE || !TOKEN) {
  console.error(
    "Missing PRINT_AGENT_BASE_URL (or NEXT_PUBLIC_APP_URL) or PRINT_AGENT_TOKEN.\n" +
      "Create a token under Dashboard → Options → Auto-print, then:\n" +
      "  export PRINT_AGENT_BASE_URL=https://your-app.com\n" +
      "  export PRINT_AGENT_TOKEN=...\n" +
      "  npm run print-agent"
  );
  process.exit(1);
}

function money(cents) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatTicket(order) {
  const w = 42;
  const line = (s) => String(s).slice(0, w).padEnd(w);
  const rows = [];
  rows.push("=".repeat(w));
  rows.push(line(order.restaurantName.toUpperCase().slice(0, w)));
  rows.push(line("KITCHEN TICKET"));
  rows.push("=".repeat(w));
  rows.push(line(`Table: ${order.tableName}`));
  rows.push(line(`Status: ${order.status}`));
  rows.push(line(new Date(order.createdAt).toLocaleString()));
  rows.push(line(`Order: ${order.id}`));
  rows.push("-".repeat(w));
  for (const it of order.items) {
    const extra = [it.notes, it.selectedOptionsSummary].filter(Boolean).join(" · ");
    rows.push(line(`${it.quantity}x ${it.name}`));
    if (extra) rows.push(line(`  ${extra}`));
    rows.push(line(money(it.unitPrice * it.quantity)));
  }
  rows.push("-".repeat(w));
  rows.push(line(`TOTAL ${money(order.totalAmount)}`));
  rows.push("=".repeat(w));
  rows.push("\n\n");
  return rows.join("\n");
}

function sendToPrinter(text) {
  if (!PRINT_CMD) {
    console.log(text);
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const child = spawn(PRINT_CMD, { shell: true, stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", (err) => {
      console.error("Print command failed:", err.message);
      resolve(false);
    });
    child.on("close", (code) => resolve(code === 0));
    child.stdin.write(text, "utf8");
    child.stdin.end();
  });
}

async function fetchPending() {
  const res = await fetch(`${BASE}/api/print-agent/pending`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (res.status === 401) {
    console.error("Unauthorized — check PRINT_AGENT_TOKEN.");
    return null;
  }
  if (!res.ok) {
    console.error("pending HTTP", res.status, await res.text());
    return null;
  }
  const data = await res.json();
  return Array.isArray(data.orders) ? data.orders : [];
}

async function ack(orderId) {
  const res = await fetch(`${BASE}/api/print-agent/ack`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderId }),
  });
  return res.ok;
}

async function tick() {
  const orders = await fetchPending();
  if (orders == null) return;
  for (const order of orders) {
    const text = formatTicket(order);
    const ok = await sendToPrinter(text);
    if (!ok) {
      console.error("Skipping ack for", order.id, "(print failed)");
      continue;
    }
    const acked = await ack(order.id);
    if (!acked) console.error("Ack failed for", order.id, "(will retry next poll)");
  }
}

console.error(`Print agent polling ${BASE} every ${POLL_MS}ms`);
await tick();
setInterval(tick, POLL_MS);
