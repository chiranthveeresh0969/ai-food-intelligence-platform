import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  AlertTriangle,
  Camera,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import type { RecognitionResult } from "../types/api";

interface UploadPanelProps {
  selectedFile: File | null;
  previewUrl: string | null;
  isAnalyzing: boolean;
  error: string | null;
  recognition: RecognitionResult | null;
  onFileSelect: (file: File) => void;
  onAnalyze: () => void;
  onReset: () => void;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function UploadPanel({
  selectedFile,
  previewUrl,
  isAnalyzing,
  error,
  recognition,
  onFileSelect,
  onAnalyze,
  onReset,
}: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateAndEmit = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Please upload a JPEG, PNG, or WebP food photo.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLocalError("Image exceeds the 10 MB limit. Please choose a smaller photo.");
      return;
    }
    setLocalError(null);
    onFileSelect(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndEmit(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    validateAndEmit(event.dataTransfer.files?.[0]);
  };

  const activeError = localError || error;

  return (
    <section className="rounded-3xl border border-zinc-800/90 bg-zinc-950/80 p-6 backdrop-blur-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-emerald-400 uppercase">
            Step 01 · Visual Capture
          </p>
          <h2 className="mt-1 font-serif text-3xl tracking-tight text-white">
            Upload Your Meal
          </h2>
        </div>

        {selectedFile && (
          <button
            type="button"
            onClick={onReset}
            disabled={isAnalyzing}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload food photograph"
      />

      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`group flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition ${
            isDragging
              ? "border-emerald-400 bg-emerald-500/10"
              : "border-zinc-700/80 bg-zinc-900/40 hover:border-zinc-500 hover:bg-zinc-900/70"
          }`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-emerald-400 transition group-hover:scale-105 group-hover:border-emerald-500/60">
            <Upload className="h-6 w-6" />
          </div>
          <p className="text-base font-medium text-zinc-100">
            Drop a food photograph here, or click to browse
          </p>
          <p className="mt-1.5 max-w-sm text-sm text-zinc-400">
            Supports single items or multi-dish Indian and international plates. JPEG, PNG, or WebP up to 10 MB.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 transition group-hover:bg-zinc-200">
            <Camera className="h-4 w-4" />
            Choose Image
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black">
            <img
              src={previewUrl}
              alt={selectedFile?.name || "Uploaded meal preview"}
              className="max-h-80 w-full object-contain"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-xs">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                <p className="text-sm font-medium text-zinc-100">
                  Identifying visible food items...
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
            <div className="truncate">
              <span className="font-medium text-zinc-200">{selectedFile?.name}</span>
              {selectedFile && (
                <span className="ml-2 tabular-nums">({formatBytes(selectedFile.size)})</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isAnalyzing}
              className="font-medium text-emerald-400 transition hover:text-emerald-300 disabled:opacity-50"
            >
              Change photo
            </button>
          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running Vision Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {recognition ? "Re-Analyze Plate" : "Identify Foods in Image"}
              </>
            )}
          </button>
        </div>
      )}

      {activeError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-sm text-rose-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{activeError}</span>
        </div>
      )}

      {recognition && (
        <div className="mt-4 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">
              Provider: <strong className="text-zinc-200">{recognition.provider}</strong>
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1">
              Model: <strong className="text-zinc-200">{recognition.model_used}</strong>
            </span>
            {recognition.image_metadata && (
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 tabular-nums">
                Normalized: {recognition.image_metadata.processed_width}×
                {recognition.image_metadata.processed_height} (
                {formatBytes(recognition.image_metadata.processed_size_bytes)})
              </span>
            )}
          </div>

          {recognition.warning && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span>{recognition.warning}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}