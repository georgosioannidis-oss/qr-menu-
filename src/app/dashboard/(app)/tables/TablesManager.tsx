"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

type TableRow = {
  id: string;
  name: string;
  token: string;
  tableSectionId: string | null;
  sortOrder?: number;
};

type TableSectionRow = {
  id: string;
  name: string;
  sortOrder: number;
  tables: TableRow[];
};

const SEC_PREFIX = "sec-";
const TBL_PREFIX = "tbl-";
const DROP_PREFIX = "drop-";

/** Sections use a large sortable rect (whole card). Without this, dragging a table upward often collides with `sec-*` and the table jumps to the section bottom. Prefer table / drop targets while dragging tables. */
const tablesManagerCollisionDetection: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  if (activeId.startsWith(TBL_PREFIX)) {
    const tableTargets = args.droppableContainers.filter((c) => {
      const id = String(c.id);
      return id.startsWith(TBL_PREFIX) || id.startsWith(DROP_PREFIX);
    });
    if (tableTargets.length > 0) {
      const hits = closestCorners({ ...args, droppableContainers: tableTargets });
      if (hits.length > 0) return hits;
    }
  }
  if (activeId.startsWith(SEC_PREFIX)) {
    const sectionTargets = args.droppableContainers.filter((c) => String(c.id).startsWith(SEC_PREFIX));
    if (sectionTargets.length > 0) {
      const hits = closestCorners({ ...args, droppableContainers: sectionTargets });
      if (hits.length > 0) return hits;
    }
  }
  return closestCorners(args);
};

const TABLE_DRAG_DROP_ANIMATION = {
  duration: 200,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.28" } },
  }),
};

function GripIcon() {
  return (
    <span className="inline-flex flex-col gap-0.5 text-ink-muted/60 select-none" aria-hidden>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
      <span className="flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-current" />
        <span className="h-1 w-1 rounded-full bg-current" />
      </span>
    </span>
  );
}

function TableCardContent({
  table,
  appUrl,
  deletingId,
  onDelete,
  onRefresh,
  isDragging,
}: {
  table: TableRow;
  appUrl: string;
  deletingId: string | null;
  onDelete: (id: string, name: string) => void;
  onRefresh: () => Promise<void>;
  isDragging: boolean;
}) {
  const menuUrl = `${appUrl}/m/${table.token}`;
  const [nameEdit, setNameEdit] = useState(false);
  const [nameDraft, setNameDraft] = useState(table.name);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    setNameDraft(table.name);
  }, [table.id, table.name]);

  const saveTableName = async () => {
    const next = nameDraft.trim();
    if (!next) {
      toast.error("Name cannot be empty");
      return;
    }
    if (next === table.name) {
      setNameEdit(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch(`/api/dashboard/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      setNameEdit(false);
      await onRefresh();
      toast.success("Table renamed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      setNameDraft(table.name);
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm sm:flex-row sm:items-stretch ${isDragging ? "opacity-60 ring-2 ring-primary/30" : ""}`}
    >
      <div className="min-w-0 flex-1 space-y-2">
        {nameEdit ? (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap"
            onSubmit={(e) => {
              e.preventDefault();
              void saveTableName();
            }}
          >
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              disabled={savingName}
              className="min-w-0 flex-1 rounded-xl border-2 border-black/10 px-3 py-2 text-sm font-semibold text-ink focus:border-primary focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNameDraft(table.name);
                  setNameEdit(false);
                }
              }}
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={savingName || !nameDraft.trim()} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {savingName ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
                Save
              </button>
              <button type="button" disabled={savingName} onClick={() => { setNameDraft(table.name); setNameEdit(false); }} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-ink">{table.name}</p>
            <button type="button" onClick={() => setNameEdit(true)} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:border-primary/40">
              Rename
            </button>
          </div>
        )}
        <p className="text-xs text-ink-muted">Drag the handle to reorder or drop onto another section.</p>
        <a href={menuUrl} target="_blank" rel="noopener noreferrer" className="inline-block break-all text-sm text-primary hover:underline">
          {menuUrl}
        </a>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-3 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4 sm:items-center">
        <a href={`/api/dashboard/tables/${table.id}/qr`} download className="inline-flex items-center justify-center rounded-xl bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20">
          Download QR
        </a>
        <button
          type="button"
          disabled={deletingId === table.id || nameEdit}
          onClick={() => onDelete(table.id, table.name)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          {deletingId === table.id ? <Spinner className="h-4 w-4 border-red-600 border-t-transparent" /> : null}
          {deletingId === table.id ? "Removing…" : "Delete table"}
        </button>
      </div>
    </div>
  );
}

function SortableTableRow({
  table,
  appUrl,
  deletingId,
  onDelete,
  onRefresh,
}: {
  table: TableRow;
  appUrl: string;
  deletingId: string | null;
  onDelete: (id: string, name: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${TBL_PREFIX}${table.id}`,
    data: { kind: "table", tableId: table.id },
    animateLayoutChanges: () => false,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex gap-2 items-center">
      <button
        type="button"
        className="flex h-10 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-border bg-surface touch-none active:cursor-grabbing"
        aria-label="Drag to reorder or move table"
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <div className="min-w-0 flex-1">
        <TableCardContent
          table={table}
          appUrl={appUrl}
          deletingId={deletingId}
          onDelete={onDelete}
          onRefresh={onRefresh}
          isDragging={isDragging}
        />
      </div>
    </li>
  );
}

function SectionDropZone({
  sectionId,
  emphasize,
  children,
}: {
  sectionId: string;
  /** Stronger highlight while dragging a table between sections */
  emphasize?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${DROP_PREFIX}${sectionId}` });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-8 rounded-xl transition-colors ${
        isOver
          ? emphasize
            ? "bg-primary/12 ring-2 ring-primary/60"
            : "bg-primary/10 ring-2 ring-dashed ring-primary/40"
          : ""
      }`}
    >
      {children}
    </div>
  );
}

function SortableSectionBlock({
  section,
  appUrl,
  deletingId,
  onDelete,
  onRefresh,
  onDeleteSectionClick,
  onRenameSection,
  renamingSectionId,
  sectionRenameDraft,
  setSectionRenameDraft,
  sectionRenameSaving,
  saveSectionRename,
  setRenamingSectionId,
  deletingSectionId,
  addingTableSectionId,
  setAddingTableSectionId,
  addingTable,
  onAddTable,
  compactForSectionReorder,
  emphasizeTableDropTarget,
}: {
  section: TableSectionRow;
  appUrl: string;
  deletingId: string | null;
  onDelete: (id: string, name: string) => void;
  onRefresh: () => Promise<void>;
  onDeleteSectionClick: () => void;
  onRenameSection: () => void;
  renamingSectionId: string | null;
  sectionRenameDraft: string;
  setSectionRenameDraft: (s: string) => void;
  sectionRenameSaving: boolean;
  saveSectionRename: (sectionId: string) => void;
  setRenamingSectionId: (id: string | null) => void;
  deletingSectionId: string | null;
  addingTableSectionId: string | null;
  setAddingTableSectionId: (id: string | null) => void;
  addingTable: boolean;
  onAddTable: (name: string, sectionId: string) => void;
  /** While reordering sections, hide tables; each section shows as a table-sized summary card */
  compactForSectionReorder: boolean;
  /** Brighter drop targets while dragging a table to another section */
  emphasizeTableDropTarget: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: `${SEC_PREFIX}${section.id}`,
    data: { kind: "section", sectionId: section.id },
    animateLayoutChanges: () => false,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const tableIds = section.tables.map((t) => `${TBL_PREFIX}${t.id}`);

  if (compactForSectionReorder) {
    return (
      <div
        ref={setNodeRef}
        style={{
          ...style,
          opacity: isDragging ? 0 : undefined,
        }}
        className="flex items-center gap-2"
      >
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex h-10 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-border bg-surface touch-none active:cursor-grabbing"
          aria-label="Drag to reorder section"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm sm:flex-row sm:items-stretch ${
            isDragging ? "opacity-60 ring-2 ring-primary/30" : ""
          }`}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg font-bold text-ink">{section.name}</h2>
            <p className="text-xs text-ink-muted">Drag to reorder sections. Table list hidden until you release.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0 : undefined,
      }}
      className={`rounded-2xl border border-border bg-card p-5 shadow-sm ${isDragging ? "ring-2 ring-primary/25" : ""}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:items-start">
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-border bg-surface touch-none active:cursor-grabbing sm:mt-0.5"
            aria-label="Drag to reorder section"
            {...attributes}
            {...listeners}
          >
            <GripIcon />
          </button>
          <div className="min-w-0 flex-1">
            {renamingSectionId === section.id ? (
              <form
                className="flex flex-col gap-2 sm:flex-row sm:items-center"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSectionRename(section.id);
                }}
              >
                <input
                  value={sectionRenameDraft}
                  onChange={(e) => setSectionRenameDraft(e.target.value)}
                  disabled={sectionRenameSaving}
                  className="w-full rounded-xl border-2 border-black/10 px-3 py-2 text-lg font-bold focus:border-primary focus:outline-none sm:max-w-md"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && !sectionRenameSaving) setRenamingSectionId(null);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" disabled={sectionRenameSaving || !sectionRenameDraft.trim()} className="rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {sectionRenameSaving ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
                    Save
                  </button>
                  <button type="button" disabled={sectionRenameSaving} onClick={() => setRenamingSectionId(null)} className="rounded-xl border border-border px-3 py-2 text-sm font-semibold">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <h2 className="text-lg font-bold text-ink">{section.name}</h2>
            )}
          </div>
        </div>
        {renamingSectionId !== section.id ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={deletingSectionId === section.id} onClick={onRenameSection} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold shadow-sm hover:border-primary/40">
              Rename section
            </button>
            <button type="button" disabled={deletingSectionId === section.id} onClick={onDeleteSectionClick} className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
              Delete section
            </button>
          </div>
        ) : null}
      </div>

      <SectionDropZone sectionId={section.id} emphasize={emphasizeTableDropTarget}>
        {section.tables.length === 0 ? (
          <p className="text-sm text-ink-muted py-3">Drop tables here or add below.</p>
        ) : (
          <SortableContext items={tableIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3">
              {section.tables.map((t) => (
                <SortableTableRow key={t.id} table={t} appUrl={appUrl} deletingId={deletingId} onDelete={onDelete} onRefresh={onRefresh} />
              ))}
            </ul>
          </SortableContext>
        )}
      </SectionDropZone>

      {addingTableSectionId === section.id ? (
        <AddTableInline
          sectionLabel={section.name}
          submitting={addingTable}
          onSubmit={(name) => onAddTable(name, section.id)}
          onCancel={() => setAddingTableSectionId(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAddingTableSectionId(section.id)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/[0.04] py-3.5 text-sm font-semibold text-primary transition hover:border-primary/55 hover:bg-primary/10"
        >
          <span className="text-lg leading-none">+</span>
          Add table to {section.name}
        </button>
      )}
    </div>
  );
}

function DeleteSectionWarningModal({
  sectionName,
  tableCount,
  busy,
  otherSections,
  onClose,
  onConfirm,
}: {
  sectionName: string;
  tableCount: number;
  otherSections: { id: string; name: string }[];
  busy: boolean;
  onClose: () => void;
  onConfirm: (reassignToSectionId: string | null) => void | Promise<void>;
}) {
  const [targetId, setTargetId] = useState(otherSections[0]?.id ?? "");

  useEffect(() => {
    setTargetId(otherSections[0]?.id ?? "");
  }, [otherSections]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const tablePhrase =
    tableCount === 0
      ? "There are no tables in this section."
      : tableCount === 1
        ? "1 table must move to another section before this one can be removed."
        : `${tableCount} tables must move to another section before this one can be removed.`;

  const canDelete = tableCount === 0 || (otherSections.length > 0 && Boolean(targetId));

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onClick={() => !busy && onClose()}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-section-title"
        className="w-full max-w-md rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-section-title" className="text-lg font-bold text-ink">
          Delete this section?
        </h2>
        <div className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">{`You are about to remove "${sectionName}".`}</p>
          <p className="mt-2 text-amber-950/90">{tablePhrase} Guest QR links are not deleted.</p>
        </div>
        {tableCount > 0 && otherSections.length > 0 ? (
          <div className="mt-4">
            <label htmlFor="reassign-section" className="block text-xs font-semibold text-ink-muted mb-1">
              Move tables to
            </label>
            <select
              id="reassign-section"
              value={targetId}
              disabled={busy}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full rounded-xl border-2 border-black/10 bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none"
            >
              {otherSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {tableCount > 0 && otherSections.length === 0 ? (
          <p className="mt-3 text-sm text-red-700">Add another section first, then you can move tables and delete this one.</p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-ink/5 disabled:opacity-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !canDelete}
            onClick={() => void onConfirm(tableCount > 0 ? targetId : null)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
            {busy ? "Deleting…" : "Delete section"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTableInline({
  sectionLabel,
  submitting,
  onSubmit,
  onCancel,
}: {
  sectionLabel: string;
  submitting: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    onSubmit(name.trim());
    setName("");
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/[0.04] p-4">
      <p className="text-sm font-semibold text-ink">New table · {sectionLabel}</p>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Sun bed 12, Table 5"
        className="w-full rounded-xl border-2 border-black/10 px-4 py-2.5 focus:border-primary focus:outline-none"
        autoFocus
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={submitting || !name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {submitting ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
          {submitting ? "Adding…" : "Add table"}
        </button>
        <button type="button" disabled={submitting} onClick={onCancel} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function TablesManager() {
  const [sections, setSections] = useState<TableSectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [deleteSectionPrompt, setDeleteSectionPrompt] = useState<{ id: string; name: string; tableCount: number } | null>(null);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [addingTableSectionId, setAddingTableSectionId] = useState<string | null>(null);
  const [addingTable, setAddingTable] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [sectionRenameDraft, setSectionRenameDraft] = useState("");
  const [sectionRenameSaving, setSectionRenameSaving] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const tableLayoutPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTableLayoutRef = useRef<TableSectionRow[] | null>(null);
  const sectionOrderPersistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSectionOrderRef = useRef<TableSectionRow[] | null>(null);
  const [activeDrag, setActiveDrag] = useState<
    null | { kind: "section"; sectionId: string } | { kind: "table"; tableId: string }
  >(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sectionSortIds = useMemo(() => sections.map((s) => `${SEC_PREFIX}${s.id}`), [sections]);

  const dragOverlayTable = useMemo(() => {
    if (!activeDrag || activeDrag.kind !== "table") return null;
    for (const s of sections) {
      const t = s.tables.find((row) => row.id === activeDrag.tableId);
      if (t) return { table: t, sectionName: s.name };
    }
    return null;
  }, [sections, activeDrag]);

  const dragOverlaySection = useMemo(() => {
    if (!activeDrag || activeDrag.kind !== "section") return null;
    return sections.find((s) => s.id === activeDrag.sectionId) ?? null;
  }, [sections, activeDrag]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith(TBL_PREFIX)) {
      setActiveDrag({ kind: "table", tableId: id.slice(TBL_PREFIX.length) });
    } else if (id.startsWith(SEC_PREFIX)) {
      setActiveDrag({ kind: "section", sectionId: id.slice(SEC_PREFIX.length) });
    }
  };

  const handleDragCancel = () => setActiveDrag(null);

  const fetchLayout = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch("/api/dashboard/table-sections", { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 401) throw new Error("Session expired. Please log in again.");
      const text = await res.text();
      if (!res.ok) {
        let msg = `Failed to load tables (HTTP ${res.status})`;
        try {
          if (text) {
            const d = JSON.parse(text) as { error?: string };
            if (typeof d.error === "string") msg = d.error;
          }
        } catch {
          if (text && text.length < 400) msg = `${msg}. ${text.trim()}`;
        }
        throw new Error(msg);
      }
      const parsed = text ? JSON.parse(text) : {};
      const rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];

      const normTable = (row: Record<string, unknown>): TableRow => ({
        id: String(row.id),
        name: String(row.name),
        token: String(row.token),
        tableSectionId:
          row.tableSectionId === null || row.tableSectionId === undefined ? null : String(row.tableSectionId),
        sortOrder: typeof row.sortOrder === "number" ? row.sortOrder : 0,
      });

      setSections(
        rawSections.map((s: Record<string, unknown>) => ({
          id: String(s.id),
          name: String(s.name),
          sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : 0,
          tables: Array.isArray(s.tables) ? s.tables.map((t) => normTable(t as Record<string, unknown>)) : [],
        }))
      );
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out. Is the server running? Run: npm run dev");
      } else if (e instanceof Error && e.message.includes("Session expired")) {
        setError(e.message + " Go to the login page and sign in again.");
      } else if (
        e instanceof Error &&
        (/Failed to fetch|NetworkError|Network request failed|load failed/i.test(e.message) ||
          /^TypeError:\s*Failed to fetch$/i.test(e.message))
      ) {
        setError(
          e.message +
            " The dev server may be stopped. From your project folder run: npm run dev"
        );
      } else {
        setError(e instanceof Error ? e.message : "Error");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLayout();
  }, [fetchLayout]);

  useEffect(() => {
    return () => {
      if (tableLayoutPersistTimerRef.current) clearTimeout(tableLayoutPersistTimerRef.current);
      if (sectionOrderPersistTimerRef.current) clearTimeout(sectionOrderPersistTimerRef.current);
    };
  }, []);

  const flushSectionOrderPersist = useCallback(async () => {
    const ordered = pendingSectionOrderRef.current;
    pendingSectionOrderRef.current = null;
    if (!ordered) return;
    setPersisting(true);
    try {
      const res = await fetch("/api/dashboard/table-sections/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedSectionIds: ordered.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error("Failed to save section order");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      await fetchLayout();
    } finally {
      setPersisting(false);
    }
  }, [fetchLayout]);

  const scheduleSectionOrderPersist = useCallback(
    (ordered: TableSectionRow[]) => {
      pendingSectionOrderRef.current = ordered;
      if (sectionOrderPersistTimerRef.current) clearTimeout(sectionOrderPersistTimerRef.current);
      sectionOrderPersistTimerRef.current = setTimeout(() => {
        sectionOrderPersistTimerRef.current = null;
        void flushSectionOrderPersist();
      }, 450);
    },
    [flushSectionOrderPersist]
  );

  const flushTableLayoutPersist = useCallback(async () => {
    const nextSections = pendingTableLayoutRef.current;
    pendingTableLayoutRef.current = null;
    if (!nextSections) return;
    setPersisting(true);
    try {
      const res = await fetch("/api/dashboard/tables/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          layout: nextSections.map((s) => ({ sectionId: s.id, tableIds: s.tables.map((t) => t.id) })),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = "Failed to save table order";
        try {
          if (t) {
            const d = JSON.parse(t) as { error?: string };
            if (typeof d.error === "string") msg = d.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
      await fetchLayout();
    } finally {
      setPersisting(false);
    }
  }, [fetchLayout]);

  const scheduleTableLayoutPersist = useCallback(
    (nextSections: TableSectionRow[]) => {
      pendingTableLayoutRef.current = nextSections;
      if (tableLayoutPersistTimerRef.current) clearTimeout(tableLayoutPersistTimerRef.current);
      tableLayoutPersistTimerRef.current = setTimeout(() => {
        tableLayoutPersistTimerRef.current = null;
        void flushTableLayoutPersist();
      }, 450);
    },
    [flushTableLayoutPersist]
  );

  function findSectionIdForTable(sectionsArg: TableSectionRow[], tableId: string): string | null {
    for (const s of sectionsArg) {
      if (s.tables.some((t) => t.id === tableId)) return s.id;
    }
    return null;
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const aid = active.id.toString();
    const oid = over.id.toString();

    if (aid.startsWith(SEC_PREFIX)) {
      if (!oid.startsWith(SEC_PREFIX)) return;
      const a = aid.slice(SEC_PREFIX.length);
      const b = oid.slice(SEC_PREFIX.length);
      setSections((prev) => {
        const oldI = prev.findIndex((s) => s.id === a);
        const newI = prev.findIndex((s) => s.id === b);
        if (oldI === -1 || newI === -1 || oldI === newI) return prev;
        const next = arrayMove(prev, oldI, newI);
        scheduleSectionOrderPersist(next);
        return next;
      });
      return;
    }

    if (!aid.startsWith(TBL_PREFIX)) return;
    const tableId = aid.slice(TBL_PREFIX.length);
    setSections((prev) => {
      const fromSid = findSectionIdForTable(prev, tableId);
      if (!fromSid) return prev;

      let toSid: string | null = null;
      let overTableId: string | null = null;

      if (oid.startsWith(DROP_PREFIX)) {
        toSid = oid.slice(DROP_PREFIX.length);
      } else if (oid.startsWith(TBL_PREFIX)) {
        overTableId = oid.slice(TBL_PREFIX.length);
        toSid = findSectionIdForTable(prev, overTableId);
      } else if (oid.startsWith(SEC_PREFIX)) {
        toSid = oid.slice(SEC_PREFIX.length);
      }

      if (!toSid) return prev;

      // Same-section reorder: use arrayMove on indices (remove-then-splice breaks dragging downward).
      if (fromSid === toSid && overTableId && overTableId !== tableId) {
        const next = prev.map((s) => ({ ...s, tables: [...s.tables] }));
        const sec = next.find((s) => s.id === fromSid)!;
        const oldIndex = sec.tables.findIndex((t) => t.id === tableId);
        const newIndex = sec.tables.findIndex((t) => t.id === overTableId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        sec.tables = arrayMove(sec.tables, oldIndex, newIndex);
        scheduleTableLayoutPersist(next);
        return next;
      }

      const next = prev.map((s) => ({ ...s, tables: [...s.tables] }));
      const fromSec = next.find((s) => s.id === fromSid)!;
      const tidx = fromSec.tables.findIndex((t) => t.id === tableId);
      if (tidx === -1) return prev;
      const [moved] = fromSec.tables.splice(tidx, 1);

      const toSec = next.find((s) => s.id === toSid)!;
      if (overTableId) {
        const oi = toSec.tables.findIndex((t) => t.id === overTableId);
        if (oi !== -1) toSec.tables.splice(oi, 0, moved);
        else toSec.tables.push(moved);
      } else {
        toSec.tables.push(moved);
      }

      moved.tableSectionId = toSid;
      scheduleTableLayoutPersist(next);
      return next;
    });
  };

  const handleDragEndWrapped = (event: DragEndEvent) => {
    setActiveDrag(null);
    handleDragEnd(event);
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    setAddingSection(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/table-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSectionName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add section");
      setNewSectionName("");
      await fetchLayout();
      toast.success("Section added");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setAddingSection(false);
    }
  };

  const saveSectionRename = async (sectionId: string) => {
    const name = sectionRenameDraft.trim();
    if (!name) {
      toast.error("Section name cannot be empty");
      return;
    }
    const cur = sections.find((s) => s.id === sectionId);
    if (cur && name === cur.name) {
      setRenamingSectionId(null);
      return;
    }
    setSectionRenameSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/table-sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename section");
      setRenamingSectionId(null);
      await fetchLayout();
      toast.success("Section renamed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setSectionRenameSaving(false);
    }
  };

  const executeDeleteSection = async (reassignToSectionId: string | null) => {
    if (!deleteSectionPrompt) return;
    const { id } = deleteSectionPrompt;
    setDeletingSectionId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/table-sections/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reassignToSectionId ? { reassignToSectionId } : {}),
      });
      if (!res.ok) {
        const t = await res.text();
        let msg = "Failed to delete section";
        try {
          if (t) {
            const d = JSON.parse(t) as { error?: string };
            if (typeof d.error === "string") msg = d.error;
          }
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }
      setDeleteSectionPrompt(null);
      setRenamingSectionId((cur) => (cur === id ? null : cur));
      setAddingTableSectionId((cur) => (cur === id ? null : cur));
      await fetchLayout();
      toast.success("Section removed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingSectionId(null);
    }
  };

  const handleAddTable = async (name: string, tableSectionId: string) => {
    setAddingTable(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tableSectionId }),
      });
      if (!res.ok) {
        const t = await res.text();
        let d: { error?: string } = {};
        try {
          if (t) d = JSON.parse(t);
        } catch {}
        throw new Error(d.error ?? "Failed");
      }
      setAddingTableSectionId(null);
      await fetchLayout();
      toast.success("Table added");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setAddingTable(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirmDestructiveAction(
        `Delete table “${name}”?`,
        "The QR code and guest link for this table will stop working."
      )
    )
      return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/dashboard/tables/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete table");
      await fetchLayout();
      toast.success("Table removed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const otherSectionsForModal = deleteSectionPrompt
    ? sections.filter((s) => s.id !== deleteSectionPrompt.id).map((s) => ({ id: s.id, name: s.name }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading tables…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {persisting ? (
        <p className="text-xs text-ink-muted inline-flex items-center gap-2">
          <Spinner className="h-3 w-3 border-primary border-t-transparent" />
          Saving order…
        </p>
      ) : null}

      {error && <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-ink-muted uppercase tracking-wide mb-3">Add section</h2>
        <form onSubmit={handleAddSection} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
            placeholder="e.g. Pool sun beds, Indoor dining"
            className="flex-1 rounded-xl border-2 border-black/10 px-4 py-2.5 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={addingSection || !newSectionName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {addingSection ? <Spinner className="h-4 w-4 border-white border-t-transparent" /> : null}
            {addingSection ? "Adding…" : "Add section"}
          </button>
        </form>
      </div>

      {sections.length === 0 ? (
        <p className="text-ink-muted py-6 text-center rounded-2xl border-2 border-dashed border-black/10">
          No sections yet. Add a section above, then add tables inside it.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={tablesManagerCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndWrapped}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={sectionSortIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-5">
              {sections.map((sec) => (
                <SortableSectionBlock
                  key={sec.id}
                  section={sec}
                  appUrl={appUrl}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                  onRefresh={fetchLayout}
                  onDeleteSectionClick={() =>
                    setDeleteSectionPrompt({ id: sec.id, name: sec.name, tableCount: sec.tables.length })
                  }
                  onRenameSection={() => {
                    setSectionRenameDraft(sec.name);
                    setRenamingSectionId(sec.id);
                  }}
                  renamingSectionId={renamingSectionId}
                  sectionRenameDraft={sectionRenameDraft}
                  setSectionRenameDraft={setSectionRenameDraft}
                  sectionRenameSaving={sectionRenameSaving}
                  saveSectionRename={saveSectionRename}
                  setRenamingSectionId={setRenamingSectionId}
                  deletingSectionId={deletingSectionId}
                  addingTableSectionId={addingTableSectionId}
                  setAddingTableSectionId={setAddingTableSectionId}
                  addingTable={addingTable}
                  onAddTable={(name, sid) => void handleAddTable(name, sid)}
                  compactForSectionReorder={activeDrag?.kind === "section"}
                  emphasizeTableDropTarget={activeDrag?.kind === "table"}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={TABLE_DRAG_DROP_ANIMATION}>
            {dragOverlayTable ? (
              <div className="pointer-events-none flex w-[min(92vw,560px)] items-center gap-2">
                <div
                  className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface"
                  aria-hidden
                >
                  <GripIcon />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm sm:flex-row sm:items-stretch">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-bold text-ink">{dragOverlayTable.table.name}</p>
                    <p className="text-xs text-ink-muted">From {dragOverlayTable.sectionName}</p>
                  </div>
                </div>
              </div>
            ) : dragOverlaySection ? (
              <div className="pointer-events-none flex w-[min(92vw,560px)] items-center gap-2">
                <div
                  className="flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface"
                  aria-hidden
                >
                  <GripIcon />
                </div>
                <div className="min-w-0 flex-1 rounded-2xl border border-border bg-card/80 px-4 py-3.5 shadow-sm">
                  <h2 className="text-lg font-bold text-ink">{dragOverlaySection.name}</h2>
                  <p className="mt-1 text-xs text-ink-muted">Section · drag to reorder</p>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <p className="text-sm text-ink-muted bg-surface/50 rounded-xl px-4 py-3">
        Guest links use each table&apos;s token; renaming or reordering does not change URLs. Tables without a section are auto-assigned to &quot;Main&quot; when you open this page.
      </p>

      {deleteSectionPrompt ? (
        <DeleteSectionWarningModal
          sectionName={deleteSectionPrompt.name}
          tableCount={deleteSectionPrompt.tableCount}
          busy={deletingSectionId === deleteSectionPrompt.id}
          otherSections={otherSectionsForModal}
          onClose={() => {
            if (deletingSectionId === deleteSectionPrompt.id) return;
            setDeleteSectionPrompt(null);
          }}
          onConfirm={executeDeleteSection}
        />
      ) : null}
    </div>
  );
}
