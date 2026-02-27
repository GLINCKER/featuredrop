import { useCallback, useMemo, useState } from "react";
import { useFeatureDrop } from "./use-feature-drop";
import { getTourController } from "../tour-registry";

export interface TourSequenceItem {
  featureId: string;
  tourId: string;
}

export interface UseTourSequencerResult {
  nextTourId: string | null;
  nextFeatureId: string | null;
  remainingTours: number;
  startNextTour: () => boolean;
}

export function useTourSequencer(sequence: TourSequenceItem[]): UseTourSequencerResult {
  const {
    newFeatures,
    canShowTour,
    markTourShown,
    markFeatureSeen,
  } = useFeatureDrop();
  const [startedFeatureIds, setStartedFeatureIds] = useState<Set<string>>(new Set());

  const visibleFeatureIds = useMemo(
    () => new Set(newFeatures.map((feature) => feature.id)),
    [newFeatures],
  );

  const remaining = useMemo(
    () =>
      sequence.filter(
        (item) =>
          visibleFeatureIds.has(item.featureId) &&
          !startedFeatureIds.has(item.featureId),
      ),
    [sequence, startedFeatureIds, visibleFeatureIds],
  );

  const next = remaining[0] ?? null;

  const startNextTour = useCallback((): boolean => {
    if (!next) return false;
    if (!canShowTour()) return false;
    const controller = getTourController(next.tourId);
    if (!controller) return false;
    setStartedFeatureIds((previous) => {
      if (previous.has(next.featureId)) return previous;
      const updated = new Set(previous);
      updated.add(next.featureId);
      return updated;
    });
    markFeatureSeen(next.featureId);
    markTourShown();
    controller.startTour();
    return true;
  }, [canShowTour, markFeatureSeen, markTourShown, next]);

  return {
    nextTourId: next?.tourId ?? null,
    nextFeatureId: next?.featureId ?? null,
    remainingTours: remaining.length,
    startNextTour,
  };
}
