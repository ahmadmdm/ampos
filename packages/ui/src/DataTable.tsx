"use client";
import React from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
}

export function DataTable<T extends Record<string, any>>({ columns, data, keyField = "id", onRowClick, emptyText = "لا توجد بيانات" }: DataTableProps<T>) {
  if (data.length === 0) {
    return <div style={{ textAlign: "center", padding: "40px 20px", color: "#9CA3AF", fontSize: "0.95rem" }}>{emptyText}</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: "right", padding: "10px 12px", fontSize: "0.8rem", fontWeight: 600, color: "#6B7280", borderBottom: "1px solid #E5E7EB", whiteSpace: "nowrap", width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row[keyField]}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? "pointer" : undefined, transition: "background 0.1s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F9FAFB")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "")}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "10px 12px", fontSize: "0.9rem", borderBottom: "1px solid #F3F4F6" }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
