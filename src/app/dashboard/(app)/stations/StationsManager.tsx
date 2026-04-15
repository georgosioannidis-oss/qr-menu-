"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

type Station = {
  id: string;
  name: string;
  createdAt: string;
};

export function StationsManager() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchStations = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stations");
      if (!res.ok) throw new Error("Failed to load stations");
      const data = await res.json();
      setStations(data);
    } catch {
      toast.error("Could not load stations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStations();
  }, [fetchStations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/dashboard/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to create station");
      }
      setNewName("");
      await fetchStations();
      toast.success("Station created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    const name = editName.trim();
    if (!name) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/dashboard/stations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename station");
      setEditingId(null);
      await fetchStations();
      toast.success("Station renamed");
    } catch {
      toast.error("Failed to rename");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete station "${name}"? Menu items using it will revert to default kitchen routing.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/dashboard/stations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchStations();
      toast.success("Station deleted");
    } catch {
      toast.error("Failed to delete station");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <Spinner className="h-5 w-5 border-primary border-t-transparent" />
        Loading stations…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-ink-muted mb-1.5">
            New station
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Bar, Kitchen, Grill"
            maxLength={100}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-ink shadow-sm placeholder:text-ink-muted/50 focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-50"
        >
          {creating ? (
            <>
              <Spinner className="h-4 w-4 border-white border-t-transparent" />
              Creating…
            </>
          ) : (
            "Add station"
          )}
        </button>
      </form>

      {stations.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
          <p className="text-ink-muted font-medium">No stations yet</p>
          <p className="text-sm text-ink-muted mt-1">
            Items without a station are routed to a default &quot;Kitchen&quot; queue. Create stations above to split orders.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {stations.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              {editingId === s.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRename(s.id);
                  }}
                  className="flex flex-1 items-center gap-2"
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                    maxLength={100}
                    className="flex-1 rounded-lg border-2 border-primary bg-card px-3 py-2 text-sm text-ink focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={savingId === s.id || !editName.trim()}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    {savingId === s.id ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-ink hover:bg-surface"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="text-sm font-semibold text-ink">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(s.id);
                        setEditName(s.name);
                      }}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(s.id, s.name)}
                      disabled={deletingId === s.id}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
