import { MenuManager } from "./MenuManager";

export default function MenuPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink mb-2">Menu</h1>
        <p className="max-w-3xl text-ink-muted">
          Manage categories and items. Drag the grip to reorder categories or items, or drop an item on another
          category. Add options (e.g. size, extras) when editing an item.
        </p>
      </div>
      <MenuManager />
    </div>
  );
}
