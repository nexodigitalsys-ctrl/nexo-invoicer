"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  activo: boolean;
}

export default function ServicioTable({ servicios }: { servicios: Servicio[] }) {
  const router = useRouter();

  if (!servicios || servicios.length === 0) {
    return (
      <p className="text-slate-500">
        No hay servicios registrados todavía.
      </p>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="p-3 text-left">Nombre</th>
            <th className="p-3 text-left">Descripción</th>
            <th className="p-3 text-left">Precio (EUR)</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="p-3">{s.nombre}</td>
              <td className="p-3">{s.descripcion ?? "-"}</td>
              <td className="p-3">
                {s.precio != null ? s.precio.toFixed(2) : "-"}
              </td>
              <td className="p-3">{s.activo ? "Activo" : "Inactivo"}</td>
              <td className="p-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/servicios/editar/${s.id}`)}
                >
                  Editar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
