import QRCode from "qrcode";
import { NatalPeserta } from "../../types";

/** Urutkan peserta berdasarkan nomor (numerik, mis. "2" < "10", "001" < "002"). */
export function sortByNomor(list: NatalPeserta[]): NatalPeserta[] {
  return [...list].sort((a, b) =>
    a.nomor.localeCompare(b.nomor, undefined, { numeric: true, sensitivity: "base" })
  );
}

export function formatWaktu(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
  });
}

/** QR code polos (dipakai untuk preview di layar). */
export function buildQrDataUrl(kode: string, size = 320): Promise<string> {
  return QRCode.toDataURL(kode, { width: size, margin: 1, errorCorrectionLevel: "M" });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Membuat kartu undangan berisi barcode (QR) + nama + nomor peserta,
 * dikembalikan sebagai data URL PNG (siap diunduh / dicetak / dikirim via WA).
 */
export async function buildCardDataUrl(p: NatalPeserta): Promise<string> {
  const W = 600;
  const QR = 420;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Hitung tinggi nama terlebih dulu
  ctx.font = "bold 34px Inter, Arial, sans-serif";
  const nameLines = wrapText(ctx, p.nama, W - 80);
  const H = 150 + QR + 40 + nameLines.length * 44 + 90;
  canvas.width = W;
  canvas.height = H;

  // Latar
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Header merah-hijau khas Natal
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, "#b91c1c");
  grad.addColorStop(1, "#15803d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 120);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 34px Inter, Arial, sans-serif";
  ctx.fillText("UNDANGAN NATAL", W / 2, 58);
  ctx.font = "20px Inter, Arial, sans-serif";
  ctx.fillText("GKMI ICHTUS", W / 2, 92);

  // QR code
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, p.kode, { width: QR, margin: 1, errorCorrectionLevel: "M" });
  ctx.drawImage(qrCanvas, (W - QR) / 2, 150, QR, QR);

  // Nama peserta
  let y = 150 + QR + 60;
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 34px Inter, Arial, sans-serif";
  for (const line of nameLines) {
    ctx.fillText(line, W / 2, y);
    y += 44;
  }

  // Nomor peserta
  ctx.fillStyle = "#b91c1c";
  ctx.font = "bold 26px Inter, Arial, sans-serif";
  ctx.fillText(`No. Peserta: ${p.nomor}`, W / 2, y + 8);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "16px monospace";
  ctx.fillText(p.kode, W / 2, y + 44);

  // Bingkai
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function safeFilename(p: NatalPeserta) {
  return `undangan-natal-${p.nomor}-${p.nama}`.replace(/[^a-z0-9-_]+/gi, "_") + ".png";
}

/** Membuka jendela cetak berisi kartu-kartu barcode peserta. */
export async function printCards(list: NatalPeserta[]) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Pop-up diblokir browser. Izinkan pop-up untuk mencetak.");
    return;
  }
  win.document.write("<p style='font-family:sans-serif'>Menyiapkan kartu...</p>");
  const urls = await Promise.all(sortByNomor(list).map(buildCardDataUrl));
  win.document.open();
  win.document.write(`<!doctype html><html><head><title>Cetak Barcode Undangan Natal</title>
<style>
  body{margin:0;padding:12px;font-family:sans-serif}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  img{width:100%;break-inside:avoid;page-break-inside:avoid}
  @media print{body{padding:0}}
</style></head><body><div class="grid">
${urls.map(u => `<img src="${u}"/>`).join("")}
</div><script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body></html>`);
  win.document.close();
}
