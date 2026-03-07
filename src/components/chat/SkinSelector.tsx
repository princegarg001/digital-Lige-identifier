"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SKIN_PRESETS, createNanoBananaPreset, SkinPreset } from "@/lib/skinConfig";
import { Upload, Wand2, Sparkles, RefreshCw, Check, ImageIcon } from "lucide-react";

interface SkinSelectorProps {
  selectedSkinId: string | null;
  onSkinChange: (preset: SkinPreset) => void;
}

const DEFAULT_PROMPT = `Photorealistic human skin texture for a 3D avatar head. Neutral studio lighting. No hair, no clothing. Natural pores and subtle skin color variation. PBR albedo map, even illumination, no shadows baked in.`;

export function SkinSelector({ selectedSkinId, onSkinChange }: SkinSelectorProps) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedMime, setGeneratedMime] = useState<string>("image/png");
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedMime, setUploadedMime] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Portrait upload handler ─────────────────────────────────────────────
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedName(file.name);
    setUploadedMime(file.type);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      // Strip "data:image/xxx;base64," prefix to get raw base64
      const base64 = dataUrl.split(",")[1];
      setUploadedImage(base64);
    };
    reader.readAsDataURL(file);
  }, []);

  // ── Nano Banana 2 generation ────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const body: Record<string, string> = { prompt };
      if (uploadedImage && uploadedMime) {
        body.imageBase64 = uploadedImage;
        body.mimeType = uploadedMime;
      }

      const res = await fetch("/api/generate-skin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Generation failed. Try a different prompt.");
        return;
      }

      setGeneratedImage(data.imageBase64);
      setGeneratedMime(data.mimeType ?? "image/png");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, uploadedImage, uploadedMime]);

  // ── Apply AI-generated skin to avatar ──────────────────────────────────
  const handleApplyGenerated = useCallback(() => {
    if (!generatedImage) return;
    const dataUrl = `data:${generatedMime};base64,${generatedImage}`;
    const preset = createNanoBananaPreset(dataUrl);
    onSkinChange(preset);
  }, [generatedImage, generatedMime, onSkinChange]);

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1 min-h-0">

      {/* ── Preset Skin Grid ──────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2.5">
          Preset Skins
        </p>
        <div className="grid grid-cols-5 gap-2">
          {SKIN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              title={preset.description}
              onClick={() => onSkinChange(preset)}
              className={cn(
                "group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-200",
                selectedSkinId === preset.id
                  ? "border-cyan-400/60 bg-cyan-400/10 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                  : "border-white/8 bg-white/4 hover:border-white/20 hover:bg-white/8"
              )}
            >
              {/* Color swatch */}
              <div
                className="w-8 h-8 rounded-full shadow-inner ring-1 ring-black/20 transition-transform duration-200 group-hover:scale-110"
                style={{ backgroundColor: preset.color }}
              />
              <span className="text-[9px] font-medium text-muted-foreground/80 leading-tight text-center">
                {preset.label.split(" ")[0]}
              </span>
              {selectedSkinId === preset.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-black" strokeWidth={3} />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-white/8" />
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-widest">
          <Sparkles className="w-2.5 h-2.5" />
          AI Generate
        </div>
        <div className="flex-1 h-px bg-white/8" />
      </div>

      {/* ── Portrait Upload ───────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2">
          Reference Portrait <span className="text-muted-foreground/40 normal-case font-normal">(optional)</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="skin-portrait-upload"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all duration-200 text-left",
            uploadedImage
              ? "border-emerald-400/40 bg-emerald-400/8"
              : "border-dashed border-white/15 bg-white/4 hover:border-white/30 hover:bg-white/8"
          )}
        >
          {uploadedImage ? (
            <>
              {/* Thumbnail preview — base64 data URLs can't use next/image, disable lint */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${uploadedMime};base64,${uploadedImage}`}
                alt="portrait"
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/20"
              />
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[11px] font-medium text-emerald-400 truncate">
                  {uploadedName}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  Click to change
                </span>
              </div>
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 text-muted-foreground/60" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium text-muted-foreground/80">
                  Upload portrait
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  Matches skin tone from photo
                </span>
              </div>
              <Upload className="w-3.5 h-3.5 text-muted-foreground/40 ml-auto shrink-0" />
            </>
          )}
        </button>
      </div>

      {/* ── Prompt Input ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-2">
          Skin Prompt
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Describe the skin texture you want..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[11px] text-foreground/90 placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-cyan-400/40 focus:bg-white/8 transition-all duration-200"
        />
      </div>

      {/* ── Generate Button ───────────────────────────────────────── */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className={cn(
          "relative w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-xs transition-all duration-300",
          isGenerating
            ? "bg-white/8 border border-white/10 text-muted-foreground cursor-not-allowed"
            : "bg-linear-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-[0_4px_20px_rgba(139,92,246,0.35)] hover:shadow-[0_4px_28px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        {isGenerating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Generating with Nano Banana 2…
          </>
        ) : (
          <>
            <Wand2 className="w-3.5 h-3.5" />
            Generate Skin with AI
          </>
        )}
        {/* shimmer overlay */}
        {!isGenerating && (
          <div className="absolute inset-0 rounded-xl bg-linear-to-r from-white/0 via-white/10 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}
      </button>

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-[11px] text-red-400 leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Generated Preview ─────────────────────────────────────── */}
      {generatedImage && (
        <div className="rounded-xl overflow-hidden border border-violet-400/20 bg-violet-400/5">
          <div className="p-2 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">
              Nano Banana 2 Result
            </span>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:${generatedMime};base64,${generatedImage}`}
            alt="Generated skin texture"
            className="w-full aspect-square object-cover"
          />
          <div className="p-2">
            <button
              onClick={handleApplyGenerated}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                selectedSkinId === "nano-banana"
                  ? "bg-cyan-400/20 text-cyan-400 border border-cyan-400/30"
                  : "bg-violet-600 text-white hover:bg-violet-500"
              )}
            >
              {selectedSkinId === "nano-banana" ? (
                <><Check className="w-3 h-3" /> Applied to Avatar</>
              ) : (
                <><Wand2 className="w-3 h-3" /> Apply to Avatar</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Footer hint ──────────────────────────────────────────── */}
      <p className="text-[9px] text-muted-foreground/30 text-center leading-relaxed mt-auto">
        Powered by Gemini Nano Banana 2 · gemini-3.1-flash-image-preview
      </p>
    </div>
  );
}
