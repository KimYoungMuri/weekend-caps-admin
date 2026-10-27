"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRow, deleteRow, updateRow } from "@/app/actions/resources";
import type { Field, Operation } from "@/lib/resources";

type Row = Record<string, unknown> & { id: number };
type RefOptions = Record<string, { id: number; label: string }[]>;

type ResourceManagerProps = {
  slug: string;
  label: string;
  fields: Field[];
  operations: Operation[];
  rows: Row[];
  refOptions: RefOptions;
  meta: string[];
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none";

function FieldInput({
  field,
  value,
  refOptions,
}: {
  field: Field;
  value: unknown;
  refOptions: RefOptions;
}) {
  if (field.type === "boolean") {
    return (
      <input
        type="checkbox"
        name={field.name}
        defaultChecked={value === undefined ? true : Boolean(value)}
        className="h-4 w-4"
      />
    );
  }
  if (field.type === "ref" && field.ref) {
    const options = refOptions[field.name] ?? [];
    return (
      <select
        name={field.name}
        required={field.required}
        defaultValue={value === undefined || value === null ? options[0]?.id : String(value)}
        className={inputClass}
      >
        {!field.required && <option value="">—</option>}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        name={field.name}
        required={field.required}
        defaultValue={value === null || value === undefined ? "" : String(value)}
        placeholder={field.placeholder}
        rows={2}
        className={inputClass}
      />
    );
  }
  return (
    <input
      name={field.name}
      type={field.type === "number" ? "number" : "text"}
      required={field.required}
      min={field.min}
      max={field.max}
      step={field.step}
      defaultValue={value === null || value === undefined ? "" : String(value)}
      placeholder={field.placeholder}
      className={inputClass}
    />
  );
}

function display(field: Field, value: unknown, refOptions: RefOptions) {
  if (value === null || value === undefined || value === "") return <span className="text-slate-400">—</span>;
  if (field.type === "boolean") {
    return value ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">yes</span>
    ) : (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">no</span>
    );
  }
  if (field.type === "ref") {
    return refOptions[field.name]?.find((o) => o.id === Number(value))?.label ?? `#${String(value)}`;
  }
  return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
}

function useAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onSuccess?.();
      router.refresh();
    });
  }

  return { error, isPending, run };
}

function CreateForm({ slug, label, fields, refOptions }: Omit<ResourceManagerProps, "rows" | "operations" | "meta">) {
  const [open, setOpen] = useState(false);
  const { error, isPending, run } = useAction();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        + New {label.replace(/s$/, "").toLowerCase()}
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        run(
          () => createRow(slug, formData),
          () => {
            form.reset();
            setOpen(false);
          },
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {fields
          .filter((f) => !f.readOnly)
          .map((field) => (
            <label
              key={field.name}
              className={`space-y-1 text-sm ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
            >
              <span className="flex items-center gap-2 text-slate-600">
                {field.label}
                {field.required && <span className="text-red-500">*</span>}
              </span>
              <FieldInput field={field} value={undefined} refOptions={refOptions} />
            </label>
          ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-teal-700 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Create"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 text-sm text-slate-600">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RowView({
  slug,
  row,
  fields,
  operations,
  refOptions,
  meta,
}: Omit<ResourceManagerProps, "rows" | "label"> & { row: Row }) {
  const [editing, setEditing] = useState(false);
  const { error, isPending, run } = useAction();
  const editableFields = fields.filter((f) => !f.readOnly);

  if (editing) {
    return (
      <tr className="border-b border-slate-100 bg-amber-50/50 align-top">
        <td className="px-3 py-3 font-mono text-xs text-slate-500">#{row.id}</td>
        <td colSpan={fields.length + meta.length + 1} className="px-3 py-3">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("id", String(row.id));
              run(() => updateRow(slug, formData), () => setEditing(false));
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {editableFields.map((field) => (
                <label
                  key={field.name}
                  className={`space-y-1 text-sm ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
                >
                  <span className="text-slate-600">{field.label}</span>
                  <FieldInput field={field} value={row[field.name]} refOptions={refOptions} />
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-60"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm text-slate-600">
                Cancel
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 align-top">
      <td className="px-3 py-3 font-mono text-xs text-slate-500">#{row.id}</td>
      {fields.map((field) => (
        <td key={field.name} className="max-w-xs px-3 py-3">
          {display(field, row[field.name], refOptions)}
        </td>
      ))}
      {meta.map((column) => (
        <td key={column} className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
          {row[column] ? new Date(String(row[column])).toLocaleString() : "—"}
        </td>
      ))}
      <td className="whitespace-nowrap px-3 py-3 text-right">
        <div className="flex justify-end gap-3 text-sm">
          {operations.includes("update") && (
            <button type="button" onClick={() => setEditing(true)} className="font-medium text-slate-700 hover:text-slate-950">
              Edit
            </button>
          )}
          {operations.includes("delete") && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (confirm(`Delete #${row.id}?`)) run(() => deleteRow(slug, row.id));
              }}
              className="text-red-600 hover:text-red-800 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
        {error && <p className="mt-1 max-w-48 text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

export function ResourceManager(props: ResourceManagerProps) {
  const { rows, fields, meta, operations } = props;
  return (
    <div className="space-y-4">
      {operations.includes("create") && <CreateForm {...props} />}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2.5 font-medium">ID</th>
              {fields.map((field) => (
                <th key={field.name} className="px-3 py-2.5 font-medium">
                  {field.label}
                </th>
              ))}
              {meta.map((column) => (
                <th key={column} className="px-3 py-2.5 font-medium">
                  {column.replace(/_/g, " ")}
                </th>
              ))}
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={fields.length + meta.length + 2} className="px-3 py-8 text-center text-slate-500">
                  No rows yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <RowView key={row.id} {...props} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">{rows.length} rows</p>
    </div>
  );
}
