"use server";

import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getCurrentWorkspaceId } from "@/lib/workspace";
import { getSupabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";


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

  // 👇 NOVO: ler idioma do formulário
  const idiomaRaw = formData.get("idioma")?.toString() || "es";
  const idioma: "es" | "ca" = idiomaRaw === "ca" ? "ca" : "es";

  if (!nombre) {
    throw new Error("El nombre de la empresa es obligatorio");
  }

  // 🔹 LOGO (Supabase Storage)
const logoFile = formData.get("logo") as File | null;
let logoPath: string | null = null;

if (logoFile && logoFile.size > 0) {
  const supabase = getSupabaseServer();

  const originalName = logoFile.name || "logo.png";
  const ext = originalName.includes(".")
    ? originalName.split(".").pop()?.toLowerCase()
    : "png";

  const fileName = `logo-${workspaceId}-${Date.now()}.${ext}`;
  const storagePath = `workspaces/${workspaceId}/${fileName}`;

  const arrayBuffer = await logoFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from("logos")
    .upload(storagePath, buffer, {
      contentType: logoFile.type || "image/png",
      upsert: true,
    });

  if (error) {
    throw new Error(`Error subiendo logo: ${error.message}`);
  }

  const { data } = supabase.storage.from("logos").getPublicUrl(storagePath);
  logoPath = data.publicUrl;
}

  // buscar config só deste workspace
  const existing = await prisma.empresaConfig.findUnique({
    where: { workspaceId },
  });

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
    ...(logoPath ? { logoPath } : {}), // só atualiza logo se enviou arquivo
  };

  if (existing) {
    await prisma.empresaConfig.update({
      where: { workspaceId },
      data: dataToSave,
    });
  } else {
    await prisma.empresaConfig.create({
      data: dataToSave,
    });
  }

  revalidatePath("/settings");
  redirect("/settings");
}