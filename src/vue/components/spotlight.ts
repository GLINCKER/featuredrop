import { computed, defineComponent, h, ref } from "vue";
import { parseDescription } from "../../markdown";
import { useFeatureDrop } from "../composables/use-feature-drop";

export const Spotlight = defineComponent({
  name: "Spotlight",
  props: {
    featureId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: "New feature",
    },
  },
  setup(props, { slots }) {
    const { newFeatures, dismiss } = useFeatureDrop();
    const open = ref(false);
    const feature = computed(() => newFeatures.value.find((f) => f.id === props.featureId));

    return () => {
      if (slots.default) {
        return slots.default({
          feature: feature.value,
          isActive: !!feature.value,
          isTooltipOpen: open.value,
          openTooltip: () => {
            open.value = true;
          },
          closeTooltip: () => {
            open.value = false;
          },
          dismiss: () => dismiss(props.featureId),
        });
      }
      if (!feature.value) return null;

      return h("div", { "data-featuredrop-spotlight": true, style: { display: "inline-block", position: "relative" } }, [
        h(
          "button",
          {
            onClick: () => {
              open.value = !open.value;
            },
            style: {
              width: "20px",
              height: "20px",
              borderRadius: "9999px",
              border: "2px solid #f59e0b",
              background: "#fff",
              cursor: "pointer",
            },
            "aria-label": props.label,
          },
          "",
        ),
        open.value
          ? h(
              "div",
              {
                style: {
                  position: "absolute",
                  top: "24px",
                  left: 0,
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  background: "#fff",
                  padding: "10px",
                  width: "240px",
                  zIndex: 30,
                },
              },
              [
                h("p", { style: { margin: "0 0 4px", fontWeight: 600 } }, feature.value.label),
                feature.value.description
                  ? h("div", {
                      style: { marginBottom: "8px", color: "#6b7280", fontSize: "13px" },
                      innerHTML: parseDescription(feature.value.description),
                    })
                  : null,
                h(
                  "button",
                  {
                    onClick: () => {
                      dismiss(props.featureId);
                      open.value = false;
                    },
                    style: {
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      cursor: "pointer",
                    },
                  },
                  "Got it",
                ),
              ],
            )
          : null,
      ]);
    };
  },
});
