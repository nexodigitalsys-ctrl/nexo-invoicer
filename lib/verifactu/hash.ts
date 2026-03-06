import { createHash } from "crypto";

type VerifactuHashInput = {
  idEmisorFactura: string;          // NIF
  numSerieFactura: string;          // Serie+Número (ex: "F-2026-0001")
  fechaExpedicionFactura: string;   // "DD-MM-YYYY" (atenção ao formato)
  tipoFactura: string;              // ex: "F1"
  cuotaTotal: number;               // IVA total (com ponto decimal)
  importeTotal: number;             // Total (com ponto decimal)
  huellaAnterior: string;           // "" se for o primeiro registro
  fechaHoraHusoGenRegistro: string; // ISO com timezone: "2026-02-12T18:20:30+01:00"
};

function to2(num: number): string {
  // A AEAT nos exemplos usa ponto como decimal na string do hash
  // (ex: 12.35). Então aqui garantimos esse formato.
  return num.toFixed(2);
}

export function buildVerifactuInputString(input: VerifactuHashInput): string {
  return [
    `IDEmisorFactura=${input.idEmisorFactura}`,
    `NumSerieFactura=${input.numSerieFactura}`,
    `FechaExpedicionFactura=${input.fechaExpedicionFactura}`,
    `TipoFactura=${input.tipoFactura}`,
    `CuotaTotal=${to2(input.cuotaTotal)}`,
    `ImporteTotal=${to2(input.importeTotal)}`,
    `Huella=${input.huellaAnterior ?? ""}`,
    `FechaHoraHusoGenRegistro=${input.fechaHoraHusoGenRegistro}`,
  ].join("&");
}

export function computeVerifactuHash(inputString: string): string {
  // UTF-8 + SHA-256 + HEX em MAIÚSCULAS (64 chars)
  return createHash("sha256").update(inputString, "utf8").digest("hex").toUpperCase();
}
