import React from 'react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : 'Unexpected error' };
  }

  componentDidCatch(err: unknown) {
    console.error('[ErrorBoundary]', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6" role="alert">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center shadow-xl">
            <h1 className="font-black text-slate-900 dark:text-white text-base">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h1>
            <p className="text-xs text-slate-500 mt-2 break-words">{this.state.message}</p>
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => this.setState({ hasError: false, message: '' })}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold"
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
