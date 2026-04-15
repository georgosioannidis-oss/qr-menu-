"use client";

import { useState } from "react";
import { confirmDestructiveAction } from "@/lib/confirm-destructive";

export type OptionChoice = { id: string; label: string; priceCents: number };
export type OptionGroup = {
  id: string;
  label: string;
  required: boolean;
  type: "single" | "multi";
  choices: OptionChoice[];
};

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function OptionGroupsEditor({
  value,
  onChange,
}: {
  value: OptionGroup[];
  onChange: (groups: OptionGroup[]) => void;
}) {
  const [open, setOpen] = useState(value.length > 0);

  const addGroup = () => {
    onChange([
      ...value,
      {
        id: newId(),
        label: "",
        required: false,
        type: "single",
        choices: [{ id: newId(), label: "", priceCents: 0 }],
      },
    ]);
    setOpen(true);
  };

  const updateGroup = (index: number, upd: Partial<OptionGroup>) => {
    const next = [...value];
    next[index] = { ...next[index], ...upd };
    onChange(next);
  };

  const removeGroup = (index: number) => {
    const g = value[index];
    const label = (g?.label ?? "").trim() || "this option group";
    if (
      !confirmDestructiveAction(
        `Remove ${label}?`,
        "All choices in this group will be removed from the item."
      )
    )
      return;
    onChange(value.filter((_, i) => i !== index));
  };

  const addChoice = (groupIndex: number) => {
    const next = [...value];
    const g = next[groupIndex];
    g.choices = [...g.choices, { id: newId(), label: "", priceCents: 0 }];
    onChange(next);
  };

  const updateChoice = (groupIndex: number, choiceIndex: number, upd: Partial<OptionChoice>) => {
    const next = [...value];
    const g = next[groupIndex];
    g.choices = g.choices.map((c, i) => (i === choiceIndex ? { ...c, ...upd } : c));
    onChange(next);
  };

  const removeChoice = (groupIndex: number, choiceIndex: number) => {
    const g0 = value[groupIndex];
    const ch = g0?.choices[choiceIndex];
    const label = (ch?.label ?? "").trim() || "this choice";
    if (!confirmDestructiveAction(`Remove ${label}?`, "This option will no longer appear for guests.")) return;
    const next = [...value];
    const g = next[groupIndex];
    g.choices = g.choices.filter((_, i) => i !== choiceIndex);
    if (g.choices.length === 0) g.choices = [{ id: newId(), label: "", priceCents: 0 }];
    onChange(next);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-bold text-ink"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-xs text-ink-muted shadow-sm ring-1 ring-border">
            {open ? "▼" : "▶"}
          </span>
          <span>
            Options & sizes{" "}
            <span className="font-normal text-ink-muted">(optional)</span>
          </span>
        </button>
        <button
          type="button"
          onClick={addGroup}
          className="rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/15"
        >
          + Add group
        </button>
      </div>
      {open && value.length === 0 && (
        <p className="text-xs text-ink-muted bg-surface/50 rounded-lg px-3 py-2">
          e.g. &quot;How cooked?&quot; (required, one choice) or &quot;Extras&quot; (optional, multiple).
        </p>
      )}
      {open &&
        value.map((group, gi) => (
          <div key={group.id} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:min-w-[200px]">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  Group name
                </label>
                <input
                  type="text"
                  value={group.label}
                  onChange={(e) => updateGroup(gi, { label: e.target.value })}
                  placeholder="e.g. Size, How cooked?"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm placeholder:text-ink-muted/60 focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none"
                />
              </div>
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  Customer must choose?
                </span>
                <div
                  className="inline-flex rounded-xl border border-border bg-surface/80 p-1 shadow-inner"
                  role="group"
                  aria-label="Required or optional group"
                >
                  <button
                    type="button"
                    onClick={() => updateGroup(gi, { required: false })}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      !group.required
                        ? "bg-card text-ink shadow-sm ring-1 ring-border"
                        : "text-ink-muted hover:bg-card/60 hover:text-ink"
                    }`}
                  >
                    Optional
                  </button>
                  <button
                    type="button"
                    onClick={() => updateGroup(gi, { required: true })}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      group.required
                        ? "bg-primary text-white shadow-sm"
                        : "text-ink-muted hover:bg-card/60 hover:text-ink"
                    }`}
                  >
                    Required
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                  Pick style
                </label>
                <select
                  value={group.type}
                  onChange={(e) => updateGroup(gi, { type: e.target.value as "single" | "multi" })}
                  className="w-full min-w-[10rem] rounded-xl border border-border bg-card px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none sm:w-auto"
                >
                  <option value="single">One option only</option>
                  <option value="multi">Multiple (extras)</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeGroup(gi)}
                className="self-end text-sm font-semibold text-red-600 hover:text-red-700 sm:ml-auto"
              >
                Remove group
              </button>
            </div>
            <div className="pl-1 space-y-2">
              <p className="text-xs font-medium text-ink-muted">Choices</p>
              {group.choices.map((choice, ci) => (
                <div key={choice.id} className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={choice.label}
                    onChange={(e) => updateChoice(gi, ci, { label: e.target.value })}
                    placeholder="e.g. Medium, Extra cheese"
                    className="flex-1 min-w-[100px] rounded-lg border border-black/10 px-2.5 py-1.5 text-sm placeholder:text-ink-muted/70"
                  />
                  <span className="text-sm font-medium text-ink-muted">+ $</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(choice.priceCents / 100).toFixed(2)}
                    onChange={(e) =>
                      updateChoice(gi, ci, {
                        priceCents: Math.round(parseFloat(e.target.value || "0") * 100),
                      })
                    }
                    className="input-no-spin w-[4.5rem] rounded-lg border border-border bg-card px-2 py-1.5 text-sm tabular-nums shadow-sm focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeChoice(gi, ci)}
                    className="p-1.5 text-ink-muted hover:text-red-600 rounded-lg hover:bg-red-50"
                    aria-label="Remove choice"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addChoice(gi)}
                className="text-sm font-medium text-primary hover:underline"
              >
                + Add choice
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}

export function parseOptionGroups(s: string | null | undefined): OptionGroup[] {
  if (!s || typeof s !== "string") return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
