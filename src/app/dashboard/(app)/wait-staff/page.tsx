import { WaitStaffSections } from "./WaitStaffSections";

export default function WaitStaffPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Waiter</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Three areas below — choose a tab for what you need. Incoming guest routing is configured under{" "}
          <strong>Options</strong>.
        </p>
      </div>
      <WaitStaffSections />
    </div>
  );
}
