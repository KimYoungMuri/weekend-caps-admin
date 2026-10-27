"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type StoredImage = {
  path: string;
  url: string;
  folder: string;
  owner: string;
  size: number | null;
  createdAt: string | null;
  inUse: boolean;
};

function formatSize(bytes: number | null) {
  if (bytes === null) return "—";
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function extension(file: File) {
  return (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

export function ImageManager({ bucket, images }: { bucket: string; images: StoredImage[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(task: () => Promise<string | null>, success: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const failure = await task();
      if (failure) {
        setError(failure);
        return;
      }
      setMessage(success);
      router.refresh();
    });
  }

  function upload(file: File) {
    run(async () => {
      const { error: uploadError } = await createClient()
        .storage.from(bucket)
        .upload(`admin/${Date.now()}.${extension(file)}`, file, { contentType: file.type });
      return uploadError?.message ?? null;
    }, "Uploaded.");
  }

  function replace(image: StoredImage, file: File) {
    run(async () => {
      const { error: updateError } = await createClient()
        .storage.from(bucket)
        .update(image.path, file, { contentType: file.type, upsert: true, cacheControl: "0" });
      return updateError?.message ?? null;
    }, "Replaced. Browsers may show the old image until the cache clears.");
  }

  function remove(image: StoredImage) {
    if (!confirm(`Delete ${image.path}?${image.inUse ? " It's someone's current profile photo." : ""}`)) return;
    run(async () => {
      const { error: removeError } = await createClient().storage.from(bucket).remove([image.path]);
      return removeError?.message ?? null;
    }, "Deleted.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          {isPending ? "Working…" : "+ Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-sm text-slate-500">{images.length} images</span>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {message && <span className="text-sm text-teal-700">{message}</span>}
      </div>

      {images.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
          No images uploaded yet.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image) => (
            <li key={image.path} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="aspect-square w-full bg-slate-100 object-cover" />
              <div className="space-y-2 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-900">{image.owner}</span>
                  {image.inUse && (
                    <span className="shrink-0 rounded-full bg-teal-100 px-2 py-0.5 font-semibold text-teal-800">
                      in use
                    </span>
                  )}
                </div>
                <p className="truncate font-mono text-slate-500" title={image.path}>
                  {image.path}
                </p>
                <p className="text-slate-500">
                  {formatSize(image.size)}
                  {image.createdAt && ` · ${new Date(image.createdAt).toLocaleDateString()}`}
                </p>
                <div className="flex gap-3 pt-1 text-sm">
                  <label className="cursor-pointer font-medium text-slate-700 hover:text-slate-950">
                    Replace
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) replace(image, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <a href={image.url} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-950">
                    Open
                  </a>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => remove(image)}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
