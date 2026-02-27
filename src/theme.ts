export interface FeatureDropTheme {
  colors: {
    primary: string;
    background: string;
    text: string;
    textMuted: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    family: string;
    sizeBase: string;
    sizeSm: string;
    sizeLg: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  radii: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
  zIndex: {
    base: number;
    tooltip: number;
    modal: number;
    overlay: number;
  };
}

export type FeatureDropThemePreset = "light" | "dark" | "auto" | "minimal" | "vibrant";

export type FeatureDropThemeOverrides = {
  [K in keyof FeatureDropTheme]?: Partial<FeatureDropTheme[K]>;
};

export type FeatureDropThemeInput =
  | FeatureDropThemePreset
  | FeatureDropThemeOverrides
  | FeatureDropTheme;

const LIGHT_THEME: FeatureDropTheme = {
  colors: {
    primary: "#2563eb",
    background: "#ffffff",
    text: "#111827",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    success: "#16a34a",
    warning: "#f59e0b",
    error: "#dc2626",
  },
  fonts: {
    family: "system-ui, -apple-system, Segoe UI, sans-serif",
    sizeBase: "14px",
    sizeSm: "12px",
    sizeLg: "16px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },
  radii: {
    sm: "6px",
    md: "8px",
    lg: "12px",
    full: "999px",
  },
  shadows: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.08)",
    md: "0 8px 24px rgba(0, 0, 0, 0.12)",
    lg: "0 20px 60px rgba(0, 0, 0, 0.16)",
  },
  zIndex: {
    base: 9998,
    tooltip: 10000,
    modal: 10001,
    overlay: 9997,
  },
};

const DARK_THEME: FeatureDropTheme = {
  ...LIGHT_THEME,
  colors: {
    primary: "#60a5fa",
    background: "#0b1220",
    text: "#f3f4f6",
    textMuted: "#9ca3af",
    border: "#1f2937",
    success: "#4ade80",
    warning: "#fbbf24",
    error: "#f87171",
  },
  shadows: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.35)",
    md: "0 8px 24px rgba(0, 0, 0, 0.42)",
    lg: "0 20px 60px rgba(0, 0, 0, 0.52)",
  },
};

const MINIMAL_THEME: FeatureDropTheme = {
  ...LIGHT_THEME,
  colors: {
    ...LIGHT_THEME.colors,
    primary: "#111827",
    background: "#ffffff",
    text: "#111827",
    textMuted: "#6b7280",
    border: "#d1d5db",
    success: "#111827",
    warning: "#111827",
    error: "#111827",
  },
  shadows: {
    sm: "none",
    md: "none",
    lg: "none",
  },
  radii: {
    sm: "0",
    md: "0",
    lg: "0",
    full: "0",
  },
};

const VIBRANT_THEME: FeatureDropTheme = {
  ...LIGHT_THEME,
  colors: {
    primary: "#ec4899",
    background: "#fff7ed",
    text: "#3f1d57",
    textMuted: "#6d4c84",
    border: "#fdba74",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
  },
  shadows: {
    sm: "0 2px 10px rgba(236, 72, 153, 0.15)",
    md: "0 10px 26px rgba(236, 72, 153, 0.22)",
    lg: "0 22px 58px rgba(236, 72, 153, 0.28)",
  },
};

export const FEATUREDROP_THEMES = {
  light: LIGHT_THEME,
  dark: DARK_THEME,
  minimal: MINIMAL_THEME,
  vibrant: VIBRANT_THEME,
} as const;

function isThemePreset(value: unknown): value is FeatureDropThemePreset {
  return (
    value === "light" ||
    value === "dark" ||
    value === "auto" ||
    value === "minimal" ||
    value === "vibrant"
  );
}

function mergeTheme(base: FeatureDropTheme, overrides?: FeatureDropThemeOverrides): FeatureDropTheme {
  if (!overrides) return base;
  return {
    colors: {
      ...base.colors,
      ...(overrides.colors ?? {}),
    },
    fonts: {
      ...base.fonts,
      ...(overrides.fonts ?? {}),
    },
    spacing: {
      ...base.spacing,
      ...(overrides.spacing ?? {}),
    },
    radii: {
      ...base.radii,
      ...(overrides.radii ?? {}),
    },
    shadows: {
      ...base.shadows,
      ...(overrides.shadows ?? {}),
    },
    zIndex: {
      ...base.zIndex,
      ...(overrides.zIndex ?? {}),
    },
  };
}

export function createTheme(overrides: FeatureDropThemeOverrides, base: FeatureDropTheme = LIGHT_THEME): FeatureDropTheme {
  return mergeTheme(base, overrides);
}

export function resolveTheme(
  input: FeatureDropThemeInput = "light",
  options: { prefersDark?: boolean } = {},
): FeatureDropTheme {
  if (isThemePreset(input)) {
    if (input === "auto") {
      return options.prefersDark ? DARK_THEME : LIGHT_THEME;
    }
    return FEATUREDROP_THEMES[input];
  }
  return mergeTheme(LIGHT_THEME, input);
}

function applyThemeSection(
  vars: Record<string, string | number>,
  key: string,
  values: Record<string, string | number>,
): void {
  for (const [token, value] of Object.entries(values)) {
    vars[`--featuredrop-${key}-${token}`] = value;
  }
}

export function themeToCSSVariables(theme: FeatureDropTheme): Record<string, string | number> {
  const vars: Record<string, string | number> = {};

  applyThemeSection(vars, "color", theme.colors);
  applyThemeSection(vars, "font", theme.fonts);
  applyThemeSection(vars, "space", theme.spacing);
  applyThemeSection(vars, "radius", theme.radii);
  applyThemeSection(vars, "shadow", theme.shadows);
  applyThemeSection(vars, "z", theme.zIndex as Record<string, number>);

  vars["--featuredrop-font-family"] = theme.fonts.family;
  vars["--featuredrop-widget-bg"] = theme.colors.background;
  vars["--featuredrop-trigger-bg"] = theme.colors.background;
  vars["--featuredrop-trigger-color"] = theme.colors.text;
  vars["--featuredrop-entry-title-color"] = theme.colors.text;
  vars["--featuredrop-entry-desc-color"] = theme.colors.textMuted;
  vars["--featuredrop-title-color"] = theme.colors.text;
  vars["--featuredrop-border-color"] = theme.colors.border;
  vars["--featuredrop-cta-bg"] = theme.colors.primary;
  vars["--featuredrop-cta-color"] = theme.colors.background;
  vars["--featuredrop-mark-all-color"] = theme.colors.primary;
  vars["--featuredrop-widget-shadow"] = theme.shadows.md;
  vars["--featuredrop-widget-radius"] = theme.radii.lg;
  vars["--featuredrop-trigger-radius"] = theme.radii.md;
  vars["--featuredrop-badge-bg"] = theme.colors.warning;
  vars["--featuredrop-z-index"] = theme.zIndex.base;
  vars["--featuredrop-toast-z-index"] = theme.zIndex.tooltip;
  vars["--featuredrop-tour-z-index"] = theme.zIndex.modal;
  vars["--featuredrop-tour-overlay-z-index"] = theme.zIndex.overlay;

  return vars;
}
