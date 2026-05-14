"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getAccessToken } from "@/lib/supabase/session";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Conversation = {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string | null;
  updated_at: string;
  product?: { id: string; name: string } | null;
  lastMessage?: { body: string; sender_id: string; created_at: string } | null;
  unreadCount?: number;
};

type Msg = {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function MessagesInner() {
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversations = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch("/api/conversations", { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) {
      setConversations(data.conversations ?? []);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      setMessages(data.messages ?? []);
    }
  }, []);

  const markRead = async (conversationId: string) => {
    const token = await getAccessToken();
    if (!token) return;
    await fetch(`/api/conversations/${conversationId}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadConversations();
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        window.location.href = "/login?redirect=/messages";
        setLoading(false);
        return;
      }
      setUserId(session.user.id);
      await loadConversations();
      setLoading(false);
    };
    init();
  }, [loadConversations]);

  useEffect(() => {
    const c = searchParams.get("c");
    if (c) setSelected(c);
  }, [searchParams]);

  useEffect(() => {
    if (!selected || !userId) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`messages:${selected}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selected}`,
        },
        () => {
          loadMessages(selected);
          loadConversations();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selected, userId, loadMessages, loadConversations]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!selected) return;
    loadMessages(selected);
    markRead(selected);
    pollRef.current = setInterval(() => {
      loadMessages(selected);
      loadConversations();
    }, 10000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selected, loadMessages, loadConversations]);

  const send = async () => {
    if (!selected || !draft.trim()) return;
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch(`/api/conversations/${selected}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ body: draft.trim() }),
    });
    if (res.ok) {
      setDraft("");
      loadMessages(selected);
      loadConversations();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black py-24 px-6">
        <p className="text-white/60">Loading messages…</p>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black py-20 sm:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-gradient-luxury">Messages</h1>
            <p className="text-white/55 text-sm mt-2">
              Conversations with buyers and sellers. New messages appear instantly when Realtime is enabled; otherwise
              the inbox refreshes about every 10 seconds.
            </p>
          </div>
          <Link href="/marketplace">
            <Button variant="outline" size="sm">
              Marketplace
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[480px] border border-white/10 bg-white/[0.03] rounded-lg overflow-hidden">
          <aside className="border-b lg:border-b-0 lg:border-r border-white/10 max-h-[40vh] lg:max-h-none overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="p-4 text-white/45 text-sm">No conversations yet. Open a listing and message the seller.</p>
            ) : (
              <ul>
                {conversations.map((c) => {
                  const other = c.buyer_id === userId ? c.seller_id : c.buyer_id;
                  const label = c.product?.name ?? "Direct message";
                  const active = selected === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(c.id)}
                        className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                          active ? "bg-gold/10 border-l-2 border-l-gold" : ""
                        }`}
                      >
                        <p className="text-white text-sm font-medium line-clamp-1">{label}</p>
                        <p className="text-white/40 text-xs mt-0.5">Thread · {other.slice(0, 8)}…</p>
                        {c.lastMessage && (
                          <p className="text-white/50 text-xs mt-1 line-clamp-2">{c.lastMessage.body}</p>
                        )}
                        {(c.unreadCount ?? 0) > 0 && (
                          <span className="inline-block mt-2 text-[10px] bg-gold text-black px-2 py-0.5 rounded-full font-bold">
                            {c.unreadCount} new
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          <section className="lg:col-span-2 flex flex-col min-h-[360px]">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-white/40 text-sm p-8">
                Select a conversation
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh] lg:max-h-[420px]">
                  {messages.map((m) => {
                    const mine = m.sender_id === userId;
                    return (
                      <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                            mine ? "bg-gold/20 text-white border border-gold/30" : "bg-white/10 text-white/90"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className="text-[10px] text-white/35 mt-1">
                            {new Date(m.created_at).toLocaleString()}
                            {mine && m.read_at && <span> · Read</span>}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-white/10 p-3 flex gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={2}
                    placeholder="Type a message…"
                    className="flex-1 bg-black border border-white/20 rounded px-3 py-2 text-sm text-white focus:border-gold focus:outline-none resize-none"
                  />
                  <Button variant="primary" className="self-end" onClick={send} disabled={!draft.trim()}>
                    Send
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>

        <p className="text-white/35 text-xs mt-6">
          Tip: from a product page, use &quot;Message seller&quot; (when available) to start a thread about that
          listing.
        </p>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black py-24 px-6">
          <p className="text-white/60">Loading messages…</p>
        </div>
      }
    >
      <MessagesInner />
    </Suspense>
  );
}
