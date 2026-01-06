import prisma from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";
import { X, RotateCcw } from "lucide-react";

async function crearServicio(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();

  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const descripcion = formData.get("descripcion")?.toString().trim() ?? "";
  const precioStr = formData.get("precio")?.toString() ?? "0";

  if (!nombre) return;

  const precio = Number(precioStr) || 0;

  await prisma.servicio.create({
    data: {
      workspaceId,
      nombre,
      descripcion: descripcion || null,
      precio,
      activo: true,
    },
  });

  redirect("/servicios");
}

async function desactivarServicio(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();
  const servicioId = Number(formData.get("servicioId"));

  if (!Number.isFinite(servicioId)) return;

  // Garantiza que el servicio pertenece al workspace actual
  const exists = await prisma.servicio.findFirst({
    where: { id: servicioId, workspaceId },
    select: { id: true },
  });

  if (!exists) return;

  await prisma.servicio.update({
    where: { id: servicioId },
    data: { activo: false },
  });

  redirect("/servicios");
}

async function reactivarServicio(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();
  const servicioId = Number(formData.get("servicioId"));

  if (!Number.isFinite(servicioId)) return;

  const exists = await prisma.servicio.findFirst({
    where: { id: servicioId, workspaceId },
    select: { id: true },
  });

  if (!exists) return;

  await prisma.servicio.update({
    where: { id: servicioId },
    data: { activo: true },
  });

  redirect("/servicios");
}

export default async function ServiciosPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const serviciosActivos = await prisma.servicio.findMany({
    where: { workspaceId, activo: true },
    orderBy: { nombre: "asc" },
  });

  const serviciosInactivos = await prisma.servicio.findMany({
    where: { workspaceId, activo: false },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Servicios</h1>
      </div>

      <form
        action={crearServicio}
        className="max-w-xl space-y-4 bg-white p-6 rounded-xl shadow-sm border"
      >
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" required />
        </div>

        <div className="space-y-1">
          <Label htmlFor="descripcion">Descripción (opcional)</Label>
          <Input id="descripcion" name="descripcion" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="precio">Precio base (€)</Label>
          <Input id="precio" name="precio" type="number" step="0.01" />
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit">Agregar servicio</Button>
        </div>
      </form>

      <div className="mt-8 space-y-6">
        {/* ACTIVOS */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-700">
            Servicios activos
          </h2>

          {serviciosActivos.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay servicios registrados todavía.
            </p>
          ) : (
            <ul className="space-y-2">
              {serviciosActivos.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 truncate">
                      {s.nombre}
                    </div>
                    {s.descripcion ? (
                      <div className="text-xs text-slate-500 truncate">
                        {s.descripcion}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">
                      {(s.precio ?? 0).toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>

                    {/* X = desactivar (quitar de la lista) */}
                    <form action={desactivarServicio}>
                      <input type="hidden" name="servicioId" value={s.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        title="Quitar de la lista"
                        className="text-slate-500 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* INACTIVOS */}
        {serviciosInactivos.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700">
              Servicios desactivados
            </h2>

            <ul className="space-y-2">
              {serviciosInactivos.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm opacity-90"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-700 truncate">
                      {s.nombre}
                    </div>
                    {s.descripcion ? (
                      <div className="text-xs text-slate-500 truncate">
                        {s.descripcion}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-slate-600">
                      {(s.precio ?? 0).toLocaleString("es-ES", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </span>

                    <form action={reactivarServicio}>
                      <input type="hidden" name="servicioId" value={s.id} />
                      <Button type="submit" variant="outline" size="sm">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restaurar
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
