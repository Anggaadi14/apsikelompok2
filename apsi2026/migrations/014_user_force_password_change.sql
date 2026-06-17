-- migrations/014_user_force_password_change.sql
-- Add flag for forcing password change on first login (Admin-created accounts).

ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `force_password_change` TINYINT(1) NOT NULL DEFAULT 0
    AFTER `verified_at`;

-- Backfill: existing accounts dianggap sudah set passwordnya, jadi tidak force change.
UPDATE `user` SET `force_password_change` = 0 WHERE `force_password_change` IS NULL;