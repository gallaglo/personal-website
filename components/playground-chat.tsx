"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Sparkles, X } from "lucide-react";

// ---------- Types ----------

type UserMessage = {
  id: string;
  role: "user";
  text: string;
  imagePreview?: string;
};

type AssistantMessage = {
  id: string;
  role: "assistant";
  status: "thinking" | "streaming" | "done" | "error";
  progressLines: string[];
  threejsCode?: string;
  validationScore?: number;
  validationFeedback?: string;
};

type Message = UserMessage | AssistantMessage;

// ---------- SceneCanvas ----------

function SceneCanvas({ code }: { code: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const THREE = (window as any).THREE;
    if (!THREE || !canvasRef.current) return;

    disposeRef.current?.();
    disposeRef.current = null;

    const canvas = canvasRef.current;
    let raf1: number, raf2: number;

    // Double rAF: the canvas mounts fresh when code arrives, so clientWidth is
    // 0 until the browser completes layout. Two frames is enough for that.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!canvasRef.current) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width) || 640;
        canvas.height = Math.round(rect.height) || 360;
        try {
          const wrapped = code.includes("function init")
            ? code + "\nif (typeof init === 'function') return init(canvas);"
            : code;
          const dispose = new Function("THREE", "canvas", wrapped)(THREE, canvas);
          if (typeof dispose === "function") disposeRef.current = dispose;
        } catch (err) {
          console.error("Three.js execution error:", err);
        }
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      disposeRef.current?.();
      disposeRef.current = null;
    };
  }, [code]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full rounded-xl border border-gray-200 dark:border-zinc-700"
      style={{ aspectRatio: "16/9" }}
    />
  );
}

// ---------- AssistantBubble ----------

function AssistantBubble({ msg }: { msg: AssistantMessage }) {
  return (
    <div className="flex items-start gap-3 w-full">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 ring-1 ring-gray-200 dark:ring-zinc-700 mt-0.5">
        <Sparkles size={13} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {msg.status === "thinking" && msg.progressLines.length === 0 && (
          <p className="text-[13px] leading-relaxed text-gray-400 dark:text-zinc-500 font-sans animate-pulse">
            Thinking…
          </p>
        )}
        {msg.progressLines.map((line, i) => (
          <p key={i} className="text-[13px] leading-relaxed text-gray-600 dark:text-zinc-400 font-sans">
            {line}
          </p>
        ))}
        {msg.threejsCode && (
          <div className="mt-2 w-full">
            <SceneCanvas code={msg.threejsCode} />
            {msg.validationScore !== undefined && (
              <div className="mt-2 flex flex-wrap items-start gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-sans ${
                    msg.validationScore >= 80
                      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                  }`}
                >
                  Score: {msg.validationScore}/100
                </span>
                {msg.validationFeedback && (
                  <p className="text-xs text-gray-500 dark:text-zinc-500 font-sans">
                    {msg.validationFeedback}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {msg.status === "error" && msg.progressLines.length === 0 && (
          <p className="text-[13px] text-red-500 font-sans">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------- UserBubble ----------

function UserBubble({ msg }: { msg: UserMessage }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {msg.imagePreview && (
        <img
          src={msg.imagePreview}
          alt="Attached"
          className="h-20 w-20 rounded-xl object-cover border border-gray-200 dark:border-zinc-700"
        />
      )}
      {msg.text && (
        <div className="w-fit max-w-[min(80%,56ch)] break-words rounded-2xl rounded-br-md bg-blue-600 px-3.5 py-2 text-white text-[13px] leading-relaxed font-sans shadow-sm">
          {msg.text}
        </div>
      )}
    </div>
  );
}

// ---------- PlaygroundChat ----------

export function PlaygroundChat() {
  const [threeReady, setThreeReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // THREE may already be cached in the browser
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).THREE) setThreeReady(true);
  }, []);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || (!file.type.startsWith("image/jpeg") && file.type !== "image/png"))
      return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || isLoading) return;

    const userMsg: UserMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: input.trim(),
      imagePreview: imagePreview ?? undefined,
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: AssistantMessage = {
      id: assistantId,
      role: "assistant",
      status: "thinking",
      progressLines: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    const capturedFile = imageFile;
    setInput("");
    clearImage();
    setIsLoading(true);

    const formData = new FormData();
    if (userMsg.text) formData.append("prompt", userMsg.text);
    if (capturedFile) formData.append("image", capturedFile);

    function patchAssistant(patch: Partial<AssistantMessage>) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? ({ ...m, ...patch } as AssistantMessage) : m
        )
      );
    }

    try {
      const res = await fetch("/api/generate-scene", {
        method: "POST",
        body: formData,
      });
      if (!res.ok || !res.body) {
        patchAssistant({ status: "error" });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let currentEvent = "";
      let currentData = "";

      function processEvent(eventType: string, data: string) {
        if (!data || !eventType) return;
        try {
          const parsed = JSON.parse(data);
          if (eventType === "progress") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? ({
                      ...m,
                      status: "streaming",
                      progressLines: [
                        ...(m as AssistantMessage).progressLines,
                        parsed.message,
                      ],
                    } as AssistantMessage)
                  : m
              )
            );
          } else if (eventType === "result") {
            patchAssistant({
              status: "done",
              threejsCode: parsed.threejs_code,
              validationScore: parsed.validation_score ?? undefined,
              validationFeedback: parsed.validation_feedback ?? undefined,
            });
          } else if (eventType === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? ({
                      ...m,
                      status: "error",
                      progressLines: [
                        ...(m as AssistantMessage).progressLines,
                        `Error: ${parsed.message}`,
                      ],
                    } as AssistantMessage)
                  : m
              )
            );
          }
        } catch {
          // malformed event
        }
      }

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
      processEvent(currentEvent, currentData);
    } catch (err) {
      patchAssistant({
        status: "error",
        progressLines: [`Connection error: ${String(err)}`],
      });
    } finally {
      setIsLoading(false);
    }
  }

  const canSubmit = !!(input.trim() || imageFile) && !isLoading && threeReady;

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"
        onLoad={() => setThreeReady(true)}
      />

      <div
        className="flex flex-col"
        style={{ height: "calc(100vh - 260px)", minHeight: "480px" }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-zinc-500 font-sans text-center max-w-xs">
                Describe a scene or upload an image to generate a 3D animation.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-4 pr-1">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <UserBubble key={msg.id} msg={msg} />
                ) : (
                  <AssistantBubble key={msg.id} msg={msg} />
                )
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-zinc-700 pt-4 shrink-0">
          <form onSubmit={handleSubmit}>
            <div className="relative rounded-2xl border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 transition-all focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
              {imagePreview && (
                <div className="px-3 pt-2.5">
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Attached"
                      className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-4 h-4 bg-gray-600 text-white rounded-full hover:bg-gray-800 transition-colors"
                      aria-label="Remove image"
                    >
                      <X size={9} />
                    </button>
                  </div>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e as unknown as React.FormEvent);
                  }
                }}
                rows={1}
                placeholder="Describe a scene… (Shift+Enter for new line)"
                className="w-full resize-none bg-transparent px-4 py-3 pr-20 text-sm font-sans focus:outline-none"
                style={{ maxHeight: "120px" }}
              />
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg p-1.5 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label="Attach image"
                >
                  <Paperclip size={16} />
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed transition-colors"
                  aria-label="Send"
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileInput}
            />
            {!threeReady && (
              <p className="mt-1.5 text-xs text-gray-400 dark:text-zinc-500 font-sans">
                Loading renderer…
              </p>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
