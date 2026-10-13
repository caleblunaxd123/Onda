#!/usr/bin/env python3
"""Validate ONDA's added route, preserve the shared config and reload without downtime."""
from pathlib import Path
from datetime import datetime, timezone
import subprocess
import shutil

shared = Path('/opt/stack/Caddyfile')
before = shared.read_text()
if 'onda-api.lunalav.pe' in before:
    raise SystemExit('ONDA proxy route already exists; review before updating.')
addition = Path('/opt/onda/Caddyfile').read_text()
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
