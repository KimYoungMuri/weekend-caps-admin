"use client";

import { useState, useTransition } from "react";
import {
  createGeneration,
  deleteGeneration,
  updateGeneration,
} from "@/app/actions/generations";
import type { AdminGeneration } from "@/lib/admin";

export function CreateGenerationForm({
  profiles,
  defaultUserId,
}: {
  profiles: { id: string; label: string }[];
  defaultUserId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await createGeneration(formData);
          if (!result.ok) {
            setError(result.error ?? "Create failed");
            return;
          }
          setMessage("Created.");
          event.currentTarget.reset();
        });
      }}
    >
      <h3 className="font-semibold text-slate-900">Create generation</h3>
      <label className="block space-y-1 text-sm">
        <span className="text-slate-600">Author</span>
        <select
          name="user_id"
          defaultValue={defaultUserId}
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
        >
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-slate-600">Prompt</span>
        <input
          name="prompt"
          required
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-slate-600">Caption</span>
        <textarea
          name="caption"
          required
          rows={3}
          className="w-full rounded-xl border border-slate-300 px-3 py-2"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-teal-700">{message}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Create"}
      </button>
    </form>
  );
}

export function EditGenerationRow({ generation }: { generation: AdminGeneration }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <li className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await updateGeneration(formData);
            if (!result.ok) setError(result.error ?? "Update failed");
          });
        }}
      >
        <input type="hidden" name="id" value={generation.id} />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>#{generation.id}</span>
          <span>{new Date(generation.created_at).toLocaleString()}</span>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-600">Prompt</span>
          <input
            name="prompt"
            required
            defaultValue={generation.prompt}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-slate-600">Caption</span>
          <textarea
            name="caption"
            required
            rows={2}
            defaultValue={generation.caption}
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </form>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!window.confirm("Delete this generation?")) return;
          const formData = new FormData(event.currentTarget);
          setError(null);
          startTransition(async () => {
            const result = await deleteGeneration(formData);
            if (!result.ok) setError(result.error ?? "Delete failed");
          });
        }}
      >
        <input type="hidden" name="id" value={generation.id} />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          Delete
        </button>
      </form>
    </li>
  );
}
