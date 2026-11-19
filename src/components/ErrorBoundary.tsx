import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#0B1220] p-6 text-slate-100">
          <div className="max-w-md w-full rounded-xl border border-slate-700 bg-[#11192B] p-6 shadow-2xl">
            <h2 className="font-display text-2xl font-bold tracking-wide text-amber-400">
              Matchday Recovery
            </h2>
            <p className="mt-2 text-sm text-slate-300 break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Reload Stadium
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
