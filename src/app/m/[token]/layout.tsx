/**
 * Layout for public guest menu routes: /m/[token]
 *
 * - Loads restaurant branding (primary color, light/dark) from the DB using the table token.
 * - Injects a single <style> block so Tailwind utility classes (bg-primary, etc.) match branding
 *   without fighting global CSS from the root layout.
 */
import { notFound } from "next/navigation";
import { darkenHex } from "@/lib/theme";
import { loadCustomerTableBrandingByToken } from "@/lib/load-customer-table";
export const revalidate = 30;

/** Default palette when restaurant.colorMode is light vs dark (matches globals.css tokens) */
const DARK_THEME = {
  surface: "#0a0a0a",
  card: "#171717",
  ink: "#fafafa",
  inkMuted: "#a3a3a3",
  border: "rgba(255,255,255,0.12)",
};
const LIGHT_THEME = {
  surface: "#f5f5f5",
  card: "#ffffff",
  ink: "#171717",
  inkMuted: "#525252",
  border: "rgba(0,0,0,0.1)",
};

export default async function CustomerThemeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const table = await loadCustomerTableBrandingByToken(token);

  if (!table) notFound();

  /* Branding: default to dark unless dashboard set colorMode to "light" */
  const mode = table.restaurant.colorMode === "light" ? "light" : "dark";
  const palette = mode === "dark" ? DARK_THEME : LIGHT_THEME;
  const primary = table.restaurant.primaryColor ?? "#C15C2A";
  const primaryHover = table.restaurant.primaryColor
    ? darkenHex(table.restaurant.primaryColor)
    : "#A04A22";

  const themeCss = `
    .customer-theme-root {
      --surface: ${palette.surface};
      --card: ${palette.card};
      --ink: ${palette.ink};
      --ink-muted: ${palette.inkMuted};
      --border: ${palette.border};
      --primary: ${primary};
      --primary-hover: ${primaryHover};
      background-color: ${palette.surface} !important;
      color: ${palette.ink} !important;
    }
    .customer-theme-root .bg-surface { background-color: ${palette.surface} !important; }
    .customer-theme-root .bg-card { background-color: ${palette.card} !important; }
    .customer-theme-root .text-ink { color: ${palette.ink} !important; }
    .customer-theme-root .text-ink-muted { color: ${palette.inkMuted} !important; }
    .customer-theme-root .text-primary { color: ${primary} !important; }
    .customer-theme-root .border-primary { border-color: ${primary} !important; }
    .customer-theme-root .border-border { border-color: ${palette.border} !important; }
    .customer-theme-root .bg-primary { background-color: ${primary} !important; }
    .customer-theme-root .hover\:bg-primary-hover:hover { background-color: ${primaryHover} !important; }
    .customer-theme-root button.bg-primary:hover { background-color: ${primaryHover} !important; }
    .customer-theme-root a.bg-primary:hover { background-color: ${primaryHover} !important; }
    .customer-theme-root .focus\\:border-primary:focus { border-color: ${primary} !important; }
    .customer-theme-root input::placeholder,
    .customer-theme-root textarea::placeholder {
      color: color-mix(in srgb, ${palette.inkMuted} 78%, transparent) !important;
      opacity: 1;
    }
    /* Keyboard / remote focus; primary actions stay readable vs inherited --ink */
    .customer-theme-root button:focus-visible,
    .customer-theme-root a:focus-visible,
    .customer-theme-root select:focus-visible,
    .customer-theme-root input:focus-visible {
      outline: 3px solid ${primary} !important;
      outline-offset: 2px !important;
    }
    .customer-theme-root button.bg-primary,
    .customer-theme-root a.bg-primary {
      color: #ffffff !important;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12) !important;
    }
    /* Order status page: force readable copy (avoids white-on-white when OS dark + menu light, or inherited color fighting utilities). */
    .customer-theme-root[data-theme="light"] .order-status-heading {
      color: #171717 !important;
    }
    .customer-theme-root[data-theme="light"] .order-status-message,
    .customer-theme-root[data-theme="light"] .order-status-label {
      color: #404040 !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-heading {
      color: #fafafa !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-message,
    .customer-theme-root[data-theme="dark"] .order-status-label {
      color: #d4d4d4 !important;
    }
    .customer-theme-root[data-theme="light"] .order-status-icon {
      box-sizing: border-box;
    }
    .customer-theme-root[data-theme="light"] .order-status-icon--pending {
      background-color: #e5e5e5 !important;
      color: #171717 !important;
      border: 2px solid #a3a3a3 !important;
    }
    .customer-theme-root[data-theme="light"] .order-status-icon--paid {
      background-color: #d1fae5 !important;
      color: #065f46 !important;
      border: 2px solid #059669 !important;
    }
    .customer-theme-root[data-theme="light"] .order-status-icon--preparing {
      background-color: #fef3c7 !important;
      color: #78350f !important;
      border: 2px solid #b45309 !important;
    }
    .customer-theme-root[data-theme="light"] .order-status-icon--ready {
      background-color: #ccfbf1 !important;
      color: #115e59 !important;
      border: 2px solid #0d9488 !important;
    }
    .customer-theme-root[data-theme="light"] .order-status-icon--delivered {
      background-color: #ede9fe !important;
      color: #5b21b6 !important;
      border: 2px solid #7c3aed !important;
    }
    .customer-theme-root[data-theme="light"] .order-status-icon--declined {
      background-color: #fee2e2 !important;
      color: #991b1b !important;
      border: 2px solid #dc2626 !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-icon {
      box-sizing: border-box;
    }
    .customer-theme-root[data-theme="dark"] .order-status-icon--pending {
      background-color: #404040 !important;
      color: #fafafa !important;
      border: 2px solid #737373 !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-icon--paid {
      background-color: #064e3b !important;
      color: #ecfdf5 !important;
      border: 2px solid #34d399 !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-icon--preparing {
      background-color: #78350f !important;
      color: #fffbeb !important;
      border: 2px solid #fbbf24 !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-icon--ready {
      background-color: #134e4a !important;
      color: #ccfbf1 !important;
      border: 2px solid #2dd4bf !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-icon--delivered {
      background-color: #5b21b6 !important;
      color: #f5f3ff !important;
      border: 2px solid #a78bfa !important;
    }
    .customer-theme-root[data-theme="dark"] .order-status-icon--declined {
      background-color: #991b1b !important;
      color: #fef2f2 !important;
      border: 2px solid #f87171 !important;
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <div
        className="customer-theme-root min-h-screen w-full bg-surface text-ink"
        data-theme={mode}
        style={{
          backgroundColor: palette.surface,
          color: palette.ink,
        }}
      >
        {children}
      </div>
    </>
  );
}
