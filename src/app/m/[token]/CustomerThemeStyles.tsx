"use client";

import { useEffect } from "react";

type Palette = {
  surface: string;
  card: string;
  ink: string;
  inkMuted: string;
  border: string;
};

export function CustomerThemeStyles({
  primary,
  primaryHover,
  palette,
}: {
  primary: string;
  primaryHover: string;
  palette: Palette;
}) {
  useEffect(() => {
    const css = `
      .customer-theme-root {
        --primary: ${primary} !important;
        --primary-hover: ${primaryHover} !important;
        --surface: ${palette.surface} !important;
        --card: ${palette.card} !important;
        --ink: ${palette.ink} !important;
        --ink-muted: ${palette.inkMuted} !important;
        --border: ${palette.border} !important;
      }
      .customer-theme-root .bg-primary,
      .customer-theme-root button.bg-primary,
      .customer-theme-root a.bg-primary {
        background-color: ${primary} !important;
      }
      .customer-theme-root .bg-primary:hover,
      .customer-theme-root button.bg-primary:hover,
      .customer-theme-root a.bg-primary:hover,
      .customer-theme-root .hover\\:bg-primary-hover:hover {
        background-color: ${primaryHover} !important;
      }
      .customer-theme-root .text-primary {
        color: ${primary} !important;
      }
      .customer-theme-root .border-primary,
      .customer-theme-root .focus\\:border-primary:focus {
        border-color: ${primary} !important;
      }
    `;
    const style = document.createElement("style");
    style.setAttribute("data-customer-theme", "true");
    style.textContent = css;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode) style.parentNode.removeChild(style);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- theme from server, stable per page
  }, [primary, primaryHover]);

  return null;
}
