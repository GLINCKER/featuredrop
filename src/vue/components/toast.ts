import { computed, defineComponent, h } from "vue";
import { parseDescription } from "../../markdown";
import { useFeatureDrop } from "../composables/use-feature-drop";

export const Toast = defineComponent({
  name: "Toast",
  props: {
    maxVisible: {
      type: Number,
      default: 3,
    },
  },
  setup(props, { slots }) {
    const { newFeaturesSorted, dismiss } = useFeatureDrop();
    const visible = computed(() => newFeaturesSorted.value.slice(0, props.maxVisible));

    return () => {
      if (slots.default) {
        return slots.default({
          toasts: visible.value,
          dismiss,
        });
      }
      if (visible.value.length === 0) return null;

      return h(
        "div",
        {
          "data-featuredrop-toast-container": true,
          style: {
            position: "fixed",
            right: "16px",
            bottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 40,
          },
        },
        visible.value.map((feature) =>
          h("div", {
            key: feature.id,
            style: {
              width: "320px",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              background: "#fff",
              padding: "10px 12px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            },
          }, [
            h("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px" } }, [
              h("strong", feature.label),
              h(
                "button",
                {
                  onClick: () => dismiss(feature.id),
                  style: { border: "none", background: "transparent", cursor: "pointer" },
                },
                "x",
              ),
            ]),
            feature.description
              ? h("div", {
                  style: { marginTop: "4px", color: "#6b7280", fontSize: "13px" },
                  innerHTML: parseDescription(feature.description),
                })
              : null,
          ]),
        ),
      );
    };
  },
});
