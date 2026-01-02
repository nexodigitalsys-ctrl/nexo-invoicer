import prisma from "@/lib/prisma";
// src/lib/workspace.ts


// versão futura com login (só pra você entender a ideia):
// export async function getCurrentWorkspaceId() {
//   // buscar usuário logado, membership, etc.
// }

import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentWorkspaceId } from "@/lib/workspace";

async function crearCliente(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();

  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const nif = formData.get("nif")?.toString().trim() ?? "";
  const emailRaw = formData.get("email")?.toString().trim();
  const telefonoRaw = formData.get("telefono")?.toString().trim();
  const direccion = formData.get("direccion")?.toString().trim() || null;
  
  
  
  const email = emailRaw || null;
  const telefono = telefonoRaw || null;
  
  
  

  if (!nombre) {
    throw new Error("El nombre es obligatorio");
  }

  if (!nif) {
    throw new Error("El NIF es obligatorio");
  }

  await prisma.cliente.create({
    
    data: {
      workspaceId,
      nombre,
      nif,       // 👈 agora é sempre string, nunca null
      email,
      telefono,
      direccion,
    },
  });

  redirect("/clientes");
}


export default function NuevoClientePage() {
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Nuevo Cliente</h1>
      </div>

      <form
        action={crearCliente}
        className="max-w-xl space-y-4 bg-white p-6 rounded-xl shadow-sm border"
      >
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej. Juan Pérez"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nif">NIF / CIF / DNI</Label>
          <Input
            id="nif"
            name="nif"
            className="w-full"
            placeholder="Ej: Y1234567X"
            required
          />
        </div>


        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="cliente@ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input
            id="telefono"
            name="telefono"
            placeholder="+34 600 000 000"
          />
        </div>

         <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input
          id="direccion"
          name="direccion"
          placeholder="Calle..."
        />
      </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" asChild>
            <a href="/clientes">Cancelar</a>
          </Button>

          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </div>
  );
}
