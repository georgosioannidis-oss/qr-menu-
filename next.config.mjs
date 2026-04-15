/**
 * Next.js configuration.
 * `outputFileTracingRoot` pins the monorepo/root for file tracing when another package-lock.json exists on the machine (e.g. home directory).
 */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
