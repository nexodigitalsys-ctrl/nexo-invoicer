// app/facturas/nueva/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/workspace";


export async function crearFactura(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();

  const clienteIdStr = formData.get("clienteId")?.toString();
  const fechaRaw = formData.get("fecha")?.toString();
  const notasRaw = formData.get("notas")?.toString().trim();

  if (!clienteIdStr) return;

  const clienteId = Number(clienteIdStr);
  if (isNaN(clienteId)) return;

  const fecha = fechaRaw ? new Date(fechaRaw) : new Date();
  const numero = await generarNumeroFactura(workspaceId);
  const notas = notasRaw || null;

  try {
    const factura = await prisma.factura.create({
      data: {
        workspaceId,
        numero,
        clienteId,
        fecha,
        estado: "borrador",
        total: 0,
        notas,
      },
    });

    redirect(`/facturas/${factura.id}`);
   } catch (error: unknown) {
    // tratamos como objeto com campo "code"
    const err = error as { code?: string };

    if (err.code === "P2002") {
      console.warn(
        "Colisión en número de factura, generando otro número...",
        numero
      );

      const nuevoNumero = await generarNumeroFactura(workspaceId);

      const factura = await prisma.factura.create({
        data: {
           workspaceId,
          numero: nuevoNumero,
          clienteId,
          fecha,
          estado: "borrador",
          total: 0,
          notas,
        },
      });

      redirect(`/facturas/${factura.id}`);
    }

    console.error("Error al crear factura:", error);
    throw error;
  }
}
export default async function generarNumeroFactura(workspaceId: number) {
  const año = new Date().getFullYear();

  // Busca a última factura do ano atual, ordenada pelo número
  const ultima = await prisma.factura.findFirst({
    where: { workspaceId,
      numero: {
        startsWith: `F-${año}-`,
      },
    },
    orderBy: {
      numero: "desc",
    },
  });

  if (!ultima) {
    return `F-${año}-0001`;
  }

  // numero tipo "F-2025-0003"
  const partes = ultima.numero.split("-");
  const secuenciaStr = partes[2] ?? "0000";
  const secuenciaNum = Number(secuenciaStr) || 0;
  const siguiente = secuenciaNum + 1;

  const siguienteStr = String(siguiente).padStart(4, "0");
  return `F-${año}-${siguienteStr}`;
}