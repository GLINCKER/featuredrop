import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  hasUserVoted,
  listFeatureRequests,
  voteFeatureRequest,
  type FeatureRequestRecord,
} from "../feature-request-store";

export interface FeatureRequestButtonRenderProps {
  votes: number;
  hasVoted: boolean;
  vote: () => void;
  request: FeatureRequestRecord | null;
}

export interface FeatureRequestButtonProps {
  featureId: string;
  requestId?: string;
  requestTitle?: string;
  label?: string;
  onVote?: (result: { voted: boolean; request: FeatureRequestRecord }) => void;
  className?: string;
  style?: CSSProperties;
  children?: (props: FeatureRequestButtonRenderProps) => ReactNode;
}

const buttonStyles: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: "999px",
  padding: "6px 12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  fontWeight: 600,
};

function getRequest(options: { requestId?: string; featureId: string }): FeatureRequestRecord | null {
  const requests = listFeatureRequests("votes");
  if (options.requestId) {
    return requests.find((request) => request.id === options.requestId) ?? null;
  }
  return requests.find((request) => request.featureId === options.featureId) ?? null;
}

export function FeatureRequestButton({
  featureId,
  requestId,
  requestTitle,
  label = "Vote",
  onVote,
  className,
  style,
  children,
}: FeatureRequestButtonProps) {
  const [request, setRequest] = useState<FeatureRequestRecord | null>(() =>
    getRequest({ requestId, featureId }),
  );
  const [hasVotedState, setHasVotedState] = useState<boolean>(() =>
    hasUserVoted({ requestId, featureId }),
  );

  useEffect(() => {
    setRequest(getRequest({ requestId, featureId }));
    setHasVotedState(hasUserVoted({ requestId, featureId }));
  }, [featureId, requestId]);

  const votes = request?.votes ?? 0;

  const vote = useCallback(() => {
    const result = voteFeatureRequest({
      requestId,
      featureId,
      defaultTitle: requestTitle,
    });
    if (!result) return;
    setRequest(result.request);
    if (result.voted) setHasVotedState(true);
    onVote?.(result);
  }, [featureId, onVote, requestId, requestTitle]);

  const renderProps: FeatureRequestButtonRenderProps = useMemo(
    () => ({
      votes,
      hasVoted: hasVotedState,
      vote,
      request,
    }),
    [hasVotedState, request, vote, votes],
  );

  if (children) {
    return <>{children(renderProps)}</>;
  }

  return (
    <button
      type="button"
      onClick={vote}
      data-featuredrop-request-vote={featureId}
      className={className}
      style={{ ...buttonStyles, ...style }}
    >
      <span>{hasVotedState ? "Voted" : label}</span>
      <span>({votes})</span>
    </button>
  );
}
