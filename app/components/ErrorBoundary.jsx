import React from "react";
import { createT } from "../i18n";
import { readIdentity } from "../utils/identity";

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
      return (
        <div className="uu-error">
          <h2 className="uu-error-title">
            {createT(String((readIdentity()?.lang || 'fr')).trim())('errorBoundary.title')}
          </h2>
          <pre className="uu-error-pre">
            {String(
              (this.state.error && this.state.error.message) || this.state.error
            )}
          </pre>
          {this.state.info?.componentStack && (
            <details className="uu-error-details" open>
              <summary>
                {createT(String((readIdentity()?.lang || 'fr')).trim())('errorBoundary.stackSummary')}
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
