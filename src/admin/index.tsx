import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import type { AudienceRule, FeatureEntry } from "../types";

const panelStyles: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "12px",
  background: "#ffffff",
};

const headingStyles: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "15px",
  fontWeight: 700,
};

export interface ManifestEditorProps {
  features: readonly FeatureEntry[];
  onSave: (updated: FeatureEntry[]) => Promise<void> | void;
  schema?: {
    parse?: (value: unknown) => unknown;
    safeParse?: (value: unknown) => { success: boolean; data?: unknown; error?: unknown };
  };
  readOnly?: boolean;
  children?: ReactNode;
}

interface DraftParseResult {
  parsed: FeatureEntry[] | null;
  error: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error.trim();
  return "Invalid manifest data";
}

function parseDraft(
  draft: string,
  schema: ManifestEditorProps["schema"] | undefined,
): DraftParseResult {
  try {
    const raw = JSON.parse(draft) as unknown;
    if (!Array.isArray(raw)) {
      return {
        parsed: null,
        error: "Manifest must be an array",
      };
    }

    if (!schema) {
      return {
        parsed: raw as FeatureEntry[],
        error: "",
      };
    }

    if (typeof schema.safeParse === "function") {
      const result = schema.safeParse(raw);
      if (!result.success) {
        return {
          parsed: null,
          error: toErrorMessage(result.error),
        };
      }
      if (!Array.isArray(result.data)) {
        return {
          parsed: null,
          error: "Schema output must be an array",
        };
      }
      return {
        parsed: result.data as FeatureEntry[],
        error: "",
      };
    }

    if (typeof schema.parse === "function") {
      const parsed = schema.parse(raw);
      if (!Array.isArray(parsed)) {
        return {
          parsed: null,
          error: "Schema output must be an array",
        };
      }
      return {
        parsed: parsed as FeatureEntry[],
        error: "",
      };
    }

    return {
      parsed: raw as FeatureEntry[],
      error: "",
    };
  } catch (error: unknown) {
    return {
      parsed: null,
      error: toErrorMessage(error),
    };
  }
}

export function ManifestEditor({
  features,
  onSave,
  schema,
  readOnly = false,
  children,
}: ManifestEditorProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(features, null, 2));
  const [status, setStatus] = useState<string>("idle");
  const [error, setError] = useState<string>("");

  const parsedResult = useMemo(() => parseDraft(draft, schema), [draft, schema]);
  const parsed = parsedResult.parsed;

  const save = async () => {
    if (readOnly || !parsed) return;
    setStatus("saving");
    setError("");
    try {
      await onSave(parsed);
      setStatus("saved");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Failed to save manifest");
    }
  };

  if (children) return <>{children}</>;

  return (
    <section data-featuredrop-admin-manifest-editor style={panelStyles}>
      <p style={headingStyles}>Manifest Editor</p>
      <textarea
        aria-label="Manifest JSON"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        readOnly={readOnly}
        style={{
          width: "100%",
          minHeight: "180px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "12px",
          lineHeight: 1.45,
          border: "1px solid #d1d5db",
          borderRadius: "8px",
          padding: "10px",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px" }}>
        <button type="button" onClick={save} disabled={readOnly || !parsed}>
          Save
        </button>
        <span aria-live="polite">{status}</span>
        {!parsed && <span style={{ color: "#dc2626" }}>{parsedResult.error || "Invalid JSON"}</span>}
        {error && <span style={{ color: "#dc2626" }}>{error}</span>}
      </div>
    </section>
  );
}

export interface ScheduleCalendarProps {
  features: readonly FeatureEntry[];
  onSchedule: (featureId: string, publishAt: string) => Promise<void> | void;
  onExpire?: (featureId: string, expiresAt: string) => Promise<void> | void;
  minDate?: string;
}

function toDateTimeInputMin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 16);
}

export function ScheduleCalendar({
  features,
  onSchedule,
  onExpire,
  minDate,
}: ScheduleCalendarProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [expireValues, setExpireValues] = useState<Record<string, string>>({});
  const minDateInput = toDateTimeInputMin(minDate);

  return (
    <section data-featuredrop-admin-schedule-calendar style={panelStyles}>
      <p style={headingStyles}>Schedule Calendar</p>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "10px" }}>
        {features.map((feature) => (
          <li
            key={feature.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px",
              display: "grid",
              gap: "6px",
            }}
          >
            <strong>{feature.label}</strong>
            <label style={{ display: "grid", gap: "4px" }}>
              Publish at
              <input
                type="datetime-local"
                value={values[feature.id] ?? ""}
                min={minDateInput}
                onChange={(event) => {
                  const value = event.target.value;
                  setValues((previous) => ({ ...previous, [feature.id]: value }));
                }}
              />
            </label>
            {onExpire && (
              <label style={{ display: "grid", gap: "4px" }}>
                Expire at
                <input
                  type="datetime-local"
                  value={expireValues[feature.id] ?? ""}
                  min={minDateInput}
                  onChange={(event) => {
                    const value = event.target.value;
                    setExpireValues((previous) => ({ ...previous, [feature.id]: value }));
                  }}
                />
              </label>
            )}
            <button
              type="button"
              onClick={() => {
                const value = values[feature.id];
                if (!value) return;
                void onSchedule(feature.id, new Date(value).toISOString());
              }}
            >
              Schedule
            </button>
            {onExpire && (
              <button
                type="button"
                onClick={() => {
                  const value = expireValues[feature.id];
                  if (!value) return;
                  void onExpire(feature.id, new Date(value).toISOString());
                }}
              >
                Set expiry
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface PreviewPanelProps {
  feature?: FeatureEntry | null;
  components?: Array<"badge" | "changelog" | "spotlight" | "banner" | "toast">;
  theme?: "light" | "dark";
}

export function PreviewPanel({
  feature,
  components = ["badge", "changelog"],
  theme = "light",
}: PreviewPanelProps) {
  const dark = theme === "dark";
  return (
    <section
      data-featuredrop-admin-preview-panel
      data-featuredrop-theme={theme}
      style={{
        ...panelStyles,
        background: dark ? "#111827" : "#ffffff",
        borderColor: dark ? "#374151" : "#e5e7eb",
        color: dark ? "#f9fafb" : "#111827",
      }}
    >
      <p style={headingStyles}>Preview Panel</p>
      {!feature ? (
        <p style={{ margin: 0, color: dark ? "#9ca3af" : "#6b7280" }}>Select a feature to preview.</p>
      ) : (
        <>
          <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{feature.label}</p>
          <p style={{ margin: "0 0 8px", color: dark ? "#9ca3af" : "#6b7280" }}>
            {feature.description ?? "No description"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {components.map((component) => (
              <span
                key={component}
                style={{
                  border: dark ? "1px solid #4b5563" : "1px solid #d1d5db",
                  borderRadius: "999px",
                  padding: "2px 8px",
                  fontSize: "12px",
                }}
              >
                {component}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export interface AudienceBuilderProps {
  segments?: string[];
  roles?: string[];
  regions?: string[];
  value?: AudienceRule;
  onChange?: (audience: AudienceRule) => void;
  onSave?: (audience: AudienceRule) => Promise<void> | void;
}

function toggle(list: string[] | undefined, value: string): string[] {
  const items = new Set(list ?? []);
  if (items.has(value)) items.delete(value);
  else items.add(value);
  return Array.from(items);
}

export function AudienceBuilder({
  segments = [],
  roles = [],
  regions = [],
  value,
  onChange,
  onSave,
}: AudienceBuilderProps) {
  const [audience, setAudience] = useState<AudienceRule>({
    plan: value?.plan ?? [],
    role: value?.role ?? [],
    region: value?.region ?? [],
  });

  const updateAudience = (next: AudienceRule) => {
    setAudience(next);
    onChange?.(next);
  };

  const section = (
    title: string,
    values: string[],
    selected: string[] | undefined,
    onToggle: (value: string) => void,
  ) => (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: "4px" }}>{title}</legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {values.map((item) => (
          <label key={item} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <input
              type="checkbox"
              checked={Boolean(selected?.includes(item))}
              onChange={() => onToggle(item)}
            />
            {item}
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <section data-featuredrop-admin-audience-builder style={panelStyles}>
      <p style={headingStyles}>Audience Builder</p>
      <div style={{ display: "grid", gap: "10px" }}>
        {section("Plans", segments, audience.plan, (item) =>
          updateAudience({ ...audience, plan: toggle(audience.plan, item) }))}
        {section("Roles", roles, audience.role, (item) =>
          updateAudience({ ...audience, role: toggle(audience.role, item) }))}
        {section("Regions", regions, audience.region, (item) =>
          updateAudience({ ...audience, region: toggle(audience.region, item) }))}
      </div>
      {onSave && (
        <button
          type="button"
          style={{ marginTop: "10px" }}
          onClick={() => {
            void onSave(audience);
          }}
        >
          Save audience
        </button>
      )}
    </section>
  );
}
