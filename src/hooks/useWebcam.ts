"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AUDIO_CONFIG } from "@/lib/constants";

/**
 * Manages the webcam stream and captures frames at 1 FPS as base64 JPEG.
 */
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const onFrameRef = useRef<((base64: string) => void) | null>(null);

  const start = useCallback(async () => {
    setPermissionError(null);
    try {
      // Explicitly check permissions on browsers that support it
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const perm = await navigator.permissions.query({ name: "camera" as PermissionName });
          if (perm.state === "denied") {
            throw new Error("Camera access is explicitly denied in browser settings.");
          }
        } catch (e) {
          // Ignore if browser doesn't support 'camera' permission query
          console.log("[Webcam] Permission query skipped:", e);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Create an offscreen canvas for frame capture
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }

      // Capture frames at configured FPS
      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", AUDIO_CONFIG.video_quality);
        // Strip the data:image/jpeg;base64, prefix
        const base64 = dataUrl.split(",")[1];
        onFrameRef.current?.(base64);
      }, 1000 / AUDIO_CONFIG.video_fps);

      setIsActive(true);
      return true;
    } catch (err) {
      console.error("[Webcam] Error starting camera:", err);
      let errorMsg = "Could not access camera.";
      if (err instanceof DOMException) {
        if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errorMsg = "No camera found. Please plug one in.";
        } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errorMsg = "Camera access was denied. Please allow it in settings.";
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMsg = "Camera is already in use by another application.";
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      setPermissionError(errorMsg);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, isActive, permissionError, start, stop, onFrameRef };
}
