import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { getCurrentWorkspaceId } from "@/lib/workspace";

type FacturaConCliente = {
  id: number;
  numero: string;
  fecha: Date;
  estado: string;
  total: number;
  cliente: {
    nombre: string;
  } | null;
};

const estadoClase: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-700 border border-slate-200",
  emitida: "bg-blue-100 text-blue-700 border border-blue-200",
  cobrada: "bg-emerald-100 text-emerald-700 border border-emerald-200",
};

function EstadoBadge({ estado }: { estado: string }) {
  const key = estado as keyof typeof estadoClase;
  const clasesBase =
    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  const clasesColor = estadoClase[key] ?? estadoClase["borrador"];

  return <span className={`${clasesBase} ${clasesColor}`}>{estado}</span>;
}

export default async function FacturasPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const facturas = (await prisma.factura.findMany({
    where: { workspaceId },
    orderBy: { id: "desc" },
    include: {
      cliente: true,
    },
  })) as FacturaConCliente[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Facturas</h1>

        <Button asChild>
          <Link href="/facturas/nueva">Nueva factura</Link>
        </Button>
      </div>

      {facturas.length === 0 ? (
        <p className="text-slate-500">No hay facturas registradas todavía.</p>
      ) : (
        <>
          {/* ✅ MOBILE: cards (igual Presupuestos) */}
          <div className="space-y-3 md:hidden">
            {facturas.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{f.numero}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {f.cliente?.nombre ?? "—"}
                    </p>
                  </div>

                  <EstadoBadge estado={f.estado} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Fecha</p>
                    <p className="text-sm font-medium text-slate-900">
                      {new Date(f.fecha).toLocaleDateString("es-ES")}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total</p>
                    <p className="text-sm font-medium text-slate-900">
                      {f.total.toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </p>
                  </div>
                </div>

                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={`/facturas/${f.id}`}>Ver / editar</Link>
                </Button>
              </div>
            ))}
          </div>

          {/* ✅ DESKTOP: tabela */}
          <div className="hidden md:block bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 text-left">Número</th>
                  <th className="p-3 text-left">Fecha</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="p-3">{f.numero}</td>
                    <td className="p-3">
                      {new Date(f.fecha).toLocaleDateString("es-ES")}
                    </td>
                    <td className="p-3">{f.cliente?.nombre ?? "—"}</td>
                    <td className="p-3">
                      <EstadoBadge estado={f.estado} />
                    </td>
                    <td className="p-3 text-right">
                      {f.total.toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </td>
                    <td className="p-3 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/facturas/${f.id}`}>Ver / editar</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
