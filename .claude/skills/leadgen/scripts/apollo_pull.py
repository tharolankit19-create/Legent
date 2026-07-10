import os, json, sys, time, requests
from dotenv import load_dotenv
load_dotenv()

KEY = os.environ["APOLLO_API_KEY"]
PAGE = int(sys.argv[sys.argv.index("--page")+1]) if "--page" in sys.argv else 1
os.makedirs("data", exist_ok=True)

PAYLOAD = {
    "person_titles": ["Founder","Co-Founder","CEO","Solo Founder","Head of Growth"],
    "organization_num_employees_ranges": ["1,10","11,20"],
    "person_locations": ["United States","United Kingdom","Canada","India","Germany","Australia"],
    "q_organization_keyword_tags": ["saas","artificial intelligence","developer tools","software"],
    "contact_email_status": ["verified"],
    "page": PAGE,
    "per_page": 100,
}

HEADERS = {"Content-Type":"application/json","Cache-Control":"no-cache","x-api-key":KEY}

def search():
    r = requests.post("https://api.apollo.io/api/v1/mixed_people/search",
                      headers=HEADERS, json=PAYLOAD, timeout=60)
    r.raise_for_status()
    return r.json().get("people", [])

def enrich(pid):
    r = requests.post("https://api.apollo.io/api/v1/people/match",
                      headers=HEADERS, json={"id": pid, "reveal_personal_emails": False}, timeout=30)
    return r.json().get("person", {}) if r.ok else {}

people = search()
out = []
for p in people:
    org = p.get("organization") or {}
    e = p.get("email")
    if not e or e == "email_not_unlocked@domain.com":
        full = enrich(p["id"]); e = full.get("email"); time.sleep(0.3)
    out.append({
        "name": p.get("name"),
        "first_name": p.get("first_name"),
        "title": p.get("title"),
        "email": e,
        "linkedin": p.get("linkedin_url"),
        "twitter": p.get("twitter_url"),
        "company": org.get("name"),
        "website": org.get("website_url"),
        "employees": org.get("estimated_num_employees"),
        "founded_year": org.get("founded_year"),
        "industry": org.get("industry"),
        "keywords": (org.get("keywords") or [])[:8],
        "short_desc": (org.get("short_description") or "")[:220],
    })

path = f"data/raw_leads.json"
prev = json.load(open(path)) if PAGE > 1 and os.path.exists(path) else []
json.dump(prev + out, open(path,"w"), indent=1)
print(f"page {PAGE}: pulled {len(out)} | total {len(prev)+len(out)} → {path}")
