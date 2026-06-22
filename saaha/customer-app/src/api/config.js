/**
 * Central place to configure the backend URL.
 *
 * - Local dev (Android emulator): http://10.0.2.2:5000
 * - Local dev (iOS simulator):    http://localhost:5000
 * - Local dev (physical device):  http://<your-computer-LAN-IP>:5000
 * - Production:                   https://api.saaha.in  (your deployed backend)
 */
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:5000/api' // change to localhost:5000/api for iOS simulator
  : 'https://api.saaha.in/api'; // replace with your real deployed backend URL

export const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:5000'
  : 'https://api.saaha.in';

// Razorpay key — public key only, safe to ship in the app
export const RAZORPAY_KEY_ID = 'rzp_test_your_key_here';
