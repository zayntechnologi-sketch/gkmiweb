import { MongoClient } from "mongodb";
import "dotenv/config";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error("Set MONGODB_URI di .env dulu"); process.exit(1); }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    // Hapus admin lama kalau ada
    await db.collection("admins").deleteMany({});

    // Tambahkan akun admin baru
    await db.collection("admins").insertOne({
      username: "admin",
      password: "gkmiichtus2026",  // <-- GANTI PASSWORD DI SINI
      role: "admin",
      createdAt: new Date().toISOString()
    });

    console.log("✅ Akun admin berhasil ditambahkan ke MongoDB!");
    console.log("   Username : admin");
    console.log("   Password : gkmiichtus2026");
  } catch (err) {
    console.error("❌ Gagal:", err);
  } finally {
    await client.close();
  }
}

run();
