#!/usr/bin/env python3
"""
Publish a blog HTML file to HubSpot CMS.

Usage:
  python3 publish_to_hubspot.py <file.html> [--draft]

The HTML file must start with three comment lines:
  <!-- TITLE TAG: ... -->
  <!-- META: ... -->
  <!-- SLUG: blog/... -->

Everything after those comments is the post body (postBody).
Publishes to portal 49399880, contentGroupId 215071510044, author "Wouter Harink"
unless overridden via env.
"""
import os
import re
import sys
import json
import time
import urllib.request
import urllib.error

CONTENT_GROUP_ID = os.environ.get("HUBSPOT_BLOG_ID", "215071510044")
AUTHOR_NAME = os.environ.get("HUBSPOT_AUTHOR", "Wouter Harink")
# Known-good author id used by all existing posts (displayName "GenFlows Team",
# authorName "Wouter Harink"). Used directly to avoid a name-lookup miss.
DEFAULT_AUTHOR_ID = os.environ.get("HUBSPOT_AUTHOR_ID", "215075641934")


def load_token():
    tok = os.environ.get("HUBSPOT_ACCESS_TOKEN")
    if tok:
        return tok
    # fall back to .env one dir up
    envpath = os.path.join(os.path.dirname(__file__), "..", ".env")
    with open(envpath) as f:
        for line in f:
            if line.startswith("HUBSPOT_ACCESS_TOKEN="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("No HUBSPOT_ACCESS_TOKEN found")


def parse_html(path):
    with open(path) as f:
        raw = f.read()
    title = re.search(r"<!--\s*TITLE TAG:\s*(.*?)\s*-->", raw)
    meta = re.search(r"<!--\s*META:\s*(.*?)\s*-->", raw)
    slug = re.search(r"<!--\s*SLUG:\s*(.*?)\s*-->", raw)
    if not (title and meta and slug):
        raise SystemExit(f"{path}: missing TITLE/META/SLUG comments")
    # body = everything after the last of the three comments
    body = raw[slug.end():].strip()
    return title.group(1), meta.group(1), slug.group(1), body


def api(method, url, token, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def find_author_id(token, name):
    status, data = api("GET", "https://api.hubapi.com/cms/v3/blogs/authors?limit=100", token)
    if status != 200:
        return None
    for a in data.get("results", []):
        if a.get("displayName", "").strip().lower() == name.strip().lower():
            return a.get("id")
    return None


def slug_exists(token, slug):
    url = f"https://api.hubapi.com/cms/v3/blogs/posts?limit=100&contentGroupId={CONTENT_GROUP_ID}&archived=false"
    status, data = api("GET", url, token)
    if status != 200:
        return None
    for p in data.get("results", []):
        if p.get("slug") == slug:
            return p.get("id")
    return None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    draft = "--draft" in sys.argv
    if not args:
        raise SystemExit("Usage: publish_to_hubspot.py <file.html> [--draft]")
    path = args[0]
    token = load_token()
    title, meta, slug, body = parse_html(path)

    existing = slug_exists(token, slug)
    if existing:
        print(f"⚠️  DUPLICATE: slug '{slug}' already exists as post {existing}. Skipping.")
        return

    author_id = find_author_id(token, AUTHOR_NAME) or DEFAULT_AUTHOR_ID
    payload = {
        "name": title,
        "contentGroupId": CONTENT_GROUP_ID,
        "slug": slug,
        "postBody": body,
        "metaDescription": meta,
        "useFeaturedImage": False,
        "htmlTitle": title,
        "state": "DRAFT" if draft else "PUBLISHED",
    }
    if not draft:
        # Without an explicit publishDate the API records epoch-0 (1970) and the
        # post never renders live despite state=PUBLISHED. Set it to now (epoch ms).
        payload["publishDate"] = int(time.time() * 1000)
        payload["publishImmediately"] = True
    if author_id:
        payload["blogAuthorId"] = author_id

    status, data = api("POST", "https://api.hubapi.com/cms/v3/blogs/posts", token, payload)
    if status in (200, 201):
        print(f"✅ {'DRAFT' if draft else 'PUBLISHED'}: {data.get('id')} | {slug}")
        print(f"   URL: {data.get('url')}")
        print(f"   state: {data.get('state')}")
    else:
        print(f"❌ FAILED ({status}): {json.dumps(data)[:500]}")


if __name__ == "__main__":
    main()
