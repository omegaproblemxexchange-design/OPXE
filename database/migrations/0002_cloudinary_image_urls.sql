BEGIN;

ALTER TABLE listing_images
  ADD COLUMN secure_url text;

ALTER TABLE digital_product_images
  ADD COLUMN secure_url text;

COMMIT;
