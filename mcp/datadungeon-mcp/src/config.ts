function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parseCsv(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
}

export const config = {
  supabaseUrl: required("DATADUNGEON_SUPABASE_URL"),
  supabaseServiceRoleKey: required("DATADUNGEON_SUPABASE_SERVICE_ROLE_KEY"),
  allowedUserIds: parseCsv(process.env.DATADUNGEON_ALLOWED_USER_IDS),
};

export function assertUserAllowed(userId: string) {
  if (config.allowedUserIds.size === 0) return;
  if (!config.allowedUserIds.has(userId)) {
    throw new Error(`User ${userId} is not allowed by DATADUNGEON_ALLOWED_USER_IDS`);
  }
}
