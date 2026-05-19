import React from "react";
import { getComponentT } from "./componentTranslator";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
  }
  render() {
    if (this.state.error) {
      const t = getComponentT();
      return (
        <div className="uu-error">
          <h2 className="uu-error-title">
            {t('errorBoundary.title')}
          </h2>
          <pre className="uu-error-pre">
            {String(
              (this.state.error && this.state.error.message) || this.state.error
            )}
          </pre>
          {this.state.info?.componentStack && (
            <details className="uu-error-details" open>
              <summary>
                {t('errorBoundary.stackSummary')}
              </summary>
              <pre className="uu-error-pre">
                {this.state.info.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
