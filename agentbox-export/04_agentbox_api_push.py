#!/usr/bin/env python3
"""
AgentBox (Reapit Sales) API push — DataDungeon → AgentBox
=========================================================
Loads the CSVs produced by 01_SQL_EXPORT_PACK.sql and creates Contacts,
Properties and Listings in AgentBox via its REST API.

WHY THIS IS SAFE BY DEFAULT
  * Does NOTHING destructive. It only creates records.
  * DRY-RUN by default: it prints exactly what it WOULD send and posts nothing.
  * Real writes require the explicit  --live  flag.
  * --probe fetches one live record per resource so you can confirm AgentBox's
    exact field names BEFORE pushing (the public API field list varies by
    account/version — never push blind).
  * Idempotent: rows that already carry an "Existing AgentBox ID" are skipped,
    and contacts are matched by email to avoid duplicates.
  * Writes a results file mapping DataDungeon ID -> new AgentBox ID so you can
    update DataDungeon's agentbox_id columns afterwards.

IMPORTANT
  This writes into your Sotheby's SHARED AgentBox account. Get your principal/
  admin's OK and your own API credentials first. You run this yourself — do not
  share the API key.

SETUP
  pip install requests
  export AGENTBOX_CLIENT_ID="..."        # from AgentBox (admin-issued)
  export AGENTBOX_API_KEY="..."
  # optional, defaults shown:
  export AGENTBOX_BASE_URL="https://api.agentboxcrm.com.au"
  export AGENTBOX_API_VERSION="2"

USAGE
  python 04_agentbox_api_push.py --probe                       # inspect live schema
  python 04_agentbox_api_push.py --resource contacts           # DRY RUN (default)
  python 04_agentbox_api_push.py --resource contacts --live    # actually create
  python 04_agentbox_api_push.py --resource properties --live
  python 04_agentbox_api_push.py --resource listings  --live
  python 04_agentbox_api_push.py --resource contacts --live --limit 5   # test a few first
"""

import os, sys, csv, json, time, argparse, datetime
try:
    import requests
except ImportError:
    sys.exit("Run:  pip install requests")

# --- config -----------------------------------------------------------------
CLIENT_ID   = os.environ.get("AGENTBOX_CLIENT_ID", "")
API_KEY     = os.environ.get("AGENTBOX_API_KEY", "")
BASE_URL    = os.environ.get("AGENTBOX_BASE_URL", "https://api.agentboxcrm.com.au").rstrip("/")
API_VERSION = os.environ.get("AGENTBOX_API_VERSION", "2")
CSV_DIR     = os.path.dirname(os.path.abspath(__file__))
RESULTS     = os.path.join(CSV_DIR, "api_push_results.csv")
THROTTLE_S  = 0.4   # be gentle on a shared production system

HEADERS = {
    # AgentBox documented auth scheme. If your account uses query-string auth
    # instead (?clientId=&apiKey=), move these into AUTH_PARAMS below.
    "X-Client-ID": CLIENT_ID,
    "X-API-Key":   API_KEY,
    "X-Version":   API_VERSION,
    "Accept":      "application/json",
    "Content-Type":"application/json",
}
AUTH_PARAMS = {}   # e.g. {"version": API_VERSION}

# --- field maps (CONFIRM against --probe output before going live) ----------
# Left = AgentBox payload key, Right = column header in the exported CSV.
CONTACT_MAP = {
    "firstName":   "First Name",
    "lastName":    "Last Name",
    "title":       "Title",
    "salutation":  "Salutation",
    "companyName": "Company",
    "jobTitle":    "Job Title",
    "email":       "Email",
    "mobile":      "Mobile",
    "homePhone":   "Home Phone",
    "workPhone":   "Work Phone",
    "streetAddress":"Street Address",
    "suburb":      "Suburb",
    "state":       "State",
    "postcode":    "Postcode",
    "country":     "Country",
    "dateOfBirth": "Date of Birth",
    "contactClass":"Suggested Contact Class",
    "source":      "Source",
    "comment":     "Notes",
}
PROPERTY_MAP = {
    "streetAddress":"Street Address",
    "suburb":       "Suburb",
    "state":        "State",
    "postcode":     "Postcode",
    "country":      "Country",
    "propertyType": "Property Type",
    "bedrooms":     "Bedrooms",
    "bathrooms":    "Bathrooms",
    "carSpaces":    "Car Spaces",
    "landArea":     "Land Area (sqm)",
    "floorArea":    "Floor Area (sqm)",
    "yearBuilt":    "Year Built",
    "description":  "Description",
}
LISTING_MAP = {
    "address":      "Address",
    "propertyType": "Property Type",
    "type":         "Sale or Lease",
    "status":       "Status",
    "saleMethod":   "Sale Method",
    "authorityType":"Authority Type",
    "marketingHeadline":   "Marketing Headline",
    "marketingDescription":"Marketing Description",
    "comment":      "Notes",
}
RESOURCES = {
    "contacts":   {"path": "/contacts",   "root": "contact",  "map": CONTACT_MAP,  "csv": "agentbox_contacts.csv",            "ddid": "DataDungeon ID (do not import)", "existing": "Existing AgentBox ID", "match": "Email"},
    "properties": {"path": "/properties", "root": "property", "map": PROPERTY_MAP, "csv": "properties.csv",                   "ddid": "DataDungeon Property ID",        "existing": None,                   "match": None},
    "listings":   {"path": "/listings",   "root": "listing",  "map": LISTING_MAP,  "csv": "listings_appraisals_sales.csv",    "ddid": "DataDungeon Listing ID",         "existing": "Existing AgentBox ID", "match": None},
}

def need_creds():
    if not CLIENT_ID or not API_KEY:
        sys.exit("Set AGENTBOX_CLIENT_ID and AGENTBOX_API_KEY environment variables first.")

def api_get(path, params=None):
    p = dict(AUTH_PARAMS); p.update(params or {})
    r = requests.get(BASE_URL + path, headers=HEADERS, params=p, timeout=30)
    r.raise_for_status()
    return r.json()

def api_post(path, payload):
    p = dict(AUTH_PARAMS)
    r = requests.post(BASE_URL + path, headers=HEADERS, params=p, data=json.dumps(payload), timeout=30)
    if r.status_code >= 400:
        raise RuntimeError(f"{r.status_code}: {r.text[:500]}")
    try:
        return r.json()
    except Exception:
        return {"raw": r.text}

def probe():
    need_creds()
    for name, cfg in RESOURCES.items():
        print(f"\n=== {name.upper()}  GET {cfg['path']}?limit=1 ===")
        try:
            data = api_get(cfg["path"], {"limit": 1, "page": 1})
            print(json.dumps(data, indent=2)[:2500])
        except Exception as e:
            print("  (could not fetch — check creds/endpoint/version):", e)
    print("\nUse the field names shown above to confirm/adjust the *_MAP dicts in this script.")

def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def build_payload(row, field_map, root):
    body = {}
    for ab_field, col in field_map.items():
        val = (row.get(col) or "").strip()
        if val:
            body[ab_field] = val
    return {root: body}

def find_existing_contact_by_email(email):
    if not email:
        return None
    try:
        data = api_get("/contacts", {"filter[email]": email, "limit": 1})
        # response shape varies; look for any id-like field
        items = data.get("response", {}).get("contacts", {}).get("items") if isinstance(data, dict) else None
        if items:
            return items[0].get("id")
    except Exception:
        pass
    return None

def push(resource, live, limit):
    need_creds()
    cfg = RESOURCES[resource]
    rows = read_csv(os.path.join(CSV_DIR, cfg["csv"]))
    if limit:
        rows = rows[:limit]
    results = []
    created = skipped = failed = 0
    for i, row in enumerate(rows, 1):
        ddid = row.get(cfg["ddid"], "")
        # skip obvious test rows for contacts
        if resource == "contacts" and (row.get("suspected_test_record","").lower() in ("true","t","1")):
            skipped += 1; results.append((ddid,"","skipped: test record")); continue
        # skip if already in AgentBox
        if cfg["existing"] and (row.get(cfg["existing"]) or "").strip():
            skipped += 1; results.append((ddid, row[cfg["existing"]], "skipped: already has AgentBox ID")); continue
        # dedupe contacts by email
        if live and resource == "contacts" and cfg["match"]:
            existing = find_existing_contact_by_email(row.get(cfg["match"],"").strip())
            if existing:
                skipped += 1; results.append((ddid, existing, "skipped: email already in AgentBox")); continue

        payload = build_payload(row, cfg["map"], cfg["root"])
        label = row.get("Last Name") or row.get("Address") or row.get("Street Address") or ddid
        if not live:
            print(f"[DRY] would POST {cfg['path']}  <- {label}")
            print("      " + json.dumps(payload)[:300])
            results.append((ddid, "", "dry-run"))
            continue
        try:
            resp = api_post(cfg["path"], payload)
            new_id = ""
            if isinstance(resp, dict):
                new_id = (resp.get("response", {}).get(cfg["root"], {}) or {}).get("id", "") or resp.get("id","")
            created += 1
            results.append((ddid, new_id, "created"))
            print(f"[OK]  {label}  -> AgentBox {new_id}")
            time.sleep(THROTTLE_S)
        except Exception as e:
            failed += 1
            results.append((ddid, "", f"ERROR: {e}"))
            print(f"[ERR] {label}: {e}")

    with open(RESULTS, "a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if os.stat(RESULTS).st_size == 0:
            w.writerow(["run_at","resource","datadungeon_id","agentbox_id","status"])
        ts = datetime.datetime.now().isoformat(timespec="seconds")
        for ddid, abid, status in results:
            w.writerow([ts, resource, ddid, abid, status])

    mode = "LIVE" if live else "DRY-RUN"
    print(f"\n{mode} {resource}: created={created} skipped={skipped} failed={failed} "
          f"(of {len(rows)} rows). Log -> {RESULTS}")
    if not live:
        print("Re-run with --live to actually create records.")

def main():
    ap = argparse.ArgumentParser(description="Push DataDungeon CSVs into AgentBox.")
    ap.add_argument("--resource", choices=list(RESOURCES.keys()))
    ap.add_argument("--probe", action="store_true", help="GET one live record per resource to confirm field names")
    ap.add_argument("--live", action="store_true", help="actually create records (default is dry-run)")
    ap.add_argument("--limit", type=int, default=0, help="only process first N rows (good for a test batch)")
    a = ap.parse_args()
    if a.probe:
        probe(); return
    if not a.resource:
        ap.error("choose --resource contacts|properties|listings  (or --probe)")
    if a.live:
        print("*** LIVE MODE — this will create records in your shared AgentBox account. ***")
    push(a.resource, a.live, a.limit)

if __name__ == "__main__":
    main()
