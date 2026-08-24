import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 m-4 rounded-xl bg-slate-900 border border-rose-800/60 font-mono text-xs space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-rose-400 font-bold">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">
              {this.props.fallbackTitle || 'Komponenten-Schutzschild ausgelöst'}
            </span>
          </div>
          <p className="text-slate-300">
            Ein Rendering-Fehler wurde isoliert und abgefangen, um einen Totalabsturz des Dashboards zu verhindern:
          </p>
          <div className="p-3 bg-slate-950 rounded border border-slate-800 text-rose-300 overflow-x-auto text-[11px]">
            {this.state.error?.message || 'Unbekannter Ausnahmefehler'}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold cursor-pointer transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Komponente neu laden</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
