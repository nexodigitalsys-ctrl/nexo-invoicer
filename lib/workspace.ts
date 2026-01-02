// lib/workspace.ts
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export const DEFAULT_WORKSPACE_ID = 1;
const COOKIE_NAME = "workspaceId";

export async function getCurrentWorkspaceId(): Promise<number> {
  // 1) Se o usuário tiver workspace fixo na sessão (ex: Claudinei), trava aqui
  const session = await getServerSession(authOptions);
  const sessionWid = (session?.user as any)?.workspaceId;

  const widFromSession = Number(sessionWid);
  if (Number.isFinite(widFromSession) && widFromSession > 0) {
    return widFromSession;
  }

  // 2) Senão usa cookie (admin / multi-workspace)
  const cookieStore = await cookies();
  const workspaceCookie = cookieStore.get(COOKIE_NAME);
  const widFromCookie = Number(workspaceCookie?.value);

  if (Number.isFinite(widFromCookie) && widFromCookie > 0) {
    return widFromCookie;
  }

  // 3) fallback
  return DEFAULT_WORKSPACE_ID;
}
