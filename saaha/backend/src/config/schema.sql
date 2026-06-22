-- =============================================
-- SAAHA Food Delivery App - Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USERS TABLE (customers)
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_image VARCHAR(500),
  default_address JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ADDRESSES TABLE
-- =============================================
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50), -- 'Home', 'Work', etc.
  flat VARCHAR(100),
  street VARCHAR(200),
  landmark VARCHAR(200),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- RESTAURANTS TABLE
-- =============================================
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_name VARCHAR(100) NOT NULL,
  owner_email VARCHAR(150) UNIQUE NOT NULL,
  owner_phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  restaurant_name VARCHAR(200) NOT NULL,
  description TEXT,
  cuisine_types TEXT[],
  logo_url VARCHAR(500),
  cover_image_url VARCHAR(500),
  address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  fssai_number VARCHAR(50),
  gst_number VARCHAR(50),
  pan_number VARCHAR(20),
  bank_account JSONB,
  opening_time TIME DEFAULT '09:00',
  closing_time TIME DEFAULT '23:00',
  avg_prep_time INTEGER DEFAULT 30, -- minutes
  is_veg_only BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  is_open BOOLEAN DEFAULT false,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_ratings INTEGER DEFAULT 0,
  subscription_type VARCHAR(20), -- 'normal', 'big'
  subscription_start DATE,
  subscription_end DATE,
  subscription_status VARCHAR(20) DEFAULT 'inactive', -- 'active', 'inactive', 'expired'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- CATEGORIES TABLE (menu categories per restaurant)
-- =============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- MENU ITEMS TABLE
-- =============================================
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2),
  image_url VARCHAR(500),
  is_veg BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER DEFAULT 20,
  calories INTEGER,
  allergens TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- RIDERS TABLE
-- =============================================
CREATE TABLE riders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  profile_image VARCHAR(500),
  vehicle_type VARCHAR(50), -- 'bike', 'scooter', 'bicycle'
  vehicle_number VARCHAR(20),
  dl_number VARCHAR(50),
  rc_number VARCHAR(50),
  aadhaar_number VARCHAR(20),
  pan_number VARCHAR(20),
  bank_account JSONB,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_online BOOLEAN DEFAULT false,
  current_latitude DECIMAL(10,8),
  current_longitude DECIMAL(11,8),
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_deliveries INTEGER DEFAULT 0,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  rider_id UUID REFERENCES riders(id),
  status VARCHAR(30) DEFAULT 'pending',
  -- Status flow: pending -> confirmed -> preparing -> ready -> picked_up -> delivered -> cancelled
  items JSONB NOT NULL,
  item_total DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 40.00,
  platform_fee DECIMAL(10,2) DEFAULT 0.00,
  handling_fee DECIMAL(10,2) DEFAULT 0.00,
  discount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  restaurant_payout DECIMAL(10,2) NOT NULL,
  rider_payout DECIMAL(10,2) DEFAULT 32.00,
  delivery_address JSONB NOT NULL,
  delivery_instructions TEXT,
  payment_method VARCHAR(30), -- 'upi', 'card', 'cash', 'wallet'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  payment_id VARCHAR(100),
  otp VARCHAR(6),
  estimated_delivery_time TIMESTAMP,
  placed_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP,
  preparing_at TIMESTAMP,
  ready_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancel_reason TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- SUBSCRIPTIONS TABLE
-- =============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  plan_type VARCHAR(20) NOT NULL, -- 'normal', 'big'
  amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payment_id VARCHAR(100),
  payment_status VARCHAR(20) DEFAULT 'pending',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  rider_id UUID REFERENCES riders(id),
  restaurant_rating INTEGER CHECK (restaurant_rating BETWEEN 1 AND 5),
  rider_rating INTEGER CHECK (rider_rating BETWEEN 1 AND 5),
  food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- PAYOUTS TABLE (weekly restaurant payouts)
-- =============================================
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID REFERENCES restaurants(id),
  week_start DATE,
  week_end DATE,
  total_orders INTEGER,
  gross_revenue DECIMAL(10,2),
  commission_deducted DECIMAL(10,2),
  net_payout DECIMAL(10,2),
  payout_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  payout_date TIMESTAMP,
  utr_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ADMINS TABLE
-- =============================================
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) DEFAULT 'admin', -- 'super_admin', 'admin', 'support'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- OTP_VERIFICATIONS TABLE (mobile OTP login)
-- =============================================
CREATE TABLE otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  purpose VARCHAR(30) DEFAULT 'login', -- 'login', 'register'
  is_used BOOLEAN DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_otp_phone ON otp_verifications(phone, is_used);

-- =============================================
-- PLATFORM_SETTINGS TABLE (admin-configurable commission etc.)
-- =============================================
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value VARCHAR(255) NOT NULL,
  updated_by UUID REFERENCES admins(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO platform_settings (key, value) VALUES
  ('commission_rate', '0.10'),
  ('delivery_fee', '40'),
  ('platform_fee', '0'),
  ('handling_fee', '0'),
  ('normal_subscription_price', '4999'),
  ('big_subscription_price', '6999'),
  ('rider_payout_per_delivery', '32');

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  user_type VARCHAR(20), -- 'customer', 'restaurant', 'rider'
  title VARCHAR(200),
  message TEXT,
  type VARCHAR(50), -- 'order_update', 'promotion', 'payment', etc.
  is_read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_active ON restaurants(is_active, is_open);
CREATE INDEX idx_menu_items_restaurant ON menu_items(restaurant_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_restaurant ON orders(restaurant_id);
CREATE INDEX idx_orders_rider ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_riders_online ON riders(is_online, is_active);
CREATE INDEX idx_notifications_user ON notifications(user_id, user_type, is_read);

-- =============================================
-- SEED DATA - Default admin (password: Admin@123 — CHANGE IMMEDIATELY)
-- bcrypt hash below corresponds to 'Admin@123', generated with bcryptjs cost 12
-- =============================================
INSERT INTO admins (name, email, password_hash, role) VALUES
  ('Super Admin', 'admin@saaha.in', '$2a$12$LFS601bhDvN2xU7I6YOYYOy7h01UKXWeJQqs4F9x/JoFuuZfG205S', 'super_admin');

-- =============================================
-- Demo restaurant seed removed — register via API instead
-- (POST /api/auth/restaurant/register, then verify via Admin Panel)
-- =============================================
