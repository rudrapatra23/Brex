import { useEffect } from "react";
import { createClient } from "@/lib/client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LockKeyhole, Zap } from "lucide-react";

const supabase = createClient();

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  );
}

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate("/app");
    });
  }, [navigate]);

  async function login(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/app" },
    });
    if (error) alert(error.message);
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-4"
      style={{ background: "#0A0A0B" }}
    >
      {/* Static glow behind card */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "30%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 480, height: 320,
          background: "radial-gradient(ellipse, rgba(94,234,212,0.07) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      {/* Back */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-5 left-5 flex items-center gap-1.5 text-xs text-[#5D5D66] hover:text-foreground transition-colors duration-150 z-10"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-1.5 mb-7 text-sm font-semibold text-foreground">
        <Zap className="w-4 h-4 text-primary" /> Brex
      </div>

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm animate-fade-up"
        style={{ animationDelay: "40ms" }}
      >
        <div
          className="rounded-[16px] p-7"
          style={{
            background: "#131316",
            border: "1px solid #26262B",
          }}
        >
          {/* Heading */}
          <h1 className="text-xl font-semibold text-foreground tracking-tight mb-1">Welcome back</h1>
          <p className="text-sm text-[#9C9CA3] mb-6">Sign in to continue to Brex.</p>

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2.5">
            {[
              { provider: "google" as const, Icon: GoogleIcon, label: "Continue with Google" },
              { provider: "github" as const, Icon: GitHubIcon, label: "Continue with GitHub" },
            ].map(({ provider, Icon, label }) => (
              <button
                key={provider}
                onClick={() => login(provider)}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-[10px] text-sm font-medium text-foreground transition-all duration-150 hover:bg-[#1B1B1F] active:scale-[0.98]"
                style={{ border: "1px solid #26262B" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(94,234,212,0.3)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#26262B")}
              >
                <Icon /> {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          {/* <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#26262B]" />
            <span className="text-[11px] text-[#5D5D66] font-mono">or</span>
            <div className="flex-1 h-px bg-[#26262B]" />
          </div> */}

          {/* Primary CTA (re-triggers OAuth flow) */}
          {/* <button
            onClick={() => login("google")}
            className="w-full py-2.5 rounded-[10px] text-sm font-medium text-[#0A0A0B] transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #5EEAD4 0%, #7C9CFF 100%)",
              boxShadow: "0 0 20px rgba(94,234,212,0.15)",
            }}
          >
            Sign in with Google
          </button> */}

          {/* Footer note */}
          <div className="flex items-center justify-center gap-1.5 mt-5 text-[11px] text-[#5D5D66]">
            <LockKeyhole className="w-3 h-3" />
            <span>Session is encrypted and securely stored.</span>
          </div>
        </div>
      </div>

      <p className="relative z-10 mt-4 text-[11px] text-[#5D5D66] text-center max-w-xs">
        By signing in you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
