import Link from "next/link";
import prisma from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function QuickPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const [facturas, presupuestos] = await Promise.all([
    prisma.factura.findMany({
      where: { workspaceId },
      orderBy: { id: "desc" },
      take: 5,
      select: { id: true, numero: true, total: true, fecha: true },
    }),
    prisma.presupuesto.findMany({
      where: { workspaceId },
      orderBy: { id: "desc" },
      take: 5,
      select: { id: true, numero: true, total: true, fecha: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Modo rápido</h1>
        <p className="text-sm text-slate-600">
          Para celular: acesso rápido a PDFs e últimos documentos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Últimas facturas</h2>
            <Link href="/facturas">
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </div>

          <div className="space-y-2">
            {facturas.length === 0 ? (
              <p className="text-sm text-slate-500">Ainda não há facturas.</p>
            ) : (
              facturas.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.numero}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(f.fecha).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold whitespace-nowrap">
                      € {Number(f.total ?? 0).toFixed(2)}
                    </div>
                    <Link href={`/facturas/${f.id}/pdf`} className="text-sm underline">
                      PDF
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Últimos presupuestos</h2>
            <Link href="/presupuestos">
              <Button variant="outline" size="sm">Ver todos</Button>
            </Link>
          </div>

          <div className="space-y-2">
            {presupuestos.length === 0 ? (
              <p className="text-sm text-slate-500">Ainda não há presupuestos.</p>
            ) : (
              presupuestos.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.numero}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(p.fecha).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold whitespace-nowrap">
                      € {Number(p.total ?? 0).toFixed(2)}
                    </div>
                    <Link href={`/presupuestos/${p.id}/pdf`} className="text-sm underline">
                      PDF
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <Link href="/facturas/nueva" className="w-full md:w-auto">
          <Button className="w-full md:w-auto">Nueva factura</Button>
        </Link>
        <Link href="/presupuestos/nuevo" className="w-full md:w-auto">
          <Button variant="outline" className="w-full md:w-auto">Nuevo presupuesto</Button>
        </Link>
        <Link href="/settings" className="w-full md:w-auto">
          <Button variant="secondary" className="w-full md:w-auto">Configuración</Button>
        </Link>
      </div>
    </div>
  );
}
