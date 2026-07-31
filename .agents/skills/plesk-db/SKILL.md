---
name: plesk-db
description: "Trigger: plesk db, plesk database, plesk mariadb, plesk mysql, conexion plesk, remote db plesk, pool timeout plesk, /plesk-db. Architecture and troubleshooting guide for connecting Nuxt/Prisma applications to remote Plesk MariaDB/MySQL databases."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Activate this skill when:
- User is setting up or debugging a remote database connection to a Plesk / Hostinger VPS server.
- Error `pool timeout: failed to retrieve a connection from pool after 10000ms` occurs with Prisma / Nitro.
- Connecting Nuxt / Prisma applications to MariaDB or MySQL hosted on Plesk Obsidian / AlmaLinux.

---

## Critical Knowledge & Gotchas (The 4 Root Causes)

When a local app fails to connect to a remote Plesk database, check these 4 layers in order:

### 1. Hostinger Cloud Firewall (Nube / hPanel)
- **Problem:** Hostinger Cloud Firewall defaults to `Drop Any Any Any Any`.
- **Fix:** Add a rule in Hostinger hPanel → VPS → Firewall:
  - `Accept | TCP | 3306 | Custom | <DEVELOPER_PUBLIC_IP>` (e.g. `79.117.230.49`).

### 2. AlmaLinux OS Firewall (`firewalld`)
- **Problem:** AlmaLinux internal OS firewall blocks port 3306.
- **Fix:** Run in server SSH console (`[root@panel ~]#`):
  ```bash
  sudo firewall-cmd --permanent --add-port=3306/tcp
  sudo firewall-cmd --reload
  ```

### 3. MariaDB `bind-address` Override in `/etc/my.cnf`
- **Problem:** In AlmaLinux with Plesk, `/etc/my.cnf` line 14 contains `bind-address = ::ffff:127.0.0.1`. Since `/etc/my.cnf` is loaded *after* `/etc/my.cnf.d/*.cnf`, line 14 overrides all other config files and forces MariaDB to listen only to local loopback (`127.0.0.1:3306`).
- **Diagnosis:** Run `ss -tulpn | grep 3306` on the server. If it shows `[::ffff:127.0.0.1]:3306`, it is blocked.
- **Fix:** Run in server SSH console:
  ```bash
  sed -i 's/bind-address = ::ffff:127.0.0.1/bind-address = 0.0.0.0/g' /etc/my.cnf
  systemctl restart mariadb
  ```
- **Verification:** Run `ss -tulpn | grep 3306`. It MUST show `*:3306` or `0.0.0.0:3306`.

### 4. Prisma Adapter & RSA Key Authentication (`server/utils/prisma.ts`)
- **Problem:** MySQL 8 / MariaDB using `caching_sha2_password` rejects TCP connections without RSA key retrieval when using `@prisma/adapter-mariadb`.
- **Fix:** In `server/utils/prisma.ts`, include `allowPublicKeyRetrieval: true` in `poolConfig`:
  ```ts
  const poolConfig = {
    host: (process.env.DATABASE_HOST === 'localhost' || !process.env.DATABASE_HOST) ? '127.0.0.1' : process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
  }
  ```

---

## Execution & Diagnostic Steps

1. **Verify Network Port Accessibility (Local PowerShell):**
   ```powershell
   Test-NetConnection -ComputerName <PLESK_SERVER_IP> -Port 3306
   ```
   If `TcpTestSucceeded : False`, check Hostinger Cloud Firewall + `firewalld` + `bind-address`.

2. **Verify Public IP:**
   ```powershell
   Invoke-RestMethod https://api.ipify.org
   ```
   Ensure the IP matches the Hostinger Cloud Firewall rule.

3. **Check MariaDB Listen Interface (Server SSH):**
   ```bash
   ss -tulpn | grep 3306
   grep -rn "bind-address" /etc/my*
   ```

4. **Grant User Privileges in Plesk (Server SSH):**
   Use native `plesk db` (bypasses root password prompt):
   ```bash
   plesk db "GRANT ALL PRIVILEGES ON <DB_NAME>.* TO '<DB_USER>'@'%' IDENTIFIED BY '<DB_PASS>'; GRANT ALL PRIVILEGES ON <DB_NAME>.* TO '<DB_USER>'@'127.0.0.1' IDENTIFIED BY '<DB_PASS>'; FLUSH PRIVILEGES;"
   ```

5. **Test Connection directly (Node/Tsx Script):**
   Run `npx tsx --env-file=.env ./scripts/check-db.ts`.

---

## Output Contract

When diagnosing a Plesk database connection issue, provide:
1. Exact layer status (Hostinger Cloud Firewall, OS firewalld, bind-address, Prisma RSA options).
2. Clean, copy-pasteable SSH commands.
3. Verification steps (`check-db.ts`, `Test-NetConnection`).
