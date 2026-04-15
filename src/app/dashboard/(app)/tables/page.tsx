import { TablesManager } from "./TablesManager";

export default function TablesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Tables</h1>
        <p className="max-w-3xl text-ink-muted">
          Every table must belong to a section. Drag sections or tables to reorder; drag a table onto another section to
          move it. Create at least one section before adding tables.
        </p>
      </div>
      <TablesManager />
    </div>
  );
}
