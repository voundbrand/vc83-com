export type UserSortSource = {
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt?: number;
};

const MAX_TIMESTAMP = 9999999999999;

function normalizeSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function invertString(value: string): string {
  let out = "";
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    out += String.fromCharCode(0xffff - code);
  }
  return out;
}

export function buildUserSortFields(source: UserSortSource) {
  const email = source.email.trim().toLowerCase();
  const firstName = (source.firstName ?? "").trim().toLowerCase();
  const lastName = (source.lastName ?? "").trim().toLowerCase();
  const fullName = normalizeSpace(`${lastName}, ${firstName}`);
  const createdAt = source.createdAt ?? 0;

  return {
    sortEmail: email,
    sortEmailDesc: invertString(email),
    sortName: fullName,
    sortNameDesc: invertString(fullName),
    sortCreatedAt: createdAt,
    sortCreatedAtDesc: MAX_TIMESTAMP - createdAt,
  };
}
