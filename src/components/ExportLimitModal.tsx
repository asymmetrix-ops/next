"use client";

import React from "react";

interface ExportLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportsLeft: number;
  totalExports: number;
}

export const ExportLimitModal: React.FC<ExportLimitModalProps> = ({
  isOpen,
  onClose,
  exportsLeft,
  totalExports,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "24px",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#1a202c",
            marginBottom: "16px",
            marginTop: "0",
          }}
        >
          Export Limit Reached
        </h2>
        <p
          style={{
            fontSize: "16px",
            color: "#4a5568",
            marginBottom: "12px",
            lineHeight: "1.5",
          }}
        >
          Exports left this month: {exportsLeft} out of {totalExports}
        </p>
        <p
          style={{
            fontSize: "14px",
            color: "#718096",
            marginBottom: "20px",
            lineHeight: "1.5",
          }}
        >
          Your quota will reset next month. Please contact your Account Manager
          to discuss larger downloads.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#0075df",
              color: "white",
              fontWeight: "600",
              padding: "10px 24px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
            }}
            onMouseOver={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#005bb5";
            }}
            onMouseOut={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = "#0075df";
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

