"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FacturaWithCliente = {
  id: number;
  numero: string;
  fecha: Date | string;
  estado: string;
  total: number;
  cliente: { nombre: string | null } | null;
};

interface FacturaTableProps {
  facturas: FacturaWithCliente[];
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("es-ES");
}
function formatMoney(value: number) {
  return value.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export default function FacturaTable({ facturas }: FacturaTableProps) {
  const router = useRouter();

  if (!facturas || facturas.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No hay facturas registradas todavía.
      </p>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* MOBILE */}
      <div className="sm:hidden p-3 space-y-3">
        {facturas.map((f) => (
          <div key={f.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-slate-900">{f.numero}</div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 capitalize">
                {f.estado}
              </span>
            </div>

            <div className="mt-1 text-slate-600">
              {f.cliente?.nombre ?? "—"}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-slate-500">Fecha</div>
                <div className="text-sm font-medium text-slate-900">
                  {formatDate(f.fecha)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-sm font-semibold text-slate-900">
                  {formatMoney(f.total)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/facturas/${f.id}`)}
              >
                Ver / Editar
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {facturas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.numero}</TableCell>
                <TableCell>{f.cliente?.nombre ?? "—"}</TableCell>
                <TableCell>{formatDate(f.fecha)}</TableCell>
                <TableCell className="capitalize">{f.estado}</TableCell>
                <TableCell className="text-right">{formatMoney(f.total)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/facturas/${f.id}`)}
                  >
                    Ver / editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
