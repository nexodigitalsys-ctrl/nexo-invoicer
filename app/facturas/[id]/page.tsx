import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Link from "next/link";

import {
  agregarLineaFactura,
  cambiarEstadoFactura,
  actualizarNumeroFactura,
  actualizarNotasFactura,
  eliminarFactura,
  eliminarLineaFactura,
  actualizarIvaFactura,
} from "./actions";


interface PageProps {
  // Next 15: params é Promise
  params: Promise<{
    id: string;
  }>;
}



// 📄 Página de detalhe da factura
export default async function FacturaDetallePage({ params }: PageProps) {
  const { id } = await params;
  const facturaId = Number(id);
  if (isNaN(facturaId)) {
    notFound();
  }

  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: {
      cliente: true,
      lineas: {
        include: {
          servicio: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!factura) {
    notFound();
  }

  const servicios = await prisma.servicio.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  const subtotal = factura.subtotal ?? 0;
  const ivaPorcentaje = factura.ivaPorcentaje ?? 0;
  const ivaImporte = factura.ivaImporte ?? 0;
  const total = factura.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header: título, nº factura, pdf, estado */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Factura</h1>

            {/* Form para editar nº de factura */}
            <form
              action={actualizarNumeroFactura}
              className="flex items-center gap-2"
            >
              <input type="hidden" name="facturaId" value={factura.id} />
              <Input
                name="numero"
                defaultValue={factura.numero}
                className="h-8 w-40 text-sm"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-8 px-3 text-xs"
              >
                Guardar nº
              </Button>
            </form>
          </div>

          <p className="text-sm text-slate-500">
            Cliente: {factura.cliente?.nombre ?? "—"} ·{" "}
            Fecha: {new Date(factura.fecha).toLocaleDateString("es-ES")}
          </p>
          <p className="text-sm text-slate-500">
            Estado actual: <strong>{factura.estado}</strong>
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link href={`/facturas/${factura.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm">
              Ver / descargar PDF
            </Button>
          </Link>

          <form
            action={cambiarEstadoFactura}
            className="flex gap-2 mt-2"
          >
            <input type="hidden" name="facturaId" value={factura.id} />

            <button
              type="submit"
              name="estado"
              value="borrador"
              className="px-3 py-1 rounded-md border text-xs font-medium
                     border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Marcar como borrador
            </button>

            <button
              type="submit"
              name="estado"
              value="emitida"
              className="px-3 py-1 rounded-md border text-xs font-medium
                     border-blue-500 text-blue-700 hover:bg-blue-50"
            >
              Marcar como emitida
            </button>

            <button
              type="submit"
              name="estado"
              value="cobrada"
              className="px-3 py-1 rounded-md border text-xs font-medium
                     border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              Marcar como cobrada
            </button>
          </form>
        </div>
      </div>

        <form
          action={eliminarFactura}
          className="mt-4"
        >
          <input type="hidden" name="facturaId" value={factura.id} />
          <Button
            type="submit"
            variant="destructive"
            className="h-8 px-3 text-xs"
          >
            Eliminar factura
          </Button>
        </form>


      {/* Cliente + resumen */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-lg font-semibold mb-2">Cliente</h2>
          <p className="font-medium">{factura.cliente?.nombre}</p>
          {factura.cliente?.email && (
            <p className="text-sm text-slate-600">
              Email: {factura.cliente.email}
            </p>
          )}
          {factura.cliente?.telefono && (
            <p className="text-sm text-slate-600">
              Teléfono: {factura.cliente.telefono}
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Resumen</h2>

          <div className="space-y-1 text-sm text-slate-600">
            <p>
              Base imponible (subtotal):{" "}
              <span className="font-semibold">
                {subtotal.toFixed(2)} €
              </span>
            </p>
            <p>
              IVA ({ivaPorcentaje.toFixed(2)}%):{" "}
              <span className="font-semibold">
                {ivaImporte.toFixed(2)} €
              </span>
            </p>
            <p>
              Total factura:{" "}
              <span className="font-semibold">
                {total.toFixed(2)} €
              </span>
            </p>
          </div>

          {/* Formulário para alterar IVA */}
          <form
            action={actualizarIvaFactura}
            className="flex items-center gap-2 mt-3 text-sm"
          >
            <input type="hidden" name="facturaId" value={factura.id} />
            <Label htmlFor="ivaPorcentaje" className="text-xs">
              IVA %
            </Label>
            <Input
              id="ivaPorcentaje"
              name="ivaPorcentaje"
              type="number"
              step="0.1"
              min={0}
              defaultValue={ivaPorcentaje}
              className="h-8 w-20 text-sm"
            />
            <Button
              type="submit"
              variant="outline"
              className="h-8 px-3 text-xs"
            >
              Guardar IVA
            </Button>
          </form>

          {factura.notas && (
            <p className="text-sm text-slate-600 mt-3">
              Notas: {factura.notas}
            </p>
          )}
        </div>
      </section>

      {/* Líneas da factura + formulário para añadir */}
      <section className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold mb-4">
          Líneas de la factura
        </h2>

        {/* Formulário para añadir línea */}
        <form
          action={agregarLineaFactura}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-b pb-4 mb-4"
        >
          {/* hidden com ID da factura */}
          <input type="hidden" name="facturaId" value={factura.id} />

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="servicioId">Servicio (opcional)</Label>
            <select
              id="servicioId"
              name="servicioId"
              defaultValue=""
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="">— Selecciona un servicio —</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}{" "}
                  {s.precio ? `(${s.precio.toFixed(2)} €)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="descripcion">
              Descripción (si no eliges servicio)
            </Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              placeholder="Ej: Limpieza de sofá 3 plazas + protector..."
            />
          </div>

          <div className="space-y-1 flex flex-col md:col-span-1">
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="cantidad">Cant.</Label>
                <input
                  id="cantidad"
                  name="cantidad"
                  type="number"
                  min={1}
                  defaultValue={1}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="flex-1 space-y-1">
                <Label htmlFor="precioUnitario">Precio €</Label>
                <input
                  id="precioUnitario"
                  name="precioUnitario"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={0}
                  className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <Button type="submit" className="mt-2">
              Añadir línea
            </Button>
          </div>
        </form>

        {/* Tabela de líneas */}
        {factura.lineas.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay líneas en esta factura.
          </p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-2 text-left">Servicio</th>
                <th className="p-2 text-left">Descripción</th>
                <th className="p-2 text-right">Cantidad</th>
                <th className="p-2 text-right">Precio unitario (€)</th>
                <th className="p-2 text-right">Total línea (€)</th>
                <th className="p-2 text-right">Acciones</th> 
              </tr>
            </thead>
            <tbody>
  {factura.lineas.map((linea) => (
    <tr key={linea.id} className="border-t">
      <td className="p-2">
        {linea.servicio?.nombre ?? "-"}
      </td>
      <td className="p-2">{linea.descripcion}</td>
      <td className="p-2 text-right">{linea.cantidad}</td>
      <td className="p-2 text-right">
        {linea.precioUnitario.toFixed(2)}
      </td>
      <td className="p-2 text-right">
        {linea.totalLinea.toFixed(2)}
      </td>
      <td className="p-2 text-right">
        <form action={eliminarLineaFactura}>
          <input
            type="hidden"
            name="facturaId"
            value={factura.id}
          />
          <input
            type="hidden"
            name="lineaId"
            value={linea.id}
          />
          <button
            type="submit"
            className="text-xs text-red-600 hover:underline"
          >
            Eliminar
          </button>
        </form>
      </td>
    </tr>
  ))}
</tbody>

          </table>
        )}

        {/* 🔻 Descripción general / observaciones abaixo da tabela */}
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">
            Descripción general / observaciones
          </h3>

          <form
            action={actualizarNotasFactura}
            className="space-y-2"
          >
            <input
              type="hidden"
              name="facturaId"
              value={factura.id}
            />
            <Textarea
              id="notas"
              name="notas"
              rows={4}
              defaultValue={factura.notas ?? ""}
              placeholder="Ej.: Se ha sustituido el plato de ducha, reparación de pared, tubo cambiado, sellado con silicona neutra, etc."
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                Guardar descripción
              </Button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
