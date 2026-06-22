#!/usr/bin/env bash
set -euo pipefail

echo "This script configures UFW to allow only essential inbound traffic and limits Postgres to localhost. Run as root."
read -p "Proceed and apply firewall rules? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Applying UFW defaults..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

echo "Allowing SSH, HTTP and HTTPS..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp

echo "Restricting Postgres to localhost only..."
# Allow Postgres only from localhost (useful if you run Postgres on the same host)
ufw allow from 127.0.0.1 to any port 5432 proto tcp

echo "Enabling UFW..."
ufw --force enable

echo "UFW rules applied. Current status:"
ufw status verbose

echo "Done."
