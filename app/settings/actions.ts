"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/workspace";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

function redirectWithError(message: string): never {
  redirect(`/settings?error=${encodeURIComponent(message)}`);
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/png";
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function guardarEmpresaConfig(formData: FormData) {
  "use server";

  const workspaceId = await getCurrentWorkspaceId();

  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const nifRaw = formData.get("nif")?.toString().trim() || "";
  const direccionRaw = formData.get("direccion")?.toString().trim() || "";
  const cpRaw = formData.get("cp")?.toString().trim() || "";
  const ciudadRaw = formData.get("ciudad")?.toString().trim() || "";
  const provinciaRaw = formData.get("provincia")?.toString().trim() || "";
  const telefonoRaw = formData.get("telefono")?.toString().trim() || "";
  const emailRaw = formData.get("email")?.toString().trim() || "";
  const webRaw = formData.get("web")?.toString().trim() || "";
  const ibanRaw = formData.get("iban")?.toString().trim() || "";
  const idiomaRaw = formData.get("idioma")?.toString() || "es";
  const idioma: "es" | "ca" = idiomaRaw === "ca" ? "ca" : "es";

  if (!nombre) {
    redirectWithError("El nombre de la empresa es obligatorio.");
  }

  const logoFile = formData.get("logo") as File | null;
  let logoPath: string | null = null;

  if (logoFile && logoFile.size > 0) {
    if (!ALLOWED_LOGO_TYPES.has(logoFile.type)) {
      redirectWithError("Formato de logo invalido. Use PNG, JPG, WEBP o SVG.");
    }
    if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
      redirectWithError("El logo supera 5MB.");
    }

    const originalName = logoFile.name || "logo.png";
    const ext = originalName.includes(".")
      ? originalName.split(".").pop()?.toLowerCase()
      : "png";
    const fileName = `logo-${workspaceId}-${Date.now()}.${ext}`;
    const storagePath = `workspaces/${workspaceId}/${fileName}`;

    try {
      const supabase = getSupabaseServer();
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      const { error } = await supabase.storage.from("logos").upload(storagePath, buffer, {
        contentType: logoFile.type || "image/png",
        upsert: true,
      });

      if (error) {
        logoPath = await fileToDataUrl(logoFile);
      } else {
        const { data } = supabase.storage.from("logos").getPublicUrl(storagePath);
        logoPath = data.publicUrl;
      }
    } catch {
      logoPath = await fileToDataUrl(logoFile);
    }
  }

  const dataToSave = {
    workspaceId,
    nombre,
    nif: nifRaw || null,
    direccion: direccionRaw || null,
    cp: cpRaw || null,
    ciudad: ciudadRaw || null,
    provincia: provinciaRaw || null,
    telefono: telefonoRaw || null,
    email: emailRaw || null,
    web: webRaw || null,
    iban: ibanRaw || null,
    idioma,
    ...(logoPath ? { logoPath } : {}),
  };

  try {
    await prisma.empresaConfig.upsert({
      where: { workspaceId },
      create: dataToSave,
      update: dataToSave,
    });
  } catch {
    redirectWithError("No se pudo guardar la configuracion de la empresa.");
  }

  revalidatePath("/settings");
  redirect("/settings?ok=1");
}
