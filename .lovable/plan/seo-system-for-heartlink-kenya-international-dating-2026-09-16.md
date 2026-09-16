# SEO system for HeartLink (Kenya + international dating)

Everything below is added to the existing site. No redesign, no new app, no removed features. The only visible addition is a compact FAQ block at the bottom of the current landing page — needed because Google only accepts FAQ rich results when the questions are actually visible on the page.

## 1. Backend content store (admin-editable)

Four new tables, readable by everyone (only published rows), editable by admins only:

- **seo_pages** — one row per existing public route (`/`, `/auth`, `/shop`, `/discover`, `/install`, ...): SEO title, meta description, H1, canonical, keywords, intro copy, schema type, index/noindex, include-in-sitemap.
- **seo_questions** — the question/FAQ database: question, answer, topic, target keywords, published flag, sort order, and which route it shows on.
- **seo_keywords** — keyword/opportunity list, including queries imported from Search Console (clicks, impressions, CTR, position, last synced).
- **seo_redirects** — from-path → to-path, 301/302, active flag.

Seed content covering the requested topics, written as genuinely useful unique answers, not repeated templates:

- Kenya: dating in Kenya, dating sites/apps in Kenya, online dating in Kenya, free dating Kenya, serious dating Kenya, Kenyan singles, singles in Nairobi, Mombasa, Kisumu, Nakuru, Eldoret, Thika, Machakos, Kisii, Nyeri.
- International: Kenyans dating Americans, British, Canadians, Australians, Europeans, Germans, French, Italians, Spanish, Dutch, Irish, Swedish, Norwegians, Danish, Swiss, Belgians, Austrians, Portuguese, Polish, Greeks; Kenyans living abroad; foreigners meeting Kenyan singles.
- How-to and safety: how online dating works in Kenya, meeting singles by city, serious relationships, meeting Americans/British/Canadians/Australians/Europeans from Kenya, dating safety, dating scams, profile advice, first dates, long distance, international relationships.

Keyword targeting lives in titles, descriptions and real answers only — no stuffing, no doorway pages.

## 2. Technical SEO on existing routes

A route-aware head manager (extending the current `SEOHead`) applies per-route, from the database with sensible fallbacks:

- unique title and meta description, canonical URL (self-referencing), robots directives
- Open Graph + Twitter card, favicon and verification token (as today)
- JSON-LD: Organization + WebSite (sitewide), BreadcrumbList per route, FAQPage where FAQ is visible, ProfilePage/Person only for profiles the owner marked public
- visible breadcrumbs on inner routes, H1 audit fixes, alt text on landing images, internal links between landing, shop, FAQ block and install
- 404 stays a real 404 view; `seo_redirects` are applied on route mount as 301-intent redirects (with the server-side rule in `_redirects`/`.htaccess` where possible)
- trailing-slash and duplicate-URL normalisation so each page has one canonical address

## 3. Sitemap and robots

- Build-time generator (`scripts/generate-sitemap.ts`, wired to predev/prebuild) writes `public/sitemap.xml` from the database: every published, indexable route plus public FAQ anchors and public profiles. Admin, onboarding, messages, orders, private profiles and noindex rows are excluded. URLs only — no keywords.
- A `seo-sitemap` backend function serves an always-current XML at a stable URL, so sitemap content updates as soon as admins publish, without a rebuild. `robots.txt` references the sitemap and keeps Googlebot fully allowed.

## 4. Admin → SEO (inside the existing dashboard)

The current SEO tab becomes sub-tabs, same styling as the rest of the dashboard:

- **Pages** — edit title, description, H1, canonical, keywords, content, index/noindex, sitemap inclusion, schema type.
- **Questions / FAQs** — create, edit, publish, order, assign to a route.
- **Keywords** — list, add, and import real Search Console queries.
- **Redirects** — add/edit/disable 301s.
- **Sitemap** — regenerate, copy sitemap URL, submit to Search Console.
- **Google Search Console** — property URL, verification token, method (meta / HTML file / DNS), sitemap URL, dashboard link, plus Verify Now, Recheck, Open Search Console, Copy Sitemap URL, Submit Sitemap.
- **Audit** — run the checks and list errors/warnings.

## 5. Real verification and real Search Console data

A `seo-verify` backend function does actual detection: fetches the live homepage and compares the `google-site-verification` token, requests the HTML verification file, or reads the DNS TXT record. Status is only ever "Verified" when the check passes; otherwise it reports exactly what is missing.

A `seo-search-console` backend function talks to Search Console through the connected Google account and returns clicks, impressions, CTR, average position, top queries, top pages, countries and devices for a chosen date range, plus a one-click import of those queries into the keyword database. If no Google account is connected, the admin sees a connect prompt — never invented numbers.

## 6. Audit checks

Missing/duplicate titles and descriptions, missing H1, canonical problems, broken internal links, unintended noindex, sitemap and robots problems, structured-data problems, thin pages, duplicate pages, missing image alt text — grouped as errors vs warnings.

## 7. Verification after build

Check `/robots.txt`, `/sitemap.xml`, per-route titles/canonicals, FAQ and other structured data with a real browser pass, then confirm sign-in, swiping, chat, shop checkout and M-Pesa flows still behave exactly as before.
