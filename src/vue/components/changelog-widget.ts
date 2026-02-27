import { defineComponent, h, ref, type PropType } from "vue";
import type { AnalyticsCallbacks, FeatureEntry } from "../../types";
import { parseDescription } from "../../markdown";
import { useFeatureDrop } from "../composables/use-feature-drop";

export const ChangelogWidget = defineComponent({
  name: "ChangelogWidget",
  props: {
    title: {
      type: String,
      default: "What's New",
    },
    triggerLabel: {
      type: String,
      default: "What's New",
    },
    showCount: {
      type: Boolean,
      default: true,
    },
    analytics: {
      type: Object as PropType<AnalyticsCallbacks>,
      required: false,
    },
  },
  setup(props, { slots }) {
    const { newFeaturesSorted, newCount, dismiss, dismissAll } = useFeatureDrop();
    const isOpen = ref(false);

    const close = (): void => {
      isOpen.value = false;
      props.analytics?.onWidgetClosed?.();
    };

    const open = (): void => {
      isOpen.value = true;
      props.analytics?.onWidgetOpened?.();
    };

    const toggle = (): void => {
      if (isOpen.value) close();
      else open();
    };

    const renderEntry = (feature: FeatureEntry) => {
      if (slots.entry) {
        return slots.entry({ feature, dismiss: () => dismiss(feature.id) });
      }
      return h("div", { style: { padding: "10px 0", borderBottom: "1px solid #e5e7eb" } }, [
        h("p", { style: { margin: "0 0 4px", fontWeight: 600 } }, feature.label),
        feature.description
          ? h("div", {
              style: { margin: "0 0 6px", color: "#6b7280", fontSize: "13px", lineHeight: 1.5 },
              innerHTML: parseDescription(feature.description),
            })
          : null,
        h(
          "button",
          {
            onClick: () => dismiss(feature.id),
            style: {
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: "6px",
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: "12px",
            },
          },
          "Dismiss",
        ),
      ]);
    };

    return () => {
      if (slots.default) {
        return slots.default({
          isOpen: isOpen.value,
          toggle,
          open,
          close,
          features: newFeaturesSorted.value,
          count: newCount.value,
          dismiss,
          dismissAll,
        });
      }

      return h("div", { "data-featuredrop-widget": true }, [
        h(
          "button",
          {
            onClick: toggle,
            style: {
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              border: "1px solid #d1d5db",
              background: "#fff",
              borderRadius: "10px",
              padding: "8px 12px",
              cursor: "pointer",
            },
          },
          [
            props.triggerLabel,
            props.showCount && newCount.value > 0
              ? h(
                  "span",
                  {
                    style: {
                      display: "inline-flex",
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "999px",
                      background: "#f59e0b",
                      color: "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "0 4px",
                    },
                  },
                  String(newCount.value),
                )
              : null,
          ],
        ),
        isOpen.value
          ? h(
              "div",
              {
                role: "dialog",
                style: {
                  marginTop: "8px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  background: "#fff",
                  padding: "12px",
                  minWidth: "300px",
                },
              },
              [
                h("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "8px" } }, [
                  h("strong", props.title),
                  h("button", { onClick: close, style: { border: "none", background: "transparent", cursor: "pointer" } }, "x"),
                ]),
                newFeaturesSorted.value.length === 0
                  ? h("p", { style: { margin: 0, color: "#6b7280" } }, "You're all caught up!")
                  : newFeaturesSorted.value.map((feature) => renderEntry(feature)),
                newFeaturesSorted.value.length > 0
                  ? h(
                      "button",
                      {
                        onClick: () => void dismissAll(),
                        style: {
                          marginTop: "10px",
                          border: "none",
                          background: "transparent",
                          color: "#2563eb",
                          cursor: "pointer",
                          padding: 0,
                        },
                      },
                      "Mark all as read",
                    )
                  : null,
              ],
            )
          : null,
      ]);
    };
  },
});
