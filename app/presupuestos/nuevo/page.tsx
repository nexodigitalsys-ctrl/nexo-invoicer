// app/presupuestos/nuevo/page.tsx
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { crearPresupuesto } from "./actions";



export default async function NuevoPresupuestoPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const clientes = await prisma.cliente.findMany({
    where: { workspaceId },
    orderBy: { nombre: "asc" },
  });

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Nuevo presupuesto</h1>
      </div>

      <form
        action={crearPresupuesto}
        className="max-w-xl space-y-4 bg-white p-6 rounded-xl shadow-sm border"
      >
        <div className="space-y-1">
          <Label htmlFor="clienteId">Cliente</Label>
          <select
            id="clienteId"
            name="clienteId"
            required
            className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="">— Selecciona un cliente —</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
                {c.nif ? ` (${c.nif})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="fecha">Fecha</Label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notas">
            Descripción general / notas (opcional)
          </Label>
          <Textarea
            id="notas"
            name="notas"
            rows={3}
            placeholder="Ej: Trabajo realizado en domicilio del cliente, incluye limpieza, protector, etc."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit">Crear presupuesto</Button>
        </div>
      </form>
    </div>
  );
}
