"""Wait for the uploaded build to finish processing, then wire up internal TestFlight."""
import pathlib, sys, time
sys.path.insert(0, str(pathlib.Path.home() / 'datadungeon/scripts'))
from asc import call

APP = '6801758613'


def log(*a):
    print(f'[{time.strftime("%H:%M:%S")}]', *a, flush=True)


# ---- 1. wait for the build ----
build = None
for _ in range(120):                       # up to ~40 min
    d = call('GET', f'/builds?filter[app]={APP}'
                    '&fields[builds]=version,processingState,expirationDate').json()
    if d.get('data'):
        build = d['data'][0]
        st = build['attributes']['processingState']
        log('build', build['attributes']['version'], '->', st)
        if st == 'VALID':
            break
        if st in ('INVALID', 'FAILED'):
            log('FATAL: processing failed'); raise SystemExit(1)
    else:
        log('not visible yet...')
    time.sleep(20)

if not build or build['attributes']['processingState'] != 'VALID':
    log('gave up waiting'); raise SystemExit(1)

bid = build['id']
log('build id', bid, 'VALID')

# ---- 2. export compliance (otherwise it sits at "Missing Compliance") ----
r = call('PATCH', f'/builds/{bid}', json={"data": {"type": "builds", "id": bid,
         "attributes": {"usesNonExemptEncryption": False}}})
log('compliance set ->', r.status_code)

# ---- 3. find or create an internal group ----
groups = call('GET', f'/betaGroups?filter[app]={APP}'
                     '&fields[betaGroups]=name,isInternalGroup').json().get('data', [])
internal = [g for g in groups if g['attributes'].get('isInternalGroup')]
log('existing groups:', [(g['attributes']['name'], g['attributes'].get('isInternalGroup')) for g in groups])

if internal:
    gid = internal[0]['id']
    log('using internal group', internal[0]['attributes']['name'], gid)
else:
    r = call('POST', '/betaGroups', json={"data": {"type": "betaGroups",
             "attributes": {"name": "Greg's Devices", "isInternalGroup": True},
             "relationships": {"app": {"data": {"type": "apps", "id": APP}}}}})
    log('create group ->', r.status_code)
    if not r.ok:
        raise SystemExit(1)
    gid = r.json()['data']['id']
    log('created internal group', gid)

# ---- 4. attach the build to the group ----
r = call('POST', f'/betaGroups/{gid}/relationships/builds',
         json={"data": [{"type": "builds", "id": bid}]})
log('attach build ->', r.status_code)

# ---- 5. make sure the account holder is a tester in it ----
users = call('GET', '/users?fields[users]=username,firstName,lastName,roles').json().get('data', [])
for u in users:
    log('asc user:', u['attributes'].get('username'), u['attributes'].get('roles'))
    r = call('POST', '/betaTesters', json={"data": {"type": "betaTesters",
             "attributes": {"email": u['attributes']['username'],
                            "firstName": u['attributes'].get('firstName') or 'Greg',
                            "lastName": u['attributes'].get('lastName') or 'Leigh'},
             "relationships": {"betaGroups": {"data": [{"type": "betaGroups", "id": gid}]}}}})
    log('  add tester ->', r.status_code)

log('DONE — TestFlight ready')
