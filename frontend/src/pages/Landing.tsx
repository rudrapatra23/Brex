import { useEffect, useState } from "react";
import { ArrowRight, Check, Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createClient } from "@/lib/client";

const supabase = createClient();

export default function Landing() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/app", { replace: true });
      else setCheckingSession(false);
    });
  }, [navigate]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07131a] text-white relative">
      <div className="absolute -top-32 left-[10%] h-[34rem] w-[34rem] rounded-full bg-cyan-400/20 blur-[130px]" />
      <div className="absolute top-1/3 -right-40 h-[32rem] w-[32rem] rounded-full bg-violet-500/20 blur-[130px]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:42px_42px]" />

      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-100/25 bg-white/10 backdrop-blur-xl"><Search className="h-5 w-5 text-cyan-200" /></span>
          <span>Brex</span>
        </div>
        <button onClick={() => navigate("/auth")} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl transition hover:bg-white/20">Sign in</button>
      </nav>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl items-center px-6 pb-20 pt-10">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div className="max-w-2xl">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-100/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-cyan-100 backdrop-blur-xl"><Sparkles className="h-3.5 w-3.5" /> Research that feels effortless</p>
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">Ask better questions.<br /><span className="bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-transparent">Get clearer answers.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-cyan-50/65">Brex brings together intelligent search, cited sources, and focused follow-ups in one calm workspace.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button onClick={() => navigate("/auth")} disabled={checkingSession} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:brightness-110 disabled:opacity-60">Get started free <ArrowRight className="h-4 w-4" /></button>
              <span className="inline-flex items-center px-2 text-sm text-cyan-50/55">No credit card required</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-cyan-50/60">
              {["Source-backed answers", "Saved conversations", "Helpful next questions"].map((feature) => <span key={feature} className="flex items-center gap-2"><Check className="h-4 w-4 text-cyan-300" />{feature}</span>)}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/20 bg-white/[0.09] p-4 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl sm:p-6">
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-5">
              <div className="mb-5 flex items-center gap-3 text-sm text-cyan-50/55"><span className="h-2.5 w-2.5 rounded-full bg-cyan-300" /> New research</div>
              <p className="text-lg font-medium leading-7">How can AI teams ship reliable products faster?</p>
              <div className="my-5 h-px bg-white/10" />
              <p className="text-sm leading-7 text-cyan-50/65">Start with a narrow use case, evaluate on real examples, and keep humans in the loop for high-impact decisions.</p>
              <div className="mt-5 flex gap-2"><span className="rounded-lg border border-cyan-100/15 bg-white/10 px-2.5 py-1 text-xs text-cyan-100">3 sources</span><span className="rounded-lg border border-cyan-100/15 bg-white/10 px-2.5 py-1 text-xs text-cyan-100">Explore further</span></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
