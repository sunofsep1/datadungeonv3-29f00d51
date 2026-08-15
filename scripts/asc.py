"""Minimal App Store Connect API client (ES256 JWT).

Credentials live outside the repo:
  key    ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8
  ids    ~/.appstoreconnect/config.json  ->  {"key_id": "...", "issuer_id": "..."}
"""
import json, pathlib, sys, time
import jwt, requests

CFG = json.loads((pathlib.Path.home() / '.appstoreconnect/config.json').read_text())
KEY_ID, ISSUER_ID = CFG['key_id'], CFG['issuer_id']
KEY = (pathlib.Path.home() / f'.appstoreconnect/private_keys/AuthKey_{KEY_ID}.p8').read_text()
BASE = 'https://api.appstoreconnect.apple.com/v1'


def token():
    now = int(time.time())
    return jwt.encode(
        {'iss': ISSUER_ID, 'iat': now, 'exp': now + 1200, 'aud': 'appstoreconnect-v1'},
        KEY, algorithm='ES256', headers={'kid': KEY_ID, 'typ': 'JWT'})


def call(method, path, **kw):
    r = requests.request(method, path if path.startswith('http') else BASE + path,
                         headers={'Authorization': f'Bearer {token()}',
                                  'Content-Type': 'application/json'},
                         timeout=60, **kw)
    if not r.ok:
        print(f'HTTP {r.status_code} {method} {path}', file=sys.stderr)
        print(r.text[:2000], file=sys.stderr)
    return r


if __name__ == '__main__':
    m, p = (sys.argv[1], sys.argv[2]) if len(sys.argv) > 2 else ('GET', sys.argv[1])
    body = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    r = call(m, p, **({'json': body} if body else {}))
    try:
        print(json.dumps(r.json(), indent=2)[:6000])
    except Exception:
        print(r.status_code, r.text[:2000])
