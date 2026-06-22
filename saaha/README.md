# 🍽️ SAAHA — Honest Food Delivery

A complete food delivery platform built around **fair pricing**:

| Fee | SAAHA | Typical competitor |
|---|---|---|
| Restaurant commission | **10%** | 25–30% |
| Customer delivery fee | **₹40 flat** | ₹50–120, surge-based |
| Platform fee | **₹0** | ₹5–15 |
| Handling fee | **₹0** | ₹3–10 |
| Restaurant subscription | ₹4,999/mo (normal) · ₹6,999/mo (big) | N/A |

---

## 📁 What's in this project

| App | Tech | Status |
|---|---|---|
| **Backend API** | Node.js + Express + PostgreSQL + Socket.IO | ✅ Fully runnable |
| **Customer App** | React Native (bare CLI) | ✅ Complete code, needs Xcode/Android Studio to build |
| **Delivery Partner App** | React Native (bare CLI) | ✅ Complete code, needs Xcode/Android Studio to build |
| **Restaurant Panel** | React + Vite (web) | ✅ Fully runnable in browser |
| **Admin Panel** | React + Vite (web) | ✅ Fully runnable in browser |

```
saaha/
├── backend/              # Node.js + Express + PostgreSQL API (all 4 apps talk to this)
├── customer-app/         # React Native — ordering app for customers
├── rider-app/             # React Native — delivery partner app
├── frontend-web/          # React (Vite) — restaurant owner web dashboard
├── admin-panel/            # React (Vite) — platform admin console
├── docs/
│   ├── API.md             # Full API reference
│   └── DEPLOYMENT.md      # How to deploy every piece, step by step
├── docker-compose.yml      # Spins up backend + Postgres + both web panels together
└── README.md
```

---

## 🚀 Quick start (local)

### 1. Backend (required by everything else)

```bash
cd backend
cp .env.example .env       # fill in DB credentials, JWT secret, Razorpay keys etc.
npm install
psql -U postgres -c "CREATE DATABASE saaha_db;"
psql -U postgres -d saaha_db -f src/config/schema.sql
npm run dev                 # http://localhost:5000
```

This also seeds a default super admin: `admin@saaha.in` / `Admin@123` — **change this immediately.**

### 2. Restaurant web dashboard

```bash
cd frontend-web
npm install
npm run dev                 # http://localhost:5173
```

### 3. Admin panel

```bash
cd admin-panel
npm install
npm run dev                 # http://localhost:5174
```

### 4. Customer App (React Native)

```bash
cd customer-app
npm install
# iOS (Mac only): cd ios && pod install && cd ..
npx react-native run-android   # or run-ios
```
Edit `src/api/config.js` if your backend isn't on `10.0.2.2:5000` (Android emulator default).

### 5. Delivery Partner App (React Native)

```bash
cd rider-app
npm install
npx react-native run-android   # or run-ios
```

### Or run the backend + both web panels together with Docker

```bash
docker-compose up --build
```

> **Note on the two React Native apps:** they cannot run inside this sandbox (no Xcode/Android Studio/emulator here), but the code is complete and production-structured. Build them on your own machine with Node + Android Studio (Android) or Xcode (iOS, Mac only). See `docs/DEPLOYMENT.md` for app store submission steps.

---

## 💰 Business logic (implemented in code, admin-configurable)

- **Commission**: `10%` deducted from item total only — never from delivery fee.
- **Delivery fee**: flat `₹40`, no surge logic anywhere.
- **Platform fee / handling fee**: hardcoded to `0` in pricing logic.
- **Subscriptions**: ₹4,999 (normal) / ₹6,999 (big). A restaurant can't go live or receive orders without `subscription_status = 'active'`.
- **Rider payout**: ₹32 of the ₹40 delivery fee goes to the rider.
- All of the above are stored in the `platform_settings` table and **live-editable from the Admin Panel → Commission Settings** — changing a value there immediately affects all new orders, no redeploy needed.

---

## 🔐 Four separate auth systems

| Role | Login method | Table |
|---|---|---|
| Customer | Mobile OTP (auto-registers on first login) | `users` |
| Restaurant | Email + password | `restaurants` |
| Delivery partner | Email + password | `riders` |
| Admin | Email + password | `admins` |

Each issues its own JWT with a `role` claim; `middleware/auth.js` checks an allow-list of roles per route.

---

## 📡 Real-time features (Socket.IO)

- Restaurant dashboard gets a live `new_order` event the instant a customer checks out.
- Rider app gets a live `new_delivery` event when auto-assigned to a ready order.
- Customer app joins an `order_<id>` room to receive live `order_status_update` and rider `location_update` events for delivery tracking.

---

## 💳 Payments

Razorpay is fully wired (`backend/src/routes/payments.js`):
- Order creation, signature verification, and webhook handling are implemented.
- If `RAZORPAY_KEY_ID`/`SECRET` aren't set in `.env`, the backend automatically runs in **demo mode** (orders complete without a real payment) so you can test the full flow before getting real API keys.

---

## 🧩 Where to go next

- `docs/API.md` — every backend endpoint, request/response shapes, Socket.IO events.
- `docs/DEPLOYMENT.md` — deploying the backend, both web panels, and submitting the two mobile apps to the Play Store / App Store.

## 🔐 Security & Firewalls

See [SECURITY.md](SECURITY.md) for recommended host firewall rules, Docker Compose hardening, and Razorpay verification notes. Important scripts are available in `scripts/firewall/` — run them as Administrator/root after reviewing.
