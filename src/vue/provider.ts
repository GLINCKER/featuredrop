import {
  computed,
  defineComponent,
  provide,
  ref,
  watch,
  type PropType,
} from "vue";
import { getNewFeatures, hasNewFeature } from "../core";
import { FeatureDropVueContextKey } from "./context";
import type {
  AnalyticsCallbacks,
  AudienceMatchFn,
  FeatureManifest,
  StorageAdapter,
  UserContext,
} from "../types";

export const FeatureDropProvider = defineComponent({
  name: "FeatureDropProvider",
  props: {
    manifest: {
      type: Array as PropType<FeatureManifest>,
      required: true,
    },
    storage: {
      type: Object as PropType<StorageAdapter>,
      required: true,
    },
    analytics: {
      type: Object as PropType<AnalyticsCallbacks>,
      required: false,
    },
    userContext: {
      type: Object as PropType<UserContext>,
      required: false,
    },
    matchAudience: {
      type: Function as PropType<AudienceMatchFn>,
      required: false,
    },
    appVersion: {
      type: String,
      required: false,
    },
  },
  setup(props, { slots }) {
    const newFeatures = ref(
      getNewFeatures(
        props.manifest,
        props.storage,
        new Date(),
        props.userContext,
        props.matchAudience,
        props.appVersion,
      ),
    );

    const recompute = (): void => {
      newFeatures.value = getNewFeatures(
        props.manifest,
        props.storage,
        new Date(),
        props.userContext,
        props.matchAudience,
        props.appVersion,
      );
    };

    watch(
      () => [props.manifest, props.storage, props.userContext, props.matchAudience, props.appVersion],
      recompute,
      { deep: false },
    );

    const dismiss = (id: string): void => {
      const feature = newFeatures.value.find((f) => f.id === id);
      props.storage.dismiss(id);
      if (feature) {
        props.analytics?.onFeatureDismissed?.(feature);
      }
      recompute();
    };

    const dismissAll = async (): Promise<void> => {
      await props.storage.dismissAll(new Date());
      newFeatures.value = [];
      props.analytics?.onAllDismissed?.();
    };

    const newCount = computed(() => newFeatures.value.length);
    const newFeaturesSorted = computed(() => {
      const priorityOrder = { critical: 0, normal: 1, low: 2 };
      return [...newFeatures.value].sort((a, b) => {
        const pa = priorityOrder[a.priority ?? "normal"];
        const pb = priorityOrder[b.priority ?? "normal"];
        if (pa !== pb) return pa - pb;
        return new Date(b.releasedAt).getTime() - new Date(a.releasedAt).getTime();
      });
    });

    const getFeature = (sidebarKey: string) =>
      newFeatures.value.find((f) => f.sidebarKey === sidebarKey);

    const isNewFn = (sidebarKey: string) =>
      hasNewFeature(
        props.manifest,
        sidebarKey,
        props.storage,
        new Date(),
        props.userContext,
        props.matchAudience,
        props.appVersion,
      );

    provide(FeatureDropVueContextKey, {
      manifest: props.manifest,
      newFeatures,
      newCount,
      newFeaturesSorted,
      isNew: isNewFn,
      dismiss,
      dismissAll,
      getFeature,
    });

    return () => slots.default?.();
  },
});
