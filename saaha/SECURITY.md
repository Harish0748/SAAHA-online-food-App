# Security & Firewall Guide

This repository includes recommended hardening steps and helper scripts to reduce attack surface for a production deployment of SAAHA.

IMPORTANT: These scripts make host-level changes (firewall rules). Run them only on your production server as an administrator/root after reviewing them.

## What I added

- `scripts/firewall/ufw-setup.sh` — UFW helper to restrict inbound traffic on Linux (allows SSH, HTTP, HTTPS and restricts Postgres to localhost).
- `scripts/firewall/windows-firewall.ps1` — PowerShell helper to block external access to Postgres on Windows hosts.
- `docker-compose.yml` updated to bind Postgres to `127.0.0.1:5432:5432` to avoid exposing it on all interfaces.
- Server-side Razorpay verification added for subscription activation (`/api/subscriptions/activate`).

## Recommended deployment checklist

1. Use the `.env` file and set a strong `JWT_SECRET` and real `RAZORPAY_*` keys.
2. Remove or avoid publishing database ports in production Compose files. The default Compose now binds Postgres to `127.0.0.1`.
3. Run the UFW script on Linux:

```bash
sudo bash scripts/firewall/ufw-setup.sh
```

4. Run the PowerShell script on Windows (as Administrator):

```powershell
# Open PowerShell as Administrator
.")\scripts\firewall\windows-firewall.ps1"
```

5. Ensure `ALLOWED_ORIGINS` in your backend `.env` contains only the frontend/admin origins.
6. Configure HTTPS termination (NGINX/Load balancer) and enable HSTS.
7. Use managed DB services (AWS RDS/GCP Cloud SQL) or ensure the DB is on a private network.
8. Enable monitoring and alerting for failed logins and suspicious activity.

## Razorpay notes

Subscriptions activation now verifies Razorpay payment server-side using the Razorpay SDK when `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set. If you rely on webhooks, set `RAZORPAY_WEBHOOK_SECRET` and configure the webhook URL accordingly.

## Next steps (recommended)

- Migrate JWT tokens from `localStorage` to HttpOnly, Secure cookies and implement refresh tokens.
- Add file upload validation and malware scanning for user uploads.
- Run regular dependency audits (`npm audit`) and apply fixes.
- Perform an external penetration test for a production-ready assurance.
