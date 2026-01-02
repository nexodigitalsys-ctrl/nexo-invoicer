import  prisma  from "@/lib/prisma";
import ClienteTable from "@/components/clientes/ClienteTable";
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { getCurrentWorkspaceId } from "@/lib/workspace";

export default async function ClientesPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const clientes = await prisma.cliente.findMany({
    where: { workspaceId },
    orderBy: { id: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold">Clientes</h1>

        <Link href="/clientes/nuevo">
          <Button>Nuevo Cliente</Button>
        </Link>
      </div>

      <ClienteTable clientes={clientes} />
    </div>
  );
}
