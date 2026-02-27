import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { FeatureEntry, FeatureManifest } from "../../types";
import type { FeatureDropThemeInput } from "../../theme";
import { formatDateForLocale, formatRelativeTimeForLocale } from "../../i18n";
import { parseDescription } from "../../markdown";
import { useFeatureDrop } from "../hooks/use-feature-drop";
import { useThemeVariables } from "../theme";
import {
  DEFAULT_REACTIONS,
  getReactionCounts,
  getUserReaction,
  reactToEntry,
  type ReactionCounts,
} from "../reactions-store";

export type PaginationMode = "infinite-scroll" | "load-more" | "numbered";

export interface ChangelogPageProps {
  pageSize?: number;
  pagination?: PaginationMode;
  showFilters?: boolean;
  showSearch?: boolean;
  categories?: string[];
  emptyState?: ReactNode;
  renderEntry?: (entry: FeatureEntry, index: number) => ReactNode;
  formatDate?: (date: string) => string;
  dateFormat?: "absolute" | "relative";
  basePath?: string;
  manifest?: FeatureManifest;
  className?: string;
  style?: CSSProperties;
  theme?: FeatureDropThemeInput;
  showReactions?: boolean;
  reactions?: string[];
  onReaction?: (entry: FeatureEntry, reaction: string, counts: ReactionCounts) => void;
}

const pageStyles: CSSProperties = {
  maxWidth: "880px",
  margin: "0 auto",
  padding: "32px 16px",
  fontFamily: "var(--featuredrop-font-family, system-ui, -apple-system, Segoe UI, sans-serif)",
};

const skipLinkStyles: CSSProperties = {
  display: "inline-block",
  marginBottom: "12px",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--featuredrop-mark-all-color, #3b82f6)",
};

const headerStyles: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  alignItems: "center",
  marginBottom: "16px",
};

const searchStyles: CSSProperties = {
  flex: "1 1 280px",
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid var(--featuredrop-border-color, #e5e7eb)",
  fontSize: "14px",
};

const filterBarStyles: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  margin: "12px 0 20px",
};

const pillStyles: CSSProperties = {
  padding: "6px 12px",
  borderRadius: "999px",
  border: "1px solid var(--featuredrop-border-color, #e5e7eb)",
  cursor: "pointer",
  background: "var(--featuredrop-card-bg, #fff)",
  color: "var(--featuredrop-text, #111827)",
  fontSize: "13px",
};

const pillActiveStyles: CSSProperties = {
  ...pillStyles,
  background: "var(--featuredrop-pill-active-bg, #111827)",
  color: "var(--featuredrop-pill-active-text, #fff)",
  border: "1px solid var(--featuredrop-pill-active-bg, #111827)",
};

const entryCardStyles: CSSProperties = {
  border: "1px solid var(--featuredrop-border-color, #e5e7eb)",
  borderRadius: "12px",
  padding: "16px",
  marginBottom: "16px",
  background: "var(--featuredrop-card-bg, #fff)",
  boxShadow: "var(--featuredrop-card-shadow, 0 4px 20px rgba(0,0,0,0.04))",
};

const metaRowStyles: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  fontSize: "12px",
  color: "var(--featuredrop-muted, #6b7280)",
  marginTop: "8px",
};

const loadMoreBtnStyles: CSSProperties = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "1px solid var(--featuredrop-border-color, #e5e7eb)",
  background: "var(--featuredrop-card-bg, #fff)",
  color: "var(--featuredrop-text, #111827)",
  cursor: "pointer",
  fontWeight: 600,
};

const reactionsRowStyles: CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginTop: "12px",
};

const reactionButtonStyles: CSSProperties = {
  border: "1px solid var(--featuredrop-border-color, #e5e7eb)",
  borderRadius: "999px",
  background: "var(--featuredrop-card-bg, #fff)",
  color: "var(--featuredrop-text, #111827)",
  padding: "4px 9px",
  cursor: "pointer",
  fontSize: "12px",
};

function defaultFormatDate(date: string, locale: string): string {
  return formatDateForLocale(date, locale);
}

function EntryCard({
  entry,
  formatDate,
  basePath,
  shareLabel,
  showReactions,
  reactions,
  userReaction,
  canReact,
  onReact,
}: {
  entry: FeatureEntry;
  formatDate: (d: string) => string;
  basePath: string;
  shareLabel: string;
  showReactions: boolean;
  reactions: ReactionCounts;
  userReaction: string | null;
  canReact: boolean;
  onReact: (reaction: string) => void;
}) {
  const descriptionHtml = entry.description ? parseDescription(entry.description) : null;
  const shareHref = `${basePath}#entry-${entry.id}`;

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareHref);
      }
    } catch {
      // noop; best-effort copy
    }
  };

  return (
    <article
      id={`entry-${entry.id}`}
      data-featuredrop-entry={entry.id}
      style={entryCardStyles}
      tabIndex={0}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <h3 style={{ margin: "0 0 6px", fontSize: "18px" }}>{entry.label}</h3>
          {descriptionHtml && (
            <div
              style={{ color: "#4b5563", fontSize: "14px", lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
            />
          )}
        </div>
        <button
          aria-label={`${shareLabel} ${entry.label}`}
          onClick={handleShare}
          style={{
            border: "1px solid var(--featuredrop-border-color, #e5e7eb)",
            background: "var(--featuredrop-card-bg, #fff)",
            color: "var(--featuredrop-text, #111827)",
            borderRadius: "8px",
            padding: "6px 8px",
            cursor: "pointer",
            height: "36px",
          }}
        >
          {shareLabel}
        </button>
      </div>
      <div style={metaRowStyles}>
        <span>{formatDate(entry.releasedAt)}</span>
        {entry.version && (
          <span>
            v
            {typeof entry.version === "string"
              ? entry.version
              : entry.version.introduced ?? entry.version.showNewUntil ?? ""}
          </span>
        )}
        {entry.category && <span>{entry.category}</span>}
        {entry.type && <span>{entry.type}</span>}
      </div>
      {entry.image && (
        <img
          src={entry.image}
          alt={entry.label}
          style={{ width: "100%", borderRadius: "10px", marginTop: "12px" }}
        />
      )}
      {entry.cta && (
        <a
          href={entry.cta.url}
          style={{
            display: "inline-block",
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "10px",
            fontWeight: 600,
            color: "var(--featuredrop-btn-text, #fff)",
            background: "var(--featuredrop-btn-bg, #111827)",
            textDecoration: "none",
          }}
          target="_blank"
          rel="noopener noreferrer"
        >
          {entry.cta.label}
        </a>
      )}
      {showReactions && (
        <div style={reactionsRowStyles}>
          {Object.entries(reactions).map(([reaction, count]) => (
            <button
              key={reaction}
              type="button"
              onClick={() => onReact(reaction)}
              disabled={!canReact}
              style={{
                ...reactionButtonStyles,
                opacity: !canReact && userReaction !== reaction ? 0.55 : 1,
                background: userReaction === reaction ? "var(--featuredrop-reaction-active, rgba(17, 24, 39, 0.08))" : "var(--featuredrop-card-bg, #fff)",
              }}
              aria-label={`React ${reaction} to ${entry.label}`}
            >
              {reaction} {count}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

export function ChangelogPage({
  pageSize = 20,
  pagination = "load-more",
  showFilters = true,
  showSearch = true,
  categories,
  emptyState,
  renderEntry,
  formatDate,
  dateFormat = "absolute",
  basePath,
  manifest: manifestProp,
  className,
  style,
  theme,
  showReactions = false,
  reactions = [...DEFAULT_REACTIONS],
  onReaction,
}: ChangelogPageProps) {
  const { manifest: contextManifest, locale, direction, translations } = useFeatureDrop();
  const themeVariables = useThemeVariables(theme);
  const manifest = useMemo(
    () => manifestProp ?? contextManifest ?? [],
    [manifestProp, contextManifest],
  );

  const sorted = useMemo(
    () =>
      [...manifest].sort(
        (a, b) => new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime(),
      ),
    [manifest],
  );

  const allCategories = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    const set = new Set<string>();
    for (const f of manifest) if (f.category) set.add(f.category);
    return Array.from(set);
  }, [categories, manifest]);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [, setReactionVersion] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sorted.filter((f) => {
      if (activeCategory && f.category !== activeCategory) return false;
      if (activeType && f.type !== activeType) return false;
      if (q) {
        const haystack = `${f.label} ${f.description ?? ""}`.toLowerCase();
        // lightweight fuzzy: all query tokens must appear somewhere
        const tokens = q.split(/\s+/).filter(Boolean);
        if (!tokens.every((t) => haystack.includes(t))) return false;
      }
      return true;
    });
  }, [sorted, activeCategory, activeType, query]);

  useEffect(() => {
    setPage(1);
  }, [query, activeCategory, activeType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice(0, page * pageSize);
  const listIdRef = useRef(`featuredrop-changelog-list-${Math.random().toString(36).slice(2, 10)}`);
  const listId = listIdRef.current;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (pagination !== "infinite-scroll") return;
    if (typeof IntersectionObserver === "undefined") return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setPage((p) => (p < totalPages ? p + 1 : p));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pagination, totalPages]);

  const resolvedBasePath = useMemo(() => {
    if (basePath) return basePath;
    if (typeof window !== "undefined") return window.location.pathname;
    return "";
  }, [basePath]);
  const resolvedFormatDate = useMemo(
    () =>
      formatDate ??
      ((value: string) =>
        dateFormat === "relative"
          ? formatRelativeTimeForLocale(value, locale)
          : defaultFormatDate(value, locale)),
    [dateFormat, formatDate, locale],
  );

  // Deep-link scroll to #entry-id
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.startsWith("#entry-")) {
      const target = document.querySelector(hash);
      if (target && "scrollIntoView" in target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, []);

  const handleListKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    if (tagName === "input" || tagName === "textarea" || tagName === "select") return;

    const entries = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>("[data-featuredrop-entry]"),
    );
    if (entries.length === 0) return;

    const active = document.activeElement as HTMLElement | null;
    const currentIndex = entries.findIndex(
      (entry) => entry === active || (active ? entry.contains(active) : false),
    );
    const nextIndex = currentIndex < 0
      ? (event.key === "ArrowDown" ? 0 : entries.length - 1)
      : event.key === "ArrowDown"
        ? Math.min(entries.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);

    if (nextIndex === currentIndex) return;
    event.preventDefault();
    entries[nextIndex].focus();
  }, []);

  const renderList = () =>
    visible.map((entry, idx) =>
      renderEntry ? (
        <div key={entry.id}>{renderEntry(entry, idx)}</div>
      ) : (
        <EntryCard
          key={entry.id}
          entry={entry}
          formatDate={resolvedFormatDate}
          basePath={resolvedBasePath}
          showReactions={showReactions}
          shareLabel={translations.share}
          reactions={showReactions ? getReactionCounts(entry.id, reactions) : {}}
          userReaction={showReactions ? getUserReaction(entry.id) : null}
          canReact={showReactions ? !getUserReaction(entry.id) : false}
          onReact={(reaction) => {
            const result = reactToEntry(entry.id, reaction, reactions);
            if (!result.updated) return;
            setReactionVersion((value) => value + 1);
            onReaction?.(entry, reaction, result.counts);
          }}
        />
      ),
    );

  const paginationControls = () => {
    if (pagination === "load-more" && page < totalPages) {
      return (
        <div style={{ textAlign: "center", marginTop: "12px" }}>
          <button style={loadMoreBtnStyles} onClick={() => setPage((p) => p + 1)}>
            {translations.loadMore}
          </button>
        </div>
      );
    }
    if (pagination === "numbered" && totalPages > 1) {
      return (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
          {Array.from({ length: totalPages }).map((_, i) => {
            const pageNumber = i + 1;
            const active = pageNumber === page;
            return (
              <button
                key={pageNumber}
                style={active ? pillActiveStyles : pillStyles}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
      );
    }
    if (pagination === "infinite-scroll") {
      return <div ref={sentinelRef} style={{ height: "1px" }} />;
    }
    return null;
  };

  const containerStyles = useMemo<CSSProperties>(
    () => ({ ...(themeVariables ?? {}), ...pageStyles, ...(style ?? {}) }),
    [themeVariables, style],
  );

  return (
    <div
      data-featuredrop-changelog-page
      className={className}
      style={containerStyles}
      dir={direction}
    >
      <a href={`#${listId}`} style={skipLinkStyles}>
        {translations.skipToEntries}
      </a>

      <div style={headerStyles}>
        <h2 style={{ margin: 0 }}>{translations.changelogTitle}</h2>
        {showSearch && (
          <input
            style={searchStyles}
            type="search"
            placeholder={translations.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search changelog updates"
          />
        )}
      </div>

      {showFilters && (
        <div style={filterBarStyles}>
          {allCategories.length > 0 && (
            <>
              <button
                type="button"
                style={activeCategory ? pillStyles : pillActiveStyles}
                onClick={() => setActiveCategory(null)}
              >
                {translations.allCategories}
              </button>
              {allCategories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  style={activeCategory === cat ? pillActiveStyles : pillStyles}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </>
          )}
          {["feature", "improvement", "fix", "breaking"].map((t) => (
            <button
              type="button"
              key={t}
              style={activeType === t ? pillActiveStyles : pillStyles}
              onClick={() => setActiveType((prev) => (prev === t ? null : t))}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "#6b7280" }}>
          {emptyState ?? translations.noUpdatesYet}
        </div>
      ) : (
        <div id={listId} onKeyDown={handleListKeyDown}>
          {renderList()}
          {paginationControls()}
        </div>
      )}
    </div>
  );
}
