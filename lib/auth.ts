import { dbGet, dbRun } from "@/lib/db";
import { id, now } from "@/lib/utils";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const email = process.env.APP_DEFAULT_USER_EMAIL || "local@example.com";
  const name = process.env.APP_DEFAULT_USER_NAME || "Local Student";
  const existing = await dbGet<CurrentUser>("select id, email, name from users where email = ?", [email]);
  if (existing) return existing;

  const user = { id: id(), email, name };
  await dbRun("insert into users (id, email, name, created_at, updated_at) values (?, ?, ?, ?, ?)", [
    user.id,
    user.email,
    user.name,
    now(),
    now()
  ]);
  return user;
}
