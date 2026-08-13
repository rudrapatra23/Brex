import React, { useEffect } from "react";
import { createClient } from "@/lib/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Sparkles } from "lucide-react";

const supabase = createClient();

// Google SVG icon
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// GitHub SVG icon
function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to home
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/app");
    });
  }, [navigate]);

  async function login(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + "/app",
      },
    });
    if (error) alert(error.message);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#07131a] relative overflow-hidden px-4 py-8">
      <div className="absolute -top-32 -left-20 w-[34rem] h-[34rem] rounded-full bg-cyan-400/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-36 -right-24 w-[34rem] h-[34rem] rounded-full bg-violet-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 opacity-30 pointer-events-none [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:42px_42px]" />

      <div className="absolute top-6 left-6 z-20">
        <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <div className="rounded-[2rem] border border-white/20 bg-white/[0.09] backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-cyan-950/40">
          <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-300/15 border border-cyan-100/25 mb-5 shadow-lg shadow-cyan-400/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" className="text-primary"/>
              <path d="M20 20L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary"/>
              <path d="M11 8v6M8 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary/60"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Welcome to Brex</h1>
          <p className="text-sm text-cyan-50/65 mt-2">Search, understand, and move faster.</p>
          </div>

          <div className="space-y-3">
          <p className="text-xs text-center text-cyan-50/55 mb-5">
            Sign in to save your searches and continue your conversations.
          </p>

          {/* Google */}
          <button
            onClick={() => login("google")}
            className="
              w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
              bg-white/10 hover:bg-white/20 border border-white/20 hover:border-cyan-100/40
              text-sm font-medium text-white transition-all duration-200
              hover:shadow-lg hover:shadow-cyan-950/30 active:scale-[0.98]
            "
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* GitHub */}
          <button
            onClick={() => login("github")}
            className="
              w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl
              bg-white/10 hover:bg-white/20 border border-white/20 hover:border-cyan-100/40
              text-sm font-medium text-white transition-all duration-200
              hover:shadow-lg hover:shadow-cyan-950/30 active:scale-[0.98]
            "
          >
            <GitHubIcon />
            Continue with GitHub
          </button>

          <div className="flex items-center justify-center gap-2 pt-3 text-[11px] text-cyan-50/50">
            <LockKeyhole className="w-3 h-3" /> Your session stays securely signed in.
          </div>
          <p className="text-[11px] text-center text-cyan-50/40 pt-1">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
          </div>
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-xs text-cyan-50/45"><Sparkles className="w-3.5 h-3.5" /> Thoughtful answers, grounded in sources.</p>
        </div>
    </div>
  );
}
