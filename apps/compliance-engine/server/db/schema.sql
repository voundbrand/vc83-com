-- Compliance Engine Schema v1

CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT
);

-- Consent records (GDPR Art 6/7)
CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 0,
  legal_basis TEXT NOT NULL,
  purpose TEXT NOT NULL,
  policy_version TEXT NOT NULL DEFAULT '1.0',
  source TEXT NOT NULL DEFAULT 'system',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_consent_subject ON consent_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_consent_subject_type ON consent_records(subject_id, consent_type);

-- Audit events (GDPR Art 30 ROPA support, append-only)
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  subject_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  outcome TEXT NOT NULL DEFAULT 'allowed',
  framework TEXT,
  rule_id TEXT,
  details TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(recorded_at);
CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_events(subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(event_type);

-- Evidence artifacts metadata
CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artifact_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  provider_id TEXT,
  uploaded_by TEXT NOT NULL DEFAULT 'system',
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  metadata TEXT
);

-- Provider/subprocessor registry (GDPR Art 28)
CREATE TABLE IF NOT EXISTS provider_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  dpa_status TEXT NOT NULL DEFAULT 'missing',
  data_location TEXT,
  transfer_mechanism TEXT,
  tom_status TEXT DEFAULT 'unknown',
  active INTEGER NOT NULL DEFAULT 1,
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  dpa_signed_at TEXT,
  dpa_expires_at TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_provider_status ON provider_registry(dpa_status);

-- Data subjects (DSR tracking)
CREATE TABLE IF NOT EXISTS data_subjects (
  id TEXT PRIMARY KEY,
  external_id TEXT,
  pseudonym TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'client',
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  erased_at TEXT,
  metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_subject_external ON data_subjects(external_id);
CREATE INDEX IF NOT EXISTS idx_subject_pseudonym ON data_subjects(pseudonym);
