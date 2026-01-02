import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD") // tira acentos
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-") // tudo que não é letra/número vira "-"
    .replace(/(^-|-$)+/g, ""); // tira "-" do começo/fim
}
// 🟡 Server Action: criar novo workspace
export async function crearWorkspace(formData: FormData) {
  "use server";

  const name = formData.get("name")?.toString().trim() ?? "";
  let slug = formData.get("slug")?.toString().trim().toLowerCase() ?? "";

  if (!name) {
    // depois podemos tratar com toast bonitinho
    return;
  }

  if (!slug) {
    slug = slugify(name);
  }

  if (!slug) {
    slug = `workspace-${Date.now()}`;
  }

  // Garante slug único (se já existir, adiciona -2, -3, etc.)
  let finalSlug = slug;
  let counter = 2;

  
  while (true) {
    const existing = await prisma.workspace.findUnique({
      where: { slug: finalSlug },
    });

    if (!existing) break;

    finalSlug = `${slug}-${counter++}`;
  }

  await prisma.workspace.create({
    data: {
      name,
      slug: finalSlug,
    },
  });

  revalidatePath("/workspaces");
}