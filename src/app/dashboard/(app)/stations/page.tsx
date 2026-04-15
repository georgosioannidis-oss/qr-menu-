import { StationsManager } from "./StationsManager";

export default function StationsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Stations</h1>
        <p className="max-w-3xl text-ink-muted">
          Create preparation stations (e.g. Bar, Kitchen, Grill) and assign menu items to them.
          Orders are automatically grouped by station so each screen sees only its items.
        </p>
      </div>
      <StationsManager />
    </div>
  );
}
