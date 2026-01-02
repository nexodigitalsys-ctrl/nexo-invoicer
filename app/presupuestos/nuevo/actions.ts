"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/workspace";

async function generarNumeroPresupuesto(workspaceId: number) {
  const año = new Date().getFullYear();

  const ultimo = await prisma.presupuesto.findFirst({
    where: {
      workspaceId,
      numero: {
        startsWith: `P-${año}-`,
      },
    },
    orderBy: {
      numero: "desc",
    },
  });

  if (!ultimo) {
    return `P-${año}-0001`;
  }

  const partes = ultimo.numero.split("-");
  const secuenciaStr = partes[2] ?? "0000";
  const secuenciaNum = Number(secuenciaStr) || 0;
  const siguiente = secuenciaNum + 1;
  const siguienteStr = String(siguiente).padStart(4, "0");

  return `P-${año}-${siguienteStr}`;
}

export async function crearPresupuesto(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();

  const clienteIdStr = formData.get("clienteId")?.toString();
  const fechaRaw = formData.get("fecha")?.toString();
  const notasRaw = formData.get("notas")?.toString().trim();

  if (!clienteIdStr) return;

  const clienteId = Number(clienteIdStr);
  if (Number.isNaN(clienteId)) return;

  const fecha = fechaRaw ? new Date(fechaRaw) : new Date();
  const notas = notasRaw || null;

  async function crearConNumero() {
    const numero = await generarNumeroPresupuesto(workspaceId);

    const presupuesto = await prisma.presupuesto.create({
      data: {
        workspaceId,
        numero,
        clienteId,
        fecha,
        estado: "borrador",
        subtotal: 0,
        ivaPorcentaje: 21,
        ivaImporte: 0,
        total: 0,
        notas,
      },
    });

    return presupuesto;
  }

  try {
    // 1ª tentativa
    const presupuesto = await crearConNumero();
    redirect(`/presupuestos/${presupuesto.id}`);
  } catch (error: unknown) {
    // se colidir no UNIQUE(numero), tenta de novo
    const prismaError = error as { code?: string };

    if (prismaError.code === "P2002") {
      console.warn(
        "Colisión en número de presupuesto, generando otro número..."
      );

      const presupuesto = await crearConNumero();
      redirect(`/presupuestos/${presupuesto.id}`);
    }

    console.error("Error al crear presupuesto:", error);
    throw error;
  }
}