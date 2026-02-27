import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSurveyController,
  subscribeSurveyRegistry,
  type SurveySnapshot,
} from "../survey-registry";
import type { SurveyType } from "../components/survey";

const EMPTY_SNAPSHOT: SurveySnapshot = {
  exists: false,
  isOpen: false,
  submitted: false,
  canShow: false,
  type: "custom",
};

export interface UseSurveyResult {
  show: (options?: { force?: boolean }) => boolean;
  hide: () => void;
  askLater: () => void;
  isOpen: boolean;
  submitted: boolean;
  canShow: boolean;
  type: SurveyType;
}

function readSnapshot(id: string): SurveySnapshot {
  const controller = getSurveyController(id);
  if (!controller) return EMPTY_SNAPSHOT;
  return controller.getSnapshot();
}

export function useSurvey(id: string): UseSurveyResult {
  const [snapshot, setSnapshot] = useState<SurveySnapshot>(() => readSnapshot(id));

  useEffect(() => {
    let unsubscribeController: (() => void) | null = null;

    const bind = (): void => {
      if (unsubscribeController) {
        unsubscribeController();
        unsubscribeController = null;
      }
      const controller = getSurveyController(id);
      if (!controller) {
        setSnapshot(EMPTY_SNAPSHOT);
        return;
      }
      setSnapshot(controller.getSnapshot());
      unsubscribeController = controller.subscribe(() => {
        setSnapshot(controller.getSnapshot());
      });
    };

    bind();
    const unsubscribeRegistry = subscribeSurveyRegistry(id, bind);
    return () => {
      unsubscribeRegistry();
      if (unsubscribeController) unsubscribeController();
    };
  }, [id]);

  const show = useCallback((options?: { force?: boolean }): boolean => {
    const controller = getSurveyController(id);
    if (!controller) return false;
    return controller.show(options);
  }, [id]);

  const hide = useCallback(() => {
    getSurveyController(id)?.hide();
  }, [id]);

  const askLater = useCallback(() => {
    getSurveyController(id)?.askLater();
  }, [id]);

  return useMemo(
    () => ({
      show,
      hide,
      askLater,
      isOpen: snapshot.isOpen,
      submitted: snapshot.submitted,
      canShow: snapshot.canShow,
      type: snapshot.type,
    }),
    [askLater, hide, show, snapshot],
  );
}
