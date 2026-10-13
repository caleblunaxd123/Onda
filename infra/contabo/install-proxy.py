#!/usr/bin/env python3
"""Validate ONDA's added route, preserve the shared config and reload without downtime."""
from pathlib import Path
from datetime import datetime, timezone
import subprocess
import shutil
import sys

shared = Path('/opt/stack/Caddyfile')
before = shared.read_text()
route_file = Path(sys.argv[1] if len(sys.argv) > 1 else '/opt/onda/Caddyfile').resolve()
if route_file.parent != Path('/opt/onda'):
    raise SystemExit('Route source must be an ONDA file in /opt/onda.')
addition = route_file.read_text()
hostname = next(line.strip().split()[0] for line in addition.splitlines() if line.strip() and not line.strip().startswith('#'))
if hostname not in ['onda-api.lunalav.pe', 'onda.lunalav.pe']:
    raise SystemExit('Unexpected ONDA hostname.')
if hostname + ' {' in before:
    raise SystemExit('ONDA proxy route already exists; review before updating.')
candidate = Path('/opt/onda/Caddyfile.candidate')
candidate.write_text(before + '\n' + addition)
subprocess.run(['docker', 'cp', str(candidate), 'caddy:/tmp/onda-candidate'], check=True)
subprocess.run(['docker', 'exec', 'caddy', 'caddy', 'validate', '--config', '/tmp/onda-candidate', '--adapter', 'caddyfile'], check=True)
if shared.read_text() != before:
    raise SystemExit('Shared proxy configuration changed concurrently; nothing applied.')
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = Path('/opt/onda/releases') / ('Caddyfile.before-' + stamp)
shutil.copy2(shared, backup)
# Preserve the inode used by the existing bind mount.
shared.write_text(candidate.read_text())
try:
    subprocess.run(['docker', 'exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], check=True)
except Exception:
    shared.write_text(before)
    subprocess.run(['docker', 'exec', 'caddy', 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], check=True)
    raise
print('ONDA proxy route applied; previous shared config preserved at ' + str(backup))
