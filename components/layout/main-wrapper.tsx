"use client";

import { usePathname } from "next/navigation";
import Sidebar, { SidebarNav } from "./sidebar";
import Topbar from "./topbar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const PUBLIC_ROUTES = ["/", "/login"];

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  if (isPublic) {
    // Landing e Login sem layout interno (sidebar/topbar)
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const mobileNav = (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 hover:bg-slate-50"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-slate-700" />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0 bg-slate-900 text-white">
        <div className="px-6 py-6 text-xl font-bold tracking-wide border-b border-slate-800">
          Nexo Invoicer
        </div>

        <SidebarNav onNavigate={() => {}} />

        <div className="px-4 py-4 border-t border-slate-800">
          <a
            href="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition text-slate-200"
          >
            {/* Ícone omitido aqui para manter simples */}
            Configuraciones
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex flex-col w-full min-h-screen bg-slate-50 md:ml-64">
        <Topbar leftSlot={mobileNav} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
