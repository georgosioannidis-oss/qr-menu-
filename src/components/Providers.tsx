/**
 * Root providers. Dashboard auth uses `DashboardSessionProvider` (see app dashboard layout)
 * and login uses its own `SessionProvider` with the correct auth base path.
 */
import { AppToaster } from "@/components/AppToaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppToaster />
    </>
  );
}
