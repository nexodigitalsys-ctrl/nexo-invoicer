import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import {
  agregarLineaPresupuesto,
  cambiarEstadoPresupuesto,
  actualizarNumeroPresupuesto,
  eliminarPresupuesto,
  actualizarNotasPresupuesto,
  eliminarLineaPresupuesto,
  actualizarIvaPresupuesto,
} from "./actions";

interface PageProps {
  // Next 15: params é Promise
  params: Promise<{
    id: string;
  }>;
}



export default async function PresupuestoDetallePage({ params }: PageProps) {
  const { id } = await params;
  const presupuestoId = Number(id);
  if (isNaN(presupuestoId)) {
    notFound();
  }

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
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

  if (!presupuesto) {
    notFound();
  }

  const servicios = await prisma.servicio.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header: título, nº presupuesto, pdf, estado */}
      <div className="flex items-center justify-between mb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Presupuesto</h1>

            {/* Editar nº */}
            <form
              action={actualizarNumeroPresupuesto}
              className="flex items-center gap-2"
            >
              <input
                type="hidden"
                name="presupuestoId"
                value={presupuesto.id}
              />
              <Input
                name="numero"
                defaultValue={presupuesto.numero}
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
            Cliente: {presupuesto.cliente?.nombre ?? "—"} · Fecha:{" "}
            {new Date(presupuesto.fecha).toLocaleDateString("es-ES")}
          </p>
          <p className="text-sm text-slate-500">
            Estado actual: <strong>{presupuesto.estado}</strong>
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link href={`/presupuestos/${presupuesto.id}/pdf`} target="_blank">
            <Button variant="outline" size="sm">
              Ver / descargar PDF
            </Button>
            
          </Link>

          <form
            action={cambiarEstadoPresupuesto}
            className="flex gap-2 mt-2"
          >
            <input
              type="hidden"
              name="presupuestoId"
              value={presupuesto.id}
            />

            <button
              type="submit"
              name="estado"
              value="borrador"
              className="px-3 py-1 rounded-md border text-xs font-medium
                     border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Borrador
            </button>

            <button
              type="submit"
              name="estado"
              value="enviado"
              className="px-3 py-1 rounded-md border text-xs font-medium
                     border-blue-500 text-blue-700 hover:bg-blue-50"
            >
              Enviado
            </button>

            <button
              type="submit"
              name="estado"
              value="aceptado"
              className="px-3 py-1 rounded-md border text-xs font-medium
                     border-emerald-500 text-emerald-700 hover:bg-emerald-50"
            >
              Aceptado
            </button>
          </form>
        </div>
      </div>
      <form
        action={eliminarPresupuesto}
        className="mt-4"
      >
        <input type="hidden" name="presupuestoId" value={presupuesto.id} />
        <Button
          type="submit"
          variant="destructive"
          className="h-8 px-3 text-xs"
        >
          Eliminar presupuesto
        </Button>
      </form>


      {/* Cliente + resumen */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow-sm border">
        <div>
          <h2 className="text-lg font-semibold mb-2">Cliente</h2>
          <p className="font-medium">{presupuesto.cliente?.nombre}</p>
          {presupuesto.cliente?.email && (
            <p className="text-sm text-slate-600">
              Email: {presupuesto.cliente.email}
            </p>
          )}
          {presupuesto.cliente?.telefono && (
            <p className="text-sm text-slate-600">
              Teléfono: {presupuesto.cliente.telefono}
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Resumen</h2>

          <div className="space-y-1 text-sm text-slate-600">
            <p>
              Base imponible (subtotal):{" "}
              <span className="font-semibold">
                {(presupuesto.subtotal ?? 0).toFixed(2)} €
              </span>
            </p>
            <p>
              IVA ({(presupuesto.ivaPorcentaje ?? 0).toFixed(2)}%):{" "}
              <span className="font-semibold">
                {(presupuesto.ivaImporte ?? 0).toFixed(2)} €
              </span>
            </p>
            <p>
              Total presupuesto:{" "}
              <span className="font-semibold">
                {(presupuesto.total ?? 0).toFixed(2)} €
              </span>
            </p>
          </div>

          {/* Alterar IVA */}
          <form
            action={actualizarIvaPresupuesto}
            className="flex items-center gap-2 mt-3 text-sm"
          >
            <input
              type="hidden"
              name="presupuestoId"
              value={presupuesto.id}
            />
            <Label htmlFor="ivaPorcentaje" className="text-xs">
              IVA %
            </Label>
            <Input
              id="ivaPorcentaje"
              name="ivaPorcentaje"
              type="number"
              step="0.1"
              min={0}
              defaultValue={presupuesto.ivaPorcentaje ?? 21}
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

          {presupuesto.notas && (
            <p className="text-sm text-slate-600 mt-3">
              Notas: {presupuesto.notas}
            </p>
          )}
        </div>
      </section>

      {/* Líneas + formulário */}
      <section className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-lg font-semibold mb-4">
          Líneas del presupuesto
        </h2>

        <form
          action={agregarLineaPresupuesto}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end border-b pb-4 mb-4"
        >
          <input
            type="hidden"
            name="presupuestoId"
            value={presupuesto.id}
          />

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
              placeholder="Ej: Limpieza sofá 3 plazas + protector..."
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

        {/* Tabela de linhas */}
        {presupuesto.lineas.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay líneas en este presupuesto.
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
    {presupuesto.lineas.map((linea) => (
      <tr key={linea.id} className="border-t">
        <td className="p-2">{linea.servicio?.nombre ?? "-"}</td>
        <td className="p-2">{linea.descripcion}</td>
        <td className="p-2 text-right">{linea.cantidad}</td>
        <td className="p-2 text-right">
          {linea.precioUnitario.toFixed(2)}
        </td>
        <td className="p-2 text-right">
          {linea.totalLinea.toFixed(2)}
        </td>
        <td className="p-2 text-right">
          <form action={eliminarLineaPresupuesto}>
            <input
              type="hidden"
              name="presupuestoId"
              value={presupuesto.id}
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

        {/* Descrição geral abaixo da tabela */}
        <div className="mt-6 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">
            Descripción general / observaciones
          </h3>

          <form
            action={actualizarNotasPresupuesto}
            className="space-y-2"
          >
            <input
              type="hidden"
              name="presupuestoId"
              value={presupuesto.id}
            />
            <Textarea
              id="notas"
              name="notas"
              rows={4}
              defaultValue={presupuesto.notas ?? ""}
              placeholder="Ej.: Detalle de trabajos previstos, materiales incluidos, condiciones, etc."
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
