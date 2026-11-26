-- ==============================================================
-- LEAFLINE NUTRIENT & SOIL SERVICE - AWS RDS MYSQL SETUP SCRIPT
-- Specification Compliance: Section 9, 10 & 13
-- ==============================================================

-- 1. Create database with UTF-8 character set
CREATE DATABASE IF NOT EXISTS leafline_soil
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE leafline_soil;

-- 2. Create restricted application user (Do not use admin/root user)
CREATE USER IF NOT EXISTS 'leafline_user'@'%' IDENTIFIED BY 'YourSecureRDSGeneratedPassword2026!';

-- 3. Grant required operational privileges
-- Notice per Section 13: The application user cannot delete rows in soil_sample, soil_measurement, or audit_log
GRANT SELECT, INSERT, UPDATE, CREATE, ALTER, INDEX, REFERENCES ON leafline_soil.* TO 'leafline_user'@'%';

-- Explicitly revoke DELETE and DROP on immutable and audit tables for the app user
REVOKE DELETE, DROP ON leafline_soil.audit_log FROM 'leafline_user'@'%';
REVOKE DELETE, DROP ON leafline_soil.soil_sample FROM 'leafline_user'@'%';
REVOKE DELETE, DROP ON leafline_soil.soil_measurement FROM 'leafline_user'@'%';

FLUSH PRIVILEGES;

-- 4. Status confirmation
SELECT user, host FROM mysql.user WHERE user = 'leafline_user';
