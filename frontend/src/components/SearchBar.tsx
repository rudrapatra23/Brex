import React, { useRef, useEffect, useState, useCallback } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { ArrowUp, Plus, Mic, MicOff, Paperclip, X, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight: uses the browser's built-in Web Speech API — no package needed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

const STOP_GRACE_MS = 1000;

interface SearchBarProps {
  onSubmit: (query: string, files: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  compact?: boolean;
  accept?: string; // e.g., "image/*,.pdf"
  maxFiles?: number;
}

export default function SearchBar({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything...",
  compact = false,
  accept = "*",
  maxFiles = 5,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [files, setFiles] = useState<File[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const stableTextRef = useRef("");
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check speech recognition support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setSupported(false);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  // Clean up timer and speech instance on unmount
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
  }, []);

  const stopListeningImmediately = useCallback(() => {
    clearStopTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stableTextRef.current = "";
    setListening(false);
    textareaRef.current?.focus();
  }, [clearStopTimer]);

  const beginRecognitionSession = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    clearStopTimer();

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          stableTextRef.current += (stableTextRef.current ? " " : "") + t.trim();
        } else {
          interim += t;
        }
      }
      const display = interim
        ? stableTextRef.current
          ? `${stableTextRef.current} ${interim}`
          : interim
        : stableTextRef.current;
      setValue(display);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "no-speech") {
        stopListeningImmediately();
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition && !stopTimeoutRef.current) {
        setTimeout(() => {
          if (recognitionRef.current === recognition && !stopTimeoutRef.current) {
            beginRecognitionSession();
          }
        }, 250);
      } else if (recognitionRef.current === recognition) {
        setListening(false);
        textareaRef.current?.focus();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
        setListening(false);
      }
    }
  }, [clearStopTimer, stopListeningImmediately]);

  const startListening = beginRecognitionSession;

  const requestStopListening = useCallback(() => {
    if (stopTimeoutRef.current) return;
    stopTimeoutRef.current = setTimeout(() => {
      stopTimeoutRef.current = null;
      stopListeningImmediately();
    }, STOP_GRACE_MS);
  }, [stopListeningImmediately]);

  function toggleMic() {
    if (stopTimeoutRef.current) {
      clearStopTimer();
      return;
    }
    if (listening) requestStopListening();
    else startListening();
  }

  // --- Attachment Handlers ---
  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles].slice(0, maxFiles));
    // Reset file input so selecting the same file again triggers onChange
    e.target.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || isLoading) return;
    
    stopListeningImmediately();
    onSubmit(trimmed, files);
    
    // Clear form state
    setValue("");
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !isLoading;

  return (
    <div
      className={cn(
        "w-full flex justify-center pointer-events-none",
        compact ? "px-3 pb-3" : "px-4 pb-5 sm:px-6 sm:pb-8"
      )}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple
        className="hidden"
      />

      <div
        className={cn(
          "pointer-events-auto relative w-full rounded-2xl border border-stone-800/80",
          "bg-stone-900/75 backdrop-blur-xl",
          "shadow-[0_8px_40px_rgba(0,0,0,0.55)] transition-all duration-200",
          listening
            ? "border-rose-500/50 shadow-[0_8px_40px_rgba(239,68,68,0.15)]"
            : "focus-within:border-cyan-500/40 focus-within:shadow-[0_8px_40px_rgba(227,168,87,0.12)]",
          compact ? "max-w-xl rounded-xl" : "max-w-2xl"
        )}
      >
        {/* Attached Files Preview Pills */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 pt-3">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800/90 text-xs text-stone-200 border border-stone-700/60 max-w-[200px]"
              >
                <FileIcon className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span className="truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-0.5 hover:bg-stone-700 text-stone-400 hover:text-stone-100 rounded transition-colors ml-auto"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? "Listening..." : placeholder}
          rows={1}
          className={cn(
            "w-full resize-none bg-transparent outline-none border-none",
            "text-stone-100 placeholder:text-stone-500",
            "px-5 pt-4 pb-2",
            compact ? "text-sm min-h-[44px]" : "text-base min-h-[56px]"
          )}
          style={{ maxHeight: 200 }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
          {/* Left tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleAttachClick}
              disabled={files.length >= maxFiles}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-150",
                files.length >= maxFiles
                  ? "text-stone-600 cursor-not-allowed"
                  : "text-stone-400 hover:text-stone-100 hover:bg-stone-800/70"
              )}
            >
              {files.length > 0 ? (
                <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {files.length > 0 ? `Attached (${files.length})` : "Attach"}
              </span>
            </button>
          </div>

          {/* Right: mic + send */}
          <div className="flex items-center gap-2">
            {supported && (
              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "relative p-2 rounded-lg transition-all duration-150",
                  listening
                    ? "text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                    : "text-stone-400 hover:text-stone-100 hover:bg-stone-800/70"
                )}
                aria-label={listening ? "Stop recording" : "Voice input"}
                title={listening ? "Click to stop" : "Click to speak"}
              >
                {listening && (
                  <span className="absolute inset-0 rounded-lg animate-ping bg-rose-500/20" />
                )}
                {listening ? (
                  <MicOff className="w-4 h-4 relative z-10" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200",
                canSubmit
                  ? "bg-cyan-500 text-stone-950 hover:bg-cyan-400 shadow-md shadow-cyan-500/30"
                  : "bg-stone-800 text-stone-500 cursor-not-allowed"
              )}
              aria-label="Send"
            >
              {isLoading ? (
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}