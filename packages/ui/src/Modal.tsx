"use client";
import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: number;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 440 }: ModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "24px",
          width: "90%",
          maxWidth,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
        }}
      >
        {title && <h2 style={{ margin: "0 0 16px", fontSize: "1.15rem", fontWeight: 700, color: "#111827" }}>{title}</h2>}
        {children}
        {footer && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>{footer}</div>}
      </div>
    </div>
  );
}
