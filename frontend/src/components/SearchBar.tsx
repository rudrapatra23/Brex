import React, { useRef, useEffect, useState, useCallback } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { ArrowUp, Mic, MicOff, Paperclip, X, FileIcon, Plus } from "lucide-react";

type SpeechRecognitionInstance = any;
declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

const STOP_GRACE_MS = 1000;

interface SearchBarProps {
  onSubmit: (query: string, files?: File[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  compact?: boolean;
  accept?: string;
  maxFiles?: number;
}

export default function SearchBar({
  onSubmit,
  isLoading = false,
  placeholder = "Ask anything…",
  compact = false,
  accept = "*",
  maxFiles = 5,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [focused, setFocused] = useState(false);

  const textareaRef   = useRef<HTMLTextAreaElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const stableTextRef  = useRef("");
  const stopTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) setSupported(false);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  useEffect(() => () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    recognitionRef.current?.stop();
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimerRef.current) { clearTimeout(stopTimerRef.current); stopTimerRef.current = null; }
  }, []);

  const stopListening = useCallback(() => {
    clearStopTimer();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    stableTextRef.current = "";
    setListening(false);
    textareaRef.current?.focus();
  }, [clearStopTimer]);

  const startSession = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    clearStopTimer();
    const r = new SR();
    r.lang = "en-US"; r.interimResults = true; r.continuous = true;
    r.onstart = () => setListening(true);
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) stableTextRef.current += (stableTextRef.current ? " " : "") + t.trim();
        else interim += t;
      }
      setValue(interim ? (stableTextRef.current ? `${stableTextRef.current} ${interim}` : interim) : stableTextRef.current);
    };
    r.onerror = (e: any) => { if (e.error !== "no-speech") stopListening(); };
    r.onend = () => {
      if (recognitionRef.current === r && !stopTimerRef.current) {
        setTimeout(() => { if (recognitionRef.current === r && !stopTimerRef.current) startSession(); }, 250);
      } else if (recognitionRef.current === r) { setListening(false); textareaRef.current?.focus(); }
    };
    recognitionRef.current = r;
    try { r.start(); } catch { recognitionRef.current = null; setListening(false); }
  }, [clearStopTimer, stopListening]);

  function toggleMic() {
    if (stopTimerRef.current) { clearStopTimer(); return; }
    if (listening) {
      stopTimerRef.current = setTimeout(() => { stopTimerRef.current = null; stopListening(); }, STOP_GRACE_MS);
    } else startSession();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, maxFiles));
    e.target.value = "";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if ((!trimmed && files.length === 0) || isLoading) return;
    stopListening();
    onSubmit(trimmed, files);
    setValue("");
    setFiles([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  const canSubmit = (value.trim().length > 0 || files.length > 0) && !isLoading;

  const borderColor = listening
    ? "rgba(248,113,113,0.45)"
    : focused
    ? "rgba(94,234,212,0.45)"
    : "#26262B";

  const shadow = listening
    ? "0 0 0 1px rgba(248,113,113,0.3), 0 4px 24px rgba(0,0,0,0.35)"
    : focused
    ? "0 0 0 1px rgba(94,234,212,0.2), 0 4px 24px rgba(94,234,212,0.06)"
    : "0 4px 24px rgba(0,0,0,0.35)";

  return (
    <div className={`w-full flex justify-center pointer-events-none ${compact ? "px-2 pb-2" : "px-4 pb-4 sm:px-6 sm:pb-6"}`}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept={accept} multiple className="hidden" />

      <div
        className="pointer-events-auto relative w-full transition-all duration-200"
        style={{
          maxWidth: compact ? 640 : 720,
          background: "#131316",
          border: `1px solid ${borderColor}`,
          borderRadius: compact ? 10 : 16,
          boxShadow: shadow,
        }}
      >
        {/* File pills */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs text-[#9C9CA3] max-w-[200px]"
                style={{ background: "#1B1B1F", border: "1px solid #26262B" }}>
                <FileIcon className="w-3 h-3 shrink-0 text-primary" />
                <span className="truncate">{f.name}</span>
                <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                  className="ml-auto p-0.5 hover:text-foreground rounded transition-colors">
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
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={listening ? "Listening…" : placeholder}
          rows={1}
          className="w-full resize-none bg-transparent outline-none border-none text-foreground placeholder:text-[#5D5D66] px-4 pt-3.5 pb-2"
          style={{
            fontSize: compact ? 13 : 14,
            minHeight: compact ? 42 : 52,
            maxHeight: 200,
            fontFamily: "inherit",
          }}
        />

        {/* Toolbar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1 gap-2">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= maxFiles}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11px] text-[#5D5D66] hover:text-[#9C9CA3] hover:bg-[#1B1B1F] transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {files.length > 0
                ? <><Paperclip className="w-3 h-3 text-primary" /><span className="hidden sm:inline">({files.length})</span></>
                : <><Plus className="w-3 h-3" /><span className="hidden sm:inline">Attach</span></>
              }
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {supported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`relative p-1.5 rounded-[6px] transition-all duration-150 ${
                  listening
                    ? "text-[#F87171] bg-[rgba(248,113,113,0.08)]"
                    : "text-[#5D5D66] hover:text-[#9C9CA3] hover:bg-[#1B1B1F]"
                }`}
                aria-label={listening ? "Stop recording" : "Voice input"}
              >
                {listening && <span className="absolute inset-0 rounded-[6px] animate-ping bg-[rgba(248,113,113,0.15)]" />}
                {listening ? <MicOff className="w-3.5 h-3.5 relative z-10" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center justify-center w-7 h-7 rounded-[6px] transition-all duration-150 active:scale-95"
              style={{
                background: canSubmit
                  ? "linear-gradient(135deg, #5EEAD4 0%, #7C9CFF 100%)"
                  : "#1B1B1F",
                color: canSubmit ? "#0A0A0B" : "#5D5D66",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? "0 0 12px rgba(94,234,212,0.2)" : "none",
              }}
              aria-label="Send"
            >
              {isLoading
                ? <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                : <ArrowUp className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}