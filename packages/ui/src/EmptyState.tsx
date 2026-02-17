"use client";
import React from "react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "📭", title, description, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: "3rem", marginBottom: 12 }}>{icon}</div>
      <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 700, color: "#374151" }}>{title}</h3>
      {description && <p style={{ margin: "0 0 16px", fontSize: "0.9rem", color: "#9CA3AF" }}>{description}</p>}
      {action}
    </div>
  );
}
