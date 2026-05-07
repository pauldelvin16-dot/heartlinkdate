import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Send, Lock, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const Chat = () => {
  const { matchId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [match, setMatch] = useState<any>(null);
  const [other, setOther] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [canMsg, setCanMsg] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !matchId) return;
    (async () => {
      const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).maybeSingle();
      if (!m) { toast.error("Match not found"); nav("/matches"); return; }
      setMatch(m);
      const otherId = m.user_a === user.id ? m.user_b : m.user_a;
      const { data: p } = await supabase.from("profiles").select("*").eq("id", otherId).maybeSingle();
      setOther(p);
      const { data: can } = await (supabase as any).rpc("can_message", { _a: user.id, _b: otherId });
      setCanMsg(!!can);
      const { data: msgs } = await supabase.from("messages").select("*").eq("match_id", matchId).order("created_at", { ascending: true });
      setMessages(msgs ?? []);
      setLoading(false);
      // mark unread as read
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("match_id", matchId).eq("recipient_id", user.id).is("read_at", null);
    })();

    const ch = supabase.channel(`chat:${matchId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` }, (payload) => {
        setMessages((prev) => prev.some(m => m.id === (payload.new as any).id) ? prev : [...prev, payload.new]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, matchId, nav]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send() {
    if (!text.trim() || !user || !match) return;
    const otherId = match.user_a === user.id ? match.user_b : match.user_a;
    setSending(true);
    const body = text.trim();
    setText("");
    const { error, data } = await supabase.from("messages").insert({ match_id: matchId, sender_id: user.id, recipient_id: otherId, body }).select("*").single();
    setSending(false);
    if (error) {
      toast.error("Messaging is locked. Upgrade to Premium or request connection.");
      setText(body);
      return;
    }
    setMessages((prev) => prev.some(m => m.id === data.id) ? prev : [...prev, data]);
  }

  if (loading) return <div className="grid h-[60vh] place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-[100dvh] flex-col bg-background pb-16 md:pb-0">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-3 py-3 backdrop-blur">
        <Link to="/matches"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
          {other?.photos?.[0] && <img src={other.photos[0]} className="h-full w-full object-cover" alt="" />}
        </div>
        <div className="flex-1">
          <p className="font-semibold leading-tight">{other?.display_name}</p>
          <p className="text-xs text-muted-foreground">{other?.city || other?.country || "Matched"}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">Say hi 👋 — start the conversation.</p>
        )}
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-soft ${mine ? "gradient-primary text-primary-foreground rounded-br-md" : "bg-card rounded-bl-md"}`}>
                    {m.body}
                    <div className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={endRef} />
        </div>
      </div>

      {canMsg === false ? (
        <div className="border-t border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-muted/60 p-3 text-sm">
            <Lock className="h-4 w-4 text-primary" />
            Messaging is a Premium feature. Upgrade or request our concierge to connect you.
          </div>
          <div className="flex gap-2">
            <Link to="/connect" className="flex-1"><Button className="w-full gradient-primary text-primary-foreground"><Crown className="mr-1.5 h-4 w-4" /> Upgrade</Button></Link>
            <Button variant="outline" onClick={async () => {
              if (!user || !match) return;
              const otherId = match.user_a === user.id ? match.user_b : match.user_a;
              const { error } = await supabase.from("connection_requests").insert({ user_id: user.id, match_id: matchId, target_id: otherId });
              if (error) toast.error(error.message); else toast.success("Request sent — admin will reach out");
            }}>Request connect</Button>
          </div>
        </div>
      ) : (
        <div className="border-t border-border bg-card p-2">
          <div className="flex items-end gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())} placeholder="Type a message…" className="flex-1" />
            <Button onClick={send} disabled={sending || !text.trim()} className="gradient-primary text-primary-foreground">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
