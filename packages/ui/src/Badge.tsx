"use client";
import React from "react";

type BadgeVariant = "default" | "success" | "danger" | "warning" | "info";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: "#F3F4F6", color: "#374151" },
  success: { background: "#DCFCE7", color: "#166534" },
  danger: { background: "#FEE2E2", color: "#991B1B" },
  warning: { background: "#FEF9C3", color: "#854D0E" },
  info: { background: "#DBEAFE", color: "#1E40AF" },
};

export function Badge({ children, variant = "default", style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
