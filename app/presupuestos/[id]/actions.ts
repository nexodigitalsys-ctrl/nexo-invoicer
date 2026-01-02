"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";


// 🟡 Server Action: adicionar línea ao presupuesto
export async function agregarLineaPresupuesto(formData: FormData) {
  "use server";

  const presupuestoIdStr = formData.get("presupuestoId")?.toString();
  const servicioIdStr = formData.get("servicioId")?.toString();
  const descripcionRaw =
    formData.get("descripcion")?.toString().trim() ?? "";
  const cantidadStr = formData.get("cantidad")?.toString();
  const precioUnitarioStr = formData
    .get("precioUnitario")
    ?.toString()
    .replace(",", ".");

  if (!presupuestoIdStr) return;

  const presupuestoId = Number(presupuestoIdStr);
  if (isNaN(presupuestoId)) return;

  const servicioId =
    servicioIdStr && servicioIdStr !== "" ? Number(servicioIdStr) : null;

  // Se não informou serviço nem descrição, só recarrega sem erro
  if (!servicioId && !descripcionRaw) {
    redirect(`/presupuestos/${presupuestoId}`);
  }

  const cantidad = cantidadStr ? Number(cantidadStr) : 1;
  if (isNaN(cantidad) || cantidad <= 0) {
    throw new Error("La cantidad debe ser mayor que 0.");
  }

  const precioUnitario = precioUnitarioStr ? Number(precioUnitarioStr) : 0;
  if (isNaN(precioUnitario) || precioUnitario < 0) {
    throw new Error("El precio debe ser un número válido.");
  }

  const descripcion =
    descripcionRaw || "Servicio sin descripción detallada.";

  const totalLinea = cantidad * precioUnitario;

  // 1) cria a linha
  await prisma.presupuestoLinea.create({
    data: {
      presupuestoId,
      servicioId,
      descripcion,
      cantidad,
      precioUnitario,
      totalLinea,
    },
  });

  // 2) recalcula subtotal das linhas
  const sumResult = await prisma.presupuestoLinea.aggregate({
    where: { presupuestoId },
    _sum: {
      totalLinea: true,
    },
  });

  const subtotal = sumResult._sum.totalLinea ?? 0;

  // 3) pega o IVA atual do presupuesto (para respeitar se o usuário mudou)
  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: { ivaPorcentaje: true },
  });

  const ivaPorcentaje = presupuesto?.ivaPorcentaje ?? 0;
  const ivaImporte = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + ivaImporte;

  // 4) atualiza os totais
  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: {
      subtotal,
      ivaPorcentaje,
      ivaImporte,
      total,
    },
  });

  redirect(`/presupuestos/${presupuestoId}`);
}

// 🟢 Server Action: mudar estado do presupuesto (borrador/enviado/aceptado, etc.)
export async function cambiarEstadoPresupuesto(formData: FormData) {
  "use server";

  const idRaw = formData.get("presupuestoId");
  const nuevoEstado = formData.get("estado")?.toString() ?? "borrador";

  const presupuestoId = Number(idRaw);
  if (isNaN(presupuestoId)) return;

  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: { estado: nuevoEstado },
  });

  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${presupuestoId}`);
}

// 🟣 Server Action: editar número
export async function actualizarNumeroPresupuesto(formData: FormData) {
  "use server";

  const idRaw = formData.get("presupuestoId")?.toString();
  const numeroRaw = formData.get("numero")?.toString().trim();

  if (!idRaw || !numeroRaw) return;

  const presupuestoId = Number(idRaw);
  if (isNaN(presupuestoId)) return;

  try {
    await prisma.presupuesto.update({
      where: { id: presupuestoId },
      data: { numero: numeroRaw },
    });

    revalidatePath("/presupuestos");
    revalidatePath(`/presupuestos/${presupuestoId}`);
  } catch (e) {
    console.error("Error actualizando número de presupuesto:", e);
  }
}

// 🧨 Server Action: eliminar presupuesto completo
export async function eliminarPresupuesto(formData: FormData) {
  "use server";

  const idRaw = formData.get("presupuestoId")?.toString();
  if (!idRaw) return;

  const presupuestoId = Number(idRaw);
  if (isNaN(presupuestoId)) return;

  // 1) apaga linhas
  await prisma.presupuestoLinea.deleteMany({
    where: { presupuestoId },
  });

  // 2) apaga o presupuesto
  await prisma.presupuesto.delete({
    where: { id: presupuestoId },
  });

  revalidatePath("/presupuestos");
  redirect("/presupuestos");
}

// 📝 Server Action: notas / descrição geral
export async function actualizarNotasPresupuesto(formData: FormData) {
  "use server";

  const idRaw = formData.get("presupuestoId")?.toString();
  const notasRaw = formData.get("notas")?.toString().trim() ?? "";

  if (!idRaw) return;

  const presupuestoId = Number(idRaw);
  if (isNaN(presupuestoId)) return;

  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: { notas: notasRaw || null },
  });

  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${presupuestoId}`);
}

// 🗑️ Server Action: eliminar UNA línea del presupuesto
export async function eliminarLineaPresupuesto(formData: FormData) {
  "use server";

  const lineaIdRaw = formData.get("lineaId")?.toString();
  const presupuestoIdRaw = formData.get("presupuestoId")?.toString();

  if (!lineaIdRaw || !presupuestoIdRaw) return;

  const lineaId = Number(lineaIdRaw);
  const presupuestoId = Number(presupuestoIdRaw);

  if (isNaN(lineaId) || isNaN(presupuestoId)) return;

  // 1) apaga linha
  await prisma.presupuestoLinea.delete({
    where: { id: lineaId },
  });

  // 2) recalcula subtotal + IVA + total
  const sumResult = await prisma.presupuestoLinea.aggregate({
    where: { presupuestoId },
    _sum: { totalLinea: true },
  });

  const subtotal = sumResult._sum.totalLinea ?? 0;

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: { ivaPorcentaje: true },
  });

  const ivaPorcentaje = presupuesto?.ivaPorcentaje ?? 0;
  const ivaImporte = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + ivaImporte;

  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: {
      subtotal,
      ivaPorcentaje,
      ivaImporte,
      total,
    },
  });

  revalidatePath(`/presupuestos/${presupuestoId}`);
  redirect(`/presupuestos/${presupuestoId}`);
}






// 🧮 Server Action: atualizar IVA do presupuesto
export async function actualizarIvaPresupuesto(formData: FormData) {
  "use server";

  const idRaw = formData.get("presupuestoId")?.toString();
  const ivaRaw =
    formData.get("ivaPorcentaje")?.toString().replace(",", ".") ?? "";

  if (!idRaw || !ivaRaw) return;

  const presupuestoId = Number(idRaw);
  const ivaPorcentaje = Number(ivaRaw);

  if (isNaN(presupuestoId) || isNaN(ivaPorcentaje) || ivaPorcentaje < 0) {
    return;
  }

  const sumResult = await prisma.presupuestoLinea.aggregate({
    where: { presupuestoId },
    _sum: { totalLinea: true },
  });

  const subtotal = sumResult._sum.totalLinea ?? 0;
  const ivaImporte = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + ivaImporte;

  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: {
      subtotal,
      ivaPorcentaje,
      ivaImporte,
      total,
    },
  });

  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${presupuestoId}`);
}