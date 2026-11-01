---
name: publish-blog-batch
description: Research, write, and publish a batch of GenFlows SEO/AEO blog posts to HubSpot (the standard "batch of 3" workflow). Use when the user asks to create/write/publish blog posts, add content, or run a blog batch for genflows.com. Handles dupe-checking, house format, FAQ schema, cluster tags, and the tracker.
---

# Publish a GenFlows blog batch

End-to-end workflow for producing and publishing GenFlows SEO blog posts to HubSpot
(portal `49399880`, contentGroupId `215071510044`, author **Wouter Harink**, live on
www.genflows.com). Default batch size is **3**. Every post ships SEO/AEO-complete:
≤60-char title, 140–160-char meta, a 6-Q&A FAQ marked up as `FAQPage` schema, a cluster
tag, and internal links only to verified-live slugs.

## Key files
- `research/publish_batch.py` — **the publisher.** Publishes a post AND injects FAQPage
  JSON-LD (into the post's Head HTML) AND assigns the cluster tag, in one call. Fixes the
  epoch-0/1970 publishDate bug automatically. Usage:
  `python3 research/publish_batch.py <file.html> --tag "<cluster>" [--draft]`
  and `--faq-only` to (re)inject schema/tag on an already-published post.
- `research/blog-tracker.md` — **source of truth for dupes.** Read it before choosing topics; append a batch section after publishing.
- `research/blogs/NN-slug.html` — local source HTML, numbered sequentially (check the folder for the next number).
- `research/SEO_AEO_Report.html` / `.md` — the audit that defines the content bar (answer-first, tables, cited/dated, clean H-structure, FAQ schema).
- HubSpot token is `HUBSPOT_ACCESS_TOKEN` in `.env`.
- See also memory: `blog-publishing-workflow` and `seo-aeo-fixes-hubspot-api`.

## Cluster tags (pick exactly one per post)
`Clay & GTM Engineering` · `Cold Email` · `Outbound Systems` (includes LinkedIn) · `RevOps` · `Growth Marketing`

## Workflow

1. **Ground in current state (dupe check).** Pull the live HubSpot list fresh (all slugs,
   published + draft) and read `research/blog-tracker.md`. Never recreate a Live/Drafts
   topic. Also honor the competitor-owned list in the tracker (e.g. avoid head-on "Clay
   alternatives", "appointment setting") — out-angle, don't mirror.
   ```
   python3 -c "import json,urllib.request; tok=[l.split('=',1)[1].strip() for l in open('.env') if l.startswith('HUBSPOT_ACCESS_TOKEN=')][0]; \
   ps=[];a=None
   while True:
    u='https://api.hubapi.com/cms/v3/blogs/posts?limit=100&contentGroupId=215071510044&archived=false'+(f'&after={a}' if a else '')
    r=urllib.request.Request(u);r.add_header('Authorization',f'Bearer {tok}');d=json.loads(urllib.request.urlopen(r).read());ps+=d['results'];a=d.get('paging',{}).get('next',{}).get('after')
    if not a:break
   [print(p['state'],p['slug']) for p in sorted(ps,key=lambda x:x['slug'])]"
   ```

2. **Pick 3 clean-gap topics.** Bias to **lower-competition long-tail** and **bottom-funnel
   commercial** ("vs", "pricing", "cost", "alternatives", "best X for Y") that convert.
   Diversify across clusters to limit cannibalization; each topic maps to a GenFlows service
   line (cold email / LinkedIn DM automation / RevOps / Clay-GTM). Confirm topics are absent
   from Live/Drafts and not competitor-owned. Ask the user to confirm topics if they want a say.

3. **Research (fresh, per topic).** Launch parallel research agents (general-purpose),
   **cap each at ~10 web searches** (an uncapped one has stalled before). Require a source
   URL per claim and a VERIFIED vs DIRECTIONAL tag. Ask each to also propose a comparison
   table and 6 FAQ Q&As. Prefer vendor pages for pricing; flag secondary-sourced numbers.

4. **Write each post** as `research/blogs/NN-slug.html` in the **house format** (below).
   Every claim that's single-sourced/vendor/observed gets an in-text *(directional)* hedge.
   Cross-link to sibling posts and to service-relevant live posts; end with a CTA + byline.

5. **Validate before publishing** (title ≤60, meta 140–160, 6 FAQs parse, 0 broken links):
   ```
   python3 -c "import sys,re,json; sys.path.insert(0,'research'); from publish_batch import parse_html,extract_faqs
   live=set(); import urllib.request; tok=[l.split('=',1)[1].strip() for l in open('.env') if l.startswith('HUBSPOT_ACCESS_TOKEN=')][0]
   # (pull live slugs into 'live' as in step 1, minus 'blog/')
   for f in sys.argv[1:]:
    t,m,s,b=parse_html(f); links=re.findall(r'href=\"/blog/([^\"#?]+)\"',b)
    print(f, len(t), len(m), len(extract_faqs(b)), [l for l in links if l not in live])" research/blogs/NN-*.html
   ```
   (Include the batch's own new slugs in `live` so sibling cross-links don't flag.)

6. **Publish** each with its cluster tag. If posts cross-link each other, publish in
   dependency order (a post that links to a sibling goes second):
   ```
   python3 research/publish_batch.py research/blogs/NN-slug.html --tag "Cold Email"
   ```

7. **Verify live.** New posts 404 for ~5 min during CDN build — poll each URL to HTTP 200,
   then confirm the TL;DR box, tables, FAQ section, and `FAQPage` schema render:
   ```
   curl -s "https://www.genflows.com/blog/<slug>" -A "Mozilla/5.0" | grep -c 'FAQPage'   # expect 1
   ```
   FAQ schema propagates to the CDN a few minutes after publish (same as the page body).

8. **Update the tracker.** Append a batch section to `research/blog-tracker.md` (slugs,
   HubSpot IDs, cluster, per-post uniqueness/differentiation rationale, internal-link
   validation note, research-discipline note), and bump "Last updated". Update the
   `blog-publishing-workflow` memory if the process changed.

## House format (match exactly)
File starts with three comments, then the body (everything after them is `postBody`):
```
<!-- TITLE TAG: <keyword-first, ≤60 chars> -->
<!-- META: <140–160 chars> -->
<!-- SLUG: blog/<slug> -->
```
Then, in order:
- **TL;DR box** (answer-first, ideal for AI extraction):
  `<div style="background:#f4f7fb;border-left:4px solid #e8732b;padding:18px 22px;margin:0 0 28px;border-radius:6px;">` with an uppercase orange label (`color:#e8732b`) and a `<ul>` of bold-led bullets.
- Short intro + a directional-sourcing disclaimer line in `<em>`.
- An **"The Short Answer"** H2, then `<h2>`/`<h3>` sections (~1,700–3,000 words).
- **Inline-styled tables** (never docx-style): `<table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:15px;">`, header row `<tr style="background:#1f3a5f;color:#fff;text-align:left;">` with `<th style="padding:10px 12px;">`, alternating body rows use `background:#f8fafc;`, cells `padding:10px 12px;` + `border-bottom:1px solid #e2e8f0;`.
- **Callout boxes**: orange warn `background:#fff7ed;border-left:4px solid #e8732b;...`; navy note `background:#f4f7fb;border-left:4px solid #1f3a5f;...`.
- **FAQ (required for schema)**: exactly `<h2>Frequently Asked Questions</h2>` then **6** `<h3>Question?</h3><p>Answer.</p>` pairs. `publish_batch.py` parses this into `FAQPage` JSON-LD — keep the heading text verbatim and answers plain (inline tags OK).
- **Close**: `<hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">`, a bold CTA `<p>` linking a relevant post + `<a href="/">talk to our team</a>`, then the byline `<p style="color:#64748b;font-size:14px;"><em>By the GenFlows GTM engineering team. … Last updated <Month Year>.</em></p>`.

## Non-negotiables
- **No duplicates.** Dupe-check against the live pull AND the tracker every time.
- **Title ≤60 chars, keyword-first** (SERP truncation). Set `htmlTitle` (the tool sets `name`=title too, which is fine for a fresh post).
- **Meta 140–160 chars.** Never leave it as an H2 fragment.
- **6-Q&A FAQ** in every post so FAQPage schema emits (biggest AEO win).
- **Internal links only to verified-live slugs** (validate against the live pull); use `/blog/<slug>` and `/` for home.
- **Flag unverifiable claims as *directional* in-text.** Don't state vendor/observed/single-source numbers as fact. Never fabricate prices or stats.
- **Assign a cluster tag** on publish.
