#!/usr/bin/env python3
"""Run on the authorized VPS. Creates only ONDA resources; never prints secrets."""
import json
import os
from pathlib import Path
import secrets
import subprocess

root = Path('/opt/onda')
secret_dir = root / 'secrets'
secret_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
os.chmod(secret_dir, 0o700)

def sql(query):
    result = subprocess.run(['docker', 'exec', '-i', 'sqlserver', 'sh', '-c',
        'SQLCMDPASSWORD="$MSSQL_SA_PASSWORD" /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b'],
        input=query, text=True, capture_output=True)
    if result.returncode:
        # SQL diagnostics can echo a batch containing credentials; don't emit them.
        raise RuntimeError('ONDA database provisioning failed; inspect securely on the VPS.')
    return result.stdout

if (secret_dir / 'runtime.connection').exists():
    raise SystemExit('Existing ONDA credentials found; use migration/deploy without bootstrapping again.')

runtime_password = secrets.token_hex(32) + 'Aa1!'
migration_password = secrets.token_hex(32) + 'Aa1!'
sql(f"""
IF DB_ID(N'Onda') IS NOT NULL THROW 50001, 'ONDA database already exists; inspect before provisioning.', 1;
CREATE DATABASE [Onda];
GO
ALTER DATABASE [Onda] SET RECOVERY SIMPLE;
CREATE LOGIN [onda_runtime] WITH PASSWORD=N'{runtime_password}', CHECK_POLICY=ON;
CREATE LOGIN [onda_migration] WITH PASSWORD=N'{migration_password}', CHECK_POLICY=ON;
GO
USE [Onda];
CREATE USER [onda_runtime] FOR LOGIN [onda_runtime];
CREATE USER [onda_migration] FOR LOGIN [onda_migration];
ALTER ROLE [db_owner] ADD MEMBER [onda_migration];
GRANT SELECT, INSERT, UPDATE, DELETE ON SCHEMA::dbo TO [onda_runtime];
GO
""")
for name, user, password in [('runtime', 'onda_runtime', runtime_password), ('migration', 'onda_migration', migration_password)]:
    path = secret_dir / (name + '.connection')
    path.write_text(f'Server=sqlserver;Database=Onda;User Id={user};Password={password};Encrypt=True;TrustServerCertificate=True;Application Name=ONDA;')
    os.chown(path, 1654, 1654)
    os.chmod(path, 0o400)
print('ONDA database and separate scoped migration/runtime credentials created.')
