#!/usr/bin/env python3
"""
Publish a GenFlows blog HTML file to HubSpot CMS, SEO/AEO-complete in one shot:
  - creates the post (PUBLISHED or DRAFT)
  - sets a correct publishDate (avoids the epoch-0 / 1970 bug)
  - injects FAQPage JSON-LD schema into the post's Head HTML (AEO)
  - assigns the cluster topic tag (creating it if missing)

Usage:
  python3 research/publish_batch.py <file.html> --tag "Cold Email" [--draft]
  python3 research/publish_batch.py <file.html> --tag "RevOps" --faq-only   # just (re)inject FAQ schema + tag on an existing post

The HTML file must start with three comment lines:
  <!-- TITLE TAG: ... -->   (<=60 chars, keyword-first)
  <!-- META: ... -->        (140-160 chars)
  <!-- SLUG: blog/... -->
Body = everything after those comments. Body should contain an
<h2>Frequently Asked Questions</h2> section of <h3>Q</h3><p>A</p> pairs.

Cluster tags: "Clay & GTM Engineering" | "Cold Email" | "Outbound Systems" | "RevOps" | "Growth Marketing"
"""
import os, re, sys, json, time, html, urllib.request, urllib.error

CONTENT_GROUP_ID = os.environ.get("HUBSPOT_BLOG_ID", "215071510044")
AUTHOR_NAME = os.environ.get("HUBSPOT_AUTHOR", "Wouter Harink")
DEFAULT_AUTHOR_ID = os.environ.get("HUBSPOT_AUTHOR_ID", "215075641934")
ENV = os.path.join(os.path.dirname(__file__), "..", ".env")


def load_token():
    tok = os.environ.get("HUBSPOT_ACCESS_TOKEN")
    if tok:
        return tok
    with open(ENV) as f:
        for line in f:
            if line.startswith("HUBSPOT_ACCESS_TOKEN="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("No HUBSPOT_ACCESS_TOKEN found")


def api(method, url, token, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw.strip() else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw.decode("utf-8", "ignore")[:300]}


def parse_html(path):
    with open(path) as f:
        raw = f.read()
    title = re.search(r"<!--\s*TITLE TAG:\s*(.*?)\s*-->", raw)
    meta = re.search(r"<!--\s*META:\s*(.*?)\s*-->", raw)
    slug = re.search(r"<!--\s*SLUG:\s*(.*?)\s*-->", raw)
    if not (title and meta and slug):
        raise SystemExit(f"{path}: missing TITLE/META/SLUG comments")
    body = raw[slug.end():].strip()
    return title.group(1), meta.group(1), slug.group(1), body


def strip_tags(s):
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def extract_faqs(body):
    m = re.search(r"<h2[^>]*>\s*Frequently Asked Questions\s*</h2>", body, re.I)
    if not m:
        return []
    tail = body[m.end():]
    # Stop at the next H2 *or* the closing <hr> rule -- the house format ends the
    # post with <hr> + CTA + byline and no trailing H2, which otherwise gets
    # appended to the final FAQ answer in the emitted JSON-LD.
    end = None
    for pat in (r"<h2[^>]*>", r"<hr[\s/>]"):
        mm = re.search(pat, tail, re.I)
        if mm and (end is None or mm.start() < end):
            end = mm.start()
    if end is not None:
        tail = tail[:end]
    faqs = []
    for part in re.split(r"<h3[^>]*>", tail, flags=re.I)[1:]:
        qm = re.match(r"(.*?)</h3>(.*)", part, re.S | re.I)
        if not qm:
            continue
        q, a = strip_tags(qm.group(1)), strip_tags(qm.group(2))
        if q and a:
            faqs.append((q, a))
    return faqs


def build_faq_jsonld(faqs):
    data = {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": a}}
                           for q, a in faqs]}
    return '<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False) + '\n</script>'


def find_author_id(token):
    st, data = api("GET", "https://api.hubapi.com/cms/v3/blogs/authors?limit=100", token)
    if st != 200:
        return None
    for a in data.get("results", []):
        if a.get("displayName", "").strip().lower() == AUTHOR_NAME.strip().lower():
            return a.get("id")
    return None


def find_post_by_slug(token, slug):
    after = None
    while True:
        u = f"https://api.hubapi.com/cms/v3/blogs/posts?limit=100&contentGroupId={CONTENT_GROUP_ID}&archived=false"
        if after:
            u += f"&after={after}"
        st, data = api("GET", u, token)
        if st != 200:
            return None
        for p in data.get("results", []):
            if p.get("slug") == slug:
                return p
        after = data.get("paging", {}).get("next", {}).get("after")
        if not after:
            return None


def ensure_tag(token, name):
    st, data = api("GET", "https://api.hubapi.com/cms/v3/blogs/tags?limit=200", token)
    for t in data.get("results", []):
        if t["name"] == name:
            return t["id"]
    st, data = api("POST", "https://api.hubapi.com/cms/v3/blogs/tags", token, {"name": name})
    if st in (200, 201):
        return data["id"]
    raise SystemExit(f"tag create failed for {name}: {st} {json.dumps(data)[:200]}")


def push_live(token, pid):
    return api("POST", f"https://api.hubapi.com/cms/v3/blogs/posts/{pid}/draft/push-live", token, {})


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    draft = "--draft" in sys.argv
    faq_only = "--faq-only" in sys.argv
    tag = None
    if "--tag" in sys.argv:
        tag = sys.argv[sys.argv.index("--tag") + 1]
    if not args:
        raise SystemExit(__doc__)
    path = args[0]
    token = load_token()
    title, meta, slug, body = parse_html(path)

    if len(title) > 60:
        print(f"⚠️  TITLE is {len(title)} chars (>60): {title}")
    if not (120 <= len(meta) <= 165):
        print(f"⚠️  META is {len(meta)} chars (target 140-160)")

    faqs = extract_faqs(body)
    print(f"FAQs extracted: {len(faqs)}")
    head_html = build_faq_jsonld(faqs) if faqs else None
    tag_id = ensure_tag(token, tag) if tag else None

    existing = find_post_by_slug(token, slug)

    if faq_only:
        if not existing:
            raise SystemExit(f"--faq-only but no post with slug {slug}")
        payload = {}
        if head_html:
            payload["headHtml"] = head_html
        if tag_id:
            payload["tagIds"] = [tag_id]
        st, data = api("PATCH", f"https://api.hubapi.com/cms/v3/blogs/posts/{existing['id']}", token, payload)
        ps, _ = push_live(token, existing["id"])
        print(f"FAQ/tag update: PATCH {st} push-live {ps}  {slug}")
        return

    if existing:
        print(f"⚠️  DUPLICATE: slug '{slug}' exists as {existing['id']}. Skipping.")
        return

    author_id = find_author_id(token) or DEFAULT_AUTHOR_ID
    payload = {
        "name": title,
        "contentGroupId": CONTENT_GROUP_ID,
        "slug": slug,
        "postBody": body,
        "metaDescription": meta,
        "useFeaturedImage": False,
        "htmlTitle": title,
        "blogAuthorId": author_id,
        "state": "DRAFT" if draft else "PUBLISHED",
    }
    if head_html:
        payload["headHtml"] = head_html
    if tag_id:
        payload["tagIds"] = [tag_id]
    if not draft:
        payload["publishDate"] = int(time.time() * 1000)
        payload["publishImmediately"] = True

    st, data = api("POST", "https://api.hubapi.com/cms/v3/blogs/posts", token, payload)
    if st in (200, 201):
        print(f"✅ {'DRAFT' if draft else 'PUBLISHED'}: {data.get('id')} | {slug}")
        print(f"   URL: {data.get('url')}")
        print(f"   FAQ schema: {'yes ('+str(len(faqs))+'Q)' if head_html else 'none'} | tag: {tag or '—'}")
    else:
        print(f"❌ FAILED ({st}): {json.dumps(data)[:500]}")


if __name__ == "__main__":
    main()
