import urllib.request
import urllib.parse
import json

env_vars = {}
with open('analytics/.env', 'r', encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if line and '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

client_id = env_vars.get('GOOGLE_CLIENT_ID')
client_secret = env_vars.get('GOOGLE_CLIENT_SECRET')
refresh_token = env_vars.get('ADMOB_REFRESH_TOKEN')

print(f'Client ID: {client_id}')
print(f'Client Secret: {client_secret[:8]}...{client_secret[-4:]}')
print(f'Refresh Token: {refresh_token}')

payload = urllib.parse.urlencode({
    'client_id': client_id,
    'client_secret': client_secret,
    'refresh_token': refresh_token,
    'grant_type': 'refresh_token'
}).encode('utf-8')

req = urllib.request.Request(
    'https://oauth2.googleapis.com/token',
    data=payload,
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)

try:
    with urllib.request.urlopen(req) as resp:
        print('HTTP 200 SUCCESS:')
        print(resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f'HTTP Error {e.code}:')
    print(e.read().decode('utf-8'))
except Exception as e:
    print('Error:', e)

