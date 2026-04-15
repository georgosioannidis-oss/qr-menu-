/**
 * Node.js 25+ validates package.json more strictly. Next.js bundles minimal package.json files
 * under node_modules/next/dist/compiled/* (often missing "version"), which can throw:
 *   Error: Invalid package config .../icss-utils/package.json
 * This script adds version "0.0.0" only where missing. Safe to run on every install.
 */
const fs = require("fs");
const path = require("path");

const compiledDir = path.join(__dirname, "..", "node_modules", "next", "dist", "compiled");

if (!fs.existsSync(compiledDir)) {
  process.exit(0);
}

let patched = 0;
for (const dirent of fs.readdirSync(compiledDir, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const pkgPath = path.join(compiledDir, dirent.name, "package.json");
  if (!fs.existsSync(pkgPath)) continue;
  let raw;
  try {
    raw = fs.readFileSync(pkgPath, "utf8");
  } catch {
    continue;
  }
  let pkg;
  try {
    pkg = JSON.parse(raw);
  } catch {
    continue;
  }
  if (pkg.version != null && String(pkg.version).length > 0) continue;
  pkg.version = "0.0.0";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 0) + "\n");
  patched += 1;
}

if (patched > 0) {
  console.log(`[patch-next-compiled-pkg] Added missing "version" to ${patched} Next.js compiled package.json file(s) (Node 25+ compatibility).`);
}
