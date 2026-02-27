import { getNewFeaturesSorted, hasNewFeature } from "../core";
import { LocalStorageAdapter } from "../adapters";
import type {
  AudienceMatchFn,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "../types";

const SafeHTMLElement: typeof HTMLElement = typeof HTMLElement === "undefined"
  ? (class {} as unknown as typeof HTMLElement)
  : HTMLElement;

export interface WebComponentsConfig {
  manifest: FeatureManifest;
  storage?: StorageAdapter;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
}

export interface RegisterWebComponentsOptions {
  badgeTag?: string;
  changelogTag?: string;
}

interface RuntimeConfig {
  manifest: FeatureManifest;
  storage: StorageAdapter;
  userContext?: UserContext;
  matchAudience?: AudienceMatchFn;
  appVersion?: string;
}

let runtimeConfig: RuntimeConfig | null = null;
let defaultStorage: StorageAdapter | null = null;
const badgeInstances = new Set<FeatureDropBadgeElement>();
const changelogInstances = new Set<FeatureDropChangelogElement>();

function getDefaultStorage(): StorageAdapter {
  if (!defaultStorage) {
    defaultStorage = new LocalStorageAdapter({ prefix: "featuredrop:web-components" });
  }
  return defaultStorage;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getRuntimeConfig(): RuntimeConfig | null {
  return runtimeConfig;
}

function renderAllComponents(): void {
  for (const badge of badgeInstances) badge.render();
  for (const changelog of changelogInstances) changelog.render();
}

export function configureFeatureDropWebComponents(config: WebComponentsConfig): void {
  runtimeConfig = {
    manifest: config.manifest,
    storage: config.storage ?? getDefaultStorage(),
    userContext: config.userContext,
    matchAudience: config.matchAudience,
    appVersion: config.appVersion,
  };
  renderAllComponents();
}

export function refreshFeatureDropWebComponents(): void {
  renderAllComponents();
}

export class FeatureDropBadgeElement extends SafeHTMLElement {
  static get observedAttributes(): string[] {
    return ["sidebar-key", "variant"];
  }

  connectedCallback(): void {
    badgeInstances.add(this);
    if (!this.shadowRoot && "attachShadow" in this) {
      this.attachShadow({ mode: "open" });
    }
    this.render();
  }

  disconnectedCallback(): void {
    badgeInstances.delete(this);
  }

  attributeChangedCallback(): void {
    this.render();
  }

  render(): void {
    if (!this.shadowRoot) return;
    const sidebarKey = this.getAttribute("sidebar-key");
    const variant = this.getAttribute("variant") ?? "pill";
    const config = getRuntimeConfig();
    if (!sidebarKey || !config) {
      this.shadowRoot.innerHTML = "";
      return;
    }

    const isNew = hasNewFeature(
      config.manifest,
      sidebarKey,
      config.storage,
      new Date(),
      config.userContext,
      config.matchAudience,
      config.appVersion,
    );
    if (!isNew) {
      this.shadowRoot.innerHTML = "";
      return;
    }

    const count = getNewFeaturesSorted(
      config.manifest,
      config.storage,
      new Date(),
      config.userContext,
      config.matchAudience,
      config.appVersion,
    ).filter((entry) => entry.sidebarKey === sidebarKey).length;

    const content = variant === "dot"
      ? `<span class="dot" part="dot"></span>`
      : variant === "count"
        ? `<span class="count" part="count">${count}</span>`
        : `<span class="pill" part="pill">New</span>`;

    this.shadowRoot.innerHTML = `
      <style>
        .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 12px; font-weight: 600; background: #f59e0b; color: #fff; }
        .count { display: inline-grid; place-items: center; min-width: 18px; height: 18px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #dc2626; color: #fff; padding: 0 6px; }
        .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; }
      </style>
      ${content}
    `;
  }
}

export class FeatureDropChangelogElement extends SafeHTMLElement {
  static get observedAttributes(): string[] {
    return ["title", "trigger-label", "position"];
  }

  private isOpen = false;
  private cleanupClick: (() => void) | null = null;

  connectedCallback(): void {
    changelogInstances.add(this);
    if (!this.shadowRoot && "attachShadow" in this) {
      this.attachShadow({ mode: "open" });
    }
    const onClick = (event: Event): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const actionTarget = target.closest("[data-action]") as HTMLElement | null;
      if (!actionTarget) return;
      const action = actionTarget.getAttribute("data-action");
      if (action === "toggle") {
        this.isOpen = !this.isOpen;
        this.render();
        return;
      }
      if (action === "dismiss-all") {
        void this.dismissAll();
        return;
      }
      if (action === "dismiss-one") {
        const id = actionTarget.getAttribute("data-id");
        if (id) this.dismissOne(id);
      }
    };
    this.shadowRoot?.addEventListener("click", onClick);
    this.cleanupClick = () => this.shadowRoot?.removeEventListener("click", onClick);
    this.render();
  }

  disconnectedCallback(): void {
    changelogInstances.delete(this);
    this.cleanupClick?.();
    this.cleanupClick = null;
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private dismissOne(id: string): void {
    const config = getRuntimeConfig();
    if (!config) return;
    config.storage.dismiss(id);
    renderAllComponents();
  }

  private async dismissAll(): Promise<void> {
    const config = getRuntimeConfig();
    if (!config) return;
    await config.storage.dismissAll(new Date());
    renderAllComponents();
  }

  render(): void {
    if (!this.shadowRoot) return;
    const config = getRuntimeConfig();
    if (!config) {
      this.shadowRoot.innerHTML = "";
      return;
    }

    const title = this.getAttribute("title") ?? "What's New";
    const triggerLabel = this.getAttribute("trigger-label") ?? "What's New";
    const position = this.getAttribute("position") === "left" ? "left: 16px;" : "right: 16px;";
    const entries = getNewFeaturesSorted(
      config.manifest,
      config.storage,
      new Date(),
      config.userContext,
      config.matchAudience,
      config.appVersion,
    );

    const list = entries.length === 0
      ? `<p class="empty">You're all caught up.</p>`
      : entries
        .map((entry) => `
          <li class="item">
            <div class="item-title">${escapeHtml(entry.label)}</div>
            ${entry.description ? `<p class="item-desc">${escapeHtml(entry.description)}</p>` : ""}
            <button data-action="dismiss-one" data-id="${escapeHtml(entry.id)}" class="ghost">Mark read</button>
          </li>
        `)
        .join("");

    this.shadowRoot.innerHTML = `
      <style>
        .trigger { border: 1px solid #d1d5db; background: #fff; border-radius: 8px; padding: 8px 12px; cursor: pointer; font-weight: 600; font-size: 13px; }
        .panel { position: fixed; top: 70px; ${position} width: min(92vw, 360px); max-height: 70vh; overflow: auto; border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.16); z-index: 10000; }
        .header { display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .title { margin: 0; font-size: 14px; }
        .list { list-style: none; margin: 0; padding: 10px 12px 12px; display: grid; gap: 10px; }
        .item { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
        .item-title { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
        .item-desc { margin: 0 0 8px; color: #4b5563; font-size: 12px; }
        .empty { margin: 0; padding: 14px 12px; color: #6b7280; font-size: 13px; }
        .ghost { border: 1px solid #d1d5db; background: #fff; border-radius: 8px; padding: 5px 8px; cursor: pointer; font-size: 12px; }
      </style>
      <button data-action="toggle" class="trigger">${escapeHtml(triggerLabel)} (${entries.length})</button>
      ${this.isOpen ? `
        <section class="panel">
          <div class="header">
            <h3 class="title">${escapeHtml(title)}</h3>
            <button data-action="dismiss-all" class="ghost">Mark all read</button>
          </div>
          <ul class="list">${list}</ul>
        </section>
      ` : ""}
    `;
  }
}

export function registerFeatureDropWebComponents(
  options: RegisterWebComponentsOptions = {},
): { badgeTag: string; changelogTag: string } {
  const badgeTag = options.badgeTag ?? "feature-drop-badge";
  const changelogTag = options.changelogTag ?? "feature-drop-changelog";

  if (typeof customElements === "undefined") {
    return { badgeTag, changelogTag };
  }

  if (!customElements.get(badgeTag)) {
    customElements.define(badgeTag, FeatureDropBadgeElement);
  }
  if (!customElements.get(changelogTag)) {
    customElements.define(changelogTag, FeatureDropChangelogElement);
  }

  return { badgeTag, changelogTag };
}
