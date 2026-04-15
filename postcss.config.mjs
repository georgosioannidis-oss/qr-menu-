/**
 * Tailwind CSS v4: one PostCSS plugin (`@tailwindcss/postcss`).
 * Avoids the Tailwind v3 + PostCSS 8.4.x duplicate-package issues that break Next.js webpack.
 * Autoprefixer is included; do not add `autoprefixer` here.
 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
