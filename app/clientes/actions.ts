"use server";

import prisma from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function eliminarCliente(formData: FormData) {
  const idRaw = formData.get("clienteId")?.toString();
  if (!idRaw) return;

  const clienteId = Number(idRaw);
  if (isNaN(clienteId)) return;

  const workspaceId = await getCurrentWorkspaceId();

  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, workspaceId },
    select: {
      id: true,
      _count: {
        select: {
          facturas: true,
          presupuestos: true,
        },
      },
    },
  });

  if (!cliente) return;

  const hasDocuments =
    cliente._count.facturas > 0 || cliente._count.presupuestos > 0;

  if (!hasDocuments) {
    await prisma.cliente.delete({
      where: { id: clienteId },
    });
  }

  revalidatePath("/clientes");
  redirect("/clientes");
}
