"use client";

import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, FileText, File, Users, Settings, Wrench } from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/facturas", label: "Facturas", icon: FileText },
  { href: "/presupuestos", label: "Presupuestos", icon: File },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicios", label: "Servicios", icon: Wrench },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 flex flex-col gap-1 text-sm">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname?.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md transition",
              active ? "bg-slate-800 text-white" : "text-slate-200 hover:bg-slate-800"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex fixed left-0 top-0 z-40 h-full w-64 bg-slate-900 text-white flex-col shadow-xl">
      <div className="px-6 py-6 text-2xl font-bold tracking-wide">
        Nexo Invoicer
      </div>

      <SidebarNav />

      <div className="px-4 py-4 border-t border-slate-800">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-800 transition text-slate-200"
        >
          <Settings size={18} />
          Configuraciones
        </Link>
      </div>
    </aside>
  );
}
