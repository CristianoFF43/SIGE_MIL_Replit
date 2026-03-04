import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    message: "",
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || "Falha inesperada ao carregar a página.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[APP ERROR BOUNDARY]", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-lg rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Falha ao carregar a página</h1>
            <p className="text-sm text-muted-foreground mt-2">
              O aplicativo encontrou um erro de renderização. Recarregue a página. Se o problema persistir, revise o último fluxo executado.
            </p>
          </div>
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground break-words">
            {this.state.message}
          </div>
          <Button onClick={() => window.location.reload()} data-testid="button-reload-after-error">
            Recarregar
          </Button>
        </div>
      </div>
    );
  }
}
