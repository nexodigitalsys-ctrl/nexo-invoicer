export function parseFormNumber(value: FormDataEntryValue | null) {
  const raw = value?.toString().trim().replace(",", ".") ?? "";
  if (!raw) return 0;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function calcularTotalesDocumento(input: {
  subtotal: number;
  ivaPorcentaje: number;
  descuentoPorcentaje?: number | null;
  descuentoImporte?: number | null;
}) {
  const subtotal = Math.max(0, input.subtotal);
  const ivaPorcentaje = Math.max(0, input.ivaPorcentaje);
  const descuentoPorcentaje = Math.max(0, input.descuentoPorcentaje ?? 0);
  const descuentoImporte = Math.max(0, input.descuentoImporte ?? 0);
  const descuentoPorPorcentaje = subtotal * (descuentoPorcentaje / 100);
  const descuentoTotal = Math.min(subtotal, descuentoPorPorcentaje + descuentoImporte);
  const baseImponible = Math.max(0, subtotal - descuentoTotal);
  const ivaImporte = baseImponible * (ivaPorcentaje / 100);
  const total = baseImponible + ivaImporte;

  return {
    subtotal,
    descuentoPorcentaje,
    descuentoImporte,
    descuentoTotal,
    baseImponible,
    ivaPorcentaje,
    ivaImporte,
    total,
  };
}
