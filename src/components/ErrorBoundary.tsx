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
        <div className="waterdrop-card p-6 m-4 text-xs space-y-4">
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm">
              {this.props.fallbackTitle || 'Komponenten-Schutzschild ausgelöst'}
            </span>
          </div>
          <p className="text-[#2c4c70]">
            Ein Rendering-Fehler wurde isoliert und abgefangen, um die Stabilität des Dashboards zu wahren:
          </p>
          <div className="pearl-surface p-3 rounded-xl font-mono text-rose-800 overflow-x-auto text-[11px]">
            {this.state.error?.message || 'Unbekannter Ausnahmefehler'}
          </div>
          <button
            onClick={this.handleReset}
            className="waterdrop-btn-primary flex items-center gap-2 px-4 py-2 rounded-xl font-semibold cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Ansicht neu laden</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
