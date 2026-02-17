"use client";
import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: "40px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⚠️</div>
          <h3 style={{ margin: "0 0 8px", color: "#991B1B" }}>حدث خطأ غير متوقع</h3>
          <p style={{ color: "#6B7280", fontSize: "0.9rem", marginBottom: 16 }}>
            {this.state.error?.message || "يرجى تحديث الصفحة والمحاولة مرة أخرى"}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: undefined }); window.location.reload(); }}
            style={{ padding: "8px 20px", borderRadius: "8px", background: "#0E7490", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
