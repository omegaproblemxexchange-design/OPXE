BEGIN;

CREATE TYPE account_role AS ENUM ('user', 'premium', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'blocked', 'banned');
CREATE TYPE listing_status AS ENUM ('pending', 'approved', 'rejected', 'active');
CREATE TYPE exchange_request_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE payment_status AS ENUM ('pending', 'cleared', 'disputed');
CREATE TYPE dispute_status AS ENUM ('open', 'resolved');
CREATE TYPE dispute_severity AS ENUM ('low', 'medium', 'high');
CREATE TYPE delivery_request_status AS ENUM ('requested', 'cancelled');
CREATE TYPE digital_order_status AS ENUM ('requested', 'payment_pending', 'paid', 'fulfilled', 'cancelled', 'refunded');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  role account_role NOT NULL DEFAULT 'user',
  account_status account_status NOT NULL DEFAULT 'active',
  city text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  college text NOT NULL DEFAULT '',
  course text NOT NULL DEFAULT '',
  class_year text NOT NULL DEFAULT '',
  profile_reviewed boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
  CONSTRAINT users_email_nonempty CHECK (length(email) > 3),
  CONSTRAINT users_name_nonempty CHECK (length(btrim(name)) > 0)
);

CREATE UNIQUE INDEX users_email_unique ON users (email);

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_identities_provider_nonempty CHECK (length(btrim(provider)) > 0),
  CONSTRAINT auth_identities_subject_nonempty CHECK (length(btrim(provider_subject)) > 0),
  CONSTRAINT auth_identities_provider_subject_unique UNIQUE (provider, provider_subject),
  CONSTRAINT auth_identities_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX auth_identities_user_id_idx ON auth_identities (user_id);

CREATE TABLE listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  type text NOT NULL,
  city text NOT NULL,
  price text NOT NULL,
  description text NOT NULL,
  condition text NOT NULL DEFAULT '',
  availability text NOT NULL DEFAULT '',
  category text NOT NULL,
  status listing_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  review_started_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listings_title_nonempty CHECK (length(btrim(title)) > 0),
  CONSTRAINT listings_type_nonempty CHECK (length(btrim(type)) > 0),
  CONSTRAINT listings_category_nonempty CHECK (length(btrim(category)) > 0)
);

CREATE INDEX listings_owner_created_idx ON listings (owner_id, created_at DESC);
CREATE INDEX listings_status_created_idx ON listings (status, created_at DESC);
CREATE INDEX listings_category_city_idx ON listings (category, city);

CREATE TABLE listing_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  width integer,
  height integer,
  position smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_images_content_type CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT listing_images_byte_size_positive CHECK (byte_size > 0),
  CONSTRAINT listing_images_dimensions_positive CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0)),
  CONSTRAINT listing_images_position_range CHECK (position BETWEEN 0 AND 4),
  CONSTRAINT listing_images_listing_position_unique UNIQUE (listing_id, position)
);

CREATE INDEX listing_images_listing_id_idx ON listing_images (listing_id);

CREATE FUNCTION require_listing_photos_for_approval() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IN ('approved', 'active')
    AND (SELECT count(*) FROM listing_images WHERE listing_id = NEW.id) < 3 THEN
    RAISE EXCEPTION 'A listing requires at least three uploaded photos before approval';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_require_photos_before_approval
  BEFORE INSERT OR UPDATE OF status ON listings
  FOR EACH ROW
  EXECUTE FUNCTION require_listing_photos_for_approval();

CREATE FUNCTION preserve_listing_photos_for_approved_listing() RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  listing_state listing_status;
  image_count bigint;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  SELECT status
  INTO listing_state
  FROM listings
  WHERE id = OLD.listing_id;

  IF listing_state IN ('approved', 'active') THEN
    SELECT count(*)
    INTO image_count
    FROM listing_images
    WHERE listing_id = OLD.listing_id;

    IF image_count <= 3 THEN
      RAISE EXCEPTION 'An approved listing must retain at least three uploaded photos';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER listing_images_preserve_approved_listing_photos
  BEFORE DELETE ON listing_images
  FOR EACH ROW
  EXECUTE FUNCTION preserve_listing_photos_for_approved_listing();

CREATE TABLE exchange_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  listing_title_snapshot text NOT NULL,
  status exchange_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX exchange_requests_active_unique
  ON exchange_requests (listing_id, requester_id)
  WHERE status <> 'declined';
CREATE INDEX exchange_requests_requester_created_idx ON exchange_requests (requester_id, created_at DESC);
CREATE INDEX exchange_requests_listing_status_idx ON exchange_requests (listing_id, status);

CREATE TABLE saved_listings (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE INDEX saved_listings_listing_id_idx ON saved_listings (listing_id);

CREATE TABLE digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  price_inr integer NOT NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digital_products_title_nonempty CHECK (length(btrim(title)) > 0),
  CONSTRAINT digital_products_price_positive CHECK (price_inr > 0)
);

CREATE INDEX digital_products_published_created_idx ON digital_products (published, created_at DESC);

CREATE TABLE digital_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  width integer,
  height integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digital_product_images_content_type CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT digital_product_images_byte_size_positive CHECK (byte_size > 0)
);

CREATE TABLE digital_product_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES digital_products(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  file_name text NOT NULL,
  content_type text NOT NULL,
  byte_size bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digital_product_assets_byte_size_positive CHECK (byte_size > 0)
);

CREATE TABLE digital_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES digital_products(id) ON DELETE RESTRICT,
  buyer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  buyer_email text NOT NULL,
  amount_inr integer NOT NULL,
  status digital_order_status NOT NULL DEFAULT 'requested',
  whatsapp_reference text,
  payment_verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
  payment_verified_at timestamptz,
  fulfilled_by uuid REFERENCES users(id) ON DELETE SET NULL,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digital_orders_amount_positive CHECK (amount_inr > 0),
  CONSTRAINT digital_orders_buyer_email_nonempty CHECK (length(btrim(buyer_email)) > 3)
);

CREATE INDEX digital_orders_buyer_created_idx ON digital_orders (buyer_id, created_at DESC);
CREATE INDEX digital_orders_status_created_idx ON digital_orders (status, created_at DESC);

CREATE TABLE disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  reason text NOT NULL,
  severity dispute_severity NOT NULL DEFAULT 'medium',
  status dispute_status NOT NULL DEFAULT 'open',
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disputes_reason_nonempty CHECK (length(btrim(reason)) > 0)
);

CREATE INDEX disputes_status_created_idx ON disputes (status, created_at DESC);
CREATE INDEX disputes_reporter_created_idx ON disputes (reporter_id, created_at DESC);

CREATE TABLE delivery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  product text NOT NULL,
  pickup_address text NOT NULL,
  delivery_address text NOT NULL,
  distance_km numeric(7, 2) NOT NULL,
  preferred_partner text NOT NULL,
  estimated_fee_inr integer NOT NULL,
  status delivery_request_status NOT NULL DEFAULT 'requested',
  courier_booking_reference text,
  courier_tracking_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT delivery_requests_distance_positive CHECK (distance_km > 0 AND distance_km <= 100),
  CONSTRAINT delivery_requests_fee_nonnegative CHECK (estimated_fee_inr >= 0),
  CONSTRAINT delivery_requests_product_nonempty CHECK (length(btrim(product)) > 0),
  CONSTRAINT delivery_requests_pickup_nonempty CHECK (length(btrim(pickup_address)) > 0),
  CONSTRAINT delivery_requests_dropoff_nonempty CHECK (length(btrim(delivery_address)) > 0)
);

CREATE INDEX delivery_requests_requester_created_idx ON delivery_requests (requester_id, created_at DESC);
CREATE INDEX delivery_requests_status_created_idx ON delivery_requests (status, created_at DESC);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES users(id) ON DELETE SET NULL,
  buyer_label text NOT NULL,
  seller_label text NOT NULL,
  amount_inr integer NOT NULL,
  type text NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  provider_reference text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_nonnegative CHECK (amount_inr >= 0)
);

CREATE INDEX payments_status_created_idx ON payments (status, created_at DESC);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title text NOT NULL,
  detail text NOT NULL,
  notification_type text NOT NULL,
  reference_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_title_nonempty CHECK (length(btrim(title)) > 0)
);

CREATE INDEX notifications_recipient_unread_created_idx
  ON notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_nonempty CHECK (length(btrim(action)) > 0),
  CONSTRAINT audit_logs_entity_type_nonempty CHECK (length(btrim(entity_type)) > 0)
);

CREATE INDEX audit_logs_entity_created_idx ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_actor_created_idx ON audit_logs (actor_id, created_at DESC);

COMMIT;
