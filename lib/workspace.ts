// lib/workspace.ts
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/auth";

const WORKSPACE_COOKIE = "nexo_workspace_id";

export async function getCurrentWorkspaceId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("No hay sesión. Inicia sesión.");

  const role = (session.user as any)?.role ?? "client";
  const wsFromSession = (session.user as any)?.workspaceId ?? null;

  // ✅ CLIENTE travado no workspace dele (Claudinei)
  if (role === "client") {
    if (!wsFromSession) throw new Error("Workspace no asignado para este usuario.");
    return Number(wsFromSession);
  }

  // ✅ ADMIN escolhe via cookie (workspaces)
  const cookieStore = await cookies();
  const cookieVal = cookieStore.get(WORKSPACE_COOKIE)?.value;
  const cookieWsId = cookieVal ? Number(cookieVal) : null;

  if (cookieWsId && Number.isFinite(cookieWsId)) {
    const exists = await prisma.workspace.findUnique({
      where: { id: cookieWsId },
      select: { id: true },
    });
    if (exists) return cookieWsId;
  }

  // Se não tem cookie válido, pega o primeiro workspace existente
  const first = await prisma.workspace.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!first) throw new Error("No existe ningún workspace en la base de datos.");

  // ✅ NÃO seta cookie aqui (Next não deixa).
  // Redireciona pro route handler que seta cookie corretamente.
  redirect(`/workspaces/switch?workspaceId=${first.id}`);
}

export const workspaceCookieName = WORKSPACE_COOKIE;
