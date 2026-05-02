import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SiteSettings {
  id: number;
  site_name: string;
  tagline: string | null;
  logo_url: string | null;
  primary_color: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  premium_message: string | null;
  allowed_country_codes: string[];
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      setSettings(data as SiteSettings | null);
    });
  }, []);
  return settings;
}
