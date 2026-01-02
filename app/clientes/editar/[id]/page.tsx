import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function actualizarCliente(formData: FormData) {
  "use server";

  const idRaw = formData.get("id")?.toString();
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const nif = formData.get("nif")?.toString().trim() ?? "";
  const emailRaw = formData.get("email")?.toString().trim();
  const telefonoRaw = formData.get("telefono")?.toString().trim();
  const direccion = formData.get("direccion")?.toString().trim() || null;
  const email = emailRaw || null;
  const telefono = telefonoRaw || null;

  const id = Number(idRaw);
  if (isNaN(id)) return;

  if (!nombre || !nif) {
    throw new Error("Nombre y NIF son obligatorios");
  }

  await prisma.cliente.update({
    where: { id },
    data: {
      nombre,
      nif,
      email,
      telefono,
      direccion,
    },
  });

  redirect("/clientes");
}

export default async function EditarClientePage({ params }: PageProps) {
  const { id } = await params;
  const clienteId = Number(id);
  if (isNaN(clienteId)) notFound();

  const cliente = await prisma.cliente.findUnique({
    where: { id: clienteId },
  });

  if (!cliente) notFound();

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Editar Cliente</h1>
      </div>

      <form
        action={actualizarCliente}
        className="max-w-xl space-y-4 bg-white p-6 rounded-xl shadow-sm border"
      >
        <input type="hidden" name="id" value={cliente.id} />

        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            defaultValue={cliente.nombre}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nif">NIF / CIF / DNI</Label>
          <Input
            id="nif"
            name="nif"
            defaultValue={cliente.nif}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={cliente.email ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            defaultValue={cliente.telefono ?? ""}
          />
        </div>

        <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          name="direccion"
          defaultValue={cliente.direccion ?? ""}
        />
      </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" asChild>
            <a href="/clientes">Cancelar</a>
          </Button>
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </div>
  );
}
