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
  params: Promise<{ id: string }>;
}

// 📄 Página de detalle da factura
export default async function FacturaDetallePage({ params }: PageProps) {
  const { id } = await params;
  const facturaId = Number(id);
  if (isNaN(facturaId)) notFound();

  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: {
      cliente: true,
      lineas: {
        include: { servicio: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!factura) notFound();

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
      {/* ✅ HEADER RESPONSIVE */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <h1 className="text-2xl font-semibold">Factura</h1>

            {/* Form para editar nº de factura */}
            <form
              action={actualizarNumeroFactura}
              className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
            >
              <input type="hidden" name="facturaId" value={factura.id} />
              <Input
                name="numero"
                defaultValue={factura.numero}
                className="h-9 w-full text-sm sm:h-8 sm:w-44"
              />
              <Button
                type="submit"
                variant="outline"
                className="h-9 px-3 text-xs sm:h-8"
              >
                Guardar nº
              </Button>
            </form>
          </div>

          <p className="text-sm text-slate-500">
            Cliente: {factura.cliente?.nombre ?? "—"} · Fecha:{" "}
            {new Date(factura.fecha).toLocaleDateString("es-ES")}
          </p>
          <p className="text-sm text-slate-500">
            Estado actual: <strong className="capitalize">{factura.estado}</strong>
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
          <Link href={`/facturas/${factura.id}/pdf`} target="_blank" className="w-full md:w-auto">
            <Button variant="outline" size="sm" className="w-full md:w-auto">
              Ver / descargar PDF
            </Button>
          </Link>

          <form action={cambiarEstadoFactura} className="flex flex-wrap gap-2 md:justify-end">
            <input type="hidden" name="facturaId" value={factura.id} />

            <button
              type="submit"
              name="estado"
              value="borrador"
              className="px-3 py-2 rounded-md border text-xs font-medium
                         border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Borrador
            </button>

            <button
              type="submit"
              name="estado"
              value="emitida"
              className="px-3 py-2 rounded-md border text-xs font-medium
                         border-blue-500 text-blue-700 hover:bg-blue-50"
            >
              Emitida
            </button>

            <button
              type="submit"
              name="estado"
              value="cobrada"
              className="px-3 py-2 rounded-md border text-xs font-medium
                         border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              Cobrada
            </button>
          </form>
        </div>
      </div>

      <form action={eliminarFactura} className="mt-2">
        <input type="hidden" name="facturaId" value={factura.id} />
        <Button type="submit" variant="destructive" className="h-9 px-3 text-xs">
          Eliminar factura
        </Button>
      </form>

      {/* Cliente + resumen */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-lg font-semibold mb-2">Cliente</h2>
          <p className="font-medium">{factura.cliente?.nombre}</p>
          {factura.cliente?.email && (
            <p className="text-sm text-slate-600">Email: {factura.cliente.email}</p>
          )}
          {factura.cliente?.telefono && (
            <p className="text-sm text-slate-600">Teléfono: {factura.cliente.telefono}</p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Resumen</h2>

          <div className="space-y-1 text-sm text-slate-600">
            <p>
              Base imponible (subtotal):{" "}
              <span className="font-semibold">{subtotal.toFixed(2)} €</span>
            </p>
            <p>
              IVA ({ivaPorcentaje.toFixed(2)}%):{" "}
              <span className="font-semibold">{ivaImporte.toFixed(2)} €</span>
            </p>
            <p>
              Total factura:{" "}
              <span className="font-semibold">{total.toFixed(2)} €</span>
            </p>
          </div>

          {/* Formulário para alterar IVA */}
          <form action={actualizarIvaFactura} className="flex flex-wrap items-end gap-2 mt-3 text-sm">
            <input type="hidden" name="facturaId" value={factura.id} />

            <div className="space-y-1">
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
                className="h-9 w-24 text-sm"
              />
            </div>

            <Button type="submit" variant="outline" className="h-9 px-3 text-xs">
              Guardar IVA
            </Button>
          </form>
        </div>
      </section>

      {/* Líneas de la factura + formulário para añadir */}
      <section className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold">Líneas de la factura</h2>

        {/* Formulário para añadir línea */}
        <form
          action={agregarLineaFactura}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-b pb-4"
        >
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
                  {s.nombre} {s.precio ? `(${s.precio.toFixed(2)} €)` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="descripcion">Descripción (si no eliges servicio)</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={2}
              placeholder="Ej: Limpieza de sofá 3 plazas + protector..."
            />
          </div>

          <div className="space-y-2 md:col-span-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
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

              <div className="space-y-1">
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

            <Button type="submit" className="w-full">
              Añadir línea
            </Button>
          </div>
        </form>

        {/* ✅ LISTA RESPONSIVE (cards mobile / table desktop) */}
        {factura.lineas.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay líneas en esta factura.</p>
        ) : (
          <>
            {/* MOBILE: cards */}
            <div className="md:hidden space-y-3">
              {factura.lineas.map((linea) => (
                <div key={linea.id} className="rounded-lg border bg-white p-4 shadow-sm space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {linea.servicio?.nombre ?? "Servicio manual"}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{linea.descripcion}</p>
                    </div>

                    <form action={eliminarLineaFactura}>
                      <input type="hidden" name="facturaId" value={factura.id} />
                      <input type="hidden" name="lineaId" value={linea.id} />
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </form>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Cant.</p>
                      <p className="font-medium">{linea.cantidad}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Precio</p>
                      <p className="font-medium">{linea.precioUnitario.toFixed(2)} €</p>
                    </div>

                    <div className="col-span-2 flex items-center justify-between pt-2 border-t">
                      <p className="text-xs text-slate-500">Total línea</p>
                      <p className="font-semibold">{linea.totalLinea.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP: table */}
            <div className="hidden md:block">
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
                      <td className="p-2">{linea.servicio?.nombre ?? "-"}</td>
                      <td className="p-2">{linea.descripcion}</td>
                      <td className="p-2 text-right">{linea.cantidad}</td>
                      <td className="p-2 text-right">{linea.precioUnitario.toFixed(2)}</td>
                      <td className="p-2 text-right">{linea.totalLinea.toFixed(2)}</td>
                      <td className="p-2 text-right">
                        <form action={eliminarLineaFactura}>
                          <input type="hidden" name="facturaId" value={factura.id} />
                          <input type="hidden" name="lineaId" value={linea.id} />
                          <button type="submit" className="text-xs text-red-600 hover:underline">
                            Eliminar
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* 🔻 Descripción general / observaciones */}
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Descripción general / observaciones</h3>

          <form action={actualizarNotasFactura} className="space-y-2">
            <input type="hidden" name="facturaId" value={factura.id} />
            <Textarea
              id="notas"
              name="notas"
              rows={4}
              defaultValue={factura.notas ?? ""}
              placeholder="Ej.: Detalle de trabajos realizados, condiciones, etc."
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
