// app/workspaces/switch/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WORKSPACE_COOKIE = "workspaceId";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const idParam =
    url.searchParams.get("workspaceId") || url.searchParams.get("id");

  const workspaceId = Number(idParam);

  if (!workspaceId || isNaN(workspaceId)) {
    // ID inválido → volta pra lista
    return NextResponse.redirect(new URL("/workspaces", req.url));
  }

  // Garante que o workspace existe
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    return NextResponse.redirect(new URL("/workspaces", req.url));
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url));

  // Seta cookie com o workspace atual
  res.cookies.set(WORKSPACE_COOKIE, String(workspaceId), {
    path: "/",
    httpOnly: false, // se quiser, futuramente pode deixar true quando tiver auth
    sameSite: "lax",
  });

  return res;
}
