#!/usr/bin/env python3
"""
Google Search Console — connect & verify.

First run: opens a browser for you to authorize (one-time consent). Saves the
token to research/.gsc_token.json, then lists the Search Console properties your
account can see and confirms genflows.com is among them.

Subsequent runs: reuse/refresh the saved token silently — no browser needed.

Usage:
  python3 research/gsc_connect.py
"""
import os
import sys
import json
import warnings

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
ENV = os.path.join(HERE, "..", ".env")
TOKEN_PATH = os.path.join(HERE, ".gsc_token.json")
# Full read/write scope — enables Search Analytics reads AND sitemap submit/delete
# and site management. (Per-URL "Request Indexing" has no public API and is NOT
# covered by any scope — that remains a manual action in the GSC UI.)
SCOPES = ["https://www.googleapis.com/auth/webmasters"]
REDIRECT_PORT = 8080


def load_env():
    cid = os.environ.get("GSC_CLIENT_ID") or os.environ.get("client_id")
    csec = os.environ.get("GSC_CLIENT_SECRET") or os.environ.get("client_secret")
    if not (cid and csec):
        with open(ENV) as f:
            for line in f:
                line = line.strip()
                if line.startswith("client_id=") and not cid:
                    cid = line.split("=", 1)[1].strip()
                elif line.startswith("client_secret=") and not csec:
                    csec = line.split("=", 1)[1].strip()
    if not (cid and csec):
        sys.exit("❌ client_id / client_secret not found in .env")
    return cid, csec


def get_creds(cid, csec):
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if os.path.exists(TOKEN_PATH):
        # Load WITHOUT forcing scopes so we can read the actually-granted scopes
        # from the saved token and detect a read-only → read/write upgrade.
        creds = Credentials.from_authorized_user_file(TOKEN_PATH)
    has_scope = bool(creds) and creds.has_scopes(SCOPES)
    if creds and creds.valid and has_scope:
        return creds
    if creds and creds.expired and creds.refresh_token and has_scope:
        creds.refresh(Request())
        _save(creds)
        return creds
    if creds and not has_scope:
        print("⬆️  Saved token is read-only — re-authorizing for read/write "
              "(sitemap submit). You'll see Google's consent screen again.\n")
        try:
            os.remove(TOKEN_PATH)
        except OSError:
            pass

    client_config = {
        "installed": {
            "client_id": cid,
            "client_secret": csec,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    }
    flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
    print(f"\n🔑 A browser window will open for Google authorization.")
    print(f"   If it doesn't, copy the URL it prints below into your browser.")
    print(f"   (Sign in as bivek@genflowsagency.com and click Allow.)\n")
    creds = flow.run_local_server(port=REDIRECT_PORT, open_browser=True,
                                  authorization_prompt_message="Visit this URL to authorize:\n{url}")
    _save(creds)
    return creds


def _save(creds):
    with open(TOKEN_PATH, "w") as f:
        f.write(creds.to_json())
    os.chmod(TOKEN_PATH, 0o600)


def main():
    cid, csec = load_env()
    print(f"Client ID: ...{cid[-24:]}")
    creds = get_creds(cid, csec)

    from googleapiclient.discovery import build
    service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
    resp = service.sites().list().execute()
    sites = resp.get("siteEntry", [])

    print("\n✅ CONNECTED to Google Search Console.")
    if not sites:
        print("\n⚠️  But this account has ZERO verified properties.")
        print("    You must add/verify genflows.com in Search Console AND grant")
        print("    this Google account access under Settings → Users and permissions.")
        return

    print(f"\nProperties visible to this account ({len(sites)}):")
    genflows = []
    for s in sites:
        url = s.get("siteUrl", "")
        perm = s.get("permissionLevel", "")
        marker = ""
        if "genflows" in url.lower():
            genflows.append(url)
            marker = "  ← genflows"
        print(f"  [{perm:18}] {url}{marker}")

    print()
    if genflows:
        print(f"🎯 Found genflows propert{'y' if len(genflows)==1 else 'ies'}: {', '.join(genflows)}")
        print("   Ready to pull Search Analytics (queries / clicks / impressions / position)")
        print("   AND submit/resubmit the sitemap via API (read/write scope granted).")
    else:
        print("⚠️  No genflows.com property found on this account.")
        print("   Add it in Search Console and grant this Google account access,")
        print("   then re-run this script.")


if __name__ == "__main__":
    main()
