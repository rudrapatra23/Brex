import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { Plus, ChevronDown, ChevronRight, PanelLeft, LogOut, Zap, Menu, X, Trash2 } from "lucide-react";
import { createClient } from "@/lib/client";
import { BACKEND_URL } from "@/lib/config";
import SearchBar from "@/components/SearchBar";
import ChatView, { type Message, type Source } from "@/components/ChatView";

const supabase = createClient();

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

interface ConversationSummary {
  id: string;
  title: string;
  slug: string;
}

// ─── Stream parser ────────────────────────────────────────────────────────────

function parseStreamChunk(raw: string): {
  answer: string;
  sources: Source[];
  conversationId: string | null;
  followUps: string[];
} {
  const metadataStarts = [
    raw.search(/<SOURCES>/i),
    raw.search(/<FOLLOW_UPS>/i),
    raw.search(/<CONVERSATION_ID>/i),
  ].filter((i) => i !== -1);

  let answerBlock = raw.slice(0, metadataStarts.length > 0 ? Math.min(...metadataStarts) : undefined);

  const answerOpen = answerBlock.match(/<ANSWER>/i);
  if (answerOpen?.index !== undefined) {
    const start = answerOpen.index + answerOpen[0].length;
    const end = answerBlock.search(/<\/ANSWER>/i);
    answerBlock = answerBlock.slice(start, end !== -1 ? end : undefined);
  }

  let sources: Source[] = [];
  const sm = raw.match(/<SOURCES>\r?\n([\s\S]*?)\r?\n<\/SOURCES>/i);
  if (sm?.[1]) { try { const p = JSON.parse(sm[1]); if (Array.isArray(p)) sources = p as Source[]; } catch {} }

  let followUps: string[] = [];
  const fm = raw.match(/<FOLLOW_UPS>\r?\n([\s\S]*?)\r?\n<\/FOLLOW_UPS>/i);
  if (fm?.[1]) { try { const p = JSON.parse(fm[1]); if (Array.isArray(p)) followUps = p.filter((x): x is string => typeof x === "string"); } catch {} }

  const conversationId = raw.match(/<CONVERSATION_ID>([^<]*)<\/CONVERSATION_ID>/i)?.[1]?.trim() || null;

  return { answer: answerBlock.trimEnd(), sources, conversationId, followUps };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(user: User): string {
  const name = user.user_metadata?.full_name as string | undefined;
  if (name) return name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
  return (user.email?.[0] ?? "U").toUpperCase();
}

/** Extract profile picture URL from Supabase OAuth user_metadata.
 *  Google sets avatar_url; GitHub sets avatar_url too (their CDN).
 *  Falls back to null so the initials badge is shown instead.
 */
function getAvatarUrl(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const url = meta?.avatar_url ?? meta?.picture ?? null;
  return typeof url === "string" && url.length > 0 ? url : null;
}

// ─── Avatar badge ─────────────────────────────────────────────────────────────

function AvatarBadge({ user, size = 24 }: { user: User; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = getAvatarUrl(user);
  const showImg = avatarUrl && !imgError;

  return showImg ? (
    <img
      src={avatarUrl}
      alt={getInitials(user)}
      width={size}
      height={size}
      onError={() => setImgError(true)}
      className="rounded-full flex-shrink-0 object-cover"
      style={{ width: size, height: size, border: "1px solid rgba(94,234,212,0.2)" }}
    />
  ) : (
    <div
      className="rounded-full flex items-center justify-center font-bold text-primary flex-shrink-0"
      style={{
        width: size, height: size,
        fontSize: size * 0.42,
        background: "rgba(94,234,212,0.1)",
        border: "1px solid rgba(94,234,212,0.2)",
      }}
    >
      {getInitials(user)}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

interface SidebarProps {
  user: User | null;
  conversations: ConversationSummary[];
  activeId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onSignOut: () => void;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

function Sidebar({ user, conversations, activeId, onNewChat, onSelectConversation, onDeleteConversation, onSignOut, collapsed, open: mobileOpen, onToggle, onClose }: SidebarProps) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const isMobile = useIsMobile();

  const desktopWidth = collapsed ? 48 : 220;
  const panelWidth  = isMobile ? 260 : desktopWidth;
  const panelTransform = isMobile
    ? mobileOpen ? "translateX(0)" : "translateX(-100%)"
    : "translateX(0)";

  return (
    <>
      {/* ── Mobile backdrop ─────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* ── Sidebar panel ───────────────────────────────────────── */}
      <aside
        className="fixed md:relative top-0 left-0 z-50 md:z-30 flex flex-col h-full flex-shrink-0 transition-all duration-200 ease-out"
        style={{
          background: "#0D0D0F",
          borderRight: "1px solid #26262B",
          width: panelWidth,
          transform: panelTransform,
        }}
      >
      {/* Header */}
      <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 pt-4 pb-3 flex-shrink-0`}>
        {!collapsed && (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" /> Brex
          </div>
        )}
        {/* Desktop collapse toggle */}
        <button
          onClick={onToggle}
          className="hidden md:flex p-1.5 rounded-[6px] text-[#5D5D66] hover:text-foreground hover:bg-[#1B1B1F] transition-all duration-150"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="w-3.5 h-3.5" />
        </button>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="flex md:hidden p-1.5 rounded-[6px] text-[#5D5D66] hover:text-foreground hover:bg-[#1B1B1F] transition-all duration-150"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New chat */}
      <div className={`px-2 pb-3 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          onClick={onNewChat}
          title="New chat"
          className={`flex items-center gap-2 rounded-[8px] text-xs text-[#9C9CA3] hover:text-foreground hover:bg-[#1B1B1F] transition-all duration-150 ${
            collapsed ? "p-2" : "w-full px-3 py-2"
          }`}
          style={{ border: "1px solid #26262B" }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(94,234,212,0.25)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "#26262B")}
        >
          <Plus className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          {!collapsed && <span>New search</span>}
        </button>
      </div>

      {/* Sessions */}
      {!collapsed && (
        <div className="flex-1 overflow-hidden flex flex-col px-2 min-h-0">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            className="flex items-center justify-between px-2 py-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-[#5D5D66] hover:text-[#9C9CA3] transition-colors w-full mb-0.5"
          >
            <span>History</span>
            {historyOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>

          {historyOpen && (
            <div className="flex-1 overflow-y-auto space-y-px pb-2">
              {conversations.length === 0 ? (
                <p className="text-[11px] text-[#5D5D66] px-2 py-3 text-center">No history yet</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="group relative flex items-center rounded-[6px] transition-all duration-150"
                  >
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      title={conv.title}
                      className={`flex-1 text-left px-2.5 py-1.5 rounded-[6px] text-[11px] truncate transition-all duration-150 pr-7 ${
                        activeId === conv.id
                          ? "text-primary bg-[rgba(94,234,212,0.08)]"
                          : "text-[#9C9CA3] hover:text-foreground hover:bg-[#1B1B1F]"
                      }`}
                    >
                      {conv.title}
                    </button>
                    {/* Delete button — appears on row hover */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      title="Delete conversation"
                      className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 rounded-[4px] text-[#5D5D66] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.08)] transition-all duration-150"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* User */}
      {!collapsed && user && (
        <div className="p-2 mt-auto" style={{ borderTop: "1px solid #26262B" }}>
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            {/* Avatar: OAuth profile picture with initials fallback */}
            <AvatarBadge user={user} size={24} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-foreground truncate">
                {(user.user_metadata?.full_name as string) ?? user.email}
              </p>
              <p className="text-[10px] text-[#5D5D66] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-[11px] text-[#5D5D66] hover:text-[#F87171] hover:bg-[rgba(248,113,113,0.06)] transition-all duration-150"
          >
            <LogOut className="w-3 h-3" /> Sign out
          </button>
        </div>
      )}
    </aside>
    </>
  );
}

// ─── Home (empty state) ───────────────────────────────────────────────────────

// const SUGGESTIONS = [
//   "What's happening in AI today?",
//   "How does quantum computing work?",
//   "Best practices for React in 2025",
//   "Explain black holes simply",
//   "Latest breakthroughs in medicine",
// ];

interface HomeViewProps {
  user: User | null;
  onSearch: (q: string) => void;
  isLoading: boolean;
  showLogin: boolean;
  onShowLogin: () => void;
  onOpenSidebar: () => void;
}

function HomeView({ user, onSearch, isLoading, showLogin, onShowLogin, onOpenSidebar }: HomeViewProps) {
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0];

  async function login(provider: "google" | "github") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + "/app" },
    });
    if (error) console.error(error.message);
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-6 pt-14 md:pt-0">
      <div className="w-full max-w-xl animate-fade-up space-y-7">
        <div className="text-center space-y-2">
          <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#5D5D66]">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-foreground">
            What do you want to know?
          </h1>
        </div>

        {user ? (
          <SearchBar onSubmit={onSearch} isLoading={isLoading} placeholder="Ask anything…" />
        ) : (
          <div className="space-y-2.5">
            <div
              className="w-full rounded-[10px] px-4 py-3.5 text-sm text-[#5D5D66] cursor-pointer transition-all duration-150"
              style={{ background: "#131316", border: "1px solid #26262B" }}
              onClick={onShowLogin}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(94,234,212,0.3)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#26262B")}
            >
              Sign in to start searching…
            </div>
            {showLogin && (
              <div
                className="rounded-[10px] p-3 animate-fade-up"
                style={{ background: "#131316", border: "1px solid #26262B" }}
              >
                <p className="text-[11px] text-[#5D5D66] text-center mb-3">Continue with</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["google", "github"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => login(p)}
                      className="rounded-[8px] px-3 py-2.5 text-xs font-medium text-foreground capitalize transition-all duration-150 hover:bg-[#1B1B1F]"
                      style={{ border: "1px solid #26262B" }}
                    >
                      {p === "google" ? "Google" : "GitHub"}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={onShowLogin}
              className="w-full py-2.5 rounded-[10px] text-sm font-medium text-[#0A0A0B] transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #5EEAD4 0%, #7C9CFF 100%)",
                boxShadow: "0 0 20px rgba(94,234,212,0.12)",
              }}
            >
              Get started free
            </button>
          </div>
        )}

        {/* {user && (
          <div className="flex flex-wrap gap-1.5 justify-center">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSearch(s)}
                className="text-[11px] px-3 py-1.5 rounded-[999px] text-[#9C9CA3] hover:text-foreground transition-all duration-150 hover:-translate-y-px"
                style={{ background: "#131316", border: "1px solid #26262B" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(94,234,212,0.25)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#26262B")}
              >
                {s}
              </button>
            ))}
          </div>
        )} */}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId ?? null);

  const justCreatedRef = useRef(false);
  const messagesCacheRef = useRef<Map<string, Message[]>>(new Map());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) return;
      const res = await fetch(`${BACKEND_URL}/conversation_history`, { headers: { Authorization: jwt } });
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {}
  }, [user]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!conversationId || !user) return;
    setActiveConversationId(conversationId);
    if (justCreatedRef.current) { justCreatedRef.current = false; return; }

    const cached = messagesCacheRef.current.get(conversationId);
    if (cached) { setMessages(cached); return; }

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const jwt = session?.access_token;
        if (!jwt) return;
        const res = await fetch(`${BACKEND_URL}/conversation_history/${conversationId}`, {
          method: "POST", headers: { Authorization: jwt },
        });
        const json = await res.json();
        if (json.conversation?.messages) {
          const loaded = json.conversation.messages.map(
            (m: { role: string; content: string; sources?: Source[]; followUps?: string[] }) => {
              const parsed = parseStreamChunk(m.content);
              return {
                role: m.role as "User" | "Assistant",
                content: parsed.answer || m.content,
                sources: parsed.sources.length > 0 ? parsed.sources : m.sources ?? [],
                followUps: parsed.followUps.length > 0 ? parsed.followUps : m.followUps ?? [],
              };
            }
          );
          setMessages(loaded);
        }
      } catch {}
    })();
  }, [conversationId, user]);

  async function doSearch(query: string, isFollowUp = false) {
    if (!user) { setShowLogin(true); return; }
    setIsLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) { setIsLoading(false); setShowLogin(true); return; }

    setMessages((prev) => [...prev,
      { role: "User", content: query },
      { role: "Assistant", content: "", streaming: true },
    ]);

    try {
      const url = isFollowUp ? `${BACKEND_URL}/brex_ask/follow_up` : `${BACKEND_URL}/brex_ask`;
      const body = isFollowUp ? { query, conversationId: activeConversationId } : { query };
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: jwt },
        body: JSON.stringify(body),
      });
      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const { answer, sources, conversationId: newCid } = parseStreamChunk(accumulated);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "Assistant") {
            updated[updated.length - 1] = {
              role: "Assistant",
              content: answer,
              sources: sources.length > 0 ? sources : last.sources,
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

      accumulated += decoder.decode();
      const { answer: finalAnswer, sources: finalSources, conversationId: finalCid, followUps } = parseStreamChunk(accumulated);

      let finalMessages: Message[] = [];
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "Assistant") {
          updated[updated.length - 1] = { role: "Assistant", content: finalAnswer, sources: finalSources, followUps, streaming: false };
        }
        finalMessages = updated;
        return updated;
      });

      const resolvedCid = finalCid || activeConversationId;
      if (finalCid) { setActiveConversationId(finalCid); justCreatedRef.current = true; navigate(`/search/${finalCid}`, { replace: true }); }
      if (resolvedCid && finalMessages.length > 0) messagesCacheRef.current.set(resolvedCid, finalMessages);

      await loadConversations();
    } catch (err) {
      console.error(err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "Assistant" && last.streaming) {
          updated[updated.length - 1] = { role: "Assistant", content: "Something went wrong. Please try again.", streaming: false };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteConversation(conversationId: string) {
    // Optimistic removal — remove from UI immediately
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));

    // If the deleted conversation is currently open, go back to empty home
    if (activeConversationId === conversationId) {
      setMessages([]);
      setActiveConversationId(null);
      navigate("/app");
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) return;

      const res = await fetch(`${BACKEND_URL}/conversation/${conversationId}`, {
        method: "DELETE",
        headers: { Authorization: jwt },
      });

      if (!res.ok) {
        // Rollback optimistic removal if server rejected
        console.error("[Delete] Server returned", res.status);
        await loadConversations(); // refresh to restore correct state
      } else {
        messagesCacheRef.current.delete(conversationId);
      }
    } catch (err) {
      console.error("[Delete] Network error", err);
      await loadConversations(); // restore state on failure
    }
  }

  function handleNewChat() {
    setMessages([]);
    setActiveConversationId(null);
    navigate("/app");
  }

  function handleSelectConversation(id: string) {
    setMessages([]);
    setMobileSidebarOpen(false);
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

  const isConversationView = messages.length > 0 || (!!conversationId && !!activeConversationId);

  return (
    <div className="flex h-screen w-screen overflow-hidden relative" style={{ background: "#0A0A0B" }}>
      {/* Subtle ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed z-0"
        style={{
          top: "20%", left: "30%",
          width: 500, height: 300,
          background: "radial-gradient(ellipse, rgba(94,234,212,0.04) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      {/* ── Mobile top bar ──────────────────────────────────────── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-12 flex-shrink-0"
        style={{
          background: "rgba(10,10,11,0.90)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #26262B",
        }}
      >
        <button
          onClick={() => setMobileSidebarOpen(true)}
          className="p-1.5 rounded-[6px] text-[#5D5D66] hover:text-foreground transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Zap className="w-3.5 h-3.5 text-primary" /> Brex
        </div>
        {/* Placeholder to keep logo centered */}
        <div className="w-7" />
      </div>

      {/* ── Desktop sidebar (static rail, pushes content) ────────── */}
      <div
        className="hidden md:flex flex-col flex-shrink-0 h-full relative z-30 transition-all duration-200"
        style={{
          width: sidebarCollapsed ? 48 : 220,
          background: "#0D0D0F",
          borderRight: "1px solid #26262B",
        }}
      >
        <Sidebar
          user={user}
          conversations={conversations}
          activeId={activeConversationId}
          onNewChat={handleNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={deleteConversation}
          onSignOut={handleSignOut}
          collapsed={sidebarCollapsed}
          open={false}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          onClose={() => {}}
        />
      </div>

      {/* ── Mobile sidebar (slide-over drawer) ───────────────────── */}
      <div className="md:hidden">
        <Sidebar
          user={user}
          conversations={conversations}
          activeId={activeConversationId}
          onNewChat={() => { handleNewChat(); setMobileSidebarOpen(false); }}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={deleteConversation}
          onSignOut={handleSignOut}
          collapsed={false}
          open={mobileSidebarOpen}
          onToggle={() => {}}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden h-full text-foreground">
        {isConversationView ? (
          <ChatView
            messages={messages}
            isLoading={isLoading}
            onFollowUp={(q) => doSearch(q, true)}
          />
        ) : (
          <HomeView
            user={user}
            onSearch={(q) => doSearch(q, false)}
            isLoading={isLoading}
            showLogin={showLogin}
            onShowLogin={() => setShowLogin(true)}
            onOpenSidebar={() => setMobileSidebarOpen(true)}
          />
        )}
      </main>
    </div>
  );
}
