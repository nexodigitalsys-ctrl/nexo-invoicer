"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Cliente {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
}

export default function ClienteTable({ clientes }: { clientes: Cliente[] }) {
  const router = useRouter();

  if (!clientes || clientes.length === 0) {
    return (
      <p className="text-slate-500">No hay clientes registrados todavía.</p>
    );
  }

  return (
    <>
      {/* ✅ DESKTOP/TABLET */}
      <div className="hidden sm:block bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Correo</th>
              <th className="p-3 text-left">Teléfono</th>
              <th className="p-3 text-left">Dirección</th>
              <th className="p-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.nombre}</td>
                <td className="p-3">{c.email ?? "-"}</td>
                <td className="p-3">{c.telefono ?? "-"}</td>
                <td className="p-3">{c.direccion ?? "—"}</td>
                <td className="p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/clientes/editar/${c.id}`)}
                  >
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ✅ MOBILE (igual Presupuestos: cards) */}
      <div className="sm:hidden space-y-3">
        {clientes.map((c) => (
          <div
            key={c.id}
            className="bg-white shadow-sm rounded-lg border border-slate-200 p-4"
          >
            {/* topo: nome + telefone */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {c.nombre}
                </p>
                <p className="text-sm text-slate-600 mt-1 truncate">
                  {c.email ?? "—"}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs text-slate-500">Teléfono</p>
                <p className="text-sm font-medium text-slate-900">
                  {c.telefono ?? "—"}
                </p>
              </div>
            </div>

            {/* meio: direção (compacta) */}
            <div className="mt-3">
              <p className="text-xs text-slate-500">Dirección</p>
              <p className="text-sm text-slate-900 line-clamp-2">
                {c.direccion ?? "—"}
              </p>
            </div>

            {/* botão embaixo (igual presupuesto) */}
            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/clientes/editar/${c.id}`)}
              >
                Editar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
