"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { calcularTotalesDocumento, parseFormNumber } from "@/lib/totals";
import { getCurrentWorkspaceId } from "@/lib/workspace";


// 🟡 Server Action: adicionar línea ao presupuesto
async function recalcularTotalesPresupuesto(
  presupuestoId: number,
  ivaPorcentajeOverride?: number
) {
  const sumResult = await prisma.presupuestoLinea.aggregate({
    where: { presupuestoId },
    _sum: { totalLinea: true },
  });

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
    select: {
      ivaPorcentaje: true,
      descuentoPorcentaje: true,
      descuentoImporte: true,
    },
  });

  const totales = calcularTotalesDocumento({
    subtotal: sumResult._sum.totalLinea ?? 0,
    ivaPorcentaje: ivaPorcentajeOverride ?? presupuesto?.ivaPorcentaje ?? 0,
    descuentoPorcentaje: presupuesto?.descuentoPorcentaje ?? 0,
    descuentoImporte: presupuesto?.descuentoImporte ?? 0,
  });

  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: {
      subtotal: totales.subtotal,
      descuentoPorcentaje: totales.descuentoPorcentaje,
      descuentoImporte: totales.descuentoImporte,
      ivaPorcentaje: totales.ivaPorcentaje,
      ivaImporte: totales.ivaImporte,
      total: totales.total,
    },
  });
}

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

  await recalcularTotalesPresupuesto(presupuestoId);

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
export async function actualizarClientePresupuesto(formData: FormData) {
  "use server";

  const idRaw = formData.get("presupuestoId")?.toString();
  const clienteIdRaw = formData.get("clienteId")?.toString();

  if (!idRaw || !clienteIdRaw) return;

  const presupuestoId = Number(idRaw);
  const clienteId = Number(clienteIdRaw);
  if (isNaN(presupuestoId) || isNaN(clienteId)) return;

  const workspaceId = await getCurrentWorkspaceId();

  const [presupuesto, cliente] = await Promise.all([
    prisma.presupuesto.findFirst({
      where: { id: presupuestoId, workspaceId },
      select: { id: true },
    }),
    prisma.cliente.findFirst({
      where: { id: clienteId, workspaceId },
      select: { id: true },
    }),
  ]);

  if (!presupuesto || !cliente) return;

  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: { clienteId },
  });

  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${presupuestoId}`);
}

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

  await recalcularTotalesPresupuesto(presupuestoId);

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

  await recalcularTotalesPresupuesto(presupuestoId, ivaPorcentaje);

  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${presupuestoId}`);
}

export async function actualizarDescuentoPresupuesto(formData: FormData) {
  "use server";

  const idRaw = formData.get("presupuestoId")?.toString();
  if (!idRaw) return;

  const presupuestoId = Number(idRaw);
  const descuentoPorcentaje = parseFormNumber(formData.get("descuentoPorcentaje"));
  const descuentoImporte = parseFormNumber(formData.get("descuentoImporte"));

  if (
    isNaN(presupuestoId) ||
    isNaN(descuentoPorcentaje) ||
    isNaN(descuentoImporte) ||
    descuentoPorcentaje < 0 ||
    descuentoImporte < 0
  ) {
    return;
  }

  await prisma.presupuesto.update({
    where: { id: presupuestoId },
    data: {
      descuentoPorcentaje,
      descuentoImporte,
    },
  });

  await recalcularTotalesPresupuesto(presupuestoId);

  revalidatePath("/presupuestos");
  revalidatePath(`/presupuestos/${presupuestoId}`);
}
