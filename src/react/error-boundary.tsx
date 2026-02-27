import {
  Component,
  useCallback,
  useContext,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { FeatureDropContext } from "./context";

interface BoundaryProps {
  children: ReactNode;
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface BoundaryState {
  hasError: boolean;
}

class FeatureDropComponentBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { hasError: false };

  override componentDidCatch(error: unknown, info: ErrorInfo): void {
    this.setState({ hasError: true });
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export function withFeatureDropBoundary<Props extends object>(
  ComponentImpl: ComponentType<Props>,
  componentName: string,
): ComponentType<Props> {
  function Wrapped(props: Props) {
    const context = useContext(FeatureDropContext);
    const onError = useCallback(
      (error: unknown, info: ErrorInfo) => {
        context?.reportError(error, {
          component: componentName,
          componentStack: info.componentStack ?? undefined,
        });
      },
      [context],
    );

    return (
      <FeatureDropComponentBoundary onError={onError}>
        <ComponentImpl {...props} />
      </FeatureDropComponentBoundary>
    );
  }

  Wrapped.displayName = `FeatureDropBoundary(${componentName})`;
  return Wrapped;
}
