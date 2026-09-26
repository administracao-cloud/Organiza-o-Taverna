import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class AppErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-stone-50 dark:bg-[#1E1F22]">
          <h2 className="text-lg font-bold text-rose-700 dark:text-rose-400 mb-2">Ops! Algo deu errado.</h2>
          <p className="text-stone-600 dark:text-stone-400 mb-6 max-w-sm">
            Houve um problema ao carregar esta parte da aplicação. Por favor, tente recarregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#B86B77] text-white rounded-lg hover:bg-[#9E5460] transition-colors"
          >
            Recarregar Aplicativo
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
