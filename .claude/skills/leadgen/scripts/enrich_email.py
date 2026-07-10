"""
Enrich data/raw_leads.json with a personal work email per lead.

For each lead's website, fetch /, /about, /contact, /team, regex emails, and keep
only personal-looking addresses on the SAME registrable domain. Role inboxes
(info@, support@, hello@, contact@, admin@, team@, ...) are dropped.

Discipline:
- Respects robots.txt (skips any path it disallows).
- ~1 request/second.
- Skips on 403 / 4xx / 5xx / timeout. No retries.
- Never fabricates an address. No email found -> email stays null.

Usage: python scripts/enrich_email.py
Rewrites data/raw_leads.json in place with an "email" field.
"""
import json, re, time
from urllib.parse import urlparse, urljoin
from urllib import robotparser
import requests

INPUT = "data/raw_leads.json"
PATHS = ["/", "/about", "/contact", "/team"]
ROLE = {
    "info", "support", "hello", "contact", "admin", "team", "sales", "billing",
    "help", "hi", "hey", "press", "media", "jobs", "careers", "legal", "privacy",
    "noreply", "no-reply", "mail", "email", "office", "enquiries", "inquiries",
    "accounts", "hr", "marketing", "partnerships", "security", "abuse", "webmaster",
}
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
UA = "LegentLeadBot/1.0 (+founder outreach research)"
TIMEOUT = 12


def reg_domain(host):
    if not host:
        return None
    host = host.lower().split(":")[0]
    return host[4:] if host.startswith("www.") else host


def is_personal(local):
    l = local.lower()
    if l in ROLE or l.startswith("noreply") or l.startswith("no-reply"):
        return False
    # firstname@  |  f.lastname@  |  first.last@
    return bool(
        re.fullmatch(r"[a-z]+", l)
        or re.fullmatch(r"[a-z]\.[a-z]+", l)
        or re.fullmatch(r"[a-z]+\.[a-z]+", l)
    )


def robots_for(base):
    rp = robotparser.RobotFileParser()
    try:
        rr = requests.get(urljoin(base, "/robots.txt"), headers={"User-Agent": UA}, timeout=8)
        time.sleep(1)
        rp.parse(rr.text.splitlines() if rr.status_code == 200 else [])
    except Exception:
        rp.parse([])
    return rp


def find_email(lead):
    site = lead.get("website")
    if not site:
        return None
    if "://" not in site:
        site = "http://" + site
    parsed = urlparse(site)
    rdom = reg_domain(parsed.netloc)
    if not rdom:
        return None
    base = f"{parsed.scheme}://{parsed.netloc}"
    rp = robots_for(base)

    for path in PATHS:
        url = urljoin(base, path)
        try:
            if not rp.can_fetch(UA, url):
                continue
        except Exception:
            pass
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT, allow_redirects=True)
        except Exception:
            time.sleep(1)
            continue
        time.sleep(1)  # ~1 req/sec
        if r.status_code >= 400:
            continue
        for match in EMAIL_RE.findall(r.text):
            local, _, edom = match.partition("@")
            edom = reg_domain(edom)
            if not edom or not (edom == rdom or edom.endswith("." + rdom)):
                continue
            if is_personal(local):
                return match.lower()
    return None


def main():
    leads = json.load(open(INPUT))
    for i, lead in enumerate(leads, 1):
        if lead.get("email"):
            continue
        email = find_email(lead)
        lead["email"] = email
        print(f"[{i}/{len(leads)}] {lead.get('domain') or lead.get('website')}: {email or '—'}")
    json.dump(leads, open(INPUT, "w"), indent=1)
    got = sum(1 for l in leads if l.get("email"))
    print(f"\nenriched {got}/{len(leads)} leads with a personal email")


if __name__ == "__main__":
    main()
