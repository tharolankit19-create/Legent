"""
Pull recent Product Hunt launches (ICP topics, last 90 days) as raw leads.

Free source, but Product Hunt's v2 GraphQL API requires a (free) developer token.
Generate one in ~2 min: https://www.producthunt.com/v2/oauth/applications
  -> "Add an application" -> under the app, "Create Developer Token".
Then set it in the environment as PRODUCT_HUNT_TOKEN (do NOT commit it).

Usage:
  python scripts/ph_pull.py --limit 20     # cheap test
  python scripts/ph_pull.py --limit 60     # fuller pull
Writes data/raw_leads.json (deduped by resolved website domain).
"""
import os, sys, json, time, re
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
import requests
from dotenv import load_dotenv
load_dotenv()

TOKEN = os.environ.get("PRODUCT_HUNT_TOKEN") or os.environ.get("PH_TOKEN")
if not TOKEN:
    sys.exit(
        "PRODUCT_HUNT_TOKEN not set. Generate a free developer token at "
        "https://www.producthunt.com/v2/oauth/applications and add it to the "
        "environment as PRODUCT_HUNT_TOKEN."
    )

LIMIT = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else 60
TOPICS = ["saas", "developer-tools", "artificial-intelligence", "marketing", "productivity"]
DAYS = 90
UA = "LegentLeadBot/1.0 (+founder outreach research)"

os.makedirs("data", exist_ok=True)
ENDPOINT = "https://api.producthunt.com/v2/api/graphql"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "Accept": "application/json"}
POSTED_AFTER = (datetime.now(timezone.utc) - timedelta(days=DAYS)).strftime("%Y-%m-%dT%H:%M:%SZ")

QUERY = """
query($topic: String, $after: String, $postedAfter: DateTime) {
  posts(topic: $topic, postedAfter: $postedAfter, order: VOTES, first: 20, after: $after) {
    pageInfo { hasNextPage endCursor }
    edges {
      node {
        id name tagline url website votesCount createdAt
        makers { name username twitterUsername }
      }
    }
  }
}
"""


def domain_of(url):
    if not url:
        return None
    try:
        netloc = urlparse(url if "://" in url else "http://" + url).netloc.lower().split(":")[0]
        return netloc[4:] if netloc.startswith("www.") else netloc
    except Exception:
        return None


def resolve_site(url):
    """PH's `website` is often a producthunt.com/r/ redirect; follow it to the real site."""
    if not url:
        return None, None
    if "://" not in url:
        url = "http://" + url
    dom = domain_of(url)
    if dom and "producthunt.com" in dom:
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=15, allow_redirects=True, stream=True)
            final = r.url
            r.close()
            time.sleep(1)
            return final, domain_of(final)
        except Exception:
            return url, dom
    return url, dom


def fetch_topic(topic, need):
    out, after = [], None
    while len(out) < need:
        variables = {"topic": topic, "after": after, "postedAfter": POSTED_AFTER}
        try:
            r = requests.post(ENDPOINT, headers=HEADERS, json={"query": QUERY, "variables": variables}, timeout=60)
        except Exception as e:
            print(f"  topic {topic}: request failed ({e})")
            break
        if r.status_code == 429:
            time.sleep(2)
            continue
        if r.status_code == 401:
            sys.exit("Product Hunt returned 401 — PRODUCT_HUNT_TOKEN is missing or invalid.")
        try:
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            print(f"  topic {topic}: bad response ({e})")
            break
        if data.get("errors"):
            print(f"  topic {topic}: {data['errors'][:1]}")
            break
        conn = data["data"]["posts"]
        out.extend(e["node"] for e in conn["edges"])
        if not conn["pageInfo"]["hasNextPage"]:
            break
        after = conn["pageInfo"]["endCursor"]
        time.sleep(1)
    return out


seen_domains, leads = set(), []
per_topic = max(1, LIMIT // len(TOPICS) + 1)

for topic in TOPICS:
    if len(leads) >= LIMIT:
        break
    print(f"topic: {topic}")
    for n in fetch_topic(topic, per_topic):
        if len(leads) >= LIMIT:
            break
        site, dom = resolve_site(n.get("website") or n.get("url"))
        if not dom or "producthunt.com" in dom or dom in seen_domains:
            continue
        seen_domains.add(dom)
        maker = (n.get("makers") or [{}])[0]
        leads.append({
            "product": n.get("name"),
            "tagline": n.get("tagline"),
            "website": site,
            "domain": dom,
            "ph_url": n.get("url"),
            "votes": n.get("votesCount"),
            "created_at": n.get("createdAt"),
            "maker_name": maker.get("name"),
            "maker_twitter": maker.get("twitterUsername"),
            "topic": topic,
            "email": None,
        })

json.dump(leads, open("data/raw_leads.json", "w"), indent=1)
print(f"\npulled {len(leads)} unique products (deduped by domain) -> data/raw_leads.json")
