import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Heart, MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const Connect = () => {
  const settings = useSiteSettings();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    supabase.from("premium_contacts").select("*").eq("is_active", true).then(({ data }) => setContacts(data ?? []));
    if (user) supabase.from("matches").select("id", { count: "exact", head: true }).or(`user_a.eq.${user.id},user_b.eq.${user.id}`).then(({ count }) => setMatchCount(count ?? 0));
  }, [user]);

  const wa = (n?: string | null) => n ? `https://wa.me/${n.replace(/[^\d]/g, "")}?text=${encodeURIComponent("Hi! I have a match on " + (settings?.site_name ?? "HeartLink") + " and would like to connect with them.")}` : "#";

  return (
    <div className="container max-w-2xl py-6 pb-24 md:pb-10">
      <div className="mb-6 rounded-3xl gradient-hero p-1 shadow-glow">
        <div className="rounded-3xl bg-card p-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full gradient-primary text-primary-foreground">
            <Heart className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl font-bold">Get connected</h1>
          <p className="mt-2 text-muted-foreground">
            {matchCount > 0
              ? `You have ${matchCount} match${matchCount > 1 ? "es" : ""}! `
              : "When you match, "}
            {settings?.premium_message ?? "Contact us to unlock direct messaging with your matches."}
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Premium concierge</h2>
      <div className="space-y-3">
        {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts configured yet.</p>}
        {contacts.map(c => (
          <div key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <p className="font-semibold">{c.label}</p>
            {c.notes && <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {c.whatsapp && (
                <a href={wa(c.whatsapp)} target="_blank" rel="noreferrer">
                  <Button className="gradient-primary text-primary-foreground"><MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp: Connect me</Button>
                </a>
              )}
              {c.email && <a href={`mailto:${c.email}`}><Button variant="outline"><Mail className="mr-1.5 h-4 w-4" /> Email</Button></a>}
              {c.phone && <a href={`tel:${c.phone}`}><Button variant="outline"><Phone className="mr-1.5 h-4 w-4" /> Call</Button></a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Connect;
