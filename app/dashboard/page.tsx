import prisma from "@/lib/prisma";
import Link from "next/link";
import { getCurrentWorkspaceId } from "@/lib/workspace";

export default async function DashboardPage() {
  const workspaceId = await getCurrentWorkspaceId();

  // Datas para este mês
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const [
    totalClientes,
    totalFacturas,
    totalPresupuestos,
    totalFacturadoAgg,
    facturasMes,
    facturadoMesAgg,
  ] = await Promise.all([
    // 👇 sempre filtrando pelo workspace atual
    prisma.cliente.count({
      where: { workspaceId },
    }),
    prisma.factura.count({
      where: { workspaceId },
    }),
    prisma.presupuesto.count({
      where: { workspaceId },
    }),
    prisma.factura.aggregate({
      where: { workspaceId },
      _sum: { total: true },
    }),
    prisma.factura.count({
      where: {
        workspaceId,
        fecha: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    }),
    prisma.factura.aggregate({
      where: {
        workspaceId,
        fecha: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { total: true },
    }),
  ]);

  const totalFacturado = totalFacturadoAgg._sum.total ?? 0;
  const totalFacturadoMes = facturadoMesAgg._sum.total ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Visão geral rápida de clientes, presupuestos e facturas.
          </p>
        </div>
      </header>

      {/* Cards principais */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Clientes</p>
            <p className="mt-2 text-2xl font-semibold">{totalClientes}</p>
            <p className="text-xs text-slate-500 mt-1">
              Clientes cadastrados na base
            </p>
          </div>
          <div className="mt-3 text-right">
            <Link
              href="/clientes"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver clientes →
            </Link>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Presupuestos</p>
            <p className="mt-2 text-2xl font-semibold">
              {totalPresupuestos}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Presupuestos registrados
            </p>
          </div>
          <div className="mt-3 text-right">
            <Link
              href="/presupuestos"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver presupuestos →
            </Link>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Facturas</p>
            <p className="mt-2 text-2xl font-semibold">{totalFacturas}</p>
            <p className="text-xs text-slate-500 mt-1">
              Facturas criadas no sistema
            </p>
          </div>
          <div className="mt-3 text-right">
            <Link
              href="/facturas"
              className="text-xs text-blue-600 hover:underline"
            >
              Ver facturas →
            </Link>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">
              Total facturado (geral)
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {totalFacturado.toFixed(2)} €
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Soma de todas as facturas
            </p>
          </div>
        </div>
      </section>

      {/* Bloco com foco no mês atual */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">
            Este mês ({startOfMonth.toLocaleDateString("es-ES")} –{" "}
            {endOfMonth.toLocaleDateString("es-ES")})
          </p>
          <p className="mt-2 text-lg font-semibold">
            {facturasMes} facturas emitidas
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Total facturado no mês:{" "}
            <span className="font-semibold">
              {totalFacturadoMes.toFixed(2)} €
            </span>
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs uppercase text-slate-500">
            Ações rápidas
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link
              href="/clientes/nuevo"
              className="px-3 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
            >
              + Nuevo cliente
            </Link>
            <Link
              href="/presupuestos/nuevo"
              className="px-3 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
            >
              + Nuevo presupuesto
            </Link>
            <Link
              href="/facturas/nueva"
              className="px-3 py-1 rounded-md border border-slate-300 hover:bg-slate-50"
            >
              + Nueva factura
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
