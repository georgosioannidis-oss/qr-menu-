import { BrandingPageClient } from "./BrandingPageClient";

export default function BrandingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Options</h1>
        <p className="text-ink-muted">
          Set your theme color and logo. They appear on the customer menu and in this dashboard.
        </p>
      </div>
      <BrandingPageClient />
    </div>
  );
}
