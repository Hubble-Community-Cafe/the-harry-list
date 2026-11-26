import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/react';

interface Props {
  children: ReactNode;
  /** Optional icon above the message (the admin shows a warning sign). */
  icon?: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Last-resort screen for a render crash: reports it to Sentry and offers a reload. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-dark-900 border border-dark-800 rounded-xl p-8 text-center">
            {this.props.icon}
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-dark-400 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary btn-sm"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
