import { useCallback, useEffect, useMemo, useState } from "react";
import { getTourController, subscribeTourRegistry, type TourSnapshot } from "../tour-registry";

const EMPTY_SNAPSHOT: TourSnapshot = {
  isActive: false,
  currentStepIndex: -1,
  currentStep: null,
  totalSteps: 0,
};

export interface UseTourResult {
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  closeTour: () => void;
  currentStep: TourSnapshot["currentStep"];
  currentStepIndex: number;
  totalSteps: number;
  isActive: boolean;
}

function readSnapshot(id: string): TourSnapshot {
  const controller = getTourController(id);
  if (!controller) return EMPTY_SNAPSHOT;
  return controller.getSnapshot();
}

export function useTour(id: string): UseTourResult {
  const [snapshot, setSnapshot] = useState<TourSnapshot>(() => readSnapshot(id));

  useEffect(() => {
    let unsubscribeController: (() => void) | null = null;

    const bindController = (): void => {
      if (unsubscribeController) {
        unsubscribeController();
        unsubscribeController = null;
      }
      const controller = getTourController(id);
      if (!controller) {
        setSnapshot(EMPTY_SNAPSHOT);
        return;
      }
      setSnapshot(controller.getSnapshot());
      unsubscribeController = controller.subscribe(() => {
        setSnapshot(controller.getSnapshot());
      });
    };

    bindController();
    const unsubscribeRegistry = subscribeTourRegistry(id, bindController);
    return () => {
      unsubscribeRegistry();
      if (unsubscribeController) unsubscribeController();
    };
  }, [id]);

  const call = useCallback((method: keyof Omit<UseTourResult, "currentStep" | "currentStepIndex" | "totalSteps" | "isActive">) => {
    const controller = getTourController(id);
    if (!controller) return;
    controller[method]();
  }, [id]);

  return useMemo(
    () => ({
      startTour: () => call("startTour"),
      nextStep: () => call("nextStep"),
      prevStep: () => call("prevStep"),
      skipTour: () => call("skipTour"),
      closeTour: () => call("closeTour"),
      currentStep: snapshot.currentStep,
      currentStepIndex: snapshot.currentStepIndex,
      totalSteps: snapshot.totalSteps,
      isActive: snapshot.isActive,
    }),
    [call, snapshot],
  );
}
