-- Skema D1 bio-link (idempoten; aman dijalankan berulang).
-- id=1 -> data utama (store), id=2 -> analytics.
CREATE TABLE IF NOT EXISTS store (
  id INTEGER PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
