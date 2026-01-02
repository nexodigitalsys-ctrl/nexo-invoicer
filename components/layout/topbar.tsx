import Image from "next/image";

export default function Topbar({
  leftSlot,
}: {
  leftSlot?: React.ReactNode;
}) {
  return (
    <header className="h-16 w-full bg-white border-b flex items-center justify-between px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        {leftSlot}
        <div className="flex items-center gap-2">
          <Image
            src="/logo-nexo.png"
            alt="Nexo Digital"
            width={140}
            height={40}
            priority
          />
        </div>
      </div>

      {/* espaço para menu do usuário no futuro */}
      <div className="flex items-center gap-2" />
    </header>
  );
}
