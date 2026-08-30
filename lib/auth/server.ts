import { redirect } from "next/navigation";

import { loginPathFor, safeReturnPath } from "@/lib/auth/paths";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id || !data.user.email) return null;

    return { id: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}

export async function requireAuthenticatedUser(
  returnTo: string,
): Promise<AuthenticatedUser> {
  const safeReturnTo = safeReturnPath(returnTo);
  const user = await getAuthenticatedUser();
  if (!user) redirect(loginPathFor(safeReturnTo));
  return user;
}
