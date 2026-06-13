"use client";

import Script from "next/script";
import { useRef, useState, useEffect } from "react";
import { Paperclip, X } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export function SceneGenerator() {
  const [threeReady, setThreeReady] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progressLines, setProgressLines] = useState<string[]>([]);
  const [threejsCode, setThreejsCode] = useState<string | null>(null);
  const [validationScore, setValidationScore] = useState<number | null>(null);
  const [validationFeedback, setValidationFeedback] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);

  // Execute generated Three.js code whenever it changes.
  // Deferred via rAF so the canvas is visible and has real dimensions.
  useEffect(() => {
    if (!threejsCode || !canvasRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = (window as any).THREE;
    if (!THREE) return;

    if (disposeRef.current) {
      disposeRef.current();
      disposeRef.current = null;
    }

    const code = threejsCode;
    const rafId = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Match canvas pixel dimensions to its CSS display size
      canvas.width = canvas.clientWidth || 640;
      canvas.height = canvas.clientHeight || 360;

      try {
        // The agent emits a named `function init(canvas){...}` — append the
        // call so new Function actually runs it and returns the dispose fn.
        const wrappedCode = code.includes("function init")
          ? code + "\nif (typeof init === 'function') return init(canvas);"
          : code;
        const dispose = new Function("THREE", "canvas", wrappedCode)(
          THREE,
          canvas
        );
        if (typeof dispose === "function") {
          disposeRef.current = dispose;
        }
      } catch (err) {
        console.error("Three.js execution error:", err);
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [threejsCode]);

  // THREE may already be in the browser cache — onLoad won't fire in that case
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).THREE) setThreeReady(true);
  }, []);

  // Clean up Three.js scene on unmount
  useEffect(() => {
    return () => {
      disposeRef.current?.();
    };
  }, []);

  function attachFile(file: File | null) {
    if (!file || (!file.type.startsWith("image/jpeg") && file.type !== "image/png")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    attachFile(e.target.files?.[0] ?? null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    attachFile(e.dataTransfer.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt && !imageFile) return;

    if (disposeRef.current) {
      disposeRef.current();
      disposeRef.current = null;
    }

    setStatus("loading");
    setProgressLines([]);
    setThreejsCode(null);
    setValidationScore(null);
    setValidationFeedback(null);

    const formData = new FormData();
    if (prompt) formData.append("prompt", prompt);
    if (imageFile) formData.append("image", imageFile);

    let finalStatus: Status = "loading";

    try {
      const res = await fetch("/api/generate-scene", {
        method: "POST",
        body: formData,
      });

      if (!res.ok || !res.body) {
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let currentEvent = "";
      let currentData = "";

      const processEvent = (eventType: string, data: string) => {
        if (!data || !eventType) return;
        try {
          const parsed = JSON.parse(data);
          if (eventType === "progress") {
            setProgressLines((prev) => [...prev, parsed.message]);
          } else if (eventType === "result") {
            setThreejsCode(parsed.threejs_code);
            setValidationScore(parsed.validation_score ?? null);
            setValidationFeedback(parsed.validation_feedback ?? null);
            finalStatus = "success";
            setStatus("success");
          } else if (eventType === "error") {
            setProgressLines((prev) => [...prev, `Error: ${parsed.message}`]);
            finalStatus = "error";
            setStatus("error");
          }
        } catch {
          // malformed event data
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (line === "") {
            processEvent(currentEvent, currentData);
            currentEvent = "";
            currentData = "";
          } else if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            currentData += line.slice(5).trim();
          }
        }
      }

      // Flush any final event still in buffer
      processEvent(currentEvent, currentData);

      if (finalStatus === "loading") setStatus("error");
    } catch (err) {
      setProgressLines((prev) => [...prev, `Connection error: ${String(err)}`]);
      setStatus("error");
    }
  }

  const canSubmit = !!(prompt || imageFile) && status !== "loading" && threeReady;

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        onLoad={() => setThreeReady(true)}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Unified prompt + image input */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border rounded-lg transition-colors bg-white ${
            isDragging
              ? "border-blue-400 border-2 bg-blue-50"
              : "border-gray-300"
          }`}
        >
          <textarea
            id="scene-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe a scene, drop an image, or both…"
            className="w-full px-3 pt-3 pb-10 bg-transparent focus:outline-none text-sm font-sans resize-none rounded-lg"
          />

          {/* Bottom toolbar */}
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
            {/* Image thumbnail */}
            {imagePreview && (
              <div className="relative shrink-0">
                <img
                  src={imagePreview}
                  alt="Attached"
                  className="h-10 w-10 object-cover rounded border border-gray-200"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 bg-gray-600 text-white rounded-full p-0.5 hover:bg-gray-800"
                  aria-label="Remove image"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            {/* Paperclip */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Attach image"
            >
              <Paperclip size={16} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-sans text-sm font-medium"
          >
            {status === "loading" ? "Generating…" : "Generate Scene"}
          </button>
          {!threeReady && (
            <span className="text-xs text-gray-400 font-sans">Loading renderer…</span>
          )}
        </div>
      </form>

      {/* Progress log */}
      {progressLines.length > 0 && (
        <ul className="mt-5 space-y-1">
          {progressLines.map((msg, i) => (
            <li key={i} className="text-sm text-gray-600 font-sans">
              {msg}
            </li>
          ))}
        </ul>
      )}

      {status === "error" && progressLines.length === 0 && (
        <p className="mt-5 text-sm text-red-600 font-sans">
          Something went wrong. Please try again.
        </p>
      )}

      {/* Three.js canvas */}
      <div className={`mt-6 ${status === "success" ? "block" : "hidden"}`}>
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg border border-gray-200"
          style={{ aspectRatio: "16/9" }}
        />

        {validationScore !== null && (
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-sans shrink-0 ${
                validationScore >= 80
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              Score: {validationScore}/100
            </span>
            {validationFeedback && (
              <p className="text-sm text-gray-600 font-sans">{validationFeedback}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
