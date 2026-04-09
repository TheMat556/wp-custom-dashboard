import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[WP React UI] Error in ${this.props.name}:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: 16,
            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
            color: "#64748b",
            fontSize: 13,
          }}
        >
          Something went wrong in {this.props.name}.
        </div>
      );
    }

    return this.props.children;
  }
}
