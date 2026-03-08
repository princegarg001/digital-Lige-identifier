"use client";

import { Html } from "@react-three/drei";

/**
 * In-canvas loading spinner displayed while 3D models/textures load.
 * Rendered via drei Html component to overlay on the WebGL canvas.
 * Replaces the blank fallback={null} pattern.
 */
export function SceneLoader() {
  return (
    <Html center>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          color: "rgba(255,255,255,0.7)",
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          userSelect: "none",
        }}
      >
        {/* Minimalist CSS-only spinner */}
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "3px solid rgba(255,255,255,0.15)",
            borderTopColor: "rgba(34,211,238,0.8)",
            animation: "scene-spin 0.8s linear infinite",
          }}
        />
        <span>Loading&hellip;</span>
        <style>{`
          @keyframes scene-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </Html>
  );
}
