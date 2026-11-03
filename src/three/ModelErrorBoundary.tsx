'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  /** Changing this clears the error (e.g. after "Retry" or a vehicle switch). */
  resetKey?: string | number;
}

export class ModelErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[3D] Model failed to load:', error);
    this.props.onError?.(error);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    return this.state.error ? this.props.fallback ?? null : this.props.children;
  }
}
