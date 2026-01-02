import prisma from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redirect } from "next/navigation";

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

export default async function ServiciosPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const servicios = await prisma.servicio.findMany({
    where: { workspaceId },
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

      <div className="mt-8">
        {servicios.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay servicios registrados todavía.
          </p>
        ) : (
          <ul className="space-y-2">
            {servicios.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border bg-white px-4 py-2 text-sm"
              >
                <span>{s.nombre}</span>
                <span>
                  {(s.precio ?? 0).toLocaleString("es-ES", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </span>

              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
