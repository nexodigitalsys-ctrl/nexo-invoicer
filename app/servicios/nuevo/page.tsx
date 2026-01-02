import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentWorkspaceId } from "@/lib/workspace";

// Server Action
async function crearServicio(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();

  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const descripcionRaw = formData.get("descripcion")?.toString().trim();
  const precioRaw = formData.get("precio")?.toString().trim();

  const descripcion = descripcionRaw || null;
  const precio =
    precioRaw && !isNaN(Number(precioRaw)) ? Number(precioRaw) : null;

  if (!nombre) {
    throw new Error("El nombre del servicio es obligatorio");
  }

  await prisma.servicio.create({
    data: {
      workspaceId,
      nombre,
      descripcion,
      precio,
      activo: true,
    },
  });

  redirect("/servicios");
}

export default function NuevoServicioPage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Nuevo Servicio</h1>
      </div>

      <form
        action={crearServicio}
        className="max-w-xl space-y-4 bg-white p-6 rounded-xl shadow-sm border"
      >
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre del servicio</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. Limpieza de sofá 3 plazas"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            name="descripcion"
            placeholder="Detalles del servicio, condiciones, etc."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="precio">Precio base (EUR)</Label>
          <Input
            id="precio"
            name="precio"
            type="number"
            step="0.01"
            placeholder="Ej. 79.90"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" asChild>
            <a href="/servicios">Cancelar</a>
          </Button>

          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </div>
  );
}
