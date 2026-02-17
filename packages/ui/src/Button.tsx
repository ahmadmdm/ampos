"use client";
import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: { background: "#0E7490", color: "#fff", border: "none" },
  secondary: { background: "#F3F4F6", color: "#374151", border: "1px solid #D1D5DB" },
  danger: { background: "#DC2626", color: "#fff", border: "none" },
  ghost: { background: "transparent", color: "#374151", border: "none" },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "0.8rem" },
  md: { padding: "8px 16px", fontSize: "0.9rem" },
  lg: { padding: "12px 24px", fontSize: "1rem" },
};

export function Button({ variant = "primary", size = "md", loading, children, style, disabled, ...rest }: ButtonProps) {
  return (
    <button
      style={{
        borderRadius: "8px",
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        transition: "opacity 0.15s, transform 0.1s",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />}
      {children}
    </button>
  );
}
