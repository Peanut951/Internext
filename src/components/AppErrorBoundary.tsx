import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

type BoundaryProps = {
  children: ReactNode;
};

type BoundaryState = {
  hasError: boolean;
};

class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Internext page render failed", error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section className="section-padding bg-background">
        <div className="container-custom">
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h1 className="text-xl font-bold text-foreground">This page could not be displayed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Reload the page to retrieve the latest Internext content.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Reload Page
              </button>
              <a
                href="/"
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground"
              >
                Return Home
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }
}

const RouteErrorBoundary = ({ children }: BoundaryProps) => {
  const location = useLocation();
  return <AppErrorBoundary key={`${location.pathname}${location.search}`}>{children}</AppErrorBoundary>;
};

export default RouteErrorBoundary;
