import prisma from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import PresupuestoTable from "@/components/presupuestos/PresupuestoTable";

import { getCurrentWorkspaceId } from "@/lib/workspace";

export default async function PresupuestosPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const presupuestos = await prisma.presupuesto.findMany({
    where: { workspaceId},
    orderBy: { id: "desc" },
    include: {
      cliente: true,
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Presupuestos</h1>

        <Link href="/presupuestos/nuevo">
          <Button>Nuevo Presupuesto</Button>
        </Link>
      </div>

      <PresupuestoTable presupuestos={presupuestos} />
    </div>
  );
}
