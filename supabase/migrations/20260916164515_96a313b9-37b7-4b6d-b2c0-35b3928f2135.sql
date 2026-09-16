-- SEO pages
CREATE TABLE public.seo_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route text NOT NULL UNIQUE,
  title text,
  meta_description text,
  h1 text,
  canonical text,
  keywords text[] NOT NULL DEFAULT '{}',
  content text,
  schema_type text NOT NULL DEFAULT 'WebPage',
  is_indexable boolean NOT NULL DEFAULT true,
  in_sitemap boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT true,
  priority numeric NOT NULL DEFAULT 0.5,
  changefreq text NOT NULL DEFAULT 'weekly',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_pages TO authenticated;
GRANT ALL ON public.seo_pages TO service_role;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_pages public read published" ON public.seo_pages FOR SELECT USING (is_published = true);
CREATE POLICY "seo_pages admin all" ON public.seo_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_pages_updated BEFORE UPDATE ON public.seo_pages FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SEO questions / FAQ
CREATE TABLE public.seo_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL,
  answer text NOT NULL,
  topic text,
  keywords text[] NOT NULL DEFAULT '{}',
  route text NOT NULL DEFAULT '/faq',
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_questions TO authenticated;
GRANT ALL ON public.seo_questions TO service_role;
ALTER TABLE public.seo_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_questions public read published" ON public.seo_questions FOR SELECT USING (is_published = true);
CREATE POLICY "seo_questions admin all" ON public.seo_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_questions_updated BEFORE UPDATE ON public.seo_questions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SEO keywords
CREATE TABLE public.seo_keywords (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword text NOT NULL UNIQUE,
  topic text,
  source text NOT NULL DEFAULT 'manual',
  clicks integer,
  impressions integer,
  ctr numeric,
  position numeric,
  last_synced_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_keywords TO authenticated;
GRANT ALL ON public.seo_keywords TO service_role;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_keywords admin all" ON public.seo_keywords FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_keywords_updated BEFORE UPDATE ON public.seo_keywords FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SEO redirects
CREATE TABLE public.seo_redirects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  code integer NOT NULL DEFAULT 301,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_redirects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_redirects TO authenticated;
GRANT ALL ON public.seo_redirects TO service_role;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_redirects public read active" ON public.seo_redirects FOR SELECT USING (is_active = true);
CREATE POLICY "seo_redirects admin all" ON public.seo_redirects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_seo_redirects_updated BEFORE UPDATE ON public.seo_redirects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- public profile opt-in
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public_profile boolean NOT NULL DEFAULT false;

-- Search Console settings
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS gsc_property_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS gsc_verification_method text NOT NULL DEFAULT 'meta';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS gsc_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS gsc_last_checked_at timestamptz;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS gsc_last_check_detail text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sitemap_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS sitemap_last_submitted_at timestamptz;