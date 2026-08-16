import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Globe, Search, Zap, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/client";

const supabase = createClient();

/* ── Mouse-tracking wisp ─────────────────────────────────────────────────── */
function useMouseWisp() {
  const target  = useRef({ x: 0.45, y: 0.38 });
  const current = useRef({ x: 0.45, y: 0.38 });
  const hasMouse = useRef(false);
  const raf  = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [pos, setPos] = useState({ x: 0.45, y: 0.38 });

  useEffect(() => {
    const wander = () => {
      if (!hasMouse.current) {
        target.current = { x: 0.2 + Math.random() * 0.6, y: 0.1 + Math.random() * 0.5 };
      }
      timer.current = setTimeout(wander, 2500 + Math.random() * 2000);
    };
    wander();

    const onMove = (e: MouseEvent) => {
      hasMouse.current = true;
      target.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("mousemove", onMove);

    const tick = () => {
      const speed = hasMouse.current ? 0.06 : 0.016;
      current.current.x += (target.current.x - current.current.x) * speed;
      current.current.y += (target.current.y - current.current.y) * speed;
      setPos({ x: current.current.x, y: current.current.y });
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
      clearTimeout(timer.current);
    };
  }, []);

  return pos;
}

const EXAMPLE_QUERIES = [
  "How does CRISPR gene editing work?",
  "Latest AI breakthroughs in 2025",
  "Explain quantum entanglement",
];

const HOW_IT_WORKS = [
  { icon: Search,    label: "Ask anything",              desc: "Type any question, naturally." },
  { icon: Globe,     label: "Live web search",           desc: "Tavily searches the web in real time." },
  { icon: FileText,  label: "Cited answer",              desc: "Agent reasons and responds with sources." },
];

export default function Landing() {
  const navigate = useNavigate();
  const wisp = useMouseWisp();
  const [checkingSession, setCheckingSession] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/app", { replace: true });
      else setCheckingSession(false);
    });
  }, [navigate]);

  function handleSearch() {
    if (!query.trim()) return;
    navigate("/auth");
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative flex flex-col">
      {/* Mouse wisp */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-0"
        style={{
          left: `${wisp.x * 100}%`,
          top:  `${wisp.y * 100}%`,
          transform: "translate(-50%, -50%)",
          width: 280,
          height: 280,
          background: "radial-gradient(circle, rgba(94,234,212,0.13) 0%, rgba(94,234,212,0.04) 50%, transparent 75%)",
          borderRadius: "50%",
          filter: "blur(24px)",
          willChange: "left, top",
        }}
      />

      {/* Static hero glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-0"
        style={{
          left: "50%", top: "30%",
          transform: "translate(-50%,-50%)",
          width: 600, height: 400,
          background: "radial-gradient(ellipse, rgba(94,234,212,0.055) 0%, transparent 65%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
      />

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <header className="relative z-10 sticky top-0">
        <div
          className="flex items-center justify-between max-w-5xl mx-auto px-6 h-14"
          style={{
            background: "rgba(10,10,11,0.80)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid #26262B",
          }}
        >
          <div className="flex items-center gap-2 font-semibold text-[15px] tracking-tight text-foreground">
            <Zap className="w-4 h-4 text-primary" />
            Brex
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/auth")}
              className="text-sm text-[--foreground-secondary] hover:text-foreground transition-colors duration-150 px-3 py-1.5"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="text-sm font-medium px-3 py-1.5 rounded-[10px] transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #5EEAD4 0%, #7C9CFF 100%)",
                color: "#0A0A0B",
                boxShadow: "0 0 16px rgba(94,234,212,0.18)",
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <p className="text-xs font-mono uppercase tracking-[0.18em] text-[--foreground-muted] mb-5">
          AI-powered search · Live web · Cited answers
        </p>

        <h1 className="text-5xl sm:text-6xl font-semibold tracking-[-0.03em] leading-[1.06] mb-5 max-w-2xl">
          Search,{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #5EEAD4 0%, #7C9CFF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            reasoned.
          </span>
        </h1>

        <p className="text-base text-[--foreground-secondary] max-w-md mb-10 leading-7">
          Ask anything. Brex searches the live web, then an AI agent synthesizes a clear, cited answer — in seconds.
        </p>

        {/* Search box */}
        <div className="w-full max-w-xl mb-6">
          <div
            className="flex items-center gap-3 rounded-[16px] px-4 transition-all duration-200 focus-within:shadow-[0_0_0_1px_#5EEAD4,0_0_24px_rgba(94,234,212,0.12)]"
            style={{
              background: "#131316",
              border: "1px solid #26262B",
              height: 56,
            }}
          >
            <Search className="w-4 h-4 text-[--foreground-muted] flex-shrink-0" />
            <input
              className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-[--foreground-muted]"
              placeholder="Ask anything…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            {query.trim() && (
              <button
                onClick={handleSearch}
                className="flex-shrink-0 w-8 h-8 rounded-[8px] flex items-center justify-center transition-all duration-150 hover:opacity-90 active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #5EEAD4 0%, #7C9CFF 100%)",
                  color: "#0A0A0B",
                }}
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-16">
          {EXAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => { setQuery(q); navigate("/auth"); }}
              disabled={checkingSession}
              className="text-xs px-3 py-1.5 rounded-[999px] text-[--foreground-secondary] hover:text-foreground transition-all duration-150 hover:-translate-y-px"
              style={{ background: "#131316", border: "1px solid #26262B" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(94,234,212,0.35)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#26262B")}
            >
              {q}
            </button>
          ))}
        </div>

        {/* How it works */}
        <div className="w-full max-w-2xl mb-16">
          <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-[--foreground-muted] mb-6">How it works</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map(({ icon: Icon, label, desc }, i) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2.5 p-4 rounded-[10px] text-center"
                style={{ background: "#131316", border: "1px solid #26262B" }}
              >
                <div
                  className="w-8 h-8 rounded-[8px] flex items-center justify-center"
                  style={{ background: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.15)" }}
                >
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground mb-0.5">{i + 1}. {label}</p>
                  <p className="text-[11px] text-[--foreground-muted]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-semibold tracking-tight">Ready to search smarter?</p>
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #5EEAD4 0%, #7C9CFF 100%)",
              color: "#0A0A0B",
              boxShadow: "0 0 24px rgba(94,234,212,0.15)",
            }}
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4 text-[11px] text-[--foreground-muted]">
            {["No credit card", "Instant access", "Live web results"].map((f) => (
              <span key={f} className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" /> {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 px-6 py-5 flex items-center justify-between max-w-5xl mx-auto w-full"
        style={{ borderTop: "1px solid #26262B" }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[--foreground-muted]">
          <Zap className="w-3 h-3 text-primary" /> Brex
        </div>
        <p className="text-[11px] text-[--foreground-muted]">© {new Date().getFullYear()} Brex. All rights reserved.</p>
      </footer>
    </div>
  );
}
