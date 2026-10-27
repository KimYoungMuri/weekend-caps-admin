export type FieldType = "text" | "textarea" | "number" | "boolean" | "ref";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** For "ref": table + label column to build a <select>. */
  ref?: { table: string; labelColumn: string };
  /** Shown in the table but never editable. */
  readOnly?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
};

export type Operation = "create" | "update" | "delete";

export type Resource = {
  slug: string;
  table: string;
  label: string;
  description: string;
  group: "Content" | "Prompting" | "LLM" | "Observability" | "Access";
  fields: Field[];
  operations: Operation[];
  orderBy: { column: string; ascending: boolean };
  /** Extra columns shown read-only (e.g. timestamps). */
  meta?: string[];
};

export const RESOURCES: Resource[] = [
  {
    slug: "terms",
    table: "terms",
    label: "Terms",
    description: "Slang and places the caption prompts can use ({{terms}} in prompt steps).",
    group: "Prompting",
    operations: ["create", "update", "delete"],
    orderBy: { column: "term", ascending: true },
    fields: [
      { name: "term", label: "Term", type: "text", required: true },
      { name: "definition", label: "Definition", type: "textarea", required: true },
      { name: "example", label: "Example usage", type: "text" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
    meta: ["created_at"],
  },
  {
    slug: "examples",
    table: "generation_examples",
    label: "Generation examples",
    description: "Few-shot examples injected into prompts ({{examples}}). Only active rows are used.",
    group: "Prompting",
    operations: ["create", "update", "delete"],
    orderBy: { column: "created_at", ascending: false },
    fields: [
      { name: "prompt", label: "Prompt / vibe", type: "text", required: true },
      { name: "caption", label: "Caption", type: "textarea", required: true },
      { name: "notes", label: "Notes", type: "text" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
    meta: ["created_at"],
  },
  {
    slug: "providers",
    table: "llm_providers",
    label: "LLM providers",
    description:
      "Who serves the models. api_key_env is the name of the server env var holding the key; keys are never stored here.",
    group: "LLM",
    operations: ["create", "update", "delete"],
    orderBy: { column: "id", ascending: true },
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true, placeholder: "google" },
      { name: "base_url", label: "Base URL", type: "text" },
      { name: "api_key_env", label: "API key env var", type: "text", placeholder: "GEMINI_API_KEY" },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
    meta: ["created_at"],
  },
  {
    slug: "models",
    table: "llm_models",
    label: "LLM models",
    description:
      "Models the caption app tries in priority order (lowest first). Inactive models and models of inactive providers are skipped.",
    group: "LLM",
    operations: ["create", "update", "delete"],
    orderBy: { column: "priority", ascending: true },
    fields: [
      {
        name: "provider_id",
        label: "Provider",
        type: "ref",
        required: true,
        ref: { table: "llm_providers", labelColumn: "name" },
      },
      { name: "model_id", label: "API model id", type: "text", required: true, placeholder: "gemini-2.5-flash" },
      { name: "display_name", label: "Display name", type: "text", required: true },
      { name: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.05 },
      { name: "max_output_tokens", label: "Max output tokens", type: "number", min: 1, step: 1 },
      { name: "priority", label: "Priority", type: "number", step: 1 },
      { name: "is_active", label: "Active", type: "boolean" },
    ],
    meta: ["created_at"],
  },
  {
    slug: "domains",
    table: "allowed_signup_domains",
    label: "Allowed signup domains",
    description: "Anyone with an email at one of these domains can sign in to Weekend Caps.",
    group: "Access",
    operations: ["create", "update", "delete"],
    orderBy: { column: "domain", ascending: true },
    fields: [
      { name: "domain", label: "Domain", type: "text", required: true, placeholder: "columbia.edu" },
      { name: "note", label: "Note", type: "text" },
    ],
    meta: ["created_at"],
  },
  {
    slug: "whitelist",
    table: "whitelisted_emails",
    label: "Whitelisted emails",
    description: "Individual addresses allowed to sign in even if their domain isn't on the list.",
    group: "Access",
    operations: ["create", "update", "delete"],
    orderBy: { column: "email", ascending: true },
    fields: [
      { name: "email", label: "Email", type: "text", required: true, placeholder: "friend@gmail.com" },
      { name: "note", label: "Note", type: "text" },
    ],
    meta: ["created_at"],
  },
];

export function getResource(slug: string) {
  return RESOURCES.find((resource) => resource.slug === slug);
}

const LOWERCASE_FIELDS = new Set(["domain", "email", "slug"]);

/** Coerce a submitted form into a row for the given resource, ignoring unknown keys. */
export function parseRow(resource: Resource, formData: FormData) {
  const row: Record<string, string | number | boolean | null> = {};
  for (const field of resource.fields) {
    if (field.readOnly) continue;
    const raw = formData.get(field.name);

    if (field.type === "boolean") {
      row[field.name] = raw === "on" || raw === "true";
      continue;
    }

    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) {
      if (field.required) throw new Error(`${field.label} is required.`);
      row[field.name] = null;
      continue;
    }

    if (field.type === "number" || field.type === "ref") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new Error(`${field.label} must be a number.`);
      row[field.name] = parsed;
    } else {
      row[field.name] = LOWERCASE_FIELDS.has(field.name) ? value.toLowerCase() : value;
    }
  }
  return row;
}
