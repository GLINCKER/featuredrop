import { computed, defineComponent, h, type PropType } from "vue";
import type { AnalyticsCallbacks } from "../../types";
import { parseDescription } from "../../markdown";
import { useFeatureDrop } from "../composables/use-feature-drop";

export const Banner = defineComponent({
  name: "Banner",
  props: {
    featureId: {
      type: String,
      required: true,
    },
    dismissible: {
      type: Boolean,
      default: true,
    },
    analytics: {
      type: Object as PropType<AnalyticsCallbacks>,
      required: false,
    },
  },
  setup(props, { slots }) {
    const { newFeatures, dismiss } = useFeatureDrop();
    const feature = computed(() => newFeatures.value.find((f) => f.id === props.featureId));

    return () => {
      if (slots.default) {
        return slots.default({
          feature: feature.value,
          isActive: !!feature.value,
          dismiss: () => dismiss(props.featureId),
        });
      }
      if (!feature.value) return null;

      return h(
        "div",
        {
          "data-featuredrop-banner": true,
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            border: "1px solid #fbbf24",
            background: "#fffbeb",
            color: "#92400e",
            borderRadius: "10px",
            padding: "10px 12px",
          },
        },
        [
          h("div", [
            h("strong", feature.value.label),
            feature.value.description
              ? h("span", {
                  style: { marginLeft: "6px" },
                  innerHTML: parseDescription(feature.value.description),
                })
              : null,
          ]),
          props.dismissible
            ? h(
                "button",
                {
                  onClick: () => {
                    dismiss(props.featureId);
                    props.analytics?.onFeatureDismissed?.(feature.value!);
                  },
                  style: {
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: "16px",
                    lineHeight: 1,
                  },
                },
                "x",
              )
            : null,
        ],
      );
    };
  },
});
