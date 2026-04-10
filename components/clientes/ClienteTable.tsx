"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Cliente {
  id: number;
  nombre: string;
  nif: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  _count: {
    facturas: number;
    presupuestos: number;
  };
}

export default function ClienteTable({
  clientes,
  eliminarClienteAction,
}: {
  clientes: Cliente[];
  eliminarClienteAction: (formData: FormData) => void | Promise<void>;
}) {
  const router = useRouter();

  if (!clientes || clientes.length === 0) {
    return (
      <p className="text-slate-500">No hay clientes registrados todavia.</p>
    );
  }

  const hasDocuments = (cliente: Cliente) =>
    cliente._count.facturas > 0 || cliente._count.presupuestos > 0;

  const linkedDocumentsLabel = (cliente: Cliente) => {
    const parts = [
      cliente._count.facturas > 0 ? `${cliente._count.facturas} factura(s)` : "",
      cliente._count.presupuestos > 0
        ? `${cliente._count.presupuestos} presupuesto(s)`
        : "",
    ].filter(Boolean);

    return `Tiene ${parts.join(" y ")} vinculados.`;
  };

  return (
    <>
      <div className="hidden sm:block overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-3 text-left">Nombre</th>
              <th className="p-3 text-left">Correo</th>
              <th className="p-3 text-left">Telefono</th>
              <th className="p-3 text-left">Direccion</th>
              <th className="p-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="p-3 font-medium">{c.nombre}</td>
                <td className="p-3">{c.email ?? "-"}</td>
                <td className="p-3">{c.telefono ?? "-"}</td>
                <td className="p-3">{c.direccion ?? "-"}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/clientes/editar/${c.id}`)}
                    >
                      Editar
                    </Button>

                    <form
                      action={eliminarClienteAction}
                      onSubmit={(event) => {
                        if (
                          !confirm(
                            `Eliminar cliente "${c.nombre}"? Esta accion no se puede deshacer.`
                          )
                        ) {
                          event.preventDefault();
                        }
                      }}
                    >
                      <input type="hidden" name="clienteId" value={c.id} />
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                        disabled={hasDocuments(c)}
                        title={
                          hasDocuments(c)
                            ? "No se puede eliminar: tiene documentos vinculados."
                            : "Eliminar cliente"
                        }
                      >
                        Eliminar
                      </Button>
                    </form>
                  </div>

                  {hasDocuments(c) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {linkedDocumentsLabel(c)}
                    </p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 sm:hidden">
        {clientes.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {c.nombre}
                </p>
                <p className="mt-1 truncate text-sm text-slate-600">
                  {c.email ?? "-"}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-500">Telefono</p>
                <p className="text-sm font-medium text-slate-900">
                  {c.telefono ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-slate-500">Direccion</p>
              <p className="line-clamp-2 text-sm text-slate-900">
                {c.direccion ?? "-"}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/clientes/editar/${c.id}`)}
              >
                Editar
              </Button>

              <form
                action={eliminarClienteAction}
                onSubmit={(event) => {
                  if (
                    !confirm(
                      `Eliminar cliente "${c.nombre}"? Esta accion no se puede deshacer.`
                    )
                  ) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="clienteId" value={c.id} />
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={hasDocuments(c)}
                  title={
                    hasDocuments(c)
                      ? "No se puede eliminar: tiene documentos vinculados."
                      : "Eliminar cliente"
                  }
                >
                  Eliminar
                </Button>
              </form>

              {hasDocuments(c) && (
                <p className="text-xs text-slate-500">
                  {linkedDocumentsLabel(c)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
