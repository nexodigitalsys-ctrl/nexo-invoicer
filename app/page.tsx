import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user?.email;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white grid place-items-center font-bold">
              N
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">Nexo Invoicer</div>
              <div className="text-xs text-slate-500">
                Facturas & presupuestos — multi-workspace
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <div className="hidden sm:block text-xs text-slate-500">
                  Logado como{" "}
                  <span className="font-medium text-slate-700">
                    {session?.user?.email}
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Ir ao painel
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-600">
              SaaS en Vercel • Neon + Prisma • PDFs en 1 click
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Tu facturación, simple.
              <span className="block text-slate-700">
                Con logo, PDFs y control por workspace.
              </span>
            </h1>

            <p className="mt-4 text-base text-slate-600">
              Crea clientes, servicios, presupuestos y facturas. Genera PDFs
              profesionales y guarda tu logo en la nube (Supabase Storage).
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Ir al panel
                  </Link>
                  <Link
                    href="/settings"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Configurar empresa
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Entrar
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                  >
                    Ver demo
                  </Link>
                </>
              )}
            </div>

            <div className="mt-6 text-xs text-slate-500">
              Dica: configure sua empresa e logo em{" "}
              <span className="font-medium">Ajustes</span> para aparecerem nos
              PDFs.
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-900">
              Estado do sistema
            </div>

            <div className="mt-2 text-sm text-slate-600">
              {isLoggedIn ? (
                <>
                  ✅ Você está logado. Pode acessar o painel e gerar PDFs.
                </>
              ) : (
                <>🔒 Acesso protegido. Faça login para usar o sistema.</>
              )}
            </div>

            <div className="mt-6 grid gap-3">
              <Feature
                title="Multi-tenant (workspaces)"
                desc="Cada dado isolado por workspaceId."
              />
              <Feature
                title="Logo em Supabase Storage"
                desc="Sem filesystem. Compatível com Vercel."
              />
              <Feature
                title="PDFs com numeração"
                desc="F-YYYY-000X / P-YYYY-000X, ES/CA."
              />
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-700">
                Próximo passo
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Suporte e relatórios para contador (em seguida).
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-14 border-t pt-8 text-sm text-slate-500">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} Nexo Digital</div>
            <div className="flex gap-4">
              <Link className="hover:underline" href="/dashboard">
                Panel
              </Link>
              <Link className="hover:underline" href="/settings">
                Ajustes
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-600">{desc}</div>
    </div>
  );
}
