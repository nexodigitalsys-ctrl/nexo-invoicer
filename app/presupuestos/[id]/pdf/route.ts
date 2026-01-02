import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";


export const runtime = "nodejs";


/**
 * Textos multi-idioma (ES / CA) para a estrutura da fatura
 */
const texts = {
  es: {
    invoiceTitle: "FACTURA",
    quoteTitle: "PRESUPUESTO",
    customerData: "Datos del cliente",
    companyData: "Datos de la empresa",
    base: "Base imponible",
    vat: "IVA",
    totalInvoice: "Total factura",
    totalQuote: "Total presupuesto",
    notes: "Observaciones",

    // 🔹 NOVO: cabeçalho da tabela
    tableDescription: "Descripción",
    tableQuantity: "Cant.",
    tableUnitPrice: "P. unit. (€)",
    tableTotal: "Total (€)",
  },
  ca: {
    invoiceTitle: "FACTURA",
    quoteTitle: "PRESSUPOST",
    customerData: "Dades del client",
    companyData: "Dades de l'empresa",
    base: "Base imposable",
    vat: "IVA",
    totalInvoice: "Total factura",
    totalQuote: "Total pressupost",
    notes: "Observacions",

    // 🔹 NOVO: cabeçalho da tabela em catalão
    tableDescription: "Descripció",
    tableQuantity: "Quant.",
    tableUnitPrice: "Preu unit. (€)",
    tableTotal: "Total (€)",
  },
} as const;

type Idioma = keyof typeof texts; // 'es' | 'ca'

async function fetchToBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}



export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next 15: params é Promise
) {
  const { id } = await params;
  const numeroId = Number(id);

  if (isNaN(numeroId)) {
    return new NextResponse("ID de presupuesto inválido", { status: 400 });
  }

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: numeroId },
    include: {
      cliente: true,
      lineas: {
        include: { servicio: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!presupuesto) {
    return new NextResponse("Presupuesto no encontrado", { status: 404 });
  }

  // Empresa do mesmo workspace
  const empresa = await prisma.empresaConfig.findUnique({
    where: { workspaceId: presupuesto.workspaceId },
  });

  // Idioma para o PDF
  const idioma: Idioma = empresa?.idioma === "ca" ? "ca" : "es";
  const t = texts[idioma];

  const empresaNombre = empresa?.nombre ?? "Mi Empresa";
  const accentGreen = "#16A34A";

  // Criar PDF em memória
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {});

 // Logo: se existir URL do supabase, usa; senão fallback pro logo padrão do public
let logoBuffer: Buffer | null = null;

if (empresa?.logoPath) {
  const logoUrl = empresa.logoPath.startsWith("http")
    ? empresa.logoPath
    : new URL(empresa.logoPath, req.url).toString();

  logoBuffer = await fetchToBuffer(logoUrl);
}

// fallback para um logo padrão que está no /public
if (!logoBuffer) {
  const fallbackUrl = new URL("/logo-nexo.png", req.url).toString();
  logoBuffer = await fetchToBuffer(fallbackUrl);
}

if (logoBuffer) {
  doc.image(logoBuffer, 40, 35, { fit: [200, 100] });
} else {
  doc.fontSize(18).text(empresaNombre, 50, 60);
}

  /*
   * BLOCO "Datos del cliente" / "Datos de la empresa" (multi-idioma)
   */
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("black")
    .text(t.customerData, 40, 130);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("black")
    .text(t.companyData, 350, 130, {
      width: 205,
      align: "right",
    });

  // Cliente (esquerda)
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("black")
    .text(
      `Fecha: ${presupuesto.fecha.toLocaleDateString("es-ES")}`,
      40,
      160
    )
    .text(
      `Cliente: ${presupuesto.cliente?.nombre ?? ""}`,
      40,
      175
    );

  if (presupuesto.cliente?.nif) {
    doc.text(`NIF: ${presupuesto.cliente.nif}`, 40, 190);
  }
  if (presupuesto.cliente?.email) {
    doc.text(`Email: ${presupuesto.cliente.email}`, 40, 205);
  }
  if (presupuesto.cliente?.telefono) {
    doc.text(`Teléfono: ${presupuesto.cliente.telefono}`, 40, 220);
  }
  if (presupuesto.cliente?.direccion) {
    doc.text(`Dirección: ${presupuesto.cliente.direccion}`, 40, 235);
  }

  // Empresa (direita)
  const empresaLines = [
    empresaNombre,
    empresa?.direccion || "",
    `${empresa?.cp ?? ""} ${empresa?.ciudad ?? ""}`.trim(),
    empresa?.provincia || "",
    empresa?.nif ? `NIF: ${empresa.nif}` : "",
    empresa?.telefono ? `Tel: ${empresa.telefono}` : "",
    empresa?.email || "",
    empresa?.web || "",
  ].filter(Boolean);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("black")
    .text(empresaLines.join("\n"), 350, 160, {
      width: 190,
      align: "right",
    });

  /*
   * TABELA DE LÍNEAS
   */
  const tableTop = 260;

  // 🔹 CABEÇALHO DA TABELA DE LÍNEAS: fundo verde + texto branco
  const headerHeight = 20;
  doc.rect(40, tableTop - 4, 515, headerHeight).fill(accentGreen);

  doc.fontSize(10).fillColor("white");
  doc.text(t.tableDescription, 45, tableTop);
  doc.text(t.tableQuantity, 330, tableTop, { width: 40, align: "right" });
  doc.text(t.tableUnitPrice, 380, tableTop, { width: 70, align: "right" });
  doc.text(t.tableTotal, 460, tableTop, { width: 95, align: "right" });


  // linha depois do cabeçalho (cinza claro)
  doc
    .moveTo(40, tableTop + headerHeight)
    .lineTo(555, tableTop + headerHeight)
    .strokeColor("#E5E7EB")
    .stroke();

  // 👇 VOLTA TEXTO PRA PRETO ANTES DAS LINHAS
  doc.fillColor("black");

  let y = tableTop + headerHeight + 8;

  // 🔹 LÍNEAS DO PRESUPUESTO
  presupuesto.lineas.forEach((linea) => {
    const startY = y;

    // monta o texto da descrição para o PDF
    const descTexto = linea.servicio?.nombre
      ? `${linea.servicio.nombre}${
          linea.descripcion ? " – " + linea.descripcion : ""
        }`
      : linea.descripcion;

    // descrição multilinha
    doc.fontSize(9).fillColor("black").text(descTexto, 40, y, {
      width: 270,
      align: "left",
    });

    const descHeight =
      doc.heightOfString(descTexto, { width: 270, align: "left" }) + 4;

    // demais colunas alinhadas na primeira linha da descrição
    doc
      .fontSize(9)
      .fillColor("black")
      .text(String(linea.cantidad), 330, startY, {
        width: 40,
        align: "right",
      })
      .text(linea.precioUnitario.toFixed(2), 380, startY, {
        width: 70,
        align: "right",
      })
      .text(linea.totalLinea.toFixed(2), 460, startY, {
        width: 95,
        align: "right",
      });

    y = startY + descHeight;

    doc.moveTo(40, y).lineTo(555, y).strokeColor("#E5E7EB").stroke();

    y += 5;
  });

  /*
   * RESUMO COM IVA (Base imponible, IVA %, Total)
   */
  const subtotal = presupuesto.subtotal ?? 0;
  const ivaPorcentaje = presupuesto.ivaPorcentaje ?? 0;
  const ivaImporte =
    presupuesto.ivaImporte ?? subtotal * (ivaPorcentaje / 100);
  const total = presupuesto.total ?? subtotal + ivaImporte;

  const summaryTop = y + 10;

  doc
    .fontSize(10)
    .fillColor("black")
    .text(`${t.base}:`, 350, summaryTop, {
      width: 100,
      align: "right",
    })
    .text(`${subtotal.toFixed(2)} €`, 460, summaryTop, {
      width: 95,
      align: "right",
    });

  doc
    .text(`${t.vat} (${ivaPorcentaje.toFixed(2)}%):`, 350, summaryTop + 14, {
      width: 100,
      align: "right",
    })
    .text(`${ivaImporte.toFixed(2)} €`, 460, summaryTop + 14, {
      width: 95,
      align: "right",
    });

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(`${t.totalQuote}:`, 350, summaryTop + 30, {
      width: 100,
      align: "right",
    })
    .text(`${total.toFixed(2)} €`, 460, summaryTop + 30, {
      width: 95,
      align: "right",
    })
    .font("Helvetica");

  /*
   * NOTAS / OBSERVACIONES (multi-idioma)
   */
  if (presupuesto.notas) {
    const notasTop = summaryTop + 60;
    doc
      .fontSize(10)
      .fillColor("black")
      .text(`${t.notes}:`, 40, notasTop)
      .fontSize(9)
      .text(presupuesto.notas, 40, notasTop + 12, {
        width: 515,
      });
  }

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="documento.pdf"`,
  },
});

}
