import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function setMeta(selector: string, attr: "content" | "href", value: string | null | undefined, create?: () => HTMLElement) {
  if (!value) return;
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el && create) { el = create(); document.head.appendChild(el); }
  if (el) el.setAttribute(attr, value);
}

export function SEOHead() {
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (!data) return;
      if (data.meta_title) document.title = data.meta_title;
      setMeta('meta[name="description"]', "content", data.meta_description, () => {
        const m = document.createElement("meta"); m.setAttribute("name", "description"); return m;
      });
      setMeta('meta[name="keywords"]', "content", data.meta_keywords, () => {
        const m = document.createElement("meta"); m.setAttribute("name", "keywords"); return m;
      });
      setMeta('meta[property="og:title"]', "content", data.meta_title);
      setMeta('meta[property="og:description"]', "content", data.meta_description);
      setMeta('meta[property="og:image"]', "content", data.og_image_url);
      setMeta('meta[name="twitter:image"]', "content", data.og_image_url);
      if (data.canonical_url) {
        let c = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
        if (!c) { c = document.createElement("link"); c.rel = "canonical"; document.head.appendChild(c); }
        c.href = data.canonical_url;
      }
      if (data.favicon_url) {
        document.head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach(n => n.remove());
        const ico = document.createElement("link"); ico.rel = "icon"; ico.href = data.favicon_url; document.head.appendChild(ico);
        const apple = document.createElement("link"); apple.rel = "apple-touch-icon"; apple.href = data.favicon_url; document.head.appendChild(apple);
      }
      if (data.google_site_verification) {
        let g = document.head.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
        if (!g) { g = document.createElement("meta"); g.setAttribute("name", "google-site-verification"); document.head.appendChild(g); }
        g.content = data.google_site_verification;
      }
    })();
  }, []);
  return null;
}
