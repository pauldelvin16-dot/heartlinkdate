import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UnreadCounts { messages: number; notifications: number }

export function useUnreadCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<UnreadCounts>({ messages: 0, notifications: 0 });

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).rpc("unread_counts", { _user_id: user.id });
    if (data) setCounts({ messages: Number(data.messages || 0), notifications: Number(data.notifications || 0) });
  }, [user]);

  useEffect(() => {
    if (!user) { setCounts({ messages: 0, notifications: 0 }); return; }
    refresh();
    const ch = supabase
      .channel(`unread:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        refresh();
        if (payload.eventType === "INSERT" && "Notification" in window && Notification.permission === "granted") {
          const n: any = payload.new;
          try { new Notification(n.title, { body: n.body || "", icon: "/favicon.png" }); } catch {}
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  return { counts, refresh };
}

export function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    setTimeout(() => { Notification.requestPermission().catch(() => {}); }, 1500);
  }
}
