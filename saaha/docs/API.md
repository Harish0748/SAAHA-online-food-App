# SAAHA API Reference

Base URL (local): `http://localhost:5000/api`

All authenticated routes require header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Auth — Customer (`/auth/customer`)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/register` | — | `{ name, email, phone, password }` |
| POST | `/login` | — | `{ email, password }` |
| GET | `/me` | customer | — |
| PUT | `/me` | customer | `{ name, phone }` |
| POST | `/address` | customer | `{ label, flat, street, landmark, city, state, pincode, latitude, longitude, is_default }` |
| GET | `/addresses` | customer | — |

## Auth — Restaurant (`/auth/restaurant`)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/register` | — | `{ owner_name, owner_email, owner_phone, password, restaurant_name, description, cuisine_types[], address, city, pincode, fssai_number, gst_number }` |
| POST | `/login` | — | `{ email, password }` |
| GET | `/me` | restaurant | — |
| PATCH | `/toggle` | restaurant | — (toggles open/closed; requires active subscription) |
| GET | `/dashboard` | restaurant | — returns today/week stats |

## Auth — Rider (`/auth/rider`)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/register` | — | `{ name, email, phone, password, vehicle_type, vehicle_number, dl_number }` |
| POST | `/login` | — | `{ email, password }` |
| PATCH | `/online` | rider | `{ latitude, longitude }` (toggles online status) |
| PATCH | `/location` | rider | `{ latitude, longitude }` |
| GET | `/earnings` | rider | — today/week/total earnings |

## Restaurants (public browsing)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/restaurants?city=&search=&veg_only=&page=` | — | Only returns restaurants with active subscription + open |
| GET | `/restaurants/:id` | — | Returns restaurant + full menu grouped by category |

## Menu (restaurant management)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/menu/category` | restaurant | `{ name, display_order }` |
| GET | `/menu/my` | restaurant | — |
| POST | `/menu/item` | restaurant | `{ category_id, name, description, price, discounted_price, is_veg, preparation_time, calories, allergens[] }` |
| PUT | `/menu/item/:id` | restaurant | `{ name, description, price, discounted_price, is_available }` |
| PATCH | `/menu/item/:id/toggle` | restaurant | — |
| DELETE | `/menu/item/:id` | restaurant | — |

## Orders

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/orders` | customer | `{ restaurant_id, items:[{id,quantity}], delivery_address, payment_method, delivery_instructions }` |
| GET | `/orders/my?page=&limit=` | customer | — |
| GET | `/orders/:id` | customer/restaurant/rider | — |
| PATCH | `/orders/:id/status` | restaurant/rider | `{ status }` — restaurant: `confirmed→preparing→ready→cancelled`; rider: `picked_up→delivered` |
| POST | `/orders/:id/verify-otp` | rider | `{ otp }` — must verify before marking delivered |
| GET | `/orders/restaurant/active` | restaurant | All non-final orders for the restaurant |

**Order pricing breakdown (computed server-side, not trusted from client):**
```
item_total        = sum(menu price × qty)
delivery_fee       = ₹40 (flat)
platform_fee       = ₹0
handling_fee        = ₹0
total_amount        = item_total + delivery_fee
commission_amount  = item_total × 10%
restaurant_payout  = item_total − commission_amount
rider_payout        = ₹32 (of the ₹40 delivery fee)
```

## Rider operations (`/rider`)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/rider/active` | rider | Current in-progress delivery |
| GET | `/rider/history?page=&limit=` | rider | Past deliveries |
| PATCH | `/rider/:orderId/respond` | rider | `{ accept: true/false }` |

## Subscriptions (`/subscriptions`)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/subscriptions/plans` | — | Returns both plans with pricing & features |
| POST | `/subscriptions/activate` | restaurant | `{ plan_type: 'normal'\|'big', payment_id }` |
| GET | `/subscriptions/status` | restaurant | Current plan + days remaining |

## Payments (`/payments`)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| POST | `/payments/create-order` | customer/restaurant | `{ amount, purpose }` — Razorpay order stub |
| POST | `/payments/verify` | customer/restaurant | `{ payment_id, order_id, signature }` |

> ⚠️ Razorpay integration is stubbed — plug in real `RAZORPAY_KEY_ID`/`SECRET` and the official SDK (`npm i razorpay`) before going to production.

## Reviews (`/reviews`)

| Method | Endpoint | Auth | Body |
|---|---|---|---|
| POST | `/reviews` | customer | `{ order_id, restaurant_rating, rider_rating, food_rating, comment }` |
| GET | `/reviews/restaurant/:id` | — | Last 20 reviews |

## Notifications (`/notifications`)

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | any | Last 50 for logged-in user |
| PATCH | `/notifications/:id/read` | any | Mark as read |

---

## Socket.IO events

Connect to the same backend URL with `socket.io-client`.

| Event (client emits) | Payload | Purpose |
|---|---|---|
| `join_order` | `orderId` | Join a room to receive tracking updates |
| `join_restaurant` | `restaurantId` | Restaurant dashboard listens for new orders |
| `join_rider` | `riderId` | Rider app listens for delivery assignments |
| `rider_location` | `{ orderId, lat, lng }` | Rider broadcasts live location |

| Event (server emits) | Payload | Received by |
|---|---|---|
| `new_order` | `{ order_id, order_number, items, total }` | Restaurant room |
| `new_delivery` | `{ order_id, order_number, restaurant_address, delivery_address, earnings }` | Rider room |
| `order_status_update` | `{ status, order_id }` | Order room (customer tracking) |
| `location_update` | `{ lat, lng }` | Order room (customer tracking) |

---

## Sample request — place an order

```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $CUSTOMER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "uuid-here",
    "items": [{ "id": "menu-item-uuid", "quantity": 2 }],
    "delivery_address": { "flat": "12B", "street": "MG Road", "city": "Bengaluru", "pincode": "560001", "latitude": 12.97, "longitude": 77.59 },
    "payment_method": "upi",
    "delivery_instructions": "Ring the bell twice"
  }'
```
