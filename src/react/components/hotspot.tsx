import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export interface HotspotProps {
  id: string;
  target: string;
  type?: "info" | "new" | "help";
  frequency?: "once" | "every-session" | "always";
  children: ReactNode;
}

export interface TooltipGroupProps {
  maxVisible?: number;
  children: ReactNode;
}

interface TooltipGroupContextValue {
  canOpen: (id: string) => boolean;
  markOpen: (id: string) => void;
  markClosed: (id: string) => void;
}

const TooltipGroupContext = createContext<TooltipGroupContextValue | null>(null);
const sessionDismissed = new Set<string>();

function onceStorageKey(id: string): string {
  return `featuredrop:hotspot:${id}:dismissed`;
}

function isDismissedOnce(id: string): boolean {
  const storage = globalThis.localStorage as unknown as {
    getItem?: (key: string) => string | null;
  };
  if (!storage || typeof storage.getItem !== "function") return false;
  try {
    return storage.getItem(onceStorageKey(id)) === "1";
  } catch {
    return false;
  }
}

function setDismissedOnce(id: string): void {
  const storage = globalThis.localStorage as unknown as {
    setItem?: (key: string, value: string) => void;
  };
  if (!storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(onceStorageKey(id), "1");
  } catch {
    // noop
  }
}

export function TooltipGroup({ maxVisible = 3, children }: TooltipGroupProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const openIdsRef = useRef(openIds);
  openIdsRef.current = openIds;

  const value = useMemo<TooltipGroupContextValue>(() => ({
    canOpen: (id: string) => {
      const current = openIdsRef.current;
      return current.has(id) || current.size < maxVisible;
    },
    markOpen: (id: string) => {
      const current = openIdsRef.current;
      if (current.has(id)) return;
      const next = new Set(current);
      next.add(id);
      openIdsRef.current = next;
      setOpenIds(next);
    },
    markClosed: (id: string) => {
      const current = openIdsRef.current;
      if (!current.has(id)) return;
      const next = new Set(current);
      next.delete(id);
      openIdsRef.current = next;
      setOpenIds(next);
    },
  }), [maxVisible]);

  useEffect(() => {
    openIdsRef.current = openIds;
  }, [openIds]);

  return (
    <TooltipGroupContext.Provider value={value}>
      {children}
    </TooltipGroupContext.Provider>
  );
}

const beaconTypeStyles: Record<NonNullable<HotspotProps["type"]>, CSSProperties> = {
  info: { background: "#3b82f6" },
  new: { background: "#10b981" },
  help: { background: "#f59e0b" },
};

const tooltipStyles: CSSProperties = {
  position: "fixed",
  zIndex: "var(--featuredrop-hotspot-z-index, 10001)" as unknown as number,
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  background: "#fff",
  padding: "10px 12px",
  boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
  width: "min(90vw, 280px)",
};

export function Hotspot({
  id,
  target,
  type = "info",
  frequency = "once",
  children,
}: HotspotProps) {
  const group = useContext(TooltipGroupContext);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const beaconRef = useRef<HTMLButtonElement>(null);
  const instanceIdRef = useRef(`featuredrop-hotspot-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    if (frequency === "once" && isDismissedOnce(id)) {
      setDismissed(true);
      return;
    }
    if (frequency === "every-session" && sessionDismissed.has(id)) {
      setDismissed(true);
    }
  }, [frequency, id]);

  useEffect(() => {
    const el = document.querySelector(target);
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [target]);

  const canOpen = useCallback(() => {
    if (dismissed) return false;
    if (!group) return true;
    return group.canOpen(id);
  }, [dismissed, group, id]);

  const openTooltip = useCallback(() => {
    if (!canOpen()) return;
    setOpen(true);
    group?.markOpen(id);
  }, [canOpen, group, id]);

  const closeTooltip = useCallback(() => {
    setOpen(false);
    group?.markClosed(id);
    const beacon = beaconRef.current;
    if (beacon) {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => beacon.focus());
      } else {
        beacon.focus();
      }
    }
  }, [group, id]);

  const dismissTooltip = useCallback(() => {
    setDismissed(true);
    closeTooltip();
    if (frequency === "once") {
      setDismissedOnce(id);
    } else if (frequency === "every-session") {
      sessionDismissed.add(id);
    }
  }, [closeTooltip, frequency, id]);

  useEffect(() => {
    return () => {
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
      group?.markClosed(id);
    };
  }, [group, id]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeTooltip();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeTooltip, open]);

  if (!rect || dismissed) return null;

  const tooltipTop = Math.min(window.innerHeight - 120, rect.bottom + 10);
  const tooltipLeft = Math.min(window.innerWidth - 300, Math.max(10, rect.left));
  const tooltipId = `${instanceIdRef.current}-tooltip`;

  return (
    <>
      <button
        ref={beaconRef}
        type="button"
        data-featuredrop-hotspot={id}
        aria-label={`Hotspot ${id}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={tooltipId}
        onMouseEnter={() => {
          hoverTimer.current = setTimeout(openTooltip, 120);
        }}
        onMouseLeave={() => {
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
        }}
        onClick={() => {
          if (open) closeTooltip();
          else openTooltip();
        }}
        style={{
          position: "fixed",
          top: rect.top - 6,
          left: rect.right - 6,
          width: "12px",
          height: "12px",
          borderRadius: "999px",
          border: "2px solid #fff",
          boxShadow: "0 0 0 2px rgba(17,24,39,0.1)",
          cursor: "pointer",
          zIndex: "var(--featuredrop-hotspot-beacon-z-index, 10000)" as unknown as number,
          ...beaconTypeStyles[type],
        }}
      />
      {open && (
        <div
          id={tooltipId}
          role="dialog"
          aria-modal="false"
          data-featuredrop-hotspot-tooltip={id}
          style={{ ...tooltipStyles, top: tooltipTop, left: tooltipLeft }}
          onMouseLeave={closeTooltip}
        >
          <div style={{ fontSize: "13px", color: "#374151", lineHeight: 1.5 }}>{children}</div>
          <button
            type="button"
            onClick={dismissTooltip}
            style={{
              marginTop: "8px",
              border: "none",
              background: "transparent",
              color: "#2563eb",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}
