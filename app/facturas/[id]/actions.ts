"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ⬇️ mover TODAS

export async function agregarLineaFactura(formData: FormData) {
  "use server";

  const facturaIdStr = formData.get("facturaId")?.toString();
  const servicioIdStr = formData.get("servicioId")?.toString();
  const descripcionRaw = formData.get("descripcion")?.toString().trim() ?? "";
  const cantidadStr = formData.get("cantidad")?.toString();
  const precioUnitarioStr = formData
    .get("precioUnitario")
    ?.toString()
    .replace(",", ".");

  if (!facturaIdStr) return;

  const facturaId = Number(facturaIdStr);
  if (isNaN(facturaId)) return;

  const servicioId =
    servicioIdStr && servicioIdStr !== "" ? Number(servicioIdStr) : null;

  // Se não informou serviço nem descrição, só recarrega sem erro
  if (!servicioId && !descripcionRaw) {
    redirect(`/facturas/${facturaId}`);
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
    descripcionRaw || "Descripción.";

  const totalLinea = cantidad * precioUnitario;

  // 1) cria a linha
  await prisma.facturaLinea.create({
    data: {
      facturaId,
      servicioId,
      descripcion,
      cantidad,
      precioUnitario,
      totalLinea,
    },
  });

  // 2) recalcula subtotal + IVA + total
  const sumResult = await prisma.facturaLinea.aggregate({
    where: { facturaId },
    _sum: {
      totalLinea: true,
    },
  });

  const subtotal = sumResult._sum.totalLinea ?? 0;

  // pega o IVA atual da factura (para respeitar se o usuário mudou)
  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    select: { ivaPorcentaje: true },
  });

  const ivaPorcentaje = factura?.ivaPorcentaje ?? 0;
  const ivaImporte = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + ivaImporte;

  await prisma.factura.update({
    where: { id: facturaId },
    data: {
      subtotal,
      ivaPorcentaje,
      ivaImporte,
      total,
    },
  });

  revalidatePath("/facturas");
  revalidatePath(`/facturas/${facturaId}`);

  redirect(`/facturas/${facturaId}`);
}

// 🟢 Server Action para mudar o estado da factura
export async function cambiarEstadoFactura(formData: FormData) {
  "use server";

  const idRaw = formData.get("facturaId");
  const nuevoEstado = formData.get("estado")?.toString() ?? "borrador";

  const facturaId = Number(idRaw);
  if (isNaN(facturaId)) return;

  await prisma.factura.update({
    where: { id: facturaId },
    data: { estado: nuevoEstado },
  });

  revalidatePath("/facturas");
  revalidatePath(`/facturas/${facturaId}`);
}

// 🟣 Server Action para editar o número da factura
export async function actualizarNumeroFactura(formData: FormData) {
  "use server";

  const idRaw = formData.get("facturaId")?.toString();
  const numeroRaw = formData.get("numero")?.toString().trim();

  if (!idRaw || !numeroRaw) return;

  const facturaId = Number(idRaw);
  if (isNaN(facturaId)) return;

  try {
    await prisma.factura.update({
      where: { id: facturaId },
      data: { numero: numeroRaw },
    });

    revalidatePath("/facturas");
    revalidatePath(`/facturas/${facturaId}`);
  } catch (e) {
    console.error("Error actualizando número de factura:", e);
  }
}

// 📝 Server Action para salvar descripción general / notas da factura
export async function actualizarNotasFactura(formData: FormData) {
  "use server";

  const idRaw = formData.get("facturaId")?.toString();
  const notasRaw = formData.get("notas")?.toString().trim() ?? "";

  if (!idRaw) return;

  const facturaId = Number(idRaw);
  if (isNaN(facturaId)) return;

  await prisma.factura.update({
    where: { id: facturaId },
    data: { notas: notasRaw || null },
  });

  revalidatePath("/facturas");
  revalidatePath(`/facturas/${facturaId}`);
}

// 🧨 Server Action: eliminar factura completa
export async function eliminarFactura(formData: FormData) {
  "use server";

  const idRaw = formData.get("facturaId")?.toString();
  if (!idRaw) return;

  const facturaId = Number(idRaw);
  if (isNaN(facturaId)) return;

  // 1) apaga as linhas primeiro (pra não ter problema de FK)
  await prisma.facturaLinea.deleteMany({
    where: { facturaId },
  });

  // 2) apaga a factura
  await prisma.factura.delete({
    where: { id: facturaId },
  });

  // 3) atualiza lista e volta pra /facturas
  revalidatePath("/facturas");
  redirect("/facturas");
}

// 🗑️ Server Action: eliminar UNA línea de la factura
export async function eliminarLineaFactura(formData: FormData) {
  "use server";

  const lineaIdRaw = formData.get("lineaId")?.toString();
  const facturaIdRaw = formData.get("facturaId")?.toString();

  if (!lineaIdRaw || !facturaIdRaw) return;

  const lineaId = Number(lineaIdRaw);
  const facturaId = Number(facturaIdRaw);

  if (isNaN(lineaId) || isNaN(facturaId)) return;

  // 1) apaga a linha
  await prisma.facturaLinea.delete({
    where: { id: lineaId },
  });

  // 2) recalcula subtotal + IVA + total
  const sumResult = await prisma.facturaLinea.aggregate({
    where: { facturaId },
    _sum: { totalLinea: true },
  });

  const subtotal = sumResult._sum.totalLinea ?? 0;

  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    select: { ivaPorcentaje: true },
  });

  const ivaPorcentaje = factura?.ivaPorcentaje ?? 0;
  const ivaImporte = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + ivaImporte;

  await prisma.factura.update({
    where: { id: facturaId },
    data: {
      subtotal,
      ivaPorcentaje,
      ivaImporte,
      total,
    },
  });

  revalidatePath(`/facturas/${facturaId}`);
  redirect(`/facturas/${facturaId}`);
}


// 🧮 Server Action para atualizar o IVA da factura
export async function actualizarIvaFactura(formData: FormData) {
  "use server";

  const idRaw = formData.get("facturaId")?.toString();
  const ivaRaw =
    formData.get("ivaPorcentaje")?.toString().replace(",", ".") ?? "";

  if (!idRaw || !ivaRaw) return;

  const facturaId = Number(idRaw);
  const ivaPorcentaje = Number(ivaRaw);

  if (isNaN(facturaId) || isNaN(ivaPorcentaje) || ivaPorcentaje < 0) {
    return;
  }

  // recalcula subtotal com base nas líneas
  const sumResult = await prisma.facturaLinea.aggregate({
    where: { facturaId },
    _sum: { totalLinea: true },
  });

  const subtotal = sumResult._sum.totalLinea ?? 0;
  const ivaImporte = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + ivaImporte;

  await prisma.factura.update({
    where: { id: facturaId },
    data: {
      subtotal,
      ivaPorcentaje,
      ivaImporte,
      total,
    },
  });

  revalidatePath("/facturas");
  revalidatePath(`/facturas/${facturaId}`);
}

