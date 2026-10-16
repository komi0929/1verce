import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in 1verce application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch {}
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#FFFFFF] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#121212] border border-[#2C2C2E] rounded-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#E50914]/15 border border-[#E50914]/40 flex items-center justify-center mx-auto text-[#E50914]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h1 className="font-display text-xl font-bold tracking-tight text-[#FFFFFF]">
                APPLICATION ERROR // 1VERCE
              </h1>
              <p className="text-xs font-jp text-[#8E8E93]">
                予期せぬランタイムエラーが発生しました。ページを再読み込みするか、ストレージをリセットしてください。
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded bg-[#FFFFFF] hover:bg-[#E5E5EA] text-[#0A0A0A] text-xs font-mono-tech font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RELOAD PAGE</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="px-4 py-2 rounded bg-[#1A1A1A] hover:bg-[#2C2C2E] border border-[#3A3A3C] text-[#8E8E93] hover:text-[#FFFFFF] text-xs font-mono-tech transition-colors cursor-pointer"
              >
                RESET CACHE
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
