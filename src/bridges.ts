import { generateRSS } from "./rss";
import type { FeatureEntry, FeatureManifest } from "./types";

async function postJson(url: string, payload: unknown, headers?: Record<string, string>): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(headers ?? {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`[featuredrop] Bridge request failed (${response.status}) for ${url}`);
  }
}

function formatFeatureLine(feature: FeatureEntry): string {
  const released = new Date(feature.releasedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `${feature.label} (${released})`;
}

export interface SlackBridgeOptions {
  webhookUrl: string;
  username?: string;
  iconEmoji?: string;
  channel?: string;
  formatter?: (feature: FeatureEntry) => Record<string, unknown>;
}

export const SlackBridge = {
  async notify(feature: FeatureEntry, options: SlackBridgeOptions): Promise<void> {
    const payload = options.formatter
      ? options.formatter(feature)
      : {
          username: options.username,
          icon_emoji: options.iconEmoji,
          channel: options.channel,
          text: `New feature published: *${feature.label}*`,
          attachments: [
            {
              color: "#2563eb",
              title: feature.label,
              text: feature.description ?? "No description provided.",
              title_link: feature.url,
              footer: `featuredrop | ${feature.id}`,
            },
          ],
        };
    await postJson(options.webhookUrl, payload);
  },
};

export interface DiscordBridgeOptions {
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
  formatter?: (feature: FeatureEntry) => Record<string, unknown>;
}

export const DiscordBridge = {
  async notify(feature: FeatureEntry, options: DiscordBridgeOptions): Promise<void> {
    const payload = options.formatter
      ? options.formatter(feature)
      : {
          username: options.username ?? "featuredrop",
          avatar_url: options.avatarUrl,
          embeds: [
            {
              title: feature.label,
              description: feature.description ?? "No description provided.",
              url: feature.url,
              color: 0x2563eb,
              footer: {
                text: `featuredrop | ${feature.id}`,
              },
            },
          ],
        };
    await postJson(options.webhookUrl, payload);
  },
};

export interface WebhookBridgeOptions {
  url: string;
  headers?: Record<string, string>;
  event?: string;
  body?: Record<string, unknown>;
}

export const WebhookBridge = {
  async post(feature: FeatureEntry, options: WebhookBridgeOptions): Promise<void> {
    const payload = {
      event: options.event ?? "feature.published",
      feature,
      sentAt: new Date().toISOString(),
      ...(options.body ?? {}),
    };
    await postJson(options.url, payload, options.headers);
  },
};

export interface EmailDigestGeneratorOptions {
  title?: string;
  intro?: string;
  template?: "default" | "minimal";
  productName?: string;
}

export const EmailDigestGenerator = {
  generate(features: readonly FeatureEntry[], options: EmailDigestGeneratorOptions = {}): string {
    const title = options.title ?? "Product Updates";
    const intro = options.intro ?? "Here are the latest updates:";
    const productName = options.productName ?? "Your Product";
    const template = options.template ?? "default";

    const listItems = features
      .map((feature) => {
        const safeLabel = feature.label.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeDescription = (feature.description ?? "")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        const link = feature.url
          ? `<a href="${feature.url}" style="color:#2563eb;text-decoration:none;">Read more</a>`
          : "";

        if (template === "minimal") {
          return `<li><strong>${safeLabel}</strong>${safeDescription ? ` - ${safeDescription}` : ""}</li>`;
        }

        return [
          "<li style=\"margin:0 0 14px;\">",
          `<p style="margin:0 0 4px;font-weight:600;color:#111827;">${safeLabel}</p>`,
          safeDescription
            ? `<p style="margin:0 0 6px;color:#4b5563;line-height:1.45;">${safeDescription}</p>`
            : "",
          link ? `<p style="margin:0;">${link}</p>` : "",
          "</li>",
        ].join("");
      })
      .join("");

    if (template === "minimal") {
      return [
        "<!doctype html>",
        "<html><body>",
        `<h2>${title}</h2>`,
        `<p>${intro}</p>`,
        `<ul>${listItems}</ul>`,
        "</body></html>",
      ].join("");
    }

    const summary = features.map((feature) => formatFeatureLine(feature)).join(" | ");
    return [
      "<!doctype html>",
      "<html>",
      "<body style=\"font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;padding:20px;\">",
      "<div style=\"max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;\">",
      `<p style="margin:0 0 12px;color:#6b7280;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;">${productName}</p>`,
      `<h1 style="margin:0 0 8px;font-size:22px;color:#111827;">${title}</h1>`,
      `<p style="margin:0 0 14px;color:#374151;">${intro}</p>`,
      `<p style="margin:0 0 18px;color:#6b7280;font-size:13px;">${summary}</p>`,
      `<ul style="padding-left:18px;margin:0;">${listItems}</ul>`,
      "</div>",
      "</body>",
      "</html>",
    ].join("");
  },
};

export interface RSSFeedGeneratorOptions {
  title?: string;
  link?: string;
  description?: string;
}

export const RSSFeedGenerator = {
  generate(manifest: FeatureManifest, options?: RSSFeedGeneratorOptions): string {
    return generateRSS(manifest, options);
  },
};
