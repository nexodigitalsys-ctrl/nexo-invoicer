import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";

import PDFDocument from "pdfkit";
import QRCode from "qrcode";

import {
  buildVerifactuInputString,
  computeVerifactuHash,
} from "@/lib/verifactu/hash";
import { calcularTotalesDocumento } from "@/lib/totals";

// =========================
// Helpers
// =========================
const texts = {
  es: {
    invoiceTitle: "FACTURA",
    customerLabel: "Factura a:",
    companyLabel: "Datos de la empresa",
    notes: "Observaciones",
    tableDescription: "Descripción",
    tableQuantity: "Cantidad",
    tableUnitPrice: "Precio unitario",
    tableTotal: "Total",
    base: "Base imponible:",
    subtotal: "Subtotal:",
    discount: "Descuento:",
    vat: "IVA",
    totalEur: "TOTAL (EUR):",
    payTitle: "Por favor realizar el pago a la siguiente cuenta bancaria:",
    accountHolder: "Titular:",
    bank: "Banco:",
    iban: "IBAN:",
    bic: "BIC/SWIFT:",
    thanksSmall: "Gracias por su confianza",
    huella: "Huella:Veri*factu (AEAT):",

  },
  ca: {
    invoiceTitle: "FACTURA",
    customerLabel: "Factura a:",
    companyLabel: "Dades de l'empresa",
    notes: "Observacions",
    tableDescription: "Descripció",
    tableQuantity: "Quantitat",
    tableUnitPrice: "Preu unitari",
    tableTotal: "Total",
    base: "Base imposable:",
    subtotal: "Subtotal:",
    discount: "Descompte:",
    vat: "IVA",
    totalEur: "TOTAL (EUR):",
    payTitle: "Si us plau, realitzeu el pagament al següent compte bancari:",
    accountHolder: "Titular:",
    bank: "Banc:",
    iban: "IBAN:",
    bic: "BIC/SWIFT:",
    thanksSmall: "Gràcies per la seva confiança",
    huella: "Empremta:",
  },
} as const;

type Idioma = keyof typeof texts;

function formatEuro(amount: number, idioma: Idioma) {
  const locale = idioma === "ca" ? "ca-ES" : "es-ES";
  return new Intl.NumberFormat(locale, {
    useGrouping: true,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDiscountLabel(
  baseLabel: string,
  descuentoPorcentaje: number,
  descuentoImporte: number,
  idioma: Idioma
) {
  const parts = [
    descuentoPorcentaje > 0 ? `${formatEuro(descuentoPorcentaje, idioma)}%` : "",
    descuentoImporte > 0 ? `${formatEuro(descuentoImporte, idioma)} EUR` : "",
  ].filter(Boolean);

  if (parts.length === 0) return baseLabel;
  return `${baseLabel.replace(/:$/, "")} (${parts.join(" + ")}):`;
}

function formatDateDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}

async function fetchToBuffer(url: string) {
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

async function readPublicAssetToBuffer(assetPath: string) {
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

function compactLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

// =========================
// Route
// =========================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const facturaId = Number(id);

  if (Number.isNaN(facturaId)) {
    return new NextResponse("ID de factura inválido", { status: 400 });
  }

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

  const empresa = await prisma.empresaConfig.findUnique({
    where: { workspaceId: factura.workspaceId },
  });

  const idioma: Idioma = empresa?.idioma === "ca" ? "ca" : "es";
  const t = texts[idioma];

  const empresaNombre = empresa?.nombre ?? "Nexo Digital";
  const empresaNif = empresa?.nif ?? "NIF pendiente";
  const empresaDireccion = empresa?.direccion ?? "";
  const empresaCP = empresa?.cp ?? "";
  const empresaCiudad = empresa?.ciudad ?? "";
  const empresaProvincia = empresa?.provincia ?? "";
  const empresaTelefono = empresa?.telefono ?? "";
  const empresaEmail = empresa?.email ?? "";
  const empresaWeb = empresa?.web ?? "";
  const empresaIban = empresa?.iban ?? "";

  // Não existe no schema -> fallback seguro
  const empresaTitular = empresaNombre;
  const empresaBanco = ""; // se você criar no schema depois, conecta aqui
  const empresaBic = ""; // se você criar no schema depois, conecta aqui

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
  doc.on("data", (c: Buffer) => chunks.push(c));
  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // =========================
  // Layout base (A4)
  // =========================
  const pageW = doc.page.width; // ~595
  const pageH = doc.page.height; // ~842
  const margin = 40;
  const x0 = margin;
  const x1 = pageW - margin; // 555
  const contentW = x1 - x0; // 515

  // Cores (igual print 2)
  const blue = "#2563EB";
  const blueDark = "#1E40AF";
  const text = "#111827";
  const muted = "#6B7280";
  const border = "#E5E7EB";
  const card = "#F3F4F6";
  const rowAlt = "#F9FAFB";
  const white = "#FFFFFF";

  // =========================
  // Logo (topo esquerdo grande)
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
  const boxW = 240;
  const boxH = 86;
  const boxX = x1 - boxW;
  const boxY = 25;
  const logoMaxW = 170;
  const logoMaxH = 90;
  const logoX = x0 - 26;
  const logoY = boxY;

  if (logoBuffer) {
    // Maior e com “fit” (sem estourar)
    doc.image(logoBuffer, logoX, logoY, { fit: [logoMaxW, logoMaxH] });
  } else {
    doc.font("Helvetica-Bold").fontSize(26).fillColor(text).text(empresaNombre, x0, topY + 10);
  }

  // =========================
  // Card FACTURA (topo direito)
  // =========================
  // caixa clara
  doc.roundedRect(boxX, boxY, boxW, boxH, 12).fill("#EEF2FF");
  // faixa azul (simula gradient)
  doc.roundedRect(boxX, boxY, boxW, 34, 12).fill(blueDark);
  doc.rect(boxX, boxY + 18, boxW, 16).fill(blue);

  doc
    .fillColor(white)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(t.invoiceTitle, boxX + 18, boxY + 10);

  doc
    .fillColor(text)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(factura.numero, boxX + 18, boxY + 44);

  const facturaFecha = factura.fecha ?? factura.createdAt ?? new Date();
  doc
    .fillColor(muted)
    .font("Helvetica")
    .fontSize(10)
    .text(
      `Fecha: ${new Date(facturaFecha).toLocaleDateString("es-ES")}`,
      boxX + 18,
      boxY + 62
    );

  // =========================
  // Cliente + Empresa (meio)
  // =========================
  let currentY = topY + 120;

  // Labels
  doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(t.customerLabel, x0, currentY);

  // Card cliente (esquerda)
  const clientCardX = x0;
  const clientCardY = currentY + 16;
  const clientCardW = 280; // reduzido p/ não invadir empresa
  const clientCardH = 108;

  doc.roundedRect(clientCardX, clientCardY, clientCardW, clientCardH, 12).fill(card);

  const cliente = factura.cliente;
  const clienteDireccion = compactLine(cliente?.direccion ?? "");
  const clienteCityLine = compactLine(`${cliente?.cp ?? ""} ${cliente?.ciudad ?? ""}`);
  const clienteLines = [
    cliente?.nif ? `NIF: ${cliente.nif}` : "",
    clienteDireccion,
    clienteCityLine,
    cliente?.telefono ? `Tel: ${cliente.telefono}` : "",
    cliente?.email ? `Email: ${cliente.email}` : "",
  ].filter(Boolean);
  let cy = clientCardY + 14;

  doc.fillColor(text).font("Helvetica-Bold").fontSize(12).text(cliente?.nombre ?? "—", clientCardX + 16, cy);
  cy += 18;

  doc.fillColor(muted).font("Helvetica").fontSize(10);
  for (const line of clienteLines) {
    const lineHeight = doc.heightOfString(line, { width: clientCardW - 32 });
    doc.text(line, clientCardX + 16, cy, { width: clientCardW - 32 });
    cy += Math.max(14, lineHeight + 2);
  }

  // Empresa (direita) - sem card
  const companyX = x0 + 320;
  const companyY = currentY + 23;
  const companyW = x1 - companyX;
  const cityLine = compactLine(
    `${empresaCP} ${empresaCiudad}${empresaProvincia ? ", " + empresaProvincia : ""}`
  );
  const empresaLines = [
    empresaNif ? `NIF: ${empresaNif}` : "",
    compactLine(empresaDireccion),
    cityLine,
    empresaTelefono ? `Tel: ${empresaTelefono}` : "",
    empresaEmail ? `Email: ${empresaEmail}` : "",
    empresaWeb,
  ].filter(Boolean);

  doc.fillColor(text).font("Helvetica-Bold").fontSize(14).text(empresaNombre, companyX, companyY);
  let ey = companyY + 22;

  doc.fillColor(muted).font("Helvetica").fontSize(10);
  for (const line of empresaLines) {
    const lineHeight = doc.heightOfString(line, { width: companyW });
    doc.text(line, companyX, ey, { width: companyW });
    ey += Math.max(14, lineHeight + 2);
  }

  currentY = clientCardY + clientCardH + 26;

  // =========================
  // Tabela (colunas do print 2)
  // =========================
  // >>> AQUI está o “cálculo certo”:
  // - total sempre termina em x1
  // - widths fixas
  const colDescX = x0 + 18;

  const colQtyW = 60;
  const colUnitW = 90;
  const colTotalW = 90;

  const colTotalX = x1 - colTotalW;                 // encosta no fim
  const colUnitX = colTotalX - 14 - colUnitW;       // gap 14
  const colQtyX = colUnitX - 14 - colQtyW;          // gap 14

  const colDescW = colQtyX - colDescX - 12; // nunca invade a coluna "Cantidad"

  // Header compacto (logo + caixa FACTURA + número + fecha), desenhado no topo
  // de toda página NOVA (2+). A página 1 mantém o header grande + bloco
  // "Factura a:" (dados das duas partes), que não se repete nas demais páginas.
  const facturaNumero = factura.numero; // capturado fora do closure (TS não estreita `factura` dentro de função aninhada)

  function drawCompactHeader(): number {
    const y = margin;
    const logoH = logoMaxH;

    if (logoBuffer) {
      doc.image(logoBuffer, x0, y, { fit: [logoMaxW, logoH] });
    } else {
      doc.font("Helvetica-Bold").fontSize(13).fillColor(text).text(empresaNombre, x0, y);
    }

    // Caixa FACTURA (direita)
    const boxWc = 200, boxHc = 70, boxXc = x1 - boxWc, boxYc = y;
    doc.roundedRect(boxXc, boxYc, boxWc, boxHc, 10).fill("#EEF2FF");
    doc.roundedRect(boxXc, boxYc, boxWc, 28, 10).fill(blueDark);
    doc.rect(boxXc, boxYc + 14, boxWc, 14).fill(blue);
    doc.fillColor(white).font("Helvetica-Bold").fontSize(13).text(t.invoiceTitle, boxXc + 12, boxYc + 7);
    doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(facturaNumero, boxXc + 12, boxYc + 36);
    doc.fillColor(muted).font("Helvetica").fontSize(9).text(
      `Fecha: ${new Date(facturaFecha).toLocaleDateString("es-ES")}`,
      boxXc + 12, boxYc + 52
    );

    const lineY = y + logoH + 14;
    doc.moveTo(x0, lineY).lineTo(x1, lineY).strokeColor(border).stroke();
    let cy2 = lineY + 10;

    // Bloco "Factura a:" — cliente (esquerda) + empresa (direita)
    doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(t.customerLabel, x0, cy2);
    cy2 += 12;
    const cardW2 = (contentW - 16) / 2;
    const cardH2 = 80;

    // card cliente
    doc.roundedRect(x0, cy2, cardW2, cardH2, 10).fill(card);
    doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(cliente?.nombre ?? "—", x0 + 12, cy2 + 10, { width: cardW2 - 24 });
    const clientLines2 = [
      cliente?.nif ? `NIF: ${cliente.nif}` : null,
      cliente?.direccion ?? null,
      cliente?.cp && cliente?.ciudad ? `${cliente.cp} ${cliente.ciudad}` : null,
      cliente?.telefono ? `Tel: ${cliente.telefono}` : null,
      cliente?.email ?? null,
    ].filter(Boolean) as string[];
    let cly2 = cy2 + 24;
    for (const line of clientLines2) {
      doc.fillColor(muted).font("Helvetica").fontSize(8).text(line, x0 + 12, cly2, { width: cardW2 - 24 });
      cly2 += 11;
    }

    // card empresa
    const empX2 = x0 + cardW2 + 16;
    doc.roundedRect(empX2, cy2, cardW2, cardH2, 10).fill(card);
    doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(empresaNombre, empX2 + 12, cy2 + 10, { width: cardW2 - 24 });
    const empLines2 = [
      empresa?.nif ? `CIF: ${empresa.nif}` : null,
      empresa?.direccion ?? null,
      empresa?.cp && empresa?.ciudad ? `${empresa.cp} ${empresa.ciudad}` : null,
      empresa?.telefono ? `Tel: ${empresa.telefono}` : null,
      empresa?.email ?? null,
    ].filter(Boolean) as string[];
    let ely2 = cy2 + 24;
    for (const line of empLines2) {
      doc.fillColor(muted).font("Helvetica").fontSize(8).text(line, empX2 + 12, ely2, { width: cardW2 - 24 });
      ely2 += 11;
    }

    return cy2 + cardH2 + 14;
  }
  // Header azul arredondado (desenhado no topo da tabela e repetido em toda página nova)
  const headerH = 30;
  function drawItemsHeader(y: number): number {
    doc.roundedRect(x0, y, contentW, headerH, 14).fill(blue);

    doc.fillColor(white).font("Helvetica-Bold").fontSize(11);
    doc.text(t.tableDescription, colDescX, y + 9, { width: colDescW });

    // “Cantidad” pode quebrar em 2 linhas, igual print
    doc.text(t.tableQuantity, colQtyX, y + 6, { width: colQtyW, align: "center" });
    doc.text(t.tableUnitPrice, colUnitX, y + 6, { width: colUnitW, align: "center" });
    doc.text(t.tableTotal, colTotalX, y + 6, { width: colTotalW, align: "center" });

    return y + headerH + 10;
  }

  currentY = drawItemsHeader(currentY);

  // Reserva usada para decidir se o bloco final (totais/pago/Verifactu/footer)
  // cabe na página atual ou precisa ir para a próxima.
  const footerH = 34;
  const huellaH = 12;
  const payCardH = 120;
  const notesCardH = factura.notas ? 80 : 0;
  const totalsH = 138;
  const bottomReserve = footerH + huellaH + payCardH + notesCardH + totalsH + 24;

  const ROW_MIN = 44; // altura de uma linha de 1 linha de descrição (visual idêntico ao anterior)
  const ROW_PADDING_TOP = 10;
  const ROW_PADDING_BOTTOM = 10;
  const ROW_TITLE_SUBTITLE_GAP = 6;
  const itemsMaxY = pageH - margin; // limite de uma página de itens

  for (let idx = 0; idx < factura.lineas.length; idx++) {
    const linea = factura.lineas[idx];

    const servicio = linea.servicio?.nombre ?? "";
    const descRaw = (linea.descripcion ?? "").trim();
    const desc =
      descRaw && descRaw !== "Descripción."
        ? descRaw
        : linea.servicio?.descripcion ?? "";

    const titleText = servicio || desc || "—";
    const showSubtitle = Boolean(servicio && desc);

    // Mede a altura real do bloco de descrição com a MESMA fonte/tamanho/largura
    // que serão usados no desenho, para que a medida bata com o render.
    doc.font("Helvetica-Bold").fontSize(11);
    const titleH = doc.heightOfString(titleText, { width: colDescW });

    let subtitleH = 0;
    if (showSubtitle) {
      doc.font("Helvetica").fontSize(9);
      subtitleH = doc.heightOfString(desc, { width: colDescW });
    }

    const descBlockH =
      titleH + (showSubtitle ? ROW_TITLE_SUBTITLE_GAP + subtitleH : 0);
    const rowH = Math.max(
      ROW_MIN,
      descBlockH + ROW_PADDING_TOP + ROW_PADDING_BOTTOM
    );

    if (currentY + rowH > itemsMaxY) {
      doc.addPage();
      currentY = drawItemsHeader(drawCompactHeader());
    }

    // alternado
    if (idx % 2 === 1) doc.rect(x0, currentY, contentW, rowH).fill(rowAlt);

    // descrição (altura dinâmica, cresce com o conteúdo)
    doc.fillColor(text).font("Helvetica-Bold").fontSize(11);
    doc.text(titleText, colDescX, currentY + ROW_PADDING_TOP, {
      width: colDescW,
    });

    if (showSubtitle) {
      doc.fillColor(muted).font("Helvetica").fontSize(9);
      doc.text(
        desc,
        colDescX,
        currentY + ROW_PADDING_TOP + titleH + ROW_TITLE_SUBTITLE_GAP,
        { width: colDescW }
      );
    }

    // qty / unit / total alinhados no topo da linha (mesmo padding da descrição)
    doc.fillColor(text).font("Helvetica").fontSize(11);
    doc.text(String(linea.cantidad ?? 0), colQtyX, currentY + ROW_PADDING_TOP, {
      width: colQtyW,
      align: "center",
    });

    doc.text(
      formatEuro(linea.precioUnitario ?? 0, idioma),
      colUnitX,
      currentY + ROW_PADDING_TOP,
      { width: colUnitW, align: "right" }
    );

    doc.font("Helvetica-Bold");
    doc.text(
      formatEuro(linea.totalLinea ?? 0, idioma),
      colTotalX,
      currentY + ROW_PADDING_TOP,
      { width: colTotalW, align: "right" }
    );

    // separador
    doc.moveTo(x0, currentY + rowH).lineTo(x1, currentY + rowH).strokeColor(border).stroke();

    currentY += rowH;
  }

  currentY += 10;

  // Bloco final (totais/notas/pago/Verifactu/footer) sempre ancorado no rodapé,
  // na MESMA posição vertical, independente de quantos itens couberam na página.
  const blockStartY = pageH - bottomReserve;

  if (currentY > blockStartY) {
    // Itens da página atual invadiriam a zona do bloco final -> bloco vai pra
    // página nova, só com o header compacto (sem cabeçalho de colunas, já que
    // essa página não tem itens).
    doc.addPage();
    drawCompactHeader();
  }

  currentY = blockStartY;

  // =========================
  // Totales (caixa direita)
  // =========================
  const subtotal = factura.subtotal ?? factura.total ?? 0;
  const ivaPorcentaje = factura.ivaPorcentaje ?? 0;
  const totalesFactura = calcularTotalesDocumento({
    subtotal,
    ivaPorcentaje,
    descuentoPorcentaje: factura.descuentoPorcentaje ?? 0,
    descuentoImporte: factura.descuentoImporte ?? 0,
  });
  const descuentoLabel = formatDiscountLabel(
    t.discount,
    factura.descuentoPorcentaje ?? 0,
    factura.descuentoImporte ?? 0,
    idioma
  );
  const ivaImporte = factura.ivaImporte ?? totalesFactura.ivaImporte;
  const totalFactura = factura.total ?? totalesFactura.total;

  const totalsW = 240;
  const totalsX = x1 - totalsW;
  const totalsY = currentY;

  doc.roundedRect(totalsX, totalsY, totalsW, 124, 12).fill(card);

  doc.fillColor(muted).font("Helvetica").fontSize(10);
  doc.text(t.subtotal, totalsX + 16, totalsY + 14);
  doc.text(descuentoLabel, totalsX + 16, totalsY + 34, { width: totalsW - 104 });
  doc.text(t.base, totalsX + 16, totalsY + 54);
  doc.text(`${t.vat} (${formatEuro(ivaPorcentaje, idioma)}%):`, totalsX + 16, totalsY + 74);

  doc.fillColor(text).font("Helvetica-Bold").fontSize(10);
  doc.text(formatEuro(subtotal, idioma), totalsX, totalsY + 14, { width: totalsW - 16, align: "right" });
  doc.text(`-${formatEuro(totalesFactura.descuentoTotal, idioma)}`, totalsX, totalsY + 34, { width: totalsW - 16, align: "right" });
  doc.text(formatEuro(totalesFactura.baseImponible, idioma), totalsX, totalsY + 54, { width: totalsW - 16, align: "right" });
  doc.text(formatEuro(ivaImporte, idioma), totalsX, totalsY + 74, { width: totalsW - 16, align: "right" });

  doc.moveTo(totalsX + 16, totalsY + 96).lineTo(totalsX + totalsW - 16, totalsY + 96).strokeColor(border).stroke();

  doc.fillColor(muted).font("Helvetica-Bold").fontSize(11).text(t.totalEur, totalsX + 16, totalsY + 104);
  doc.fillColor(blue).font("Helvetica-Bold").fontSize(14).text(formatEuro(totalFactura, idioma), totalsX, totalsY + 102, {
    width: totalsW - 16,
    align: "right",
  });

  currentY = totalsY + 142;

  // =========================
  // Observaciones (se existir)
  // =========================
  if (factura.notas) {
    const notesX = x0;
    const notesY = currentY;
    const notesW = contentW;

    doc.roundedRect(notesX, notesY, notesW, 70, 12).fill(card);
    doc.fillColor(text).font("Helvetica-Bold").fontSize(11).text(t.notes, notesX + 16, notesY + 14);
    doc.fillColor(muted).font("Helvetica").fontSize(10).text(factura.notas, notesX + 16, notesY + 34, {
      width: notesW - 32,
      height: 30,
      ellipsis: true,
    });

    currentY = notesY + 86;
  }

  // =========================
  // VERIFACTU (HASH + QR) + Pago card
  // =========================
  const fechaDMY = formatDateDMY(new Date(facturaFecha));
  const prevHash = "";

  const inputStr = buildVerifactuInputString({
    idEmisorFactura: empresaNif,
    numSerieFactura: factura.numero,
    fechaExpedicionFactura: fechaDMY,
    tipoFactura: "F1",
    cuotaTotal: ivaImporte,
    importeTotal: totalFactura,
    huellaAnterior: prevHash,
    fechaHoraHusoGenRegistro: new Date().toISOString(),
  });

  const vfHash = computeVerifactuHash(inputStr);
  const vfQrPayload = `HASH=${vfHash}&NIF=${empresaNif}&NUM=${factura.numero}`;

  const qrPngBuffer = await QRCode.toBuffer(vfQrPayload, {
    type: "png",
    margin: 1,
    width: 220,
  });

  // Card de pago (igual print 2)
  const payX = x0;
  const payW = contentW;
  const payH2 = 110;

  // posiciona sempre acima do rodapé (sem estourar)
  const footerY = pageH - 55;
  const maxPayY = footerY - footerH - huellaH - payH2 + 22; // <-- aumenta aqui
  const payY = Math.min(currentY + 22, maxPayY);


  doc.roundedRect(payX, payY, payW, payH2, 12).fill(card);

  doc.fillColor(muted).font("Helvetica").fontSize(10).text(t.payTitle, payX + 16, payY + 14, {
    width: payW - 150,
  });

  // linhas bancárias (esquerda)
  const leftW = payW - 150;
  const lineGap = 16;
  let ly = payY + 42;

  doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(t.accountHolder, payX + 16, ly);
  doc.fillColor(muted).font("Helvetica").fontSize(10).text(empresaTitular, payX + 90, ly, { width: leftW - 90 });
  ly += lineGap;

  if (empresaBanco) {
    doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(t.bank, payX + 16, ly);
    doc.fillColor(muted).font("Helvetica").fontSize(10).text(empresaBanco, payX + 90, ly, { width: leftW - 90 });
    ly += lineGap;
  }

  if (empresaIban) {
    doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(t.iban, payX + 16, ly);
    doc.fillColor(muted).font("Helvetica").fontSize(10).text(empresaIban, payX + 90, ly, { width: leftW - 90 });
    ly += lineGap;
  }

  if (empresaBic) {
    doc.fillColor(text).font("Helvetica-Bold").fontSize(10).text(t.bic, payX + 16, ly);
    doc.fillColor(muted).font("Helvetica").fontSize(10).text(empresaBic, payX + 90, ly, { width: leftW - 90 });
  }

  // QR (direita) sem sobrepor texto
  const qrSize = 88;
  const qrX = x1 - qrSize;
  const qrY = payY + 18;
  doc.image(qrPngBuffer, qrX, qrY, { width: qrSize });

  // “Gracias…” pequeno e fora do QR (embaixo do card, não dentro)
  const huellaY = payY + payH2 + 8;
  doc.fillColor(muted).font("Helvetica").fontSize(7).text(`${t.huella} ${vfHash}`, x0, huellaY, {
    width: contentW,
     align: "center",
  });

  // =========================
  // Footer (centrado, 1 página)
  // =========================
  const footerText = [
    empresaNombre,
    empresaNif ? `CIF: ${empresaNif}` : "",
    empresaDireccion ? empresaDireccion : "",
    `${empresaCP} ${empresaCiudad}`.trim(),
    empresaTelefono ? `Tel: ${empresaTelefono}` : "",
    empresaWeb ? empresaWeb : "",
  ]
    .filter(Boolean)
    .join(" · ");

  doc.fillColor("#9CA3AF").font("Helvetica").fontSize(9).text(footerText, x0, footerY, {
    width: contentW,
    align: "center",
  });

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

