import { theme } from "antd";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Inner functional component so the error UI can access Ant Design theme tokens. */
function ErrorDisplay({ name }: { name: string }) {
  const { token } = theme.useToken();
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: 16,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        color: token.colorTextDescription,
        fontSize: 13,
      }}
    >
      Something went wrong in {name}.
    </div>
  );
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
      return <ErrorDisplay name={this.props.name} />;
    }

    return this.props.children;
  }
}
