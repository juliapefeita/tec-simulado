ALTER TABLE questions ADD COLUMN owner_id INT NULL DEFAULT NULL;
CREATE INDEX idx_owner ON questions(owner_id);
