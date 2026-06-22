/**
 * Central place to configure the backend URL.
 *
 * - Local dev (Android emulator): http://10.0.2.2:5000
 * - Local dev (iOS simulator):    http://localhost:5000
 * - Local dev (physical device):  http://<your-computer-LAN-IP>:5000
 * - Production:                   https://api.saaha.in  (your deployed backend)
 */
export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:5000/api'
  : 'https://api.saaha.in/api';

export const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:5000'
  : 'https://api.saaha.in';

// Used to build Google Maps turn-by-turn navigation deep links
export const GOOGLE_MAPS_DIRECTIONS_BASE = 'https://www.google.com/maps/dir/?api=1';
