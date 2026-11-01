#!/usr/bin/env python3
"""
Google Search Console actions — run AFTER gsc_connect.py has authorized
(reuses research/.gsc_token.json silently, no browser).

Usage:
  python3 research/gsc_actions.py sitemaps          # list sitemap status
  python3 research/gsc_actions.py submit-sitemap    # (re)submit sitemap.xml  [needs read/write scope]
  python3 research/gsc_actions.py report [days]     # search-analytics report (default 28 days)
"""
import os, sys, json, warnings
warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
TOKEN_PATH = os.path.join(HERE, ".gsc_token.json")
SITEMAP = "https://www.genflows.com/sitemap.xml"


def service():
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    if not os.path.exists(TOKEN_PATH):
        sys.exit("❌ No token. Run: python3 research/gsc_connect.py")
    creds = Credentials.from_authorized_user_file(TOKEN_PATH)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        open(TOKEN_PATH, "w").write(creds.to_json())
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False), creds


def pick_site(svc):
    sites = svc.sites().list().execute().get("siteEntry", [])
    gf = [s["siteUrl"] for s in sites if "genflows" in s["siteUrl"].lower()]
    if not gf:
        sys.exit("❌ No genflows property visible to this account.")
    # prefer domain property, else the www URL-prefix
    gf.sort(key=lambda u: (not u.startswith("sc-domain:"), len(u)))
    return gf[0]


def can_write(creds):
    return "https://www.googleapis.com/auth/webmasters" in (creds.scopes or [])


def cmd_sitemaps(svc, site):
    print(f"Property: {site}\n--- sitemaps ---")
    data = svc.sitemaps().list(siteUrl=site).execute()
    for s in data.get("sitemap", []):
        c = s.get("contents", [{}])
        submitted = c[0].get("submitted", "?") if c else "?"
        print(f"  {s.get('path')}  lastSubmitted={s.get('lastSubmitted','?')} "
              f"lastDownloaded={s.get('lastDownloaded','never')} "
              f"errors={s.get('errors',0)} warnings={s.get('warnings',0)} "
              f"isPending={s.get('isPending')} urls={submitted}")
    if not data.get("sitemap"):
        print("  (none registered)")


def cmd_submit(svc, site, creds):
    if not can_write(creds):
        sys.exit("❌ Token is read-only. Re-run gsc_connect.py to grant read/write.")
    svc.sitemaps().submit(siteUrl=site, feedpath=SITEMAP).execute()
    print(f"✅ Submitted {SITEMAP} to {site}")
    cmd_sitemaps(svc, site)


def cmd_report(svc, site, days):
    from datetime import date, timedelta
    end = date.today()
    start = end - timedelta(days=days)
    def q(dims, extra=None):
        body = {"startDate": start.isoformat(), "endDate": end.isoformat(),
                "dimensions": dims, "rowLimit": 250}
        if extra:
            body.update(extra)
        return svc.searchanalytics().query(siteUrl=site, body=body).execute().get("rows", [])

    print(f"Property: {site}   window: {start} → {end} ({days}d)\n")
    tot = q([])
    if tot:
        m = tot[0]
        print(f"TOTALS: clicks={m['clicks']:.0f} impressions={m['impressions']:.0f} "
              f"ctr={m['ctr']*100:.2f}% avgPos={m['position']:.1f}\n")

    rows = q(["query"])
    print("== TOP QUERIES (by impressions) ==")
    for r in sorted(rows, key=lambda x: -x["impressions"])[:20]:
        print(f"  pos {r['position']:5.1f}  imp {r['impressions']:6.0f}  clk {r['clicks']:4.0f}  "
              f"ctr {r['ctr']*100:5.1f}%  {r['keys'][0]}")

    print("\n== STRIKING DISTANCE (avg position 5–20, by impressions) — fastest wins ==")
    sd = [r for r in rows if 5 <= r["position"] <= 20]
    for r in sorted(sd, key=lambda x: -x["impressions"])[:25]:
        print(f"  pos {r['position']:5.1f}  imp {r['impressions']:6.0f}  clk {r['clicks']:4.0f}  "
              f"ctr {r['ctr']*100:5.1f}%  {r['keys'][0]}")
    if not sd:
        print("  (none yet — expected on a young property; revisit as impressions grow)")

    prows = q(["page"])
    print("\n== TOP PAGES (by impressions) ==")
    for r in sorted(prows, key=lambda x: -x["impressions"])[:20]:
        print(f"  imp {r['impressions']:6.0f}  clk {r['clicks']:4.0f}  pos {r['position']:5.1f}  "
              f"{r['keys'][0].replace('https://www.genflows.com','')}")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    svc, creds = service()
    site = pick_site(svc)
    if cmd == "sitemaps":
        cmd_sitemaps(svc, site)
    elif cmd == "submit-sitemap":
        cmd_submit(svc, site, creds)
    elif cmd == "report":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 28
        cmd_report(svc, site, days)
    else:
        sys.exit(f"unknown command: {cmd}")


if __name__ == "__main__":
    main()
