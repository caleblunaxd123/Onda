#!/usr/bin/env python3
"""Native SQL backup + checksum, encrypted at rest. Run as root; never logs credentials."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import os
import secrets
import subprocess
import sys
import fcntl

lock = open('/opt/onda/backup.lock', 'w')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
folder = Path('/opt/stack/backups/sql/onda')
folder.mkdir(mode=0o700, exist_ok=True)
os.chown(folder, 10001, 0)
os.chmod(folder, 0o700)
key = Path('/opt/onda/secrets/backup.key')
if not key.exists():
    key.write_text(secrets.token_hex(48))
    os.chmod(key, 0o600)
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
native = folder / ('Onda-' + stamp + '.bak')
encrypted = native.with_suffix('.bak.enc')
container_path = '/var/opt/mssql/backup/onda/' + native.name

def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', 'sqlserver', 'sh', '-c',
        'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b'],
        input=query, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError('ONDA backup/restore SQL check failed; inspect securely on the VPS.')
    return result.stdout.strip()

sql(f"BACKUP DATABASE [Onda] TO DISK=N'{container_path}' WITH COPY_ONLY, CHECKSUM;\nGO\nRESTORE VERIFYONLY FROM DISK=N'{container_path}' WITH CHECKSUM;\nGO\n")
subprocess.run(['openssl', 'enc', '-aes-256-cbc', '-salt', '-pbkdf2', '-iter', '200000',
    '-pass', 'file:' + str(key), '-in', str(native), '-out', str(encrypted)], check=True)
os.chmod(encrypted, 0o600)
encrypted.with_suffix('.enc.sha256').write_text(hashlib.file_digest(encrypted.open('rb'), 'sha256').hexdigest() + '\n')
if '--restore-check' in sys.argv:
    check = folder / (native.name + '.restorecheck')
    subprocess.run(['openssl', 'enc', '-d', '-aes-256-cbc', '-pbkdf2', '-iter', '200000',
        '-pass', 'file:' + str(key), '-in', str(encrypted), '-out', str(check)], check=True)
    os.chown(check, 10001, 0)
    os.chmod(check, 0o600)
    restored = '/var/opt/mssql/backup/onda/' + check.name
    verification = sql(f"""
IF DB_ID(N'OndaBackupCheck') IS NOT NULL THROW 50001, 'Existing restore-check database; inspect first.', 1;
RESTORE DATABASE [OndaBackupCheck] FROM DISK=N'{restored}' WITH CHECKSUM,
MOVE N'Onda' TO N'/var/opt/mssql/data/OndaBackupCheck.mdf',
MOVE N'Onda_log' TO N'/var/opt/mssql/data/OndaBackupCheck_log.ldf';
GO
SELECT COUNT_BIG(*) AS RestoredStations FROM [OndaBackupCheck].dbo.Stations;
IF (SELECT COUNT_BIG(*) FROM [OndaBackupCheck].dbo.Stations) = 0 THROW 50002, 'Empty restored catalog.', 1;
GO
DROP DATABASE [OndaBackupCheck];
GO
""")
    check.unlink()
    print('Encrypted backup decrypted and restored to a separate database; populated catalog verified; test database removed.')
native.unlink()
# Only completed ONDA encrypted backups older than 14 days; retain at least the newest two.
archives = sorted(folder.glob('Onda-*.bak.enc'), reverse=True)
now = datetime.now(timezone.utc).timestamp()
for archive in archives[2:]:
    if now - archive.stat().st_mtime > 14 * 86400:
        archive.unlink()
        archive.with_suffix('.enc.sha256').unlink(missing_ok=True)
print('Verified encrypted backup: ' + str(encrypted))
