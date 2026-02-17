"use client";
import React from "react";

interface SpinnerProps {
  size?: number;
  color?: string;
}

export function Spinner({ size = 24, color = "#0E7490" }: SpinnerProps) {
  return (
    <div
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `3px solid ${color}22`,
        borderTopColor: color,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}
