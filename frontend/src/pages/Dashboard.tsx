import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import {
  Plus,
  Search,
  BookOpen,
  LogOut,
  Bell,
  ChevronDown,
  ChevronRight,
  Feather,
  Home,
  PanelLeft,
} from "lucide-react";
import { createClient } from "@/lib/client";
import { BACKEND_URL } from "@/lib/config";
import SearchBar from "@/components/SearchBar";
import ChatView, { type Message, type Source } from "@/components/ChatView";

const supabase = createClient();

interface ConversationSummary {
  id: string;
  title: string;
  slug: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseStreamChunk(raw: string): {
  answer: string;
  sources: Source[];
  conversationId: string | null;
  followUps: string[];
} {
  // The backend streams the answer first, then appends tagged JSON metadata.
  // Remove every metadata block from the display text, even while a block is
  // still incomplete, so its protocol markers never appear in the answer.
  const metadataStarts = [
    raw.search(/<SOURCES>/i),
    raw.search(/<FOLLOW_UPS>/i),
    raw.search(/<CONVERSATION_ID>/i),
  ].filter((index) => index !== -1);
  let answerBlock = raw.slice(
    0,
    metadataStarts.length > 0 ? Math.min(...metadataStarts) : undefined
  );

  // Keep compatibility with streams that have not had the ANSWER wrapper
  // removed by the backend yet.
  const answerOpen = answerBlock.match(/<ANSWER>/i);
  if (answerOpen?.index !== undefined) {
    const contentStart = answerOpen.index + answerOpen[0].length;
    const answerClose = answerBlock.search(/<\/ANSWER>/i);
    answerBlock = answerBlock.slice(
      contentStart,
      answerClose !== -1 ? answerClose : undefined
    );
  }

  let sources: Source[] = [];
  const sourcesMatch = raw.match(/<SOURCES>\r?\n([\s\S]*?)\r?\n<\/SOURCES>/i);
  if (sourcesMatch?.[1]) {
    try {
      const parsed: unknown = JSON.parse(sourcesMatch[1]);
      if (Array.isArray(parsed)) sources = parsed as Source[];
    } catch {}
  }

  let followUps: string[] = [];
  const followUpsMatch = raw.match(
    /<FOLLOW_UPS>\r?\n([\s\S]*?)\r?\n<\/FOLLOW_UPS>/i
  );
  if (followUpsMatch?.[1]) {
    try {
      const parsed: unknown = JSON.parse(followUpsMatch[1]);
      if (Array.isArray(parsed)) {
        followUps = parsed.filter((item): item is string => typeof item === "string");
      }
    } catch {}
  }

  const conversationId =
    raw.match(/<CONVERSATION_ID>([^<]*)<\/CONVERSATION_ID>/i)?.[1]?.trim() || null;

  const answer = answerBlock.trimEnd();
  return { answer, sources, conversationId, followUps };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(user: User): string {
  const name = user.user_metadata?.full_name as string | undefined;
  if (name) {
    return name
      .split(" ")
      .map((w: string) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return (user.email?.[0] ?? "U").toUpperCase();
}

// ─── Sidebar ────────────────────────────────────────────────────────────────

interface SidebarProps {
  user: User | null;
  conversations: ConversationSummary[];
  activeId: string | null;
  onNewChat: () => void;
  onHome: () => void;
  onSelectConversation: (id: string) => void;
  onSignOut: () => void;
  onShowLogin: () => void;
  collapsed: boolean;
  onToggle: () => void;
}

function Sidebar({
  user,
  conversations,
  activeId,
  onNewChat,
  onHome,
  onSelectConversation,
  onSignOut,
  onShowLogin,
  collapsed,
  onToggle,
}: SidebarProps) {
  const [sessionsOpen, setSessionsOpen] = useState(true);

  return (
    <aside
      className={`
        absolute top-0 left-0 z-30 flex flex-col h-full bg-stone-950/95 backdrop-blur-xl border-r border-cyan-500/15
        transition-all duration-300 ease-in-out shadow-[4px_0_32px_rgba(0,0,0,0.7)]
        ${collapsed ? "w-[52px]" : "w-[240px]"}
      `}
    >
      {/* Top: logo + collapse */}
      <div className="flex items-center justify-between px-3 pt-4 pb-3 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-400/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_12px_rgba(227,168,87,0.35)]">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-stone-100 tracking-tight font-serif">
              Brex
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-lg text-stone-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all ${collapsed ? "mx-auto" : ""}`}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New thread */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <button
            onClick={onNewChat}
            className="
              w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl
              text-sm text-stone-300 hover:text-cyan-300
              bg-stone-900/60 hover:bg-cyan-950/30 transition-all duration-150
              border border-stone-800 hover:border-cyan-500/40 hover:shadow-[0_0_15px_rgba(227,168,87,0.2)]
            "
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>New</span>
          </button>
        </div>
      )}

      {/* Nav */}
      {!collapsed && (
        <nav className="px-3 space-y-0.5">
          <button
            onClick={onHome}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-150"
          >
            <Home className="w-4 h-4 text-stone-400" />
            <span>Home</span>
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-150">
            <BookOpen className="w-4 h-4 text-stone-400" />
            <span>Library</span>
          </button>
        </nav>
      )}

      {/* Sessions + bottom — only when expanded */}
      {!collapsed && (
        <>
          <div className="mx-3 my-2 border-t border-stone-800/80" />
          {/* Sessions */}
          <div className="flex-1 overflow-hidden flex flex-col px-3">
            <button
              onClick={() => setSessionsOpen((o) => !o)}
              className="flex items-center justify-between py-2 px-1 text-xs font-medium text-stone-500 hover:text-cyan-400 transition-colors w-full tracking-wide uppercase"
            >
              <span>Sessions</span>
              {sessionsOpen ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {sessionsOpen && (
              <div className="flex-1 overflow-y-auto space-y-0.5 pb-2">
                {conversations.length === 0 && (
                  <p className="text-xs text-stone-600 px-2 py-3 text-center">
                    No conversations yet
                  </p>
                )}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => onSelectConversation(conv.id)}
                    className={`
                      w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all duration-150
                      truncate block border-l-2
                      ${
                        activeId === conv.id
                          ? "bg-cyan-500/10 text-cyan-300 border-cyan-400/70"
                          : "text-stone-400 border-transparent hover:text-stone-200 hover:bg-stone-900/60 hover:border-stone-700"
                      }
                    `}
                    title={conv.title}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom: user */}
          <div className="border-t border-stone-800/80 p-3 mt-auto">
            {user ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 px-2 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-cyan-400/15 border border-cyan-400/40 flex items-center justify-center text-xs font-bold text-cyan-300 flex-shrink-0">
                    {getInitials(user)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-200 truncate">
                      {(user.user_metadata?.full_name as string) ?? user.email}
                    </p>
                    <p className="text-[10px] text-stone-500 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    className="p-1.5 rounded-lg text-stone-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-all"
                    aria-label="Notifications"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onShowLogin}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-stone-950 text-sm font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-[0_0_20px_rgba(227,168,87,0.35)]"
              >
                <Feather className="w-4 h-4" />
                Sign in
              </button>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

// ─── Home / Empty state ──────────────────────────────────────────────────────

interface HomeViewProps {
  user: User | null;
  onSearch: (q: string) => void;
  isLoading: boolean;
  showLogin: boolean;
  onShowLogin: () => void;
}

const SUGGESTIONS = [
  "What's happening in AI today?",
  "How does quantum computing work?",
  "Best practices for React in 2025",
  "Explain black holes simply",
  "Latest breakthroughs in medicine",
];

function HomeView({ user, onSearch, isLoading, showLogin, onShowLogin }: HomeViewProps) {
  const name = user?.user_metadata?.full_name as string | undefined;
  const firstName = name?.split(" ")[0];

  async function login(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/app" },
    });
    if (error) console.error("Sign-in failed:", error.message);
  }

  return (
    <div className="relative h-full px-4">
      <div className="absolute inset-x-0 top-24 mx-auto w-full max-w-2xl animate-fade-in space-y-8">
        {/* Heading */}
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-cyan-400/90 tracking-[0.2em] uppercase">
            {getGreeting()}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="text-4xl sm:text-5xl font-serif font-semibold text-transparent bg-clip-text bg-gradient-to-b from-stone-50 via-stone-200 to-stone-400 tracking-tight">
            What do you want to know?
          </h1>
        </div>

        {/* Search box */}
        {user ? (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
            <div className="relative">
              <SearchBar
                compact
                onSubmit={onSearch}
                isLoading={isLoading}
                placeholder="Ask anything..."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className="w-full rounded-2xl border border-cyan-500/25 bg-stone-900/50 backdrop-blur-md px-5 py-4 text-stone-400 text-base cursor-pointer hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(227,168,87,0.15)] transition-all"
              onClick={onShowLogin}
            >
              Sign in to start searching...
            </div>
            {showLogin && (
              <div className="rounded-2xl border border-cyan-400/25 bg-stone-900/75 p-3 backdrop-blur-xl animate-fade-in">
                <p className="mb-3 text-center text-xs text-stone-400">Sign in without leaving the dashboard</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => login("google")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-stone-100 hover:bg-white/10">Google</button>
                  <button onClick={() => login("github")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-stone-100 hover:bg-white/10">GitHub</button>
                </div>
              </div>
            )}
            <button
              onClick={onShowLogin}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-teal-600 text-stone-950 text-sm font-semibold hover:brightness-110 transition-all shadow-[0_0_25px_rgba(227,168,87,0.3)]"
            >
              Get started — it's free
            </button>
          </div>
        )}

        {/* Suggestions */}
        {user && (
          <div className="flex flex-wrap gap-2 justify-center">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSearch(s)}
                className="
                  px-3.5 py-1.5 rounded-full text-xs text-stone-300
                  bg-stone-900/60 border border-stone-800/80 backdrop-blur-md
                  hover:text-cyan-300 hover:border-cyan-500/30 hover:bg-stone-800/80
                  transition-all duration-200
                "
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    []
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(conversationId ?? null);

  const justCreatedRef = useRef(false);
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());

  // Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) return;
      const res = await fetch(`${BACKEND_URL}/conversation_history`, {
        headers: { Authorization: jwt },
      });
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {}
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load conversation on ID change
  useEffect(() => {
    if (!conversationId || !user) return;
    setActiveConversationId(conversationId);
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }

    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) {
      setMessages(cached);
      return;
    }

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) return;
        const res = await fetch(
          `${BACKEND_URL}/conversation_history/${conversationId}`,
          {
            method: "POST",
            headers: { Authorization: jwt },
          }
        );
        const json = await res.json();
        if (json.conversation?.messages) {
          const loaded = json.conversation.messages.map(
            (m: {
              role: string;
              content: string;
              sources?: Source[];
              followUps?: string[];
            }) => {
              const parsed = parseStreamChunk(m.content);
              return {
                role: m.role as "User" | "Assistant",
                content: parsed.answer || m.content,
                sources: parsed.sources.length > 0 ? parsed.sources : m.sources ?? [],
                followUps:
                  parsed.followUps.length > 0 ? parsed.followUps : m.followUps ?? [],
              };
            }
          );
          setMessages(loaded);
        }
      } catch {}
    })();
  }, [conversationId, user]);

  // Streaming handler
  async function doSearch(query: string, isFollowUp: boolean = false) {
    if (!user) {
      setShowLogin(true);
      return;
    }
    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) {
      setIsLoading(false);
      setShowLogin(true);
      return;
    }

    const userMessage: Message = { role: "User", content: query };
    const assistantMessage: Message = {
      role: "Assistant",
      content: "",
      streaming: true,
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const url = isFollowUp
        ? `${BACKEND_URL}/brex_ask/follow_up`
        : `${BACKEND_URL}/brex_ask`;

      const body = isFollowUp
        ? { query, conversationId: activeConversationId }
        : { query };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: jwt,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        throw new Error("Stream failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });

        const { answer, sources, conversationId: newCid } =
          parseStreamChunk(accumulated);

        setMessages((prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.role === "Assistant") {
            updated[lastIdx] = {
              role: "Assistant",
              content: answer,
              sources: sources.length > 0 ? sources : updated[lastIdx].sources,
              streaming: true,
            };
          }
          return updated;
        });

        if (newCid && !activeConversationId) {
          setActiveConversationId(newCid);
          justCreatedRef.current = true;
          navigate(`/search/${newCid}`, { replace: true });
        }
      }

      // Flush a possible trailing multi-byte character before final parsing.
      accumulated += decoder.decode();

      const {
        answer: finalAnswer,
        sources: finalSources,
        conversationId: finalCid,
        followUps,
      } = parseStreamChunk(accumulated);
      let finalMessages: Message[] = [];
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "Assistant") {
          updated[lastIdx] = {
            role: "Assistant",
            content: finalAnswer,
            sources: finalSources,
            followUps,
            streaming: false,
          };
        }
        finalMessages = updated;
        return updated;
      });

      const resolvedCid = finalCid || activeConversationId;
      if (finalCid) {
        setActiveConversationId(finalCid);
        justCreatedRef.current = true;
        navigate(`/search/${finalCid}`, { replace: true });
      }

      if (resolvedCid && finalMessages.length > 0) {
        messagesCacheRef.current.set(resolvedCid, finalMessages);
      }

      await loadConversations();
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "Assistant" && last.streaming) {
          updated[updated.length - 1] = {
            role: "Assistant",
            content: "Sorry, something went wrong. Please try again.",
            streaming: false,
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewChat() {
    setMessages([]);
    setActiveConversationId(null);
    navigate("/");
  }

  function handleSelectConversation(id: string) {
    setMessages([]);
    navigate(`/search/${id}`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setConversations([]);
    setMessages([]);
    setActiveConversationId(null);
    messagesCacheRef.current.clear();
    navigate("/");
  }

  const isConversationView =
    messages.length > 0 || (!!conversationId && !!activeConversationId);

  return (
    <div className="flex h-screen w-screen bg-stone-950 text-stone-100 overflow-hidden relative font-sans">
      {/* ── Background: quiet paper grain + a single warm glow ──────────────── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Fine grid, barely there — like ruled paper */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(245, 241, 232, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(245, 241, 232, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* One signature warm glow, upper-left, like a desk lamp over a page */}
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] bg-cyan-500/[0.14] rounded-full blur-[130px]" />

        {/* A single cool counterpoint, lower-right, kept quiet */}
        <div className="absolute -bottom-40 -right-40 w-[420px] h-[420px] bg-teal-600/[0.08] rounded-full blur-[140px]" />

        {/* Soft vignette to ground the corners */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.35)_100%)]" />
      </div>

      {/* ── Sidebar (overlays canvas, does not push content) ─────────────── */}
      <Sidebar
        user={user}
        conversations={conversations}
        activeId={activeConversationId}
        onNewChat={handleNewChat}
        onHome={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onSignOut={handleSignOut}
        onShowLogin={() => setShowLogin(true)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((c) => !c)}
      />

      {/* ── Main View (always full width) ────────────────────────────────── */}
      <main className="w-full flex flex-col min-w-0 relative z-10 overflow-hidden h-full">
        {isConversationView ? (
          <div className="flex-1 overflow-hidden flex flex-col relative z-10 h-full">
            <ChatView
              messages={messages}
              isLoading={isLoading}
              onFollowUp={(q) => doSearch(q, true)}
            />
          </div>
        ) : (
          <HomeView
            user={user}
            onSearch={(q) => doSearch(q, false)}
            isLoading={isLoading}
            showLogin={showLogin}
            onShowLogin={() => setShowLogin(true)}
          />
        )}
      </main>
    </div>
  );
}
