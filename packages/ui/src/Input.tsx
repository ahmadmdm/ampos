"use client";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {label && <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}>{label}</label>}
      <input
        style={{
          padding: "8px 12px",
          borderRadius: "8px",
          border: `1px solid ${error ? "#DC2626" : "#D1D5DB"}`,
          fontSize: "0.9rem",
          outline: "none",
          transition: "border-color 0.15s",
          ...style,
        }}
        {...rest}
      />
      {error && <span style={{ fontSize: "0.8rem", color: "#DC2626" }}>{error}</span>}
    </div>
  );
}
