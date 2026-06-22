# SAAHA — Deployment Guide

This covers taking each of the 5 pieces from your laptop to something you (and others) can actually open and use.

---

## 1. Backend API

The backend is a standard Node.js + Express app with PostgreSQL — deploy it anywhere that runs Node.

### Option A — Railway (easiest, free tier available)
1. Push the `backend/` folder to a GitHub repo.
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo.
3. Add a PostgreSQL plugin from Railway's marketplace (one click) — it gives you `DATABASE_URL` automatically.
4. In your backend's environment variables, set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` from the values Railway's Postgres plugin gives you (or refactor `src/config/db.js` to use `DATABASE_URL` directly — most hosts provide this as one connection string).
5. Set `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
6. Run the schema once via Railway's Postgres console: paste the contents of `backend/src/config/schema.sql`.
7. Railway gives you a public URL like `https://saaha-backend-production.up.railway.app`.

### Option B — Render
1. New → Web Service → connect your GitHub repo, root directory `backend/`.
2. Build command: `npm install`. Start command: `node src/index.js`.
3. Add a Render PostgreSQL instance (free tier available), copy its connection details into your web service's environment variables.
4. Same env vars as above.

### After deploying
- Run the weekly payout cron: on Railway/Render, add a **Cron Job** that runs `node src/utils/generatePayouts.js` every Monday at 6 AM.
- Set up the Razorpay webhook URL in your Razorpay dashboard: `https://<your-backend-url>/api/payments/webhook`.
- Test with: `curl https://<your-backend-url>/health`

---

## 2. Restaurant Web Dashboard (`frontend-web/`)

Static React build — deploy to Vercel or Netlify in minutes.

```bash
cd frontend-web
npm install
npm run build        # outputs to dist/
```

### Vercel
1. `npm i -g vercel` then `vercel` from inside `frontend-web/`, follow the prompts.
2. In Vercel project settings → Environment Variables, none are required by default since the app calls `/api` via the Vite proxy in dev. **For production**, update `src/api/client.js`'s `baseURL` to your deployed backend URL (e.g. `https://saaha-backend-production.up.railway.app/api`) before building.

### Netlify
1. Drag-and-drop the `dist/` folder into Netlify's deploy UI, or connect the GitHub repo with build command `npm run build` and publish directory `dist`.

---

## 3. Admin Panel (`admin-panel/`)

Same process as the restaurant dashboard — it's a separate Vite app.

```bash
cd admin-panel
npm install
npm run build
```

Deploy `dist/` to Vercel/Netlify the same way. **Important:** put this behind a separate subdomain (e.g. `admin.saaha.in`) rather than a public path, and consider adding IP allowlisting or a VPN requirement at the hosting level since this panel controls commission rates and can suspend restaurants/riders.

Update `src/api/client.js`'s `baseURL` to point at your deployed backend before building, same as the restaurant dashboard.

---

## 4. Customer App (React Native)

This needs to be built into a real `.apk`/`.aab` (Android) or `.ipa` (iOS) on a machine with the right tooling — it cannot be built inside this chat environment.

### Before building
In `customer-app/src/api/config.js`, set the production URLs:
```js
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:5000/api'
  : 'https://<your-deployed-backend>/api';

export const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:5000'
  : 'https://<your-deployed-backend>';
```
Also set your real `RAZORPAY_KEY_ID` (public key, safe to ship) if not already wired through the backend response.

### Android — Google Play
1. On a machine with [Android Studio](https://developer.android.com/studio) installed:
   ```bash
   cd customer-app
   npm install
   cd android
   ./gradlew bundleRelease
   ```
2. This produces `android/app/build/outputs/bundle/release/app-release.aab`.
3. Create a [Google Play Console](https://play.google.com/console) account (one-time $25 fee), create a new app, upload the `.aab` under Production → Create release.
4. Fill in store listing (screenshots, description, privacy policy URL — required), submit for review.

### iOS — App Store (Mac required)
1. On a Mac with Xcode installed:
   ```bash
   cd customer-app
   npm install
   cd ios
   pod install
   ```
2. Open `customer-app/ios/SAAHACustomer.xcworkspace` in Xcode.
3. Set your Apple Developer Team under Signing & Capabilities (requires an Apple Developer Program account, $99/year).
4. Product → Archive, then upload via Xcode Organizer to App Store Connect.
5. Fill in App Store listing details, submit for review.

### Faster alternative for testing/demos
Use [Expo's EAS Build](https://docs.expo.dev/build/introduction/) or simply distribute the `.apk` directly to testers (Android only, no Play Store needed) — run `./gradlew assembleRelease` instead of `bundleRelease` to get a sideloadable `.apk`.

---

## 5. Delivery Partner App (React Native)

Identical process to the Customer App above — just run the build commands inside `rider-app/` instead, and update `rider-app/src/api/config.js` with your production backend URL first.

Since this app needs **Google Maps navigation**, also confirm `react-native-maps` is configured with a real Google Maps API key in:
- Android: `rider-app/android/app/src/main/AndroidManifest.xml` (`com.google.android.geo.API_KEY` meta-data tag)
- iOS: `rider-app/ios/SAAHARider/AppDelegate.mm` (`GMSServices.provideAPIKey(...)`)

Get a key from [Google Cloud Console](https://console.cloud.google.com/google/maps-apis) → enable "Maps SDK for Android" / "Maps SDK for iOS".

---

## 6. Domain & DNS suggestion

| Subdomain | Points to |
|---|---|
| `api.saaha.in` | Backend (Railway/Render) |
| `restaurant.saaha.in` | Restaurant dashboard (Vercel/Netlify) |
| `admin.saaha.in` | Admin panel (Vercel/Netlify, access-restricted) |
| Customer App | Distributed via Play Store / App Store, no domain needed |
| Delivery Partner App | Distributed via Play Store / App Store, no domain needed |

---

## 7. Pre-launch checklist

- [ ] Change the default admin password (`admin@saaha.in` / `Admin@123`) immediately after first login
- [ ] Set real `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` (currently runs in demo mode without these)
- [ ] Replace the OTP `console.log` in `auth.otp.js` with a real SMS gateway (MSG91, Twilio, etc.) — currently OTPs only print to the server console
- [ ] Set up the weekly payout cron job (`generatePayouts.js`)
- [ ] Get a Google Maps API key for the rider app's navigation feature
- [ ] Update all `api/config.js` files (customer-app, rider-app) and `api/client.js` baseURLs (frontend-web, admin-panel) to point at your production backend
- [ ] Set up SSL (automatic on Railway/Render/Vercel/Netlify)
- [ ] Test the full order flow end-to-end: customer places order → restaurant accepts → rider picks up → OTP delivery → review
