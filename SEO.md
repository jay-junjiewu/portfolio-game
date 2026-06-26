# SEO — getting junjiewu.com to rank for "Junjie Wu"

## What was done in the code (Part A — complete)

- **`index.html` head**: real favicon, canonical URL, `author`, full Open Graph + Twitter Card tags (with `og:image`), and a better title/description.
- **JSON-LD `Person` + `WebSite`** structured data — tells Google this site *is* the person "Junjie Wu" and links it to your GitHub/LinkedIn via `sameAs`. This is the highest-leverage on-page signal for a name query.
- **Static crawlable fallback** inside `#root` (name, bio, profile links). React clears it on load, so visitors never see it, but crawlers and Google's first fetch read it from the raw HTML.
- **`public/robots.txt`** and **`public/sitemap.xml`** (homepage + all project routes).
- **`public/favicon.svg`** (JW monogram) and **`public/og-image.png`** (1200×630 share card).
- Fixed the broken entry-script reference (`/src/main.jsx` → `/src/main.tsx`).

**Next code step: rebuild and deploy** (`npm run build`, then deploy `dist/` as usual). None of the below works until the new files are live at `https://www.junjiewu.com/`.

---

## Off-site steps (Part B — you do these; they decide ranking)

> Honest expectation: "Junjie Wu" is a common name. The code is necessary groundwork, but these steps are what actually move the needle, and Google takes **days to a few weeks** to re-crawl and reflect changes.

### 1. Google Search Console (do this first)
1. Go to <https://search.google.com/search-console> and add a property.
2. Verify ownership — easiest options:
   - **HTML tag**: copy the token Google gives you into `index.html` — uncomment the line `<!-- <meta name="google-site-verification" ... /> -->` and paste the token, then rebuild & deploy.
   - **or DNS**: add the TXT record Google provides to your domain's DNS.
3. Once verified: **Sitemaps** → submit `https://www.junjiewu.com/sitemap.xml`.
4. **URL Inspection** → enter `https://www.junjiewu.com/` → **Request indexing**.
5. (Optional but recommended) Also add Bing Webmaster Tools — it covers Bing + can import from GSC in one click.

### 2. Backlinks that tie your name to the site (strongest signal after indexing)
- **LinkedIn**: Profile → *Contact info* → add `https://www.junjiewu.com` as your Website. Also worth: mention it in your About section and make one post linking to it.
- **GitHub**: 
  - Profile → *Edit profile* → set `https://www.junjiewu.com` in the **website** field.
  - On the `portfolio-game` repo → *About* (gear icon) → set **Website** to `https://www.junjiewu.com` and **pin** the repo to your profile.
- **Anywhere else your name appears**: university page, email signature, X/Twitter bio, dev.to, etc. Each consistent link strengthens the "Junjie Wu = junjiewu.com" association.

---

## Verifying it worked

- **Rich Results / Schema validator**: <https://search.google.com/test/rich-results> — paste the URL; confirm `Person` + `WebSite` parse with no errors.
- **Raw HTML check**: `curl -s https://www.junjiewu.com/ | grep -i "junjie"` — your name, bio, and links should appear in the raw HTML (simulates a non-JS crawler).
- **Lighthouse → SEO** (Chrome DevTools): should score ~100.
- **GSC URL Inspection → Test live URL → View crawled page**: confirms what Google actually sees.
- **Indexing check** (after ~1–4 weeks): search `site:junjiewu.com` on Google. Then track the "Junjie Wu" query's position in **GSC → Performance**.
