import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function ensureDirForFile(filepath) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
}

export function writeAuditEvent(filepath, event) {
  ensureDirForFile(filepath);
  const payload = {
    eventId: crypto.randomUUID(),
    timestampUtc: new Date().toISOString(),
    ...event,
  };
  fs.appendFileSync(filepath, `${JSON.stringify(payload)}\n`, 'utf8');
  return payload;
}
