import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  createFeatureRequest,
  listFeatureRequests,
  voteFeatureRequest,
  type FeatureRequestRecord,
  type FeatureRequestSort,
} from "../feature-request-store";

export interface FeatureRequestPayload extends FeatureRequestRecord {
  metadata?: Record<string, unknown>;
}

export interface FeatureRequestFormRenderProps {
  requests: FeatureRequestRecord[];
  sortBy: FeatureRequestSort;
  title: string;
  description: string;
  category: string;
  isSubmitting: boolean;
  error: string | null;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setCategory: (value: string) => void;
  setSortBy: (value: FeatureRequestSort) => void;
  submit: () => Promise<void>;
  vote: (requestId: string) => void;
}

export interface FeatureRequestFormProps {
  onSubmit?: (request: FeatureRequestPayload) => Promise<void> | void;
  onWebhook?: (request: FeatureRequestPayload) => Promise<void> | void;
  categories?: string[];
  defaultSort?: FeatureRequestSort;
  metadata?: Record<string, unknown>;
  className?: string;
  style?: CSSProperties;
  children?: (props: FeatureRequestFormRenderProps) => ReactNode;
}

const panelStyles: CSSProperties = {
  width: "min(92vw, 520px)",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  background: "#fff",
  boxShadow: "0 12px 36px rgba(0,0,0,0.12)",
  padding: "14px",
};

export function FeatureRequestForm({
  onSubmit,
  onWebhook,
  categories = ["UI", "Performance", "Integration", "Other"],
  defaultSort = "votes",
  metadata,
  className,
  style,
  children,
}: FeatureRequestFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Other");
  const [sortBy, setSortBy] = useState<FeatureRequestSort>(defaultSort);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);

  const requests = useMemo(
    () => listFeatureRequests(sortBy),
    [refreshVersion, sortBy],
  );

  const submit = useCallback(async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      setError("Please add a request title.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const created = createFeatureRequest({
      title: nextTitle,
      description,
      category,
      autoVote: true,
    });
    const payload: FeatureRequestPayload = { ...created, metadata };

    try {
      await onSubmit?.(payload);
      await onWebhook?.(payload);
    } catch {
      setError("Saved locally, but failed to sync request.");
    } finally {
      setTitle("");
      setDescription("");
      setCategory(categories[0] ?? "Other");
      setRefreshVersion((current) => current + 1);
      setIsSubmitting(false);
    }
  }, [categories, category, description, metadata, onSubmit, onWebhook, title]);

  const vote = useCallback((requestId: string) => {
    const result = voteFeatureRequest({ requestId });
    if (!result) return;
    setRefreshVersion((current) => current + 1);
  }, []);

  const renderProps: FeatureRequestFormRenderProps = {
    requests,
    sortBy,
    title,
    description,
    category,
    isSubmitting,
    error,
    setTitle,
    setDescription,
    setCategory,
    setSortBy,
    submit,
    vote,
  };

  if (children) {
    return <>{children(renderProps)}</>;
  }

  return (
    <section
      data-featuredrop-request-form
      className={className}
      style={{ ...panelStyles, ...style }}
    >
      <div style={{ display: "grid", gap: "8px" }}>
        <strong>Feature requests</strong>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Request title"
          style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px" }}
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Describe the use case"
          rows={3}
          style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px", resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            aria-label="Request category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 8px" }}
          >
            {categories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting}
            style={{
              border: "none",
              background: "#111827",
              color: "#fff",
              borderRadius: "8px",
              padding: "6px 10px",
              cursor: "pointer",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit request"}
          </button>
        </div>
        {error && <p style={{ margin: 0, color: "#b91c1c", fontSize: "12px" }}>{error}</p>}
      </div>

      <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "13px" }}>Top requests</strong>
        <select
          aria-label="Sort requests"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as FeatureRequestSort)}
          style={{ border: "1px solid #d1d5db", borderRadius: "8px", padding: "6px 8px" }}
        >
          <option value="votes">Most votes</option>
          <option value="recent">Most recent</option>
        </select>
      </div>

      <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
        {requests.length === 0 && (
          <p style={{ margin: 0, color: "#6b7280", fontSize: "13px" }}>
            No requests yet.
          </p>
        )}
        {requests.map((request) => (
          <article
            key={request.id}
            data-featuredrop-request-item={request.id}
            style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "10px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600 }}>{request.title}</p>
                {request.category && (
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280" }}>
                    {request.category}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => vote(request.id)}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "999px",
                  background: "#fff",
                  padding: "4px 8px",
                  cursor: "pointer",
                }}
              >
                ↑ {request.votes}
              </button>
            </div>
            {request.description && (
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#374151" }}>
                {request.description}
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
