"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";
import { normalizePublicMediaUrl } from "@/lib/media-url";
import { OptionGroupsEditor, parseOptionGroups, type OptionGroup } from "./OptionGroupsEditor";

type Station = { id: string; name: string };

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  quickPrep?: boolean;
  sortOrder: number;
  optionGroups?: string | null;
  stationId?: string | null;
  station?: Station | null;
};

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  isAvailable: boolean;
  items: MenuItem[];
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Shared field styles for menu item forms */
const inputClass =
  "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-ink shadow-sm placeholder:text-ink-muted/50 transition-[border-color,box-shadow] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";
const labelClass = "block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5";
const numberFieldClass = `${inputClass} input-no-spin tabular-nums`;

const MENU_CAT_PREFIX = "mcat-";
const MENU_ITEM_PREFIX = "mitem-";
const MENU_DROP_CAT_PREFIX = "mdrop-";

/** Prefer item / category drop targets over the big category card (same idea as TablesManager). */
const menuManagerCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  if (activeId.startsWith(MENU_ITEM_PREFIX)) {
    const itemTargets = args.droppableContainers.filter((c) => {
      const id = String(c.id);
      return id.startsWith(MENU_ITEM_PREFIX) || id.startsWith(MENU_DROP_CAT_PREFIX);
    });
    if (itemTargets.length > 0) {
      const hits = closestCorners({ ...args, droppableContainers: itemTargets });
      if (hits.length > 0) return hits;
    }
  }
  if (activeId.startsWith(MENU_CAT_PREFIX)) {
    const catTargets = args.droppableContainers.filter((c) => String(c.id).startsWith(MENU_CAT_PREFIX));
    if (catTargets.length > 0) {
      const hits = closestCorners({ ...args, droppableContainers: catTargets });
      if (hits.length > 0) return hits;
    }
  }
  return closestCorners(args);
};

const MENU_DRAG_DROP_ANIMATION = {
  duration: 200,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.28" } },
  }),
};

function MenuGrip() {
  return (
    <span className="inline-flex flex-col gap-0.5 text-ink-muted/60 select-none" aria-hidden>
      {[0, 1, 2].map((r) => (
        <span key={r} className="flex gap-0.5">
          <span className="h-1 w-1 rounded-full bg-current" />
          <span className="h-1 w-1 rounded-full bg-current" />
        </span>
      ))}
    </span>
  );
}

function MenuCategoryDropZone({
  categoryId,
  emphasize,
  children,
}: {
  categoryId: string;
  emphasize?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${MENU_DROP_CAT_PREFIX}${categoryId}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-6 rounded-xl transition-colors ${
        isOver
          ? emphasize
            ? "bg-primary/12 ring-2 ring-primary/60"
            : "bg-primary/10 ring-2 ring-dashed ring-primary/35"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

function findMenuCategoryForItem(categories: Category[], itemId: string): string | null {
  for (const c of categories) {
    if (c.items.some((i) => i.id === itemId)) return c.id;
  }
  return null;
}

function SortableMenuItemRow({
  item,
  categoryId,
  editingItem,
  inputClass: ic,
  numberFieldClass: nf,
  labelClass: lc,
  togglingItemId,
  deletingItemId,
  dragLocked,
  onOpenEditItem,
  onToggleAvailability,
  onUpdateItem,
  onDeleteItem,
}: {
  item: MenuItem;
  categoryId: string;
  editingItem: string | null;
  inputClass: string;
  numberFieldClass: string;
  labelClass: string;
  togglingItemId: string | null;
  deletingItemId: string | null;
  /** True while edit or add modal is open — pauses drag for all items. */
  dragLocked: boolean;
  onOpenEditItem: (itemId: string) => void;
  onToggleAvailability: (itemId: string, makeAvailable: boolean) => void;
  onUpdateItem: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      isAvailable?: boolean;
      quickPrep?: boolean;
      imageUrl?: string;
      optionGroups?: OptionGroup[];
    }
  ) => Promise<void>;
  onDeleteItem: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `${MENU_ITEM_PREFIX}${item.id}`,
      data: { kind: "item", itemId: item.id, categoryId },
      disabled: dragLocked,
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`list-none ${isDragging ? "opacity-60 ring-2 ring-primary/20" : ""}`}
    >
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/80 px-3 py-3 shadow-sm transition hover:border-primary/20 hover:shadow sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-3.5">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
            <button
              ref={setActivatorNodeRef}
              type="button"
              className="mt-0.5 flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-border bg-surface active:cursor-grabbing sm:mt-1"
              aria-label="Drag to reorder or move item"
              {...attributes}
              {...listeners}
            >
              <MenuGrip />
            </button>
            <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
              {(() => {
                const thumb = normalizePublicMediaUrl(item.imageUrl);
                return thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-border sm:h-14 sm:w-14"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface text-base text-ink-muted/40 ring-1 ring-border sm:h-14 sm:w-14 sm:text-lg">
                    ◇
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug text-ink">
                  {item.name}
                  {item.quickPrep === true ? (
                    <span className="ml-1.5 inline-block rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:ml-2 sm:text-xs">
                      Quick serve
                    </span>
                  ) : null}
                  {!item.isAvailable && (
                    <span className="ml-1.5 inline-block rounded-md bg-ink-muted/15 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted sm:ml-2 sm:text-xs">
                      Hidden
                    </span>
                  )}
                </p>
                {item.description && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted sm:text-sm">{item.description}</p>}
              </div>
            </div>
          </div>
          <div className="flex min-w-0 w-full shrink-0 flex-col gap-2 border-t border-border pt-3 sm:w-auto sm:flex-row sm:items-center sm:border-0 sm:pt-0">
            <span className="text-base font-bold tabular-nums text-primary sm:text-lg">{formatPrice(item.price)}</span>
            <div className="flex w-full min-w-0 flex-wrap gap-1.5 sm:w-auto sm:justify-end">
              {item.isAvailable ? (
                <button
                  type="button"
                  disabled={togglingItemId === item.id}
                  onClick={() => onToggleAvailability(item.id, false)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border-2 border-amber-400/70 bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-950 shadow-sm transition hover:bg-amber-100 disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-2 sm:text-sm"
                >
                  {togglingItemId === item.id ? <Spinner className="h-4 w-4 border-amber-800 border-t-transparent" /> : null}
                  {togglingItemId === item.id ? "Updating…" : (
                    <>
                      <span className="sm:hidden">Hide</span>
                      <span className="hidden sm:inline">Mark unavailable</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={togglingItemId === item.id}
                  onClick={() => onToggleAvailability(item.id, true)}
                  className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-950 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-2 sm:text-sm"
                >
                  {togglingItemId === item.id ? <Spinner className="h-4 w-4 border-emerald-800 border-t-transparent" /> : null}
                  {togglingItemId === item.id ? "Updating…" : (
                    <>
                      <span className="sm:hidden">Show</span>
                      <span className="hidden sm:inline">Show on menu</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenEditItem(item.id)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={deletingItemId === item.id}
                onClick={() => onDeleteItem(item.id)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                {deletingItemId === item.id ? <Spinner className="h-4 w-4 border-red-600 border-t-transparent" /> : null}
                {deletingItemId === item.id ? "Removing…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
    </li>
  );
}

function SortableMenuCategoryBlock({
  cat,
  editingItem,
  dragLocked,
  togglingItemId,
  togglingCategoryId,
  deletingItemId,
  deletingCategoryId,
  onOpenAddItem,
  onOpenEditItem,
  compactForCategoryReorder,
  emphasizeItemDropTarget,
  handleDeleteCategory,
  handleToggleAvailability,
  handleToggleCategoryAvailability,
  handleUpdateItem,
  handleDeleteItem,
}: {
  cat: Category;
  editingItem: string | null;
  dragLocked: boolean;
  togglingItemId: string | null;
  togglingCategoryId: string | null;
  deletingItemId: string | null;
  deletingCategoryId: string | null;
  onOpenAddItem: (categoryId: string) => void;
  onOpenEditItem: (itemId: string) => void;
  compactForCategoryReorder: boolean;
  emphasizeItemDropTarget: boolean;
  handleDeleteCategory: (id: string) => void;
  handleToggleAvailability: (itemId: string, makeAvailable: boolean) => void;
  handleToggleCategoryAvailability: (categoryId: string, makeAvailable: boolean) => void;
  handleUpdateItem: (
    id: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      isAvailable?: boolean;
      quickPrep?: boolean;
      imageUrl?: string;
      optionGroups?: OptionGroup[];
    }
  ) => Promise<void>;
  handleDeleteItem: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: `${MENU_CAT_PREFIX}${cat.id}`,
      data: { kind: "category", categoryId: cat.id },
      animateLayoutChanges: () => false,
    });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };
  const itemIds = cat.items.map((i) => `${MENU_ITEM_PREFIX}${i.id}`);

  const headerActions = (
    <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 [@media(min-width:400px)]:flex-row [@media(min-width:400px)]:flex-wrap [@media(min-width:400px)]:items-center [@media(min-width:400px)]:justify-end sm:w-auto">
      {cat.isAvailable ? (
        <button
          type="button"
          disabled={togglingCategoryId === cat.id}
          onClick={() => handleToggleCategoryAvailability(cat.id, false)}
          className="min-h-[44px] flex-1 rounded-xl border-2 border-amber-400/70 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 shadow-sm hover:bg-amber-100 disabled:opacity-50 [@media(min-width:400px)]:flex-none [@media(min-width:400px)]:py-1.5"
        >
          {togglingCategoryId === cat.id ? "…" : "Hide from menu"}
        </button>
      ) : (
        <button
          type="button"
          disabled={togglingCategoryId === cat.id}
          onClick={() => handleToggleCategoryAvailability(cat.id, true)}
          className="min-h-[44px] flex-1 rounded-xl border border-emerald-500/50 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-950 shadow-sm hover:bg-emerald-100 disabled:opacity-50 [@media(min-width:400px)]:flex-none [@media(min-width:400px)]:py-1.5"
        >
          {togglingCategoryId === cat.id ? "…" : "Show on menu"}
        </button>
      )}
      <button
        type="button"
        disabled={deletingCategoryId === cat.id}
        onClick={() => handleDeleteCategory(cat.id)}
        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-red-200/80 bg-red-50/50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 [@media(min-width:400px)]:flex-none [@media(min-width:400px)]:border-0 [@media(min-width:400px)]:bg-transparent [@media(min-width:400px)]:py-1.5 [@media(min-width:400px)]:text-red-600"
      >
        {deletingCategoryId === cat.id ? <Spinner className="h-4 w-4 border-red-600 border-t-transparent" /> : null}
        Delete category
      </button>
    </div>
  );

  if (compactForCategoryReorder) {
    return (
      <div ref={setNodeRef} style={style} className="flex items-center gap-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex h-10 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-border bg-surface touch-none active:cursor-grabbing"
          aria-label="Drag to reorder category"
          {...attributes}
          {...listeners}
        >
          <MenuGrip />
        </button>
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col gap-1 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm ${
            isDragging ? "opacity-60 ring-2 ring-primary/30" : ""
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ink">{cat.name}</h2>
            {!cat.isAvailable ? (
              <span className="rounded-md bg-ink-muted/15 px-1.5 py-0.5 text-xs font-medium text-ink-muted">
                Hidden from guests
              </span>
            ) : null}
          </div>
          <p className="text-xs text-ink-muted">Drag to reorder categories. Item list hidden until you release.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 ${isDragging ? "ring-2 ring-primary/25" : ""}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-2 sm:items-start">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="mt-0.5 flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-border bg-surface touch-none active:cursor-grabbing"
            aria-label="Drag to reorder category"
            {...attributes}
            {...listeners}
          >
            <MenuGrip />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-ink">{cat.name}</h2>
              {!cat.isAvailable ? (
                <span className="rounded-md bg-ink-muted/15 px-1.5 py-0.5 text-xs font-medium text-ink-muted">
                  Hidden from guests
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-ink-muted">Drag items by the grip, or move them to another category.</p>
          </div>
        </div>
        {headerActions}
      </div>

      <MenuCategoryDropZone categoryId={cat.id} emphasize={emphasizeItemDropTarget}>
        {cat.items.length === 0 ? (
          <p className="text-sm text-ink-muted py-2">Drop items here or add below.</p>
        ) : (
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {cat.items.map((item) => (
                <SortableMenuItemRow
                  key={item.id}
                  item={item}
                  categoryId={cat.id}
                  editingItem={editingItem}
                  inputClass={inputClass}
                  numberFieldClass={numberFieldClass}
                  labelClass={labelClass}
                  togglingItemId={togglingItemId}
                  deletingItemId={deletingItemId}
                  dragLocked={dragLocked}
                  onOpenEditItem={onOpenEditItem}
                  onToggleAvailability={handleToggleAvailability}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </ul>
          </SortableContext>
        )}
      </MenuCategoryDropZone>

      <button
        type="button"
        onClick={() => onOpenAddItem(cat.id)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/[0.04] py-3.5 text-sm font-semibold text-primary transition hover:border-primary/55 hover:bg-primary/10"
      >
        <span className="text-lg leading-none">+</span>
        Add item to {cat.name}
      </button>
    </div>
  );
}

export function MenuManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [addingItemCategoryId, setAddingItemCategoryId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [togglingCategoryId, setTogglingCategoryId] = useState<string | null>(null);
  const [persistingMenu, setPersistingMenu] = useState(false);
  const itemLayoutPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingItemLayoutRef = useRef<Category[] | null>(null);
  const categoryOrderPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCategoryOrderRef = useRef<Category[] | null>(null);
  const [activeDrag, setActiveDrag] = useState<
    null | { kind: "category"; categoryId: string } | { kind: "item"; itemId: string }
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const categorySortIds = useMemo(() => categories.map((c) => `${MENU_CAT_PREFIX}${c.id}`), [categories]);

  const dragOverlayItem = useMemo(() => {
    if (!activeDrag || activeDrag.kind !== "item") return null;
    for (const c of categories) {
      const it = c.items.find((i) => i.id === activeDrag.itemId);
      if (it) return { item: it, categoryName: c.name };
    }
    return null;
  }, [categories, activeDrag]);

  const dragOverlayCategory = useMemo(() => {
    if (!activeDrag || activeDrag.kind !== "category") return null;
    return categories.find((c) => c.id === activeDrag.categoryId) ?? null;
  }, [categories, activeDrag]);

  const fetchCategories = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/dashboard/categories", { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 401) throw new Error("Session expired. Please log in again.");
      const text = await res.text();
      if (!res.ok) {
        let msg = "Failed to load menu";
        try {
          if (text) {
            const d = JSON.parse(text) as { error?: string };
            if (typeof d.error === "string") msg = d.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      let raw: unknown[] = [];
      try {
        raw = text ? (JSON.parse(text) as unknown[]) : [];
      } catch {
        throw new Error("Invalid response");
      }
      const data: Category[] = raw.map((row) => {
        const r = row as Category & { isAvailable?: boolean };
        return {
          ...r,
          isAvailable: r.isAvailable !== false,
          items: Array.isArray(r.items) ? r.items : [],
        };
      });
      setCategories(data);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out. Is the server running? Run: npm run dev");
      } else if (e instanceof Error && e.message.includes("Session expired")) {
        setError(e.message + " Go to the login page and sign in again.");
      } else {
        setError((e instanceof Error ? e.message : "Error loading menu") + " Make sure the server is running (npm run dev).");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      const res = await fetch("/api/dashboard/stations");
      if (res.ok) {
        const data = await res.json();
        setStations(Array.isArray(data) ? data : []);
      }
    } catch { /* stations are optional */ }
  };

  useEffect(() => {
    fetchCategories();
    fetchStations();
  }, []);

  useEffect(() => {
    return () => {
      if (itemLayoutPersistTimerRef.current) clearTimeout(itemLayoutPersistTimerRef.current);
      if (categoryOrderPersistTimerRef.current) clearTimeout(categoryOrderPersistTimerRef.current);
    };
  }, []);

  const flushCategoryOrderPersist = useCallback(async () => {
    const ordered = pendingCategoryOrderRef.current;
    pendingCategoryOrderRef.current = null;
    if (!ordered) return;
    setPersistingMenu(true);
    try {
      const res = await fetch("/api/dashboard/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedCategoryIds: ordered.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error("Failed to save category order");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      await fetchCategories();
    } finally {
      setPersistingMenu(false);
    }
  }, []);

  const scheduleCategoryOrderPersist = useCallback(
    (ordered: Category[]) => {
      pendingCategoryOrderRef.current = ordered;
      if (categoryOrderPersistTimerRef.current) clearTimeout(categoryOrderPersistTimerRef.current);
      categoryOrderPersistTimerRef.current = setTimeout(() => {
        categoryOrderPersistTimerRef.current = null;
        void flushCategoryOrderPersist();
      }, 450);
    },
    [flushCategoryOrderPersist]
  );

  const flushItemLayoutPersist = useCallback(async () => {
    const next = pendingItemLayoutRef.current;
    pendingItemLayoutRef.current = null;
    if (!next) return;
    setPersistingMenu(true);
    try {
      const res = await fetch("/api/dashboard/items/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: next.map((c) => ({ categoryId: c.id, itemIds: c.items.map((i) => i.id) })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save item order");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      await fetchCategories();
    } finally {
      setPersistingMenu(false);
    }
  }, []);

  const scheduleItemLayoutPersist = useCallback(
    (next: Category[]) => {
      pendingItemLayoutRef.current = next;
      if (itemLayoutPersistTimerRef.current) clearTimeout(itemLayoutPersistTimerRef.current);
      itemLayoutPersistTimerRef.current = setTimeout(() => {
        itemLayoutPersistTimerRef.current = null;
        void flushItemLayoutPersist();
      }, 450);
    },
    [flushItemLayoutPersist]
  );

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setAddingCategory(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        const msg = d.error ?? (res.status === 500 ? "Server error. Try: npx prisma db push, then restart (npm run dev)." : "Failed to add category");
        throw new Error(msg);
      }
      setNewCategoryName("");
      await fetchCategories();
      toast.success("Category added");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (
      !confirmDestructiveAction(
        "Delete this category and all items in it.",
        "Guests will no longer see these dishes on the menu."
      )
    )
      return;
    setDeletingCategoryId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      await fetchCategories();
      toast.success("Category removed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingCategoryId(null);
    }
  };

  const handleAddItem = async (
    categoryId: string,
    name: string,
    priceCents: number,
    description: string,
    imageUrl: string,
    optionGroups: OptionGroup[],
    quickPrep: boolean,
    stationId?: string | null
  ) => {
    setError("");
    try {
      const res = await fetch("/api/dashboard/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId,
          name: name.trim(),
          price: Math.round(priceCents),
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          optionGroups: optionGroups.length > 0 ? optionGroups : undefined,
          quickPrep: quickPrep || undefined,
          stationId: stationId || undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        const msg = d.error ?? (res.status === 500 ? "Server error. Try: npx prisma db push, then restart (npm run dev)." : "Failed");
        throw new Error(msg);
      }
      setAddingItemCategoryId(null);
      await fetchCategories();
      toast.success("Item added to menu");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
      throw e;
    }
  };

  const handleUpdateItem = async (
    id: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      isAvailable?: boolean;
      quickPrep?: boolean;
      imageUrl?: string;
      optionGroups?: OptionGroup[];
      stationId?: string | null;
    }
  ) => {
    setError("");
    try {
      const body: Record<string, unknown> = { ...updates };
      if (updates.optionGroups !== undefined)
        body.optionGroups =
          updates.optionGroups.length > 0 ? updates.optionGroups : null;
      const res = await fetch(`/api/dashboard/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        const msg = d.error ?? (res.status === 500 ? "Server error. Try: npx prisma db push, then restart (npm run dev)." : "Failed to save");
        throw new Error(msg);
      }
      setEditingItem(null);
      await fetchCategories();
      toast.success("Item saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
      throw e;
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirmDestructiveAction("Remove this item from the menu.", "It will disappear from the guest menu.")) return;
    setDeletingItemId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove item");
      await fetchCategories();
      toast.success("Item removed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingItemId(null);
    }
  };

  /** One-tap hide/show on guest menu (no full edit form). */
  const handleToggleAvailability = async (itemId: string, makeAvailable: boolean) => {
    setTogglingItemId(itemId);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: makeAvailable }),
      });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        throw new Error(d.error ?? "Could not update availability");
      }
      await fetchCategories();
      toast.success(makeAvailable ? "Item is visible on the menu" : "Item hidden from menu");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleToggleCategoryAvailability = async (categoryId: string, makeAvailable: boolean) => {
    setTogglingCategoryId(categoryId);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/categories/${categoryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: makeAvailable }),
      });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        throw new Error(d.error ?? "Could not update category");
      }
      await fetchCategories();
      toast.success(makeAvailable ? "Category is visible on the guest menu" : "Category hidden from guests");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingCategoryId(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith(MENU_ITEM_PREFIX)) {
      setActiveDrag({ kind: "item", itemId: id.slice(MENU_ITEM_PREFIX.length) });
    } else if (id.startsWith(MENU_CAT_PREFIX)) {
      setActiveDrag({ kind: "category", categoryId: id.slice(MENU_CAT_PREFIX.length) });
    }
  };

  const handleDragCancel = () => setActiveDrag(null);

  const handleMenuDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const aid = active.id.toString();
    const oid = over.id.toString();

    if (aid.startsWith(MENU_CAT_PREFIX)) {
      if (!oid.startsWith(MENU_CAT_PREFIX)) return;
      const a = aid.slice(MENU_CAT_PREFIX.length);
      const b = oid.slice(MENU_CAT_PREFIX.length);
      setCategories((prev) => {
        const oldI = prev.findIndex((c) => c.id === a);
        const newI = prev.findIndex((c) => c.id === b);
        if (oldI === -1 || newI === -1 || oldI === newI) return prev;
        const next = arrayMove(prev, oldI, newI);
        scheduleCategoryOrderPersist(next);
        return next;
      });
      return;
    }

    if (!aid.startsWith(MENU_ITEM_PREFIX)) return;
    const itemId = aid.slice(MENU_ITEM_PREFIX.length);
    setCategories((prev) => {
      const fromCid = findMenuCategoryForItem(prev, itemId);
      if (!fromCid) return prev;

      let toCid: string | null = null;
      let overItemId: string | null = null;

      if (oid.startsWith(MENU_DROP_CAT_PREFIX)) {
        toCid = oid.slice(MENU_DROP_CAT_PREFIX.length);
      } else if (oid.startsWith(MENU_ITEM_PREFIX)) {
        overItemId = oid.slice(MENU_ITEM_PREFIX.length);
        toCid = findMenuCategoryForItem(prev, overItemId);
      } else if (oid.startsWith(MENU_CAT_PREFIX)) {
        toCid = oid.slice(MENU_CAT_PREFIX.length);
      }

      if (!toCid) return prev;

      if (fromCid === toCid && overItemId && overItemId !== itemId) {
        const next = prev.map((c) => ({ ...c, items: [...c.items] }));
        const cat = next.find((c) => c.id === fromCid)!;
        const oldIndex = cat.items.findIndex((i) => i.id === itemId);
        const newIndex = cat.items.findIndex((i) => i.id === overItemId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        cat.items = arrayMove(cat.items, oldIndex, newIndex);
        scheduleItemLayoutPersist(next);
        return next;
      }

      const next = prev.map((c) => ({ ...c, items: [...c.items] }));
      const fromCat = next.find((c) => c.id === fromCid)!;
      const ii = fromCat.items.findIndex((i) => i.id === itemId);
      if (ii === -1) return prev;
      const [moved] = fromCat.items.splice(ii, 1);

      const toCat = next.find((c) => c.id === toCid)!;
      if (overItemId) {
        const oi = toCat.items.findIndex((i) => i.id === overItemId);
        if (oi !== -1) toCat.items.splice(oi, 0, moved);
        else toCat.items.push(moved);
      } else {
        toCat.items.push(moved);
      }

      scheduleItemLayoutPersist(next);
      return next;
    });
  };

  const handleMenuDragEndWrapped = (event: DragEndEvent) => {
    setActiveDrag(null);
    handleMenuDragEnd(event);
  };

  useEffect(() => {
    if (!editingItem) return;
    const exists = categories.some((c) => c.items.some((i) => i.id === editingItem));
    if (!exists) setEditingItem(null);
  }, [categories, editingItem]);

  useEffect(() => {
    if (!addingItemCategoryId) return;
    if (!categories.some((c) => c.id === addingItemCategoryId)) setAddingItemCategoryId(null);
  }, [categories, addingItemCategoryId]);

  const openEditItem = useCallback((itemId: string) => {
    setAddingItemCategoryId(null);
    setEditingItem(itemId);
  }, []);

  const openAddItem = useCallback((categoryId: string) => {
    setEditingItem(null);
    setAddingItemCategoryId(categoryId);
  }, []);

  const dragLocked = editingItem !== null || addingItemCategoryId !== null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading menu…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {persistingMenu ? (
        <p className="text-xs text-ink-muted inline-flex items-center gap-2">
          <Spinner className="h-3 w-3 border-primary border-t-transparent" />
          Saving order…
        </p>
      ) : null}

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Add category</h2>
        <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g. Starters, Mains, Drinks"
            className="flex-1 rounded-xl border-2 border-black/10 px-4 py-2.5 text-ink placeholder:text-ink-muted/70 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={addingCategory || !newCategoryName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {addingCategory ? (
              <>
                <Spinner className="h-4 w-4 border-white border-t-transparent" />
                Adding…
              </>
            ) : (
              "Add category"
            )}
          </button>
        </form>
      </div>

      <div className="space-y-5">
        {categories.length === 0 && (
          <p className="text-ink-muted py-4">No categories yet. Add one above to get started.</p>
        )}
        {categories.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={menuManagerCollisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleMenuDragEndWrapped}
            onDragCancel={handleDragCancel}
          >
            <SortableContext items={categorySortIds} strategy={verticalListSortingStrategy}>
              {categories.map((cat) => (
                <SortableMenuCategoryBlock
                  key={cat.id}
                  cat={cat}
                  editingItem={editingItem}
                  dragLocked={dragLocked}
                  togglingItemId={togglingItemId}
                  togglingCategoryId={togglingCategoryId}
                  deletingItemId={deletingItemId}
                  deletingCategoryId={deletingCategoryId}
                  onOpenAddItem={openAddItem}
                  onOpenEditItem={openEditItem}
                  compactForCategoryReorder={activeDrag?.kind === "category"}
                  emphasizeItemDropTarget={activeDrag?.kind === "item"}
                  handleDeleteCategory={handleDeleteCategory}
                  handleToggleAvailability={handleToggleAvailability}
                  handleToggleCategoryAvailability={handleToggleCategoryAvailability}
                  handleUpdateItem={handleUpdateItem}
                  handleDeleteItem={handleDeleteItem}
                />
              ))}
            </SortableContext>
            <DragOverlay dropAnimation={MENU_DRAG_DROP_ANIMATION}>
              {dragOverlayItem ? (
                <div className="pointer-events-none flex w-[min(92vw,560px)] items-center gap-2">
                  <div
                    className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface"
                    aria-hidden
                  >
                    <MenuGrip />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm">
                    {(() => {
                      const dthumb = normalizePublicMediaUrl(dragOverlayItem.item.imageUrl);
                      return dthumb ? (
                        <img
                          src={dthumb}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface text-lg text-ink-muted/40 ring-1 ring-border">
                          ◇
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{dragOverlayItem.item.name}</p>
                      <p className="text-xs text-ink-muted">In {dragOverlayItem.categoryName}</p>
                    </div>
                    <span className="ml-auto text-lg font-bold tabular-nums text-primary">
                      {formatPrice(dragOverlayItem.item.price)}
                    </span>
                  </div>
                </div>
              ) : dragOverlayCategory ? (
                <div className="pointer-events-none flex w-[min(92vw,560px)] items-center gap-2">
                  <div
                    className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface"
                    aria-hidden
                  >
                    <MenuGrip />
                  </div>
                  <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm">
                    <h2 className="text-lg font-bold text-ink">{dragOverlayCategory.name}</h2>
                    <p className="mt-1 text-xs text-ink-muted">Category · drag to reorder</p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : null}
      </div>

      {editingItem ? (
        <MenuItemEditModal
          categories={categories}
          itemId={editingItem}
          stations={stations}
          inputClass={inputClass}
          numberFieldClass={numberFieldClass}
          labelClass={labelClass}
          onClose={() => setEditingItem(null)}
          onSave={handleUpdateItem}
        />
      ) : null}

      {addingItemCategoryId ? (
        <MenuItemAddModal
          categories={categories}
          categoryId={addingItemCategoryId}
          stations={stations}
          inputClass={inputClass}
          numberFieldClass={numberFieldClass}
          labelClass={labelClass}
          onClose={() => setAddingItemCategoryId(null)}
          onAdd={handleAddItem}
        />
      ) : null}
    </div>
  );
}

function MenuItemAddModal({
  categories,
  categoryId,
  stations,
  inputClass,
  numberFieldClass,
  labelClass,
  onClose,
  onAdd,
}: {
  categories: Category[];
  categoryId: string;
  stations: Station[];
  inputClass: string;
  numberFieldClass: string;
  labelClass: string;
  onClose: () => void;
  onAdd: (
    categoryId: string,
    name: string,
    priceCents: number,
    description: string,
    imageUrl: string,
    optionGroups: OptionGroup[],
    quickPrep: boolean,
    stationId?: string | null
  ) => Promise<void>;
}) {
  const categoryName = useMemo(() => categories.find((c) => c.id === categoryId)?.name ?? null, [categories, categoryId]);

  useEffect(() => {
    if (categoryName == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [categoryName]);

  useEffect(() => {
    if (categoryName == null) return;
    function onKeyClose(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyClose);
    return () => window.removeEventListener("keydown", onKeyClose);
  }, [onClose, categoryName]);

  if (categoryName == null) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-add-title"
        className="flex min-h-0 max-h-[min(100dvh,900px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-2xl sm:max-h-[min(92vh,880px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="menu-item-add-title" className="text-lg font-bold leading-tight text-ink sm:text-xl">
                New item
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Draft
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-ink-muted sm:text-sm">
              Adding to <span className="font-semibold text-ink">{categoryName}</span>
              <span className="text-ink-muted"> · appears on the guest menu after you save.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition hover:bg-ink/5 hover:text-ink"
            aria-label="Close"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 sm:px-5 sm:pb-4 sm:pt-3">
          <ItemAddForm
            key={categoryId}
            formVariant="modal"
            categoryName={categoryName}
            stations={stations}
            inputClass={inputClass}
            numberFieldClass={numberFieldClass}
            labelClass={labelClass}
            onAdd={(name, price, desc, imageUrl, optionGroups, quickPrep, sid) =>
              onAdd(categoryId, name, price, desc, imageUrl, optionGroups, quickPrep, sid)
            }
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function MenuItemEditModal({
  categories,
  itemId,
  stations,
  inputClass,
  numberFieldClass,
  labelClass,
  onClose,
  onSave,
}: {
  categories: Category[];
  itemId: string;
  stations: Station[];
  inputClass: string;
  numberFieldClass: string;
  labelClass: string;
  onClose: () => void;
  onSave: (
    id: string,
    u: {
      name?: string;
      description?: string;
      price?: number;
      isAvailable?: boolean;
      quickPrep?: boolean;
      imageUrl?: string;
      optionGroups?: OptionGroup[];
      stationId?: string | null;
    }
  ) => Promise<void>;
}) {
  const resolved = useMemo(() => {
    for (const c of categories) {
      const it = c.items.find((i) => i.id === itemId);
      if (it) return { item: it, categoryName: c.name };
    }
    return null;
  }, [categories, itemId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!resolved) return null;

  const previewSrc = normalizePublicMediaUrl(resolved.item.imageUrl);
  const preview = previewSrc ? (
    <img
      src={previewSrc}
      alt=""
      className="h-12 w-12 shrink-0 rounded-xl object-cover ring-2 ring-border shadow-sm"
    />
  ) : null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-edit-title"
        className="flex min-h-0 max-h-[min(100dvh,900px)] w-full max-w-lg flex-col rounded-t-2xl border border-border bg-card shadow-2xl sm:max-h-[min(92vh,880px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 flex-1 gap-3">
            {preview}
            <div className="min-w-0">
              <h2 id="menu-item-edit-title" className="text-lg font-bold leading-tight text-ink sm:text-xl">
                Edit item
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-ink-muted sm:text-sm">
                In <span className="font-semibold text-ink">{resolved.categoryName}</span>
                <span className="text-ink-muted"> · saved changes appear on the guest menu.</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-muted transition hover:bg-ink/5 hover:text-ink"
            aria-label="Close"
          >
            <span className="text-2xl leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[env(safe-area-inset-bottom,0px)] pt-2 sm:px-5 sm:pb-4 sm:pt-3">
          <ItemEditForm
            key={resolved.item.id}
            item={resolved.item}
            formVariant="modal"
            stations={stations}
            inputClass={inputClass}
            numberFieldClass={numberFieldClass}
            labelClass={labelClass}
            onSave={(u) => onSave(resolved.item.id, u)}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

function ItemAddForm({
  categoryName,
  formVariant = "inline",
  inputClass: ic,
  numberFieldClass: nf,
  labelClass: lc,
  stations = [],
  onAdd,
  onCancel,
}: {
  categoryName: string;
  formVariant?: "inline" | "modal";
  inputClass: string;
  numberFieldClass: string;
  labelClass: string;
  stations?: Station[];
  onAdd: (
    name: string,
    price: number,
    description: string,
    imageUrl: string,
    optionGroups: OptionGroup[],
    quickPrep: boolean,
    stationId?: string | null
  ) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [quickPrep, setQuickPrep] = useState(false);
  const [stationId, setStationId] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.set("image", file);
      const res = await fetch("/api/dashboard/items/image", {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let data: { error?: string; imageUrl?: string } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {}
      if (!res.ok) {
        toast.error(data.error ?? "Image upload failed");
        return;
      }
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success("Photo uploaded");
      }
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(price) * 100);
    if (!name.trim() || isNaN(cents) || cents < 0) return;
    setSaving(true);
    try {
      await onAdd(name.trim(), cents, description.trim(), imageUrl.trim(), optionGroups, quickPrep, stationId || null);
      setName("");
      setPrice("");
      setDescription("");
      setImageUrl("");
      setOptionGroups([]);
      setQuickPrep(false);
      setStationId("");
    } catch {
      /* parent shows toast */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        formVariant === "modal"
          ? "w-full space-y-5"
          : "mt-4 space-y-5 rounded-2xl border-2 border-primary/20 bg-gradient-to-b from-primary/[0.06] to-card p-5 shadow-md ring-1 ring-primary/10"
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />
      {formVariant === "inline" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-ink">New item</h3>
            <p className="text-xs text-ink-muted">Adding to · {categoryName}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            Draft
          </span>
        </div>
      ) : null}

      <div>
        <label className={lc}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Margherita, Sun bed — full day"
          className={ic}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={lc}>Price (EUR)</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
              €
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className={`${nf} pl-8`}
              required
            />
          </div>
        </div>
        <div className="sm:col-span-1">
          <label className={lc}>Short description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — shown on the guest menu"
            rows={2}
            className={`${ic} min-h-[5.5rem] resize-y`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <label className={lc}>Photo</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/35 bg-card px-4 py-6 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50 sm:w-36"
          >
            {uploadingImage ? (
              <>
                <Spinner className="h-4 w-4 border-primary border-t-transparent" />
                Uploading…
              </>
            ) : (
              "Upload file"
            )}
          </button>
          <div className="min-w-0 flex-1 space-y-2">
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Or paste image URL"
              className={ic}
            />
            <p className="text-xs text-ink-muted">JPEG, PNG, GIF or WebP · optional</p>
          </div>
        </div>
      </div>

      <div>
        <OptionGroupsEditor value={optionGroups} onChange={setOptionGroups} />
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition hover:border-primary/30">
        <input
          type="checkbox"
          checked={quickPrep}
          onChange={(e) => setQuickPrep(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />
        <div>
          <span className="text-sm font-semibold text-ink">Quick to serve (e.g. water, soft drink)</span>
          <p className="text-xs text-ink-muted">
            Guests won&apos;t see the long kitchen timer on the order status page for orders that are only these items.
          </p>
        </div>
      </label>

      {stations.length > 0 && (
        <div>
          <label className={lc}>Preparation station</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className={ic}
          >
            <option value="">Default (Kitchen)</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-ink-muted mt-1">Route this item to a specific station when ordered.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-ink-muted shadow-sm transition hover:bg-surface disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || uploadingImage}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? (
            <>
              <Spinner className="h-4 w-4 border-white border-t-transparent" />
              Saving…
            </>
          ) : (
            "Add to menu"
          )}
        </button>
      </div>
    </form>
  );
}

function ItemEditForm({
  item,
  formVariant = "inline",
  inputClass: ic,
  numberFieldClass: nf,
  labelClass: lc,
  stations = [],
  onSave,
  onCancel,
}: {
  item: MenuItem;
  formVariant?: "inline" | "modal";
  inputClass: string;
  numberFieldClass: string;
  labelClass: string;
  stations?: Station[];
  onSave: (u: {
    name?: string;
    description?: string;
    price?: number;
    isAvailable?: boolean;
    quickPrep?: boolean;
    imageUrl?: string;
    optionGroups?: OptionGroup[];
    stationId?: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [price, setPrice] = useState((item.price / 100).toFixed(2));
  const [isAvailable, setIsAvailable] = useState(item.isAvailable);
  const [quickPrep, setQuickPrep] = useState(item.quickPrep === true);
  const [imageUrl, setImageUrl] = useState(item.imageUrl ?? "");
  const [stationId, setStationId] = useState(item.stationId ?? "");
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>(() =>
    parseOptionGroups(item.optionGroups)
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.set("image", file);
      const res = await fetch("/api/dashboard/items/image", {
        method: "POST",
        body: formData,
      });
      const text = await res.text();
      let data: { error?: string; imageUrl?: string } = {};
      try {
        if (text) data = JSON.parse(text);
      } catch {}
      if (!res.ok) {
        toast.error(data.error ?? "Image upload failed");
        return;
      }
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast.success("Photo updated");
      }
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(price) * 100);
    if (isNaN(cents) || cents < 0) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || "",
        price: cents,
        isAvailable,
        quickPrep,
        imageUrl: imageUrl.trim(),
        optionGroups,
        stationId: stationId || null,
      });
    } catch {
      /* parent shows toast */
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleImageUpload}
        className="hidden"
      />
      {formVariant === "inline" ? (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <h3 className="text-base font-bold text-ink">Edit item</h3>
            <p className="text-xs text-ink-muted">Changes apply on the guest menu after you save.</p>
          </div>
          {(() => {
            const photo = normalizePublicMediaUrl(imageUrl);
            return photo ? (
              <img
                src={photo}
                alt=""
                className="h-16 w-16 rounded-xl object-cover ring-2 ring-border shadow-sm"
              />
            ) : null;
          })()}
        </div>
      ) : null}

      <div>
        <label className={lc}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          className={ic}
          required
        />
      </div>

      <div className="max-w-xs">
        <label className={lc}>Price (EUR)</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-muted">
            €
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={`${nf} pl-8`}
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition hover:border-primary/30">
        <input
          type="checkbox"
          checked={isAvailable}
          onChange={(e) => setIsAvailable(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />
        <div>
          <span className="text-sm font-semibold text-ink">Visible on guest menu</span>
          <p className="text-xs text-ink-muted">Turn off to hide without deleting.</p>
        </div>
      </label>

      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm transition hover:border-primary/30">
        <input
          type="checkbox"
          checked={quickPrep}
          onChange={(e) => setQuickPrep(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
        />
        <div>
          <span className="text-sm font-semibold text-ink">Quick to serve (e.g. water, soft drink)</span>
          <p className="text-xs text-ink-muted">
            For orders that are only quick items, guests see a short message instead of the kitchen time estimate.
          </p>
        </div>
      </label>

      {stations.length > 0 && (
        <div>
          <label className={lc}>Preparation station</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className={ic}
          >
            <option value="">Default (Kitchen)</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <p className="text-xs text-ink-muted mt-1">Route this item to a specific station when ordered.</p>
        </div>
      )}

      <div>
        <label className={lc}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
          rows={2}
          className={`${ic} min-h-[5rem] resize-y`}
        />
      </div>

      <div className="rounded-xl border border-border bg-surface/40 p-4">
        <label className={lc}>Photo</label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="flex shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/35 bg-card px-4 py-6 text-sm font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50 sm:w-36"
          >
            {uploadingImage ? (
              <>
                <Spinner className="h-4 w-4 border-primary border-t-transparent" />
                Uploading…
              </>
            ) : (
              "Replace image"
            )}
          </button>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL"
            className={`${ic} flex-1`}
          />
        </div>
      </div>

      <div>
        <OptionGroupsEditor value={optionGroups} onChange={setOptionGroups} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/80 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-semibold text-ink-muted shadow-sm transition hover:bg-surface disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || uploadingImage}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? (
            <>
              <Spinner className="h-4 w-4 border-white border-t-transparent" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}
