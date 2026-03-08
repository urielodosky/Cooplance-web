-- 1. Create table with constraints
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('freelancer', 'buyer', 'company')),
    -- Add other fields as needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add Unique Index for Case-Insensitive Username
-- This ensures 'Uriel', 'uriel', and ' URIEL ' are treated as duplicates.
-- We use LOWER() and TRIM() to normalize at the DB level.
CREATE UNIQUE INDEX users_username_unique_idx ON users (LOWER(TRIM(username)));

-- 3. Trigger to auto-update 'updated_at' (Optional but recommended)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
