import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/error-reporter';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError({
      message: error.message,
      stack: error.stack,
      context: `ErrorBoundary${info.componentStack ? ` — ${info.componentStack.slice(0, 500)}` : ''}`,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="error-boundary">
        <div className="error-boundary-content">
          <div className="error-boundary-icon" aria-hidden="true">!</div>
          <h1 className="error-boundary-title">Something went wrong</h1>
          <p className="error-boundary-message">
            {this.state.error.message || 'An unexpected error occurred.'}
          </p>
          <div className="error-boundary-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={this.handleReload}
            >
              Reload app
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={this.handleGoHome}
            >
              Go home
            </button>
          </div>
        </div>
      </div>
    );
  }
}
