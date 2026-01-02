import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function actualizarServicio(formData: FormData) {
  "use server";

  const idRaw = formData.get("id")?.toString();
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const descripcion = formData.get("descripcion")?.toString().trim() ?? "";
  const precioStr = formData.get("precio")?.toString().replace(",", ".") ?? "0";
  const activoStr = formData.get("activo")?.toString() ?? "on";

  const id = Number(idRaw);
  if (isNaN(id)) return;

  if (!nombre) {
    throw new Error("El nombre del servicio es obligatorio");
  }

  const precio = Number(precioStr) || 0;
  const activo = activoStr === "on" || activoStr === "true";

  await prisma.servicio.update({
    where: { id },
    data: {
      nombre,
      descripcion,
      precio,
      activo,
    },
  });

  redirect("/servicios");
}

export default async function EditarServicioPage({ params }: PageProps) {
  const { id } = await params;
  const servicioId = Number(id);
  if (isNaN(servicioId)) notFound();

  const servicio = await prisma.servicio.findUnique({
    where: { id: servicioId },
  });

  if (!servicio) notFound();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Editar Servicio</h1>
      </div>

      <form
        action={actualizarServicio}
        className="max-w-xl space-y-4 bg-white p-6 rounded-xl shadow-sm border"
      >
        <input type="hidden" name="id" value={servicio.id} />

        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            defaultValue={servicio.nombre}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            defaultValue={servicio.descripcion ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="precio">Precio (€)</Label>
          <Input
            id="precio"
            name="precio"
            type="number"
            step="0.01"
            defaultValue={servicio.precio?.toString() ?? "0"}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="activo"
            name="activo"
            type="checkbox"
            defaultChecked={servicio.activo}
          />
          <Label htmlFor="activo">Servicio activo</Label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" asChild>
            <a href="/servicios">Cancelar</a>
          </Button>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </div>
  );
}
