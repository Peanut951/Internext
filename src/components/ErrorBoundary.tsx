import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: string;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Internext page error", error, info);
  }

  componentDidUpdate(previousProps: ErrorBoundaryProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-background px-6 py-16">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 shadow-card">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Something went wrong
          </p>
          <h1 className="mt-3 text-3xl font-bold text-foreground">This page could not continue.</h1>
          <p className="mt-3 text-muted-foreground">
            Please refresh the page. Your cart is stored in your browser and should still be available.
          </p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
