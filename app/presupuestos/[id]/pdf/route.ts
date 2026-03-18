import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import PDFDocument from "pdfkit";
import { readFile } from "fs/promises";
import path from "path";

// =====================================
// Textos
// =====================================
const texts = {
  es: {
    title: "PRESUPUESTO",
    customerLabel: "Presupuesto a:",
    tableDescription: "Descripción",
    tableQuantity: "Cantidad",
    tableUnitPrice: "Precio unitario",
    tableTotal: "Total",
    notesTitle: "Observaciones",
    base: "Base imponible:",
    vat: "IVA",
    totalLabel: "TOTAL (EUR):",
  },
  ca: {
    title: "PRESSUPOST",
    customerLabel: "Pressupost a:",
    tableDescription: "Descripció",
    tableQuantity: "Quantitat",
    tableUnitPrice: "Preu unitari",
    tableTotal: "Total",
    notesTitle: "Observacions",
    base: "Base imposable:",
    vat: "IVA",
    totalLabel: "TOTAL (EUR):",
  },
} as const;

type Idioma = keyof typeof texts;

function formatEuro(value: number, idioma: Idioma): string {
  const locale = idioma === "ca" ? "ca-ES" : "es-ES";
  return new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

async function fetchToBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function publicFilePath(assetPath: string) {
  const cleanPath = assetPath.replace(/^\/+/, "");
  return path.join(process.cwd(), "public", cleanPath);
}

async function readPublicAssetToBuffer(assetPath: string): Promise<Buffer | null> {
  try {
    return await readFile(publicFilePath(assetPath));
  } catch {
    return null;
  }
}

async function fileExists(filePath: string) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function registerUnicodePdfFonts(doc: PDFKit.PDFDocument) {
  const regularCandidates = [
    path.join(process.cwd(), "public", "fonts", "arial.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSans-Regular.ttf"),
    path.join("C:\\Windows\\Fonts", "arial.ttf"),
  ];
  const boldCandidates = [
    path.join(process.cwd(), "public", "fonts", "arialbd.ttf"),
    path.join(process.cwd(), "public", "fonts", "NotoSans-Bold.ttf"),
    path.join("C:\\Windows\\Fonts", "arialbd.ttf"),
  ];

  for (const fontPath of regularCandidates) {
    if (await fileExists(fontPath)) {
      doc.registerFont("AppSans", fontPath);
      for (const boldFontPath of boldCandidates) {
        if (await fileExists(boldFontPath)) {
          doc.registerFont("AppSans-Bold", boldFontPath);
          return true;
        }
      }
      doc.registerFont("AppSans-Bold", fontPath);
      return true;
    }
  }
  return false;
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

// =====================================
// Route
// =====================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const presupuestoId = Number(id);

  if (Number.isNaN(presupuestoId)) {
    return new NextResponse("ID de presupuesto inválido", { status: 400 });
  }

  const presupuesto = await prisma.presupuesto.findUnique({
    where: { id: presupuestoId },
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

  const empresa = await prisma.empresaConfig.findUnique({
    where: { workspaceId: presupuesto.workspaceId },
  });

  const idioma: Idioma = empresa?.idioma === "ca" ? "ca" : "es";
  const t = texts[idioma];

  const empresaNombre = empresa?.nombre ?? "Nexo Digital";
  const empresaNif = empresa?.nif ?? "";
  const empresaDireccion = empresa?.direccion ?? "";
  const empresaCP = empresa?.cp ?? "";
  const empresaCiudad = empresa?.ciudad ?? "";
  const empresaProvincia = empresa?.provincia ?? "";
  const empresaTelefono = empresa?.telefono ?? "";
  const empresaEmail = empresa?.email ?? "";
  const empresaWeb = empresa?.web ?? "";

  // PDF
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const hasUnicodeFonts = await registerUnicodePdfFonts(doc);
  const originalFont = doc.font.bind(doc);
  doc.font = ((src: string, ...args: unknown[]) => {
    if (hasUnicodeFonts && src === "Helvetica") {
      return originalFont("AppSans", ...(args as []));
    }
    if (hasUnicodeFonts && src === "Helvetica-Bold") {
      return originalFont("AppSans-Bold", ...(args as []));
    }
    return originalFont(src, ...(args as []));
  }) as typeof doc.font;

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // =========================
  // Layout base
  // =========================
  const pageW = doc.page.width; // ~595
  const pageH = doc.page.height; // ~842
  const margin = 40;
  const x0 = margin;
  const x1 = pageW - margin; // 555
  const contentW = x1 - x0; // 515

  const blue = "#2563EB";
  const blueDark = "#1E40AF";
  const text = "#111827";
  const muted = "#6B7280";
  const border = "#E5E7EB";
  const card = "#F3F4F6";
  const rowAlt = "#F9FAFB";

  // =========================
  // Footer ancorado (SEMPRE pág 1)
  // =========================
  const footerTextY = pageH - 52;        // linha do footer
  const footerTopY = footerTextY - 14;   // “teto” do conteúdo antes do footer

  // =========================
  // Blocos finais ancorados (de baixo pra cima)
  // =========================
  const notesH = 70;
  const totalsW = 220;
  const totalsH = 84;
  const gap = 16;

  const notesY = footerTopY - notesH;               // Observaciones SEMPRE acima do footer
  const totalsY = notesY - gap - totalsH;           // Totais SEMPRE acima das observaciones

  // =========================
  // Logo
  // =========================
  let logoBuffer: Buffer | null = null;

  if (empresa?.logoPath) {
    if (empresa.logoPath.startsWith("data:image/")) {
      logoBuffer = dataUrlToBuffer(empresa.logoPath);
    } else if (empresa.logoPath.startsWith("http")) {
      logoBuffer = await fetchToBuffer(empresa.logoPath);
    } else {
      const localPath = empresa.logoPath.startsWith("/")
        ? empresa.logoPath
        : `/${empresa.logoPath}`;
      logoBuffer = await readPublicAssetToBuffer(localPath);
    }
  }
  if (!logoBuffer) {
    logoBuffer = await readPublicAssetToBuffer("/logo-nexo.png");
  }
  if (!logoBuffer) {
    const fallbackUrl = new URL("/logo-nexo.png", req.url).toString();
    logoBuffer = await fetchToBuffer(fallbackUrl);
  }

  const topY = 10;
  const cardW = 240;
  const cardH = 86;
  const cardX = x1 - cardW;
  const cardY = 25;
  const logoMaxW = 170;
  const logoMaxH = 90;
  const logoX = x0 - 26;
  const logoY = cardY;

  if (logoBuffer) {
    // Maior e com “fit” (sem estourar)
    doc.image(logoBuffer, logoX, logoY, { fit: [logoMaxW, logoMaxH] });
  } else {
    doc.font("Helvetica-Bold").fontSize(26).fillColor(text).text(empresaNombre, x0, topY + 10);
  }

  // =========================
  // Card azul do título (direita)
  // =========================
  doc.roundedRect(cardX, cardY, cardW, cardH, 14).fill(card);
  doc.save();
  doc.roundedRect(cardX, cardY, cardW, 28, 14).fill(blueDark);
  doc.restore();
  doc.rect(cardX, cardY + 14, cardW, 14).fill(blueDark);

  doc.fillColor("white").font("Helvetica-Bold").fontSize(16).text(t.title, cardX + 18, cardY + 10);

  const fechaTxt = formatDateDMY(new Date(presupuesto.fecha));
  doc
    .fillColor(text)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(presupuesto.numero, cardX + 18, cardY + 44);

  doc.fillColor(muted).font("Helvetica").fontSize(10).text(`Fecha: ${fechaTxt}`, cardX + 18, cardY + 62);

  // =========================
  // Blocos Cliente (esq) e Empresa (dir)
  // =========================
  let currentY = 140;

  doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(t.customerLabel, x0, currentY);
  doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(empresaNombre, x0 + 280, currentY);

  currentY += 16;

  // Card cliente (esquerda) — largura menor (não invade empresa)
  const clienteCardX = x0;
  const clienteCardY = currentY;
  const clienteCardW = 260;
  const clienteCardH = 70;

  doc.roundedRect(clienteCardX, clienteCardY, clienteCardW, clienteCardH, 12).fill(card);

  const cliente = presupuesto.cliente;
  const cName = cliente?.nombre ?? "—";
  const cEmail = cliente?.email ?? "";
  const cTel = cliente?.telefono ?? "";
  const cNif = cliente?.nif ?? "";

  doc
    .fillColor(text)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(cName, clienteCardX + 16, clienteCardY + 14, { width: clienteCardW - 32 });

  let cy = clienteCardY + 34;
  doc.fillColor(muted).font("Helvetica").fontSize(9);

  if (cEmail) {
    doc.text(`Email: ${cEmail}`, clienteCardX + 16, cy, { width: clienteCardW - 32 });
    cy += 12;
  }
  if (cTel) {
    doc.text(`Tel: ${cTel}`, clienteCardX + 16, cy, { width: clienteCardW - 32 });
    cy += 12;
  }
  if (cNif) {
    doc.text(`NIF: ${cNif}`, clienteCardX + 16, cy, { width: clienteCardW - 32 });
  }

  // Empresa (direita)
  const empX = x0 + 280;
  const empY = clienteCardY + 10;

  doc.fillColor(muted).font("Helvetica").fontSize(9);
  if (empresaDireccion) doc.text(empresaDireccion, empX, empY);
  if (empresaCP || empresaCiudad || empresaProvincia) {
    doc.text(
      `${empresaCP} ${empresaCiudad}${empresaProvincia ? ", " + empresaProvincia : ""}`,
      empX,
      empY + 12
    );
  }
  if (empresaTelefono) doc.text(`Tel: ${empresaTelefono}`, empX, empY + 24);
  if (empresaEmail) doc.text(empresaEmail, empX, empY + 36);
  if (empresaWeb) doc.text(empresaWeb, empX, empY + 48);
  if (empresaNif) doc.text(`CIF: ${empresaNif}`, empX, empY + 60);

  currentY = clienteCardY + clienteCardH + 28;

  // =========================
  // Tabela — limitar antes do totalsY
  // =========================
  const headerH = 30;

  // Colunas calculadas (cabem sempre)
  const colDescX = x0 + 18;
  const colDescW = 285;

  const colQtyW = 60;
  const colUnitW = 90;
  const colTotalW = 90;

  const colTotalX = x1 - colTotalW;                 // encosta no fim
  const colUnitX = colTotalX - 14 - colUnitW;       // gap 14
  const colQtyX = colUnitX - 14 - colQtyW;          // gap 14


  // Header azul
  doc.roundedRect(x0, currentY, contentW, headerH, 14).fill(blue);

  doc.fillColor("white").font("Helvetica-Bold").fontSize(11).text(t.tableDescription, colDescX, currentY + 9, {
    width: colDescW,
  });

  doc.fillColor("white").font("Helvetica-Bold").fontSize(11).text(t.tableQuantity, colQtyX, currentY + 6, {
    width: colQtyW,
    align: "right",
  });

  doc.fillColor("white").font("Helvetica-Bold").fontSize(11).text(t.tableUnitPrice, colUnitX, currentY + 6, {
    width: colUnitW,
    align: "right",
  });

  doc.fillColor("white").font("Helvetica-Bold").fontSize(11).text(t.tableTotal, colTotalX, currentY + 6, {
    width: colTotalW,
    align: "right",
  });

  currentY += headerH + 10;

  // Limite da tabela: não pode passar do totalsY - gap
  const stopTableY = totalsY - 14;
  const rowH = 42;

  presupuesto.lineas.forEach((linea, idx) => {
    if (currentY + rowH > stopTableY) return;

    if (idx % 2 === 1) doc.rect(x0, currentY, contentW, rowH).fill(rowAlt);

    const servicio = linea.servicio?.nombre ?? "";
    const desc = linea.descripcion ?? "";

    doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(servicio || desc || "—", colDescX, currentY + 10, {
      width: colDescW,
      ellipsis: true,
    });

    if (servicio && desc) {
      doc.fillColor(muted).font("Helvetica").fontSize(9).text(desc, colDescX, currentY + 26, {
        width: colDescW,
        ellipsis: true,
      });
    }

    doc.fillColor(text).font("Helvetica").fontSize(11).text(String(linea.cantidad ?? 0), colQtyX, currentY + 15, {
      width: colQtyW,
      align: "right",
    });

    doc.fillColor(text).font("Helvetica").fontSize(11).text(formatEuro(linea.precioUnitario ?? 0, idioma), colUnitX, currentY + 15, {
      width: colUnitW,
      align: "right",
    });

    doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(formatEuro(linea.totalLinea ?? 0, idioma), colTotalX, currentY + 15, {
      width: colTotalW,
      align: "right",
    });

    doc.moveTo(x0, currentY + rowH).lineTo(x1, currentY + rowH).strokeColor(border).stroke();
    currentY += rowH;
  });

  // =========================
  // Totais (card direita) — alinhado
  // =========================
  const subtotal = presupuesto.subtotal ?? presupuesto.total ?? 0;
  const ivaPct = presupuesto.ivaPorcentaje ?? 0;
  const ivaImporte = presupuesto.ivaImporte ?? 0;
  const total = presupuesto.total ?? subtotal + ivaImporte;

  const totalsX = x1 - totalsW;

  doc.roundedRect(totalsX, totalsY, totalsW, totalsH, 12).fill(card);

  // labels esquerda + valores direita (sempre alinhado)
  doc.fillColor(muted).font("Helvetica").fontSize(9).text(t.base, totalsX + 16, totalsY + 14);
  doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(formatEuro(subtotal, idioma), totalsX + 16, totalsY + 14, {
    width: totalsW - 32,
    align: "right",
  });

  doc.fillColor(muted).font("Helvetica").fontSize(9).text(`${t.vat} (${formatEuro(ivaPct, idioma)}%):`, totalsX + 16, totalsY + 34);
  doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(formatEuro(ivaImporte, idioma), totalsX + 16, totalsY + 34, {
    width: totalsW - 32,
    align: "right",
  });

  doc.moveTo(totalsX + 16, totalsY + 56).lineTo(totalsX + totalsW - 16, totalsY + 56).strokeColor(border).stroke();

  doc.fillColor(muted).font("Helvetica-Bold").fontSize(10).text(t.totalLabel, totalsX + 16, totalsY + 62);
  doc.fillColor(blueDark).font("Helvetica-Bold").fontSize(14).text(formatEuro(total, idioma), totalsX + 16, totalsY + 60, {
    width: totalsW - 32,
    align: "right",
  });

  // =========================
  // Observaciones (full) — SEM banco
  // =========================
  const notesText = presupuesto.notas?.trim() ? presupuesto.notas : "—";
  doc.roundedRect(x0, notesY, contentW, notesH, 12).fill(card);

  doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(t.notesTitle, x0 + 16, notesY + 14);
  doc.fillColor(muted).font("Helvetica").fontSize(9).text(notesText, x0 + 16, notesY + 32, {
    width: contentW - 32,
    height: notesH - 38,
    ellipsis: true,
  });

  // =========================
  // Footer — SEMPRE na página 1
  // =========================
  const footerTextParts: string[] = [];
  footerTextParts.push(empresaNombre);
  if (empresaNif) footerTextParts.push(`CIF: ${empresaNif}`);
  if (empresaDireccion) footerTextParts.push(empresaDireccion);
  if (empresaCP || empresaCiudad) footerTextParts.push(`${empresaCP} ${empresaCiudad}`.trim());
  if (empresaTelefono) footerTextParts.push(`Tel: ${empresaTelefono}`);
  if (empresaWeb) footerTextParts.push(empresaWeb);

  const footerText = footerTextParts.join(" · ");

  doc.fillColor("#9CA3AF").font("Helvetica").fontSize(8).text(footerText, x0, footerTextY, {
    width: contentW,
    align: "center",
  });

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="presupuesto.pdf"`,
    },
  });
}
