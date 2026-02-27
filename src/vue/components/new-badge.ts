import {
  defineComponent,
  h,
  type CSSProperties,
  type PropType,
  type VNodeChild,
} from "vue";

export const NewBadge = defineComponent({
  name: "NewBadge",
  props: {
    variant: {
      type: String as PropType<"pill" | "dot" | "count">,
      default: "pill",
    },
    show: {
      type: Boolean,
      default: true,
    },
    count: {
      type: Number,
      required: false,
    },
    label: {
      type: String,
      default: "New",
    },
  },
  setup(props, { slots }) {
    return () => {
      if (slots.default) {
        return slots.default({ isNew: props.show });
      }
      if (!props.show) return null;

      const baseStyle: CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
      };

      let style: CSSProperties = baseStyle;
      let content: VNodeChild = props.label;
      if (props.variant === "dot") {
        style = {
          ...baseStyle,
          width: "8px",
          height: "8px",
          borderRadius: "9999px",
          backgroundColor: "var(--featuredrop-color, #f59e0b)",
        };
        content = null;
      } else if (props.variant === "count") {
        style = {
          ...baseStyle,
          minWidth: "18px",
          height: "18px",
          padding: "0 4px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 700,
          color: "var(--featuredrop-count-color, #fff)",
          backgroundColor: "var(--featuredrop-count-bg, #f59e0b)",
        };
        content = props.count ?? 0;
      } else {
        style = {
          ...baseStyle,
          padding: "2px 6px",
          borderRadius: "9999px",
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--featuredrop-color, #b45309)",
          backgroundColor: "var(--featuredrop-bg, rgba(245,158,11,0.15))",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        };
      }

      return h(
        "span",
        {
          "data-featuredrop": props.variant,
          style,
        },
        content ?? undefined,
      );
    };
  },
});
