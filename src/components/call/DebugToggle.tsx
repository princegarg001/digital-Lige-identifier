import React from "react";

export function DebugToggle({
  debugMode,
  setDebugMode,
}: {
  debugMode: boolean;
  setDebugMode: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <button
      id="debug-mode-toggle"
      onClick={() => setDebugMode((v) => !v)}
      title={debugMode ? "Disable camera debug mode" : "Enable camera debug mode"}
      style={{
        position: "absolute",
        top: "calc(1.5rem + 12rem + 8px)", // Below the smaller 48-height PiP cam
        right: "1.5rem",
        zIndex: 20,
        padding: "5px 10px",
        background: debugMode
          ? "rgba(34,211,238,0.18)"
          : "rgba(255,255,255,0.06)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${
          debugMode ? "rgba(34,211,238,0.5)" : "rgba(255,255,255,0.12)"
        }`,
        borderRadius: "8px",
        color: debugMode ? "#22d3ee" : "#94a3b8",
        fontSize: "11px",
        fontFamily: "ui-monospace, monospace",
        fontWeight: 600,
        letterSpacing: "0.05em",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        gap: "5px",
      }}
    >
      ⚙ {debugMode ? "Config ON" : "Config"}
    </button>
  );
}
