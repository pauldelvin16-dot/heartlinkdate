import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type SeoPage = {
  route: string;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  canonical: string | null;
  keywords: string[] | null;
  schema_type: string | null;
  is_indexable: boolean | null;
};

function upsertMeta(kind: "name" | "property", key: string, value: string | null | undefined) {
  if (!value) return;
  const sel = `meta[${kind}="${key}"]`;
  let el = document.head.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function upsertLink(rel: string, href: string | null | undefined) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function upsertJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function titleCase(seg: string) {
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SEOHead() {
  const { pathname } = useLocation();
  const nav = useNavigate();

  // Normalise duplicate URLs: strip trailing slash (except root)
  useEffect(() => {
    if (pathname.length > 1 && pathname.endsWith("/")) {
      nav(pathname.replace(/\/+$/, ""), { replace: true });
    }
  }, [pathname, nav]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [settingsRes, pageRes, redirectRes] = await Promise.all([
        supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
        supabase.from("seo_pages").select("*").eq("route", pathname).eq("is_published", true).maybeSingle(),
        supabase.from("seo_redirects").select("from_path,to_path").eq("from_path", pathname).eq("is_active", true).maybeSingle(),
      ]);
      if (cancelled) return;

      const redirect = redirectRes.data as { to_path: string } | null;
      if (redirect?.to_path && redirect.to_path !== pathname) {
        nav(redirect.to_path, { replace: true });
        return;
      }

      const s: any = settingsRes.data ?? {};
      const page = (pageRes.data ?? null) as SeoPage | null;
      const siteName = s.site_name || "HeartLink";
      const origin = window.location.origin;

      const title = page?.title || s.meta_title || `${siteName} — Dating in Kenya & International Singles`;
      const description =
        page?.meta_description ||
        s.meta_description ||
        "HeartLink connects Kenyan singles with each other and with genuine partners abroad — free to join, verified profiles, real conversations.";
      const keywords = page?.keywords?.length ? page.keywords.join(", ") : s.meta_keywords;
      const canonical = page?.canonical || `${origin}${pathname === "/" ? "/" : pathname}`;

      document.title = title;
      upsertMeta("name", "description", description);
      upsertMeta("name", "keywords", keywords);
      upsertMeta("name", "robots", page?.is_indexable === false ? "noindex, nofollow" : "index, follow");
      upsertMeta("name", "googlebot", page?.is_indexable === false ? "noindex" : "index, follow");

      upsertMeta("property", "og:site_name", siteName);
      upsertMeta("property", "og:type", "website");
      upsertMeta("property", "og:title", title);
      upsertMeta("property", "og:description", description);
      upsertMeta("property", "og:url", canonical);
      upsertMeta("property", "og:image", s.og_image_url);
      upsertMeta("name", "twitter:card", "summary_large_image");
      upsertMeta("name", "twitter:title", title);
      upsertMeta("name", "twitter:description", description);
      upsertMeta("name", "twitter:image", s.og_image_url);

      upsertLink("canonical", canonical);

      if (s.favicon_url) {
        document.head
          .querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
          .forEach((n) => n.remove());
        const ico = document.createElement("link");
        ico.rel = "icon";
        ico.href = s.favicon_url;
        document.head.appendChild(ico);
        const apple = document.createElement("link");
        apple.rel = "apple-touch-icon";
        apple.href = s.favicon_url;
        document.head.appendChild(apple);
      }

      if (s.google_site_verification) {
        upsertMeta("name", "google-site-verification", s.google_site_verification);
      }

      upsertJsonLd("hl-ld-org", {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: siteName,
        url: origin,
        ...(s.logo_url ? { logo: s.logo_url } : {}),
        ...(s.contact_email ? { email: s.contact_email } : {}),
      });
      upsertJsonLd("hl-ld-website", {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: origin,
      });
      upsertJsonLd("hl-ld-page", {
        "@context": "https://schema.org",
        "@type": page?.schema_type || "WebPage",
        name: page?.h1 || title,
        description,
        url: canonical,
        inLanguage: "en",
      });

      if (pathname !== "/") {
        const segments = pathname.split("/").filter(Boolean);
        upsertJsonLd("hl-ld-breadcrumbs", {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
            ...segments.map((seg, i) => ({
              "@type": "ListItem",
              position: i + 2,
              name: titleCase(seg),
              item: `${origin}/${segments.slice(0, i + 1).join("/")}`,
            })),
          ],
        });
      } else {
        document.getElementById("hl-ld-breadcrumbs")?.remove();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, nav]);

  return null;
}
