import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

/* ═══════════════════════════════════════════════
   Error Boundary — Catches runtime errors in child
   components and displays a friendly fallback UI
   instead of a white screen crash.
   ═══════════════════════════════════════════════ */

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Context label for error reporting */
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary${this.props.context ? `: ${this.props.context}` : ''}]`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-3xl shadow-xl border border-red-100 max-w-md w-full p-8 text-center space-y-5">
            {/* Icon */}
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl mx-auto flex items-center justify-center border border-red-100">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h2 className="text-lg font-extrabold text-gray-900">Đã xảy ra lỗi</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                {this.props.context
                  ? `Lỗi tại module "${this.props.context}". `
                  : ''}
                Tính năng này gặp sự cố. Vui lòng thử lại hoặc quay về trang chủ.
              </p>
            </div>

            {/* Error details (collapsed) */}
            {this.state.error && (
              <details className="text-left bg-red-50 rounded-xl p-3 border border-red-100">
                <summary className="text-xs font-bold text-red-600 cursor-pointer">
                  Chi tiết lỗi kỹ thuật
                </summary>
                <pre className="mt-2 text-[10px] text-red-800 overflow-auto max-h-32 whitespace-pre-wrap font-mono">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack
                    ? `\n\nComponent Stack:${this.state.errorInfo.componentStack}`
                    : ''}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-md"
              >
                <RotateCcw className="w-4 h-4" />
                Thử Lại
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Home className="w-4 h-4" />
                Trang Chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
