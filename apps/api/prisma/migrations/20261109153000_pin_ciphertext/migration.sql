ALTER TABLE pickup_verifications
  ADD COLUMN pin_ciphertext TEXT;

UPDATE pickup_verifications
SET pin_ciphertext = ''
WHERE pin_ciphertext IS NULL;

ALTER TABLE pickup_verifications
  ALTER COLUMN pin_ciphertext SET NOT NULL;
