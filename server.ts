import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { MongoClient } from "mongodb";
import multer from "multer";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let isMongo = false;
let mongoClient: MongoClient | null = null;
let mongoDb: any = null;

const DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_DB_PATH = path.join(DATA_DIR, "db.json");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

// Ensure directories exist (Only in local dev mode)
if (process.env.NETLIFY_DEV === "true" || process.env.NODE_ENV !== "production") {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ============================================================
// ADMIN AUTH CONFIG
// ============================================================
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "gereja2026";

// In-memory session store: token -> { username, expiresAt }
const JWT_SECRET = process.env.JWT_SECRET || "gkmi-secret-key-2026";
function createToken(): string {
  return jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: "8h" });
}
function validateToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    // Token panitia natal tidak boleh dipakai untuk akses admin
    return payload?.role !== "panitia_natal";
  } catch (e) {
    return false;
  }
}

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers["x-admin-token"] as string;
  if (!token || !validateToken(token)) {
    return res.status(401).json({ error: "Unauthorized. Silakan login terlebih dahulu." });
  }
  next();
}

// ============================================================
// MULTER FILE UPLOAD SETUP
// ============================================================
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Hanya file gambar yang diizinkan (jpg, png, gif, webp)."));
  }
});

export interface Registration {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  eventId: string;
  eventTitle: string;
  createdAt: string;
}

// Ensure data directory exists (Only in local dev mode)
if (process.env.NETLIFY_DEV === "true" || process.env.NODE_ENV !== "production") {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Initial database structure
const defaultDb = {
  registrations: [
    {
      id: "reg_default_1",
      name: "Andi Saputra",
      email: "andi.saputra@example.com",
      whatsapp: "+6281234567890",
      eventId: "kelas_dasar_kekristenan",
      eventTitle: "Kelas Dasar Kekristenan",
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    },
    {
      id: "reg_default_2",
      name: "Siti Rahma",
      email: "siti.rahma@example.com",
      whatsapp: "+6281987654321",
      eventId: "kelas_dasar_kekristenan",
      eventTitle: "Kelas Dasar Kekristenan",
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    }
  ],
  worshipSessions: [
    { id: "session_1", title: "Ibadah Umum 1", time: "07:00 WIB", location: "Auditorium Utama" },
    { id: "session_2", title: "Ibadah Umum 2 & Sekolah Minggu", time: "09:30 WIB", location: "Auditorium Utama & Ruang Anak" },
    { id: "session_3", title: "Ibadah Pemuda (Youth)", time: "16:00 WIB", location: "Ruang Serbaguna" },
    { id: "session_4", title: "Ibadah Umum 3", time: "18:30 WIB", location: "Auditorium Utama" }
  ],
  churchEvents: [
    {
      id: "awakening_camp_2026",
      title: "Awakening Camp 2026",
      category: "RETREAT",
      date: "24 OKT",
      fullDate: "24 Oktober 2026",
      description: "Tiga hari untuk me-refresh imanmu dan membangun persahabatan yang kuat di alam terbuka bersama seluruh jemaat pemuda.",
      location: "Cipanas, Jawa Barat",
      image: "https://images.unsplash.com/photo-1526976775609-08916724560d?auto=format&fit=crop&q=80&w=800&h=500"
    },
    {
      id: "praise_worship_night",
      title: "Praise & Worship Night",
      category: "WORSHIP",
      date: "05 NOV",
      fullDate: "05 November 2026",
      description: "Malam puji-pujian dan penyembahan yang intim. Mari rasakan hadirat Tuhan bersama-sama dipandu oleh tim pujian utama.",
      location: "Gedung Utama GKMI ICHTUS",
      image: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&q=80&w=800&h=500"
    },
    {
      id: "youth_care_project",
      title: "Youth Care Project",
      category: "SOCIAL ACTION",
      date: "12 NOV",
      fullDate: "12 November 2026",
      description: "Tindakan nyata membagikan kasih Tuhan kepada masyarakat sekitar yang membutuhkan dengan pembagian sembako gratis.",
      location: "Kawasan Pemukiman Jakarta Pusat",
      image: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=800&h=500"
    },
    {
      id: "kelas_dasar_kekristenan",
      title: "Kelas Dasar Kekristenan",
      category: "KELAS PERTUMBUHAN",
      date: "15 OKT",
      fullDate: "Mulai Selasa, 15 Oktober 2026",
      description: "Membangun fondasi iman yang kuat dalam konteks kehidupan modern. Terbuka untuk semua jemaat baru dan siapa saja yang ingin bertumbuh.",
      timeRange: "18:30 - 20:00 WIB",
      location: "Ruang Komunitas, Lantai 2 (Gedung Utama GKMI ICHTUS)",
      trainer: "Pdt. Andreas & Tim",
      image: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&q=80&w=800&h=500"
    }
  ],
  serviceItems: [
    { id: "srv_1", title: "Connect Groups", description: "Bertumbuh bersama dalam kelompok kecil yang penuh kehangatan dan kasih.", schedule: "Setiap Jumat, 19:00 WIB", location: "Seluruh wilayah Jakarta", icon: "Users" },
    { id: "srv_2", title: "Komisi Youth", description: "Ibadah yang didesain khusus untuk jiwa muda. Pujian dinamis dan firman relevan.", schedule: "Setiap Sabtu, 17:00 WIB", location: "Ruang Serbaguna", icon: "Sparkles" },
    { id: "srv_3", title: "Doa Malam", description: "Bersama-sama mencari wajah Tuhan dalam pujian dan doa penyembahan.", schedule: "Setiap Rabu, 19:00 WIB", location: "Ruang Serbaguna", icon: "Heart" }
  ]
};

function readLocalDb() {
  try {
    if (!fs.existsSync(LOCAL_DB_PATH)) {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2));
    }
    const raw = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
    const data = JSON.parse(raw);
    // Ensure new fields exist (backwards compat)
    if (!data.worshipSessions) data.worshipSessions = defaultDb.worshipSessions;
    if (!data.churchEvents) data.churchEvents = defaultDb.churchEvents;
    if (!data.serviceItems) data.serviceItems = defaultDb.serviceItems;
    return data;
  } catch (err) {
    console.error("Error reading local DB, resetting:", err);
    return defaultDb;
  }
}

function writeLocalDb(data: any) {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing local DB:", err);
  }
}

// MongoDB Connection
export async function connectMongoGlobal() {
  if (isMongo && mongoClient) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("------------------------------------------------------------------");
    console.log("MONGODB_URI is not set. Utilizing file system database fallback.");
    console.log(`Local DB path: ${LOCAL_DB_PATH}`);
    console.log("------------------------------------------------------------------");
    return;
  }
  try {
    console.log("Connecting to MongoDB Atlas...");
    mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    isMongo = true;
    console.log("------------------------------------------------------------------");
    console.log("Successfully connected to MongoDB Atlas database!");
    console.log("------------------------------------------------------------------");
  } catch (err) {
    console.error("Failed to connect to MongoDB Atlas. Relying on local JSON DB fallback.", err);
    isMongo = false;
  }
}

// Serve uploaded images statically
// app.use("/uploads", express.static(UPLOADS_DIR));

// ============================================================
// ADMIN AUTH ROUTES (public - no auth required)
// ============================================================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = createToken();
    console.log(`[Admin] Login sukses: ${username}`);
    return res.json({ token, username });
  }
  console.warn(`[Admin] Login gagal untuk username: ${username}`);
  res.status(401).json({ error: "Username atau password salah." });
});

app.post("/api/admin/logout", (req, res) => {
  res.json({ success: true });
});

app.get("/api/admin/verify", (req, res) => {
  const token = req.headers["x-admin-token"] as string;
  if (token && validateToken(token)) {
    return res.json({ valid: true, username: ADMIN_USERNAME });
  }
  res.json({ valid: false });
});

// ============================================================
// IMAGE UPLOAD (protected)
// ============================================================
app.post("/api/upload", authMiddleware, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Tidak ada file" });
  const b64 = req.file.buffer.toString("base64");
  const dataUri = `data:${req.file.mimetype};base64,${b64}`;
  res.json({ url: dataUri });
});

// API Routes
app.get("/api/db-status", (req, res) => {
  res.json({
    status: "ok",
    database: isMongo ? "MongoDB Atlas" : "Local JSON File",
    usingFallback: !isMongo
  });
});

app.get("/api/registrations", async (req, res) => {
  if (isMongo && mongoDb) {
    try {
      const col = mongoDb.collection("registrations");
      const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
      const mapped = docs.map((doc: any) => ({
        id: doc.id || doc._id.toString(),
        name: doc.name,
        email: doc.email,
        whatsapp: doc.whatsapp,
        eventId: doc.eventId,
        eventTitle: doc.eventTitle,
        createdAt: doc.createdAt
      }));
      return res.json(mapped);
    } catch (err) {
      console.error("MongoDB find error, falling back to local DB:", err);
    }
  }
  const local = readLocalDb();
  res.json(local.registrations);
});

app.post("/api/registrations", async (req, res) => {
  const { name, email, whatsapp, eventId, eventTitle } = req.body;
  if (!name || !email || !whatsapp || !eventId || !eventTitle) {
    return res.status(400).json({ error: "Semua kolom form pendaftaran wajib diisi." });
  }

  const newReg: Registration = {
    id: "reg_" + Math.random().toString(36).substring(2, 11),
    name,
    email,
    whatsapp,
    eventId,
    eventTitle,
    createdAt: new Date().toISOString()
  };

  if (isMongo && mongoDb) {
    try {
      const col = mongoDb.collection("registrations");
      await col.insertOne(newReg);
      return res.status(201).json(newReg);
    } catch (err) {
      console.error("MongoDB insert error, falling back to local DB:", err);
    }
  }

  const db = readLocalDb();
  db.registrations.unshift(newReg);
  writeLocalDb(db);
  res.status(201).json(newReg);
});

app.post("/api/registrations/delete", async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ error: "ID pendaftaran tidak disediakan." });
  }

  if (isMongo && mongoDb) {
    try {
      const col = mongoDb.collection("registrations");
      const result = await col.deleteOne({ id: id });
      if (result.deletedCount > 0) {
        return res.json({ success: true, message: "Pendaftaran berhasil dihapus." });
      }
    } catch (err) {
      console.error("MongoDB delete error, falling back to local DB:", err);
    }
  }

  const db = readLocalDb();
  const index = db.registrations.findIndex(r => r.id === id);
  if (index !== -1) {
    db.registrations.splice(index, 1);
    writeLocalDb(db);
    return res.json({ success: true, message: "Pendaftaran berhasil dihapus." });
  }

  res.status(404).json({ error: "Pendaftaran tidak ditemukan." });
});

// ============================================================
// WORSHIP SESSIONS CRUD (protected)
// ============================================================
app.get("/api/worship-sessions", async (req, res) => {
  if (isMongo && mongoDb) {
    try {
      const docs = await mongoDb.collection("worshipSessions").find({}).toArray();
      return res.json(docs.map(d => { const { _id, ...rest } = d; return rest; }));
    } catch (e) { console.error(e); }
  }
  const db = readLocalDb();
  res.json(db.worshipSessions || []);
});

app.post("/api/worship-sessions", authMiddleware, async (req, res) => {
  const { title, time, location } = req.body;
  if (!title || !time || !location) {
    return res.status(400).json({ error: "Semua field wajib diisi." });
  }
  const newSession = { id: "session_" + Math.random().toString(36).substring(2, 9), title, time, location };
  
  if (isMongo && mongoDb) {
    try {
      await mongoDb.collection("worshipSessions").insertOne(newSession);
      return res.status(201).json(newSession);
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  db.worshipSessions = [...(db.worshipSessions || []), newSession];
  writeLocalDb(db);
  res.status(201).json(newSession);
});

app.put("/api/worship-sessions/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { title, time, location } = req.body;
  
  if (isMongo && mongoDb) {
    try {
      await mongoDb.collection("worshipSessions").updateOne({ id }, { $set: { title, time, location } });
      return res.json({ id, title, time, location });
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  const idx = (db.worshipSessions || []).findIndex((s: any) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Sesi tidak ditemukan." });
  db.worshipSessions[idx] = { ...db.worshipSessions[idx], title, time, location };
  writeLocalDb(db);
  res.json(db.worshipSessions[idx]);
});

app.delete("/api/worship-sessions/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  if (isMongo && mongoDb) {
    try {
      const result = await mongoDb.collection("worshipSessions").deleteOne({ id });
      if (result.deletedCount > 0) return res.json({ success: true });
      return res.status(404).json({ error: "Sesi tidak ditemukan." });
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  const before = (db.worshipSessions || []).length;
  db.worshipSessions = (db.worshipSessions || []).filter((s: any) => s.id !== id);
  if (db.worshipSessions.length === before) return res.status(404).json({ error: "Sesi tidak ditemukan." });
  writeLocalDb(db);
  res.json({ success: true });
});

// ============================================================
// CHURCH EVENTS CRUD (protected)
// ============================================================
app.get("/api/church-events", async (req, res) => {
  if (isMongo && mongoDb) {
    try {
      const docs = await mongoDb.collection("churchEvents").find({}).toArray();
      return res.json(docs.map(d => { const { _id, ...rest } = d; return rest; }));
    } catch (e) { console.error(e); }
  }
  const db = readLocalDb();
  res.json(db.churchEvents || []);
});

app.post("/api/church-events", authMiddleware, async (req, res) => {
  const { title, category, date, fullDate, description, timeRange, location, trainer, image } = req.body;
  if (!title || !category || !date || !fullDate || !description) {
    return res.status(400).json({ error: "Field wajib: title, category, date, fullDate, description." });
  }
  const newEvent = {
    id: "event_" + Math.random().toString(36).substring(2, 9),
    title, category, date, fullDate, description,
    ...(timeRange && { timeRange }),
    ...(location && { location }),
    ...(trainer && { trainer }),
    ...(image && { image })
  };
  
  if (isMongo && mongoDb) {
    try {
      await mongoDb.collection("churchEvents").insertOne(newEvent);
      return res.status(201).json(newEvent);
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  db.churchEvents = [...(db.churchEvents || []), newEvent];
  writeLocalDb(db);
  res.status(201).json(newEvent);
});

app.put("/api/church-events/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  if (isMongo && mongoDb) {
    try {
      await mongoDb.collection("churchEvents").updateOne({ id }, { $set: req.body });
      return res.json({ ...req.body, id });
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  const idx = (db.churchEvents || []).findIndex((e: any) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "Kegiatan tidak ditemukan." });
  db.churchEvents[idx] = { ...db.churchEvents[idx], ...req.body, id };
  writeLocalDb(db);
  res.json(db.churchEvents[idx]);
});

app.delete("/api/church-events/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  if (isMongo && mongoDb) {
    try {
      const result = await mongoDb.collection("churchEvents").deleteOne({ id });
      if (result.deletedCount > 0) return res.json({ success: true });
      return res.status(404).json({ error: "Kegiatan tidak ditemukan." });
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  const before = (db.churchEvents || []).length;
  db.churchEvents = (db.churchEvents || []).filter((e: any) => e.id !== id);
  if (db.churchEvents.length === before) return res.status(404).json({ error: "Kegiatan tidak ditemukan." });
  writeLocalDb(db);
  res.json({ success: true });
});

// ============================================================
// THEME SETTINGS (protected)
// ============================================================
app.get("/api/theme", async (req, res) => {
  if (isMongo && mongoDb) {
    try {
      const doc = await mongoDb.collection("settings").findOne({ key: "theme" });
      if (doc) return res.json(doc.value);
    } catch (e) { console.error(e); }
  }
  const db = readLocalDb();
  res.json(db.theme || {
    primaryColor: "#4f46e5",
    secondaryColor: "#6366f1",
    accentColor: "#fbbf24",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    fontFamily: "Inter",
    weeklyTheme: "Keluarga Kristen yang Menjadi Teladan"
  });
});

app.put("/api/theme", authMiddleware, async (req, res) => {
  const { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, fontFamily, weeklyTheme } = req.body;
  const theme = { primaryColor, secondaryColor, accentColor, backgroundColor, textColor, fontFamily, weeklyTheme };
  
  if (isMongo && mongoDb) {
    try {
      await mongoDb.collection("settings").updateOne(
        { key: "theme" },
        { $set: { key: "theme", value: theme } },
        { upsert: true }
      );
      return res.json(theme);
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  db.theme = theme;
  writeLocalDb(db);
  res.json(theme);
});

// ============================================================
// SERVICE ITEMS CRUD (protected)
// ============================================================
app.get("/api/service-items", async (req, res) => {
  if (isMongo && mongoDb) {
    try {
      const docs = await mongoDb.collection("serviceItems").find({}).toArray();
      return res.json(docs.map(d => { const { _id, ...rest } = d; return rest; }));
    } catch (e) { console.error(e); }
  }
  const db = readLocalDb();
  res.json(db.serviceItems || []);
});

app.post("/api/service-items", authMiddleware, async (req, res) => {
  const { title, description, schedule, location, icon } = req.body;
  if (!title || !description || !schedule || !location) {
    return res.status(400).json({ error: "Semua field wajib diisi." });
  }
  const newItem = {
    id: "srv_" + Math.random().toString(36).substring(2, 9),
    title, description, schedule, location, icon: icon || "Heart"
  };
  
  if (isMongo && mongoDb) {
    try {
      await mongoDb.collection("serviceItems").insertOne(newItem);
      return res.status(201).json(newItem);
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  db.serviceItems = [...(db.serviceItems || []), newItem];
  writeLocalDb(db);
  res.status(201).json(newItem);
});

app.put("/api/service-items/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  if (isMongo && mongoDb) {
    try {
      await mongoDb.collection("serviceItems").updateOne({ id }, { $set: req.body });
      return res.json({ ...req.body, id });
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  const idx = (db.serviceItems || []).findIndex((s: any) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Pelayanan tidak ditemukan." });
  db.serviceItems[idx] = { ...db.serviceItems[idx], ...req.body, id };
  writeLocalDb(db);
  res.json(db.serviceItems[idx]);
});

app.delete("/api/service-items/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  
  if (isMongo && mongoDb) {
    try {
      const result = await mongoDb.collection("serviceItems").deleteOne({ id });
      if (result.deletedCount > 0) return res.json({ success: true });
      return res.status(404).json({ error: "Pelayanan tidak ditemukan." });
    } catch (e) { console.error(e); }
  }
  
  const db = readLocalDb();
  const before = (db.serviceItems || []).length;
  db.serviceItems = (db.serviceItems || []).filter((s: any) => s.id !== id);
  if (db.serviceItems.length === before) return res.status(404).json({ error: "Pelayanan tidak ditemukan." });
  writeLocalDb(db);
  res.json({ success: true });
});

// ============================================================
// PANITIA NATAL (login panitia, peserta undangan, check-in)
// ============================================================
const PANITIA_USERNAME = process.env.PANITIA_USERNAME || "panitia";
const PANITIA_PASSWORD = process.env.PANITIA_PASSWORD || "natal2026";

function decodePanitiaToken(token: string): { username: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    return payload?.role === "panitia_natal" ? { username: payload.username } : null;
  } catch {
    return null;
  }
}

function panitiaMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers["x-panitia-token"] as string) || "";
  if (!decodePanitiaToken(token)) {
    return res.status(401).json({ error: "Unauthorized. Silakan login sebagai panitia." });
  }
  next();
}

function randomNatalCode() {
  return "NTL-" + Math.random().toString(36).slice(2, 8).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Helper penyimpanan peserta: MongoDB bila tersedia, jika tidak pakai db.json
async function loadPeserta(): Promise<any[]> {
  if (isMongo && mongoDb) {
    const docs = await mongoDb.collection("natalPeserta").find({}).toArray();
    return docs.map((d: any) => { const { _id, ...rest } = d; return rest; });
  }
  return readLocalDb().natalPeserta || [];
}

async function saveLocalPeserta(list: any[]) {
  const db = readLocalDb();
  db.natalPeserta = list;
  writeLocalDb(db);
}

// Ambil/simpan URL Webhook Google Spreadsheet
async function getSheetWebhookUrl(): Promise<string> {
  if (isMongo && mongoDb) {
    try {
      const doc = await mongoDb.collection("settings").findOne({ key: "natalSheetWebhook" });
      if (doc && typeof doc.value === "string") return doc.value;
    } catch {}
  } else {
    const db = readLocalDb();
    if (typeof db.natalSheetWebhook === "string") return db.natalSheetWebhook;
  }
  return process.env.NATAL_SHEET_WEBHOOK_URL || "";
}

async function setSheetWebhookUrl(url: string) {
  if (isMongo && mongoDb) {
    await mongoDb.collection("settings").updateOne(
      { key: "natalSheetWebhook" },
      { $set: { key: "natalSheetWebhook", value: url } },
      { upsert: true }
    );
  } else {
    const db = readLocalDb();
    db.natalSheetWebhook = url;
    writeLocalDb(db);
  }
}

// Kirim seluruh daftar peserta terbaru (terurut nomor) ke Google Spreadsheet
async function syncToGoogleSheet(trigger: string): Promise<{ ok: boolean; message: string }> {
  const url = (await getSheetWebhookUrl()).trim();
  if (!url) return { ok: false, message: "URL Webhook Google Spreadsheet belum diatur." };
  try {
    const list = await loadPeserta();
    const sorted = [...list].sort((a, b) =>
      String(a.nomor).localeCompare(String(b.nomor), undefined, { numeric: true, sensitivity: "base" })
    );
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        trigger,
        updatedAt: new Date().toISOString(),
        total: sorted.length,
        hadir: sorted.filter(p => p.hadir).length,
        peserta: sorted,
      }),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, message: `Webhook merespons HTTP ${res.status}` };
    return { ok: true, message: "Spreadsheet berhasil diperbarui." };
  } catch (err: any) {
    return { ok: false, message: err?.message || "Gagal menghubungi Google Spreadsheet." };
  }
}

app.post("/api/panitia/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username dan password wajib diisi." });
  let ok = username === PANITIA_USERNAME && password === PANITIA_PASSWORD;
  if (!ok && isMongo && mongoDb) {
    const doc = await mongoDb.collection("panitiaAccounts").findOne({ username });
    ok = !!doc && doc.password === password;
  }
  if (!ok) return res.status(401).json({ error: "Username atau password salah." });
  const token = jwt.sign({ role: "panitia_natal", username }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, username });
});

app.get("/api/panitia/verify", (req, res) => {
  const p = decodePanitiaToken((req.headers["x-panitia-token"] as string) || "");
  res.json(p ? { valid: true, username: p.username } : { valid: false });
});

app.get("/api/natal/peserta", panitiaMiddleware, async (_req, res) => {
  res.json(await loadPeserta());
});

app.post("/api/natal/peserta", panitiaMiddleware, async (req, res) => {
  const nama = String(req.body.nama || "").trim();
  const nomor = String(req.body.nomor || "").trim();
  if (!nama || !nomor) return res.status(400).json({ error: "Nama dan nomor peserta wajib diisi." });
  const list = await loadPeserta();
  const dup = list.find(p => p.nomor === nomor);
  if (dup) return res.status(409).json({ error: `Nomor peserta ${nomor} sudah dipakai oleh ${dup.nama}.` });
  const doc = {
    id: "ntl_" + Math.random().toString(36).slice(2, 11),
    nama, nomor,
    kode: randomNatalCode(),
    hadir: false,
    waktuHadir: null as string | null,
    createdAt: new Date().toISOString()
  };
  if (isMongo && mongoDb) {
    await mongoDb.collection("natalPeserta").insertOne({ ...doc });
  } else {
    await saveLocalPeserta([...list, doc]);
  }
  syncToGoogleSheet("add").catch(() => {});
  res.status(201).json(doc);
});

app.post("/api/natal/checkin", panitiaMiddleware, async (req, res) => {
  const kode = String(req.body.kode || "").trim();
  if (!kode) return res.status(400).json({ error: "Kode tidak terbaca." });
  const list = await loadPeserta();
  const peserta = list.find(p => p.kode === kode);
  if (!peserta) return res.status(404).json({ error: "Barcode tidak terdaftar sebagai peserta undangan." });
  if (peserta.hadir) return res.json({ status: "already", peserta });
  const waktuHadir = new Date().toISOString();
  const updated = { ...peserta, hadir: true, waktuHadir };
  if (isMongo && mongoDb) {
    await mongoDb.collection("natalPeserta").updateOne({ kode }, { $set: { hadir: true, waktuHadir } });
  } else {
    await saveLocalPeserta(list.map(p => (p.kode === kode ? updated : p)));
  }
  syncToGoogleSheet("checkin").catch(() => {});
  res.json({ status: "ok", peserta: updated });
});

app.put("/api/natal/peserta/:id", panitiaMiddleware, async (req, res) => {
  const { id } = req.params;
  const list = await loadPeserta();
  const current = list.find(p => p.id === id);
  if (!current) return res.status(404).json({ error: "Peserta tidak ditemukan." });
  const update: any = {};
  if (req.body.nama !== undefined) update.nama = String(req.body.nama).trim();
  if (req.body.nomor !== undefined) {
    update.nomor = String(req.body.nomor).trim();
    const dup = list.find(p => p.nomor === update.nomor && p.id !== id);
    if (dup) return res.status(409).json({ error: `Nomor peserta ${update.nomor} sudah dipakai oleh ${dup.nama}.` });
  }
  if (update.nama === "" || update.nomor === "") return res.status(400).json({ error: "Nama dan nomor peserta wajib diisi." });
  if (req.body.hadir !== undefined) {
    update.hadir = !!req.body.hadir;
    update.waktuHadir = update.hadir ? new Date().toISOString() : null;
  }
  const updated = { ...current, ...update };
  if (isMongo && mongoDb) {
    await mongoDb.collection("natalPeserta").updateOne({ id }, { $set: update });
  } else {
    await saveLocalPeserta(list.map(p => (p.id === id ? updated : p)));
  }
  syncToGoogleSheet("update").catch(() => {});
  res.json(updated);
});

app.delete("/api/natal/peserta/:id", panitiaMiddleware, async (req, res) => {
  const { id } = req.params;
  if (isMongo && mongoDb) {
    const result = await mongoDb.collection("natalPeserta").deleteOne({ id });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Peserta tidak ditemukan." });
    syncToGoogleSheet("delete").catch(() => {});
    return res.json({ success: true });
  }
  const list = await loadPeserta();
  const next = list.filter(p => p.id !== id);
  if (next.length === list.length) return res.status(404).json({ error: "Peserta tidak ditemukan." });
  await saveLocalPeserta(next);
  syncToGoogleSheet("delete").catch(() => {});
  res.json({ success: true });
});

app.get("/api/natal/sheet-config", panitiaMiddleware, async (_req, res) => {
  res.json({ webhookUrl: await getSheetWebhookUrl() });
});

app.put("/api/natal/sheet-config", panitiaMiddleware, async (req, res) => {
  const webhookUrl = String(req.body.webhookUrl || "").trim();
  await setSheetWebhookUrl(webhookUrl);
  const sync = webhookUrl ? await syncToGoogleSheet("config") : { ok: true, message: "Sinkronisasi spreadsheet dinonaktifkan." };
  res.json({ webhookUrl, sync });
});

app.post("/api/natal/sheet-sync", panitiaMiddleware, async (_req, res) => {
  const sync = await syncToGoogleSheet("manual");
  if (!sync.ok) return res.status(400).json({ error: sync.message });
  res.json(sync);
});

// Configure Vite or production static files serving
async function setupViteOrStaticAndListen() {
  await connectMongoGlobal();

  if (process.env.NODE_ENV !== "production") {
    console.log("Running in DEVELOPMENT mode. Starting Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Running in PRODUCTION mode. Serving pre-compiled static assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`------------------------------------------------------------------`);
    console.log(`GKMI ICHTUS Server listening at http://localhost:${PORT}`);
    console.log(`External access bridged on default platform port`);
    console.log(`------------------------------------------------------------------`);
  });
}

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  setupViteOrStaticAndListen();
}

export { app };
