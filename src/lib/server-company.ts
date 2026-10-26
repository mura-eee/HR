import { cookies } from "next/headers";

const COOKIE_KEY = "selectedCompanyId";

export async function getServerCompanyId(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_KEY)?.value;
  if (!value || value === "null") return null;
  return value;
}
