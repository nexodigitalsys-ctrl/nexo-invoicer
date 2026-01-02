// app/workspaces/switch/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const WORKSPACE_COOKIE = "nexo_workspace_id";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const idParam = url.searchParams.get("workspaceId") || url.searchParams.get("id");
  const workspaceId = Number(idParam);

  if (!workspaceId || Number.isNaN(workspaceId)) {
    return NextResponse.redirect(new URL("/workspaces", req.url));
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) {
    return NextResponse.redirect(new URL("/workspaces", req.url));
  }

  const res = NextResponse.redirect(new URL("/dashboard", req.url));

  res.cookies.set(WORKSPACE_COOKIE, String(workspaceId), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return res;
}
