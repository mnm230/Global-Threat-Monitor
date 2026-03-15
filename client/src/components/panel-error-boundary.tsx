import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

export class PanelErrorBoundary extends Component<{ children: ReactNode; panelName?: string; icon?: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; panelName?: string; icon?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Panel error (${this.props.panelName || 'unknown'}):`, error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-card/50 text-muted-foreground" data-testid={`panel-error-${this.props.panelName || 'unknown'}`}>
          <div className="text-center p-4">
            {this.props.icon || <TriangleAlert className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />}
            <p className="text-xs font-mono mt-2">{this.props.panelName || 'Panel'} Error</p>
            <p className="text-[11px] mt-1 text-muted-foreground/60">Failed to render component</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 px-3 py-1 text-[11px] font-mono bg-primary/10 border border-primary/30 rounded hover:bg-primary/20 text-primary transition-colors"
              data-testid={`button-retry-${this.props.panelName || 'unknown'}`}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const MapErrorBoundary = PanelErrorBoundary;
