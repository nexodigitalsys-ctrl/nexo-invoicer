"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Cliente {
  id: number;
  nombre: string;
}

interface Presupuesto {
  id: number;
  numero: string;
  fecha: string | Date;
  estado: string;
  total: number;
  cliente: Cliente;
}

function formatDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("es-ES");
}

function formatCurrency(value: number) {
  return (value ?? 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
  });
}

function StatusPill({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
      {value || "—"}
    </span>
  );
}

export default function PresupuestoTable({
  presupuestos,
}: {
  presupuestos: Presupuesto[];
}) {
  const router = useRouter();

  if (!presupuestos || presupuestos.length === 0) {
    return (
      <p className="text-slate-500">No hay presupuestos registrados todavía.</p>
    );
  }

  return (
    <div className="space-y-3">
      
      {/* ✅ MOBILE (Cards) */}
      <div className="space-y-3 md:hidden">
        {presupuestos.map((p) => (
          <div
            key={p.id}
            className="rounded-lg border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {p.numero}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {p.cliente?.nombre ?? "—"}
                </div>
              </div>

              <StatusPill value={p.estado} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Fecha</div>
                <div className="font-medium text-slate-900">
                  {formatDate(p.fecha)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Total</div>
                <div className="font-semibold text-slate-900">
                  {formatCurrency(p.total ?? 0)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => router.push(`/presupuestos/${p.id}`)}
              >
                Ver / Editar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ DESKTOP (Tabela completa) */}
      <div className="hidden md:block rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[760px]">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-3 text-left">Número</th>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-right">Total (€)</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {presupuestos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.numero}</td>
                  <td className="p-3">{p.cliente?.nombre ?? "-"}</td>
                  <td className="p-3">{formatDate(p.fecha)}</td>
                  <td className="p-3 capitalize">{p.estado}</td>
                  <td className="p-3 text-right">
                    {formatCurrency(p.total ?? 0)}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/presupuestos/${p.id}`)}
                    >
                      Ver / Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
