import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

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
    tableDescription: "Servicio / Descripción",
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
    tableDescription: "Servei / Descripció",
    tableQuantity: "Quant.",
    tableUnitPrice: "Preu unit. (€)",
    tableTotal: "Total (€)",
  },
} as const;

type Idioma = keyof typeof texts;

function formatMoney(value: number, idioma: Idioma) {
  const locale = idioma === "ca" ? "ca-ES" : "es-ES";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number, idioma: Idioma) {
  const locale = idioma === "ca" ? "ca-ES" : "es-ES";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}



export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const facturaId = Number(id);

  if (Number.isNaN(facturaId)) {
    return new NextResponse("ID de factura inválido", { status: 400 });
  }

  // 1️⃣ Busca a factura só pelo ID
  const factura = await prisma.factura.findUnique({
    where: { id: facturaId },
    include: {
      cliente: true,
      lineas: {
        include: { servicio: true },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!factura) {
    return new NextResponse("Factura no encontrada", { status: 404 });
  }

  // 2️⃣ Empresa do mesmo workspace
  const empresa = await prisma.empresaConfig.findUnique({
    where: { workspaceId: factura.workspaceId },
  });

  const idioma: Idioma = empresa?.idioma === "ca" ? "ca" : "es";
  const t = texts[idioma];

  const empresaNombre = empresa?.nombre ?? "Nexo Digital (demo)";
  const empresaNif = empresa?.nif ?? "NIF pendiente";
  const empresaDireccion = empresa?.direccion ?? "";
  const empresaCP = empresa?.cp ?? "";
  const empresaCiudad = empresa?.ciudad ?? "";
  const empresaProvincia = empresa?.provincia ?? "";
  const empresaTelefono = empresa?.telefono ?? "";
  const empresaEmail = empresa?.email ?? "";
  const empresaWeb = empresa?.web ?? "";
  const empresaIban = empresa?.iban ?? "";

  const doc = new PDFDocument({ size: "A4", margin: 40 });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

async function fetchToBuffer(url: string) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}


  // 🎨 cores
  const headerBg = "#ffffff";
  const accentBlue = "#1F6FEB";
  const accentGreen = "#16A34A";
  const black = "#000000";

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
  doc.image(logoBuffer, 20, 15, { fit: [200, 100] });
} else {
  doc.fontSize(18).text(empresaNombre, 50, 60);
}


  doc
    .font("Helvetica-Bold")
    .fillColor(accentGreen)
    .fontSize(16)
    .text(`${t.invoiceTitle} ${factura.numero}`, 200, 68, {
      align: "right",
      width: 345,
    });

  doc.rect(40, 110, 515, 1).fill(accentGreen);
  doc.fillColor("black");

  // 🔹 Bloco empresa + cliente
  let currentY = 120;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(black)
    .text(t.companyData, 40, currentY);

  currentY += 18;

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("black")
    .text(empresaNombre, 40, currentY);

  if (empresaDireccion) {
    doc.text(empresaDireccion, 40, currentY + 12);
  }
  if (empresaCP || empresaCiudad || empresaProvincia) {
    doc.text(
      `${empresaCP} ${empresaCiudad}${
        empresaProvincia ? " (" + empresaProvincia + ")" : ""
      }`,
      40,
      currentY + 24
    );
  }
  doc.text(`NIF: ${empresaNif}`, 40, currentY + 36);
  if (empresaTelefono) {
    doc.text(`Tel: ${empresaTelefono}`, 40, currentY + 48);
  }
  if (empresaEmail) {
    doc.text(`Email: ${empresaEmail}`, 40, currentY + 60);
  }
  if (empresaWeb) {
    doc.text(empresaWeb, 40, currentY + 72);
  }

  const clienteX = 395;
  const cliente = factura.cliente;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(black)
    .text(t.customerData, clienteX, 120);

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("black")
    .text(cliente?.nombre ?? "—", clienteX, 138);

  let yCliente = 150;

  if (cliente?.nif) {
    doc.text(`NIF: ${cliente.nif}`, clienteX, yCliente);
    yCliente += 12;
  }
  if (cliente?.email) {
    doc.text(`Email: ${cliente.email}`, clienteX, yCliente);
    yCliente += 12;
  }
  if (cliente?.telefono) {
    doc.text(`Teléfono: ${cliente.telefono}`, clienteX, yCliente);
    yCliente += 12;
  }
  if (cliente?.direccion) {
    doc.text(`Dirección: ${cliente.direccion}`, clienteX, yCliente);
    yCliente += 12;
  }

  // Info da factura
  currentY = 220;

  doc
    .fontSize(10)
    .fillColor(accentBlue)
    .text(
      `Fecha: ${new Date(factura.fecha).toLocaleDateString("es-ES")}`,
      40,
      currentY
    )
    .text(`Estado: ${factura.estado}`, 40, currentY + 14);

  if (empresaIban) {
    doc.text(`IBAN: ${empresaIban}`, 40, currentY + 28);
  }

  currentY += 40;

  // Cabeçalho tabela
  doc.fillColor(accentGreen).rect(40, currentY, 515, 22).fill();

  doc
    .fillColor("#111827")
    .fontSize(10)
    .text(t.tableDescription, 45, currentY + 6)
    .text(t.tableQuantity, 320, currentY + 6, { width: 40, align: "right" })
    .text(t.tableUnitPrice, 370, currentY + 6, { width: 70, align: "right" })
    .text(t.tableTotal, 460, currentY + 6, { width: 80, align: "right" });

  currentY += 26;

  // Linhas
  factura.lineas.forEach((linea) => {
    const lineHeight = 18;

    const descTexto = linea.servicio?.nombre
      ? `${linea.servicio.nombre}${
          linea.descripcion ? " – " + linea.descripcion : ""
        }`
      : linea.descripcion;

    doc
      .fillColor("black")
      .fontSize(9)
      .text(descTexto, 45, currentY, { width: 260 })
      .text(String(linea.cantidad), 320, currentY, {
        width: 40,
        align: "right",
      })
      .text(linea.precioUnitario.toFixed(2), 370, currentY, {
        width: 70,
        align: "right",
      })
      .text(linea.totalLinea.toFixed(2), 460, currentY, {
        width: 80,
        align: "right",
      });

    currentY += lineHeight;

    doc
      .moveTo(40, currentY - 4)
      .lineTo(555, currentY - 4)
      .strokeColor("#E5E7EB")
      .stroke();
  });

  currentY += 12;

  const subtotal = factura.subtotal ?? factura.total ?? 0;
  const ivaPorcentaje = factura.ivaPorcentaje ?? 0;
  const ivaImporte = factura.ivaImporte ?? 0;
  const totalFactura = factura.total ?? subtotal + ivaImporte;

  doc.rect(350, currentY, 205, 60).fill("#F9FAFB");

  doc
    .fillColor("#374151")
    .fontSize(9)
    .text(`${t.base}:`, 360, currentY + 8);

  doc
    .fontSize(9)
    .fillColor("#111827")
    .text(subtotal.toFixed(2) + " €", 360, currentY + 8, {
      width: 185,
      align: "right",
    });

  doc
    .fillColor("#374151")
    .fontSize(9)
    .text(`${t.vat} (${ivaPorcentaje.toFixed(2)}%):`, 360, currentY + 22);

  doc
    .fontSize(9)
    .fillColor("#111827")
    .text(ivaImporte.toFixed(2) + " €", 360, currentY + 22, {
      width: 185,
      align: "right",
    });

  doc
    .fillColor("#111827")
    .fontSize(10)
    .text(`${t.totalInvoice}:`, 360, currentY + 36);

  doc
    .fontSize(12)
    .fillColor("#111827")
    .text(totalFactura.toFixed(2) + " €", 360, currentY + 36, {
      width: 185,
      align: "right",
    });

  if (factura.notas) {
    const notasTop = currentY + 80;
    doc
      .fontSize(10)
      .fillColor("black")
      .text(`${t.notes}:`, 40, notasTop)
      .fontSize(9)
      .text(factura.notas, 40, notasTop + 12, {
        width: 515,
      });
  }

  doc
    .fillColor("#9CA3AF")
    .fontSize(8)
    .text(
      "Gracias por confiar en nuestros servicios.",
      40,
      780,
      { width: 515, align: "center" }
    );

  doc.end();
  const pdfBuffer = await pdfBufferPromise;

  return new NextResponse(new Uint8Array(pdfBuffer), {
  status: 200,
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="documento.pdf"`,
  },
});

}
