// app/workspaces/page.tsx
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentWorkspaceId } from "@/lib/workspace"; // 👈 IMPORTANTE
import { crearWorkspace } from "./actions";





export default async function WorkspacesPage() {
  // 👇 pega o workspace atual (cookie / default)
  const currentWorkspaceId = await getCurrentWorkspaceId();

  const workspaces = await prisma.workspace.findMany({
    orderBy: { id: "asc" },
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm text-slate-500 mt-1">
            Cada workspace representa uma empresa / conta separada dentro do
            CRM (clientes, facturas, presupuestos, etc.).
          </p>
        </div>
      </div>

      {/* 🔹 Formulário para criar novo workspace */}
      <section className="bg-white border rounded-xl shadow-sm p-4 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold">Crear nuevo workspace</h2>

        <form
          action={crearWorkspace}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
        >
          <div className="space-y-1 md:col-span-1">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              name="name"
              placeholder="Ej: Superclim Servicios"
              required
            />
          </div>

          <div className="space-y-1 md:col-span-1">
            <Label htmlFor="slug">Slug (opcional)</Label>
            <Input
              id="slug"
              name="slug"
              placeholder="Ej: superclim, reformas-martinez"
            />
            <p className="text-xs text-slate-400">
              Si lo dejas vacío, se generará automáticamente a partir del
              nombre.
            </p>
          </div>

          <div className="md:col-span-1 flex md:justify-end">
            <Button type="submit" className="mt-2 md:mt-0">
              Crear workspace
            </Button>
          </div>
        </form>
      </section>

      {/* 🔹 Lista de workspaces existentes */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Workspaces existentes</h2>

        {workspaces.length === 0 ? (
          <p className="text-sm text-slate-500">
            Todavía no hay ningún workspace creado.
          </p>
        ) : (
          <ul className="space-y-2">
            {workspaces.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between bg-white border rounded-lg px-4 py-2"
              >
                <div>
                  <p className="font-medium">
                    {w.name}{" "}
                    <span className="text-xs text-slate-500">
                      (slug: {w.slug})
                    </span>
                  </p>
                  <p className="text-xs text-slate-400">
                    ID: {w.id}
                    {w.id === currentWorkspaceId && " · workspace actual"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Link href={`/workspaces/switch?workspaceId=${w.id}`}>
                    <Button
                      variant={
                        w.id === currentWorkspaceId ? "secondary" : "outline"
                      }
                      size="sm"
                    >
                      {w.id === currentWorkspaceId
                        ? "Workspace actual"
                        : "Usar este workspace"}
                    </Button>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
