import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { guardarEmpresaConfig } from "./actions";




// 🟡 Server Action: salvar config da empresa + logo


// 🟢 Página de Configurações
export default  async function SettingsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  const empresa = await prisma.empresaConfig.findUnique({
    where: { workspaceId },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Configuración de la empresa</h1>
          <p className="text-sm text-slate-500 mt-1">
            Estos datos se usarán en las facturas y presupuestos (PDF incluido){" "}
            para este workspace.
          </p>
        </div>
      </div>

      <form
        action={guardarEmpresaConfig}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow-sm border"
      >
        {/* Columna izquierda */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="nombre">Nombre comercial</Label>
            <Input
              id="nombre"
              name="nombre"
              defaultValue={empresa?.nombre ?? ""}
              placeholder="Ej: Superclim Servicios"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="nif">NIF / CIF</Label>
            <Input
              id="nif"
              name="nif"
              defaultValue={empresa?.nif ?? ""}
              placeholder="Ej: Y1234567X"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="direccion">Dirección</Label>
            <Textarea
              id="direccion"
              name="direccion"
              rows={2}
              defaultValue={empresa?.direccion ?? ""}
              placeholder="Calle, número, piso…"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cp">CP</Label>
              <Input
                id="cp"
                name="cp"
                defaultValue={empresa?.cp ?? ""}
                placeholder="08000"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ciudad">Ciudad</Label>
              <Input
                id="ciudad"
                name="ciudad"
                defaultValue={empresa?.ciudad ?? ""}
                placeholder="Barcelona"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="provincia">Provincia</Label>
              <Input
                id="provincia"
                name="provincia"
                defaultValue={empresa?.provincia ?? ""}
                placeholder="Barcelona"
              />
            </div>
          </div>

          {/* Idioma dos documentos */}
          <div className="space-y-1">
            <Label htmlFor="idioma">Idioma de los documentos (PDF)</Label>
            <select
              id="idioma"
              name="idioma"
              defaultValue={empresa?.idioma ?? "es"}
              className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="es">Español</option>
              <option value="ca">Català</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Afecta a los textos fijos de los PDFs (Datos del cliente, Total,
              Observaciones, etc.).
            </p>
          </div>
        </div>

        {/* Columna derecha */}
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              defaultValue={empresa?.telefono ?? ""}
              placeholder="+34 600 000 000"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={empresa?.email ?? ""}
              placeholder="info@empresa.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="web">Web</Label>
            <Input
              id="web"
              name="web"
              defaultValue={empresa?.web ?? ""}
              placeholder="https://tu-dominio.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="iban">IBAN / datos de pago</Label>
            <Textarea
              id="iban"
              name="iban"
              rows={2}
              defaultValue={empresa?.iban ?? ""}
              placeholder="ES00 0000 0000 0000 0000 0000 · Banco X"
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="logo">Logo de la empresa</Label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
            />

            {empresa?.logoPath && (
              <div className="mt-2">
                <p className="text-xs text-slate-500 mb-1">
                  Logo actual (vista previa):
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={empresa.logoPath}
                  alt="Logo de la empresa"
                  className="h-12 w-auto object-contain border rounded-md bg-slate-50 p-1"
                />
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 flex justify-end pt-2">
          <Button type="submit">Guardar configuración</Button>
        </div>
      </form>
    </div>
  );
}
