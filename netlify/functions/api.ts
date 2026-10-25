import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// ── MongoDB connection (reused across warm invocations) ─────────────────────
let client: MongoClient | null = null;
let dbReady = false;

async function getDb() {
  if (dbReady && client) return client.db();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  dbReady = true;
  return client.db();
}

// ── Auth helpers ─────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "gkmi-secret-key-2026";

function createToken(username: string) {
  return jwt.sign({ admin: true, username }, JWT_SECRET, { expiresIn: "8h" });
}
function validateToken(token: string) {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Token panitia natal tidak boleh dipakai untuk akses admin
    return payload?.role !== "panitia_natal";
  } catch { return false; }
}
function isAuthorized(event: HandlerEvent) {
  const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"] || "";
  return validateToken(token);
}

// ── Panitia Natal auth ───────────────────────────────────────────────────────
function createPanitiaToken(username: string) {
  return jwt.sign({ role: "panitia_natal", username }, JWT_SECRET, { expiresIn: "12h" });
}
function decodePanitiaToken(token: string): { username: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    if (payload?.role === "panitia_natal") return { username: payload.username };
    return null;
  } catch { return null; }
}
function isPanitia(event: HandlerEvent) {
  const token = event.headers["x-panitia-token"] || event.headers["X-Panitia-Token"] || "";
  return !!decodePanitiaToken(token);
}
function randomCode() {
  // Kode unik yang disematkan ke dalam QR/barcode peserta
  return "NTL-" + Math.random().toString(36).slice(2, 8).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}
const stripId = ({ _id, ...rest }: any) => rest;

async function getSheetWebhookUrl(db: any): Promise<string> {
  try {
    const doc = await db.collection("settings").findOne({ key: "natalSheetWebhook" });
    if (doc && typeof doc.value === "string") return doc.value;
  } catch {}
  return process.env.NATAL_SHEET_WEBHOOK_URL || "";
}

async function syncToGoogleSheet(db: any, trigger: string): Promise<{ ok: boolean; message: string }> {
  const url = (await getSheetWebhookUrl(db)).trim();
  if (!url) return { ok: false, message: "URL Webhook Google Spreadsheet belum diatur." };
  try {
    const docs = await db.collection("natalPeserta").find({}).toArray();
    const sorted = docs.map(stripId).sort((a: any, b: any) =>
      String(a.nomor).localeCompare(String(b.nomor), undefined, { numeric: true, sensitivity: "base" })
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trigger,
        updatedAt: new Date().toISOString(),
        total: sorted.length,
        hadir: sorted.filter((p: any) => p.hadir).length,
        peserta: sorted,
      }),
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, message: `Webhook merespons HTTP ${res.status}` };
    return { ok: true, message: "Spreadsheet berhasil diperbarui." };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Gagal menghubungi Google Spreadsheet." };
  }
}

// ── Response helpers ─────────────────────────────────────────────────────────
const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  body: JSON.stringify(body),
});

// ── Router ───────────────────────────────────────────────────────────────────
export const handler: Handler = async (event: HandlerEvent, _ctx: HandlerContext) => {
  // Extract path without the prefix /.netlify/functions/api
  const rawPath = event.path || "/";
  const path = rawPath.replace(/^\/?\.netlify\/functions\/api/, "") || "/";
  const method = event.httpMethod;

  // CORS preflight
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "*", "Access-Control-Allow-Headers": "*" }, body: "" };
  }

  let body: any = {};
  try { body = JSON.parse(event.body || "{}"); } catch {}

  try {
    const db = await getDb();

    // ── Admin auth ────────────────────────────────────────────────────────────
    if (path === "/api/admin/login" && method === "POST") {
      const { username, password } = body;
      if (!username || !password) return json(400, { error: "Username dan password wajib diisi." });

      // Cek di koleksi admins MongoDB
      const adminDoc = await db.collection("admins").findOne({ username });

      if (adminDoc && adminDoc.password === password) {
        return json(200, { token: createToken(username), username });
      }

      // Fallback ke env vars jika tidak ada di MongoDB
      const envUser = process.env.ADMIN_USERNAME || "admin";
      const envPass = process.env.ADMIN_PASSWORD || "gereja2026";
      if (username === envUser && password === envPass) {
        return json(200, { token: createToken(username), username });
      }

      return json(401, { error: "Username atau password salah." });
    }

    if (path === "/api/admin/logout" && method === "POST") {
      return json(200, { success: true });
    }

    if (path === "/api/admin/verify" && method === "GET") {
      const token = event.headers["x-admin-token"] || "";
      if (validateToken(token)) {
        const payload = jwt.decode(token) as any;
        return json(200, { valid: true, username: payload?.username || "admin" });
      }
      return json(200, { valid: false });
    }

    // ── DB Status ─────────────────────────────────────────────────────────────
    if (path === "/api/db-status" && method === "GET") {
      return json(200, { status: "ok", database: "MongoDB Atlas" });
    }

    // ── Worship Sessions ──────────────────────────────────────────────────────
    if (path === "/api/worship-sessions" && method === "GET") {
      const docs = await db.collection("worshipSessions").find({}).toArray();
      return json(200, docs.map(({ _id, ...rest }) => rest));
    }

    if (path === "/api/worship-sessions" && method === "POST") {
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      const { title, time, location } = body;
      if (!title || !time || !location) return json(400, { error: "Semua field wajib diisi." });
      const doc = { id: "session_" + Math.random().toString(36).slice(2, 9), title, time, location };
      await db.collection("worshipSessions").insertOne(doc);
      return json(201, doc);
    }

    const wsMatch = path.match(/^\/api\/worship-sessions\/([^/]+)$/);
    if (wsMatch) {
      const id = wsMatch[1];
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      if (method === "PUT") {
        const { title, time, location } = body;
        await db.collection("worshipSessions").updateOne({ id }, { $set: { title, time, location } });
        return json(200, { id, title, time, location });
      }
      if (method === "DELETE") {
        const result = await db.collection("worshipSessions").deleteOne({ id });
        if (result.deletedCount === 0) return json(404, { error: "Sesi tidak ditemukan." });
        return json(200, { success: true });
      }
    }

    // ── Church Events ─────────────────────────────────────────────────────────
    if (path === "/api/church-events" && method === "GET") {
      const docs = await db.collection("churchEvents").find({}).toArray();
      return json(200, docs.map(({ _id, ...rest }) => rest));
    }

    if (path === "/api/church-events" && method === "POST") {
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      const { title, category, date, fullDate, description, timeRange, location, trainer, image } = body;
      if (!title || !category || !date || !fullDate || !description) return json(400, { error: "Field wajib: title, category, date, fullDate, description." });
      const doc: any = { id: "event_" + Math.random().toString(36).slice(2, 9), title, category, date, fullDate, description };
      if (timeRange) doc.timeRange = timeRange;
      if (location) doc.location = location;
      if (trainer) doc.trainer = trainer;
      if (image) doc.image = image;
      await db.collection("churchEvents").insertOne(doc);
      return json(201, doc);
    }

    const evMatch = path.match(/^\/api\/church-events\/([^/]+)$/);
    if (evMatch) {
      const id = evMatch[1];
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      if (method === "PUT") {
        await db.collection("churchEvents").updateOne({ id }, { $set: { ...body, id } });
        return json(200, { ...body, id });
      }
      if (method === "DELETE") {
        const result = await db.collection("churchEvents").deleteOne({ id });
        if (result.deletedCount === 0) return json(404, { error: "Kegiatan tidak ditemukan." });
        return json(200, { success: true });
      }
    }

    
    // ── Theme Settings ────────────────────────────────────────────────────────
    if (path === "/api/theme" && method === "GET") {
      const doc = await db.collection("settings").findOne({ key: "theme" });
      if (doc) return json(200, doc.value);
      // Return default if not found
      return json(200, {
        primaryColor: "#4f46e5",
        secondaryColor: "#6366f1",
        accentColor: "#fbbf24",
        backgroundColor: "#f8fafc",
        textColor: "#0f172a",
        fontFamily: "Inter",
        weeklyTheme: "Keluarga Kristen yang Menjadi Teladan"
      });
    }

    if (path === "/api/theme" && method === "PUT") {
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      const theme = body;
      await db.collection("settings").updateOne(
        { key: "theme" },
        { $set: { key: "theme", value: theme } },
        { upsert: true }
      );
      return json(200, theme);
    }

    // ── Service Items ─────────────────────────────────────────────────────────

    if (path === "/api/service-items" && method === "GET") {
      const docs = await db.collection("serviceItems").find({}).toArray();
      return json(200, docs.map(({ _id, ...rest }) => rest));
    }

    if (path === "/api/service-items" && method === "POST") {
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      const { title, description, schedule, location, icon } = body;
      if (!title || !description || !schedule || !location) return json(400, { error: "Semua field wajib diisi." });
      const doc = { id: "srv_" + Math.random().toString(36).slice(2, 9), title, description, schedule, location, icon: icon || "Heart" };
      await db.collection("serviceItems").insertOne(doc);
      return json(201, doc);
    }

    const srvMatch = path.match(/^\/api\/service-items\/([^/]+)$/);
    if (srvMatch) {
      const id = srvMatch[1];
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      if (method === "PUT") {
        await db.collection("serviceItems").updateOne({ id }, { $set: { ...body, id } });
        return json(200, { ...body, id });
      }
      if (method === "DELETE") {
        const result = await db.collection("serviceItems").deleteOne({ id });
        if (result.deletedCount === 0) return json(404, { error: "Pelayanan tidak ditemukan." });
        return json(200, { success: true });
      }
    }

    // ── Registrations ─────────────────────────────────────────────────────────
    if (path === "/api/registrations" && method === "GET") {
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      const docs = await db.collection("registrations").find({}).sort({ createdAt: -1 }).toArray();
      return json(200, docs.map(({ _id, ...rest }) => rest));
    }

    if (path === "/api/registrations" && method === "POST") {
      const { name, email, whatsapp, eventId, eventTitle } = body;
      if (!name || !email || !whatsapp || !eventId || !eventTitle) return json(400, { error: "Semua kolom form pendaftaran wajib diisi." });
      const doc = { id: "reg_" + Math.random().toString(36).slice(2, 11), name, email, whatsapp, eventId, eventTitle, createdAt: new Date().toISOString() };
      await db.collection("registrations").insertOne(doc);
      return json(201, doc);
    }

    if (path === "/api/registrations/delete" && method === "POST") {
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      const { id } = body;
      if (!id) return json(400, { error: "ID pendaftaran tidak disediakan." });
      const result = await db.collection("registrations").deleteOne({ id });
      if (result.deletedCount === 0) return json(404, { error: "Pendaftaran tidak ditemukan." });
      return json(200, { success: true });
    }

    // ── Panitia Natal: auth ───────────────────────────────────────────────────
    if (path === "/api/panitia/login" && method === "POST") {
      const { username, password } = body;
      if (!username || !password) return json(400, { error: "Username dan password wajib diisi." });

      const doc = await db.collection("panitiaAccounts").findOne({ username });
      if (doc && doc.password === password) {
        return json(200, { token: createPanitiaToken(username), username });
      }
      const envUser = process.env.PANITIA_USERNAME || "panitia";
      const envPass = process.env.PANITIA_PASSWORD || "natal2026";
      if (username === envUser && password === envPass) {
        return json(200, { token: createPanitiaToken(username), username });
      }
      return json(401, { error: "Username atau password salah." });
    }

    if (path === "/api/panitia/verify" && method === "GET") {
      const token = event.headers["x-panitia-token"] || "";
      const p = decodePanitiaToken(token);
      return json(200, p ? { valid: true, username: p.username } : { valid: false });
    }

    // ── Panitia Natal: peserta undangan ───────────────────────────────────────
    if (path === "/api/natal/peserta" && method === "GET") {
      if (!isPanitia(event)) return json(401, { error: "Unauthorized" });
      const docs = await db.collection("natalPeserta").find({}).toArray();
      return json(200, docs.map(stripId));
    }

    if (path === "/api/natal/peserta" && method === "POST") {
      if (!isPanitia(event)) return json(401, { error: "Unauthorized" });
      const nama = String(body.nama || "").trim();
      const nomor = String(body.nomor || "").trim();
      if (!nama || !nomor) return json(400, { error: "Nama dan nomor peserta wajib diisi." });
      const dup = await db.collection("natalPeserta").findOne({ nomor });
      if (dup) return json(409, { error: `Nomor peserta ${nomor} sudah dipakai oleh ${dup.nama}.` });
      const doc = {
        id: "ntl_" + Math.random().toString(36).slice(2, 11),
        nama, nomor,
        kode: randomCode(),
        hadir: false,
        waktuHadir: null as string | null,
        createdAt: new Date().toISOString(),
      };
      await db.collection("natalPeserta").insertOne({ ...doc });
      await syncToGoogleSheet(db, "add").catch(() => {});
      return json(201, doc);
    }

    if (path === "/api/natal/checkin" && method === "POST") {
      if (!isPanitia(event)) return json(401, { error: "Unauthorized" });
      const kode = String(body.kode || "").trim();
      if (!kode) return json(400, { error: "Kode tidak terbaca." });
      const col = db.collection("natalPeserta");
      const peserta = await col.findOne({ kode });
      if (!peserta) return json(404, { error: "Barcode tidak terdaftar sebagai peserta undangan." });
      if (peserta.hadir) {
        return json(200, { status: "already", peserta: stripId(peserta) });
      }
      const waktuHadir = new Date().toISOString();
      await col.updateOne({ kode }, { $set: { hadir: true, waktuHadir } });
      await syncToGoogleSheet(db, "checkin").catch(() => {});
      return json(200, { status: "ok", peserta: { ...stripId(peserta), hadir: true, waktuHadir } });
    }

    if (path === "/api/natal/sheet-config" && method === "GET") {
      if (!isPanitia(event)) return json(401, { error: "Unauthorized" });
      return json(200, { webhookUrl: await getSheetWebhookUrl(db) });
    }

    if (path === "/api/natal/sheet-config" && method === "PUT") {
      if (!isPanitia(event)) return json(401, { error: "Unauthorized" });
      const webhookUrl = String(body.webhookUrl || "").trim();
      await db.collection("settings").updateOne(
        { key: "natalSheetWebhook" },
        { $set: { key: "natalSheetWebhook", value: webhookUrl } },
        { upsert: true }
      );
      const sync = webhookUrl
        ? await syncToGoogleSheet(db, "config")
        : { ok: true, message: "Sinkronisasi spreadsheet dinonaktifkan." };
      return json(200, { webhookUrl, sync });
    }

    if (path === "/api/natal/sheet-sync" && method === "POST") {
      if (!isPanitia(event)) return json(401, { error: "Unauthorized" });
      const sync = await syncToGoogleSheet(db, "manual");
      if (!sync.ok) return json(400, { error: sync.message });
      return json(200, sync);
    }

    const ntlMatch = path.match(/^\/api\/natal\/peserta\/([^/]+)$/);
    if (ntlMatch) {
      const id = ntlMatch[1];
      if (!isPanitia(event)) return json(401, { error: "Unauthorized" });
      const col = db.collection("natalPeserta");
      if (method === "PUT") {
        const update: any = {};
        if (body.nama !== undefined) update.nama = String(body.nama).trim();
        if (body.nomor !== undefined) {
          update.nomor = String(body.nomor).trim();
          const dup = await col.findOne({ nomor: update.nomor, id: { $ne: id } });
          if (dup) return json(409, { error: `Nomor peserta ${update.nomor} sudah dipakai oleh ${dup.nama}.` });
        }
        if (body.hadir !== undefined) {
          update.hadir = !!body.hadir;
          update.waktuHadir = update.hadir ? new Date().toISOString() : null;
        }
        if (update.nama === "" || update.nomor === "") return json(400, { error: "Nama dan nomor peserta wajib diisi." });
        const result = await col.findOneAndUpdate({ id }, { $set: update }, { returnDocument: "after" });
        if (!result) return json(404, { error: "Peserta tidak ditemukan." });
        await syncToGoogleSheet(db, "update").catch(() => {});
        return json(200, stripId(result));
      }
      if (method === "DELETE") {
        const result = await col.deleteOne({ id });
        if (result.deletedCount === 0) return json(404, { error: "Peserta tidak ditemukan." });
        await syncToGoogleSheet(db, "delete").catch(() => {});
        return json(200, { success: true });
      }
    }

    // ── Image Upload ──────────────────────────────────────────────────────────
    if (path === "/api/upload" && method === "POST") {
      if (!isAuthorized(event)) return json(401, { error: "Unauthorized" });
      if (!event.body) return json(400, { error: "Tidak ada file" });
      // body is already base64-encoded by API Gateway when isBase64Encoded=true
      const buf = event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : Buffer.from(event.body);
      const mime = (event.headers["content-type"] || "image/jpeg").split(";")[0].trim();
      const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
      return json(200, { url: dataUri });
    }

    return json(404, { error: "Endpoint tidak ditemukan." });
  } catch (err: any) {
    console.error("[API Error]", err);
    return json(500, { error: "Internal server error", detail: err?.message });
  }
};
