import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
import "dotenv/config";

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("No MONGODB_URI found");
    process.exit(1);
  }
  
  const LOCAL_DB_PATH = path.join(process.cwd(), "data", "db.json");
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    console.log("No local DB found");
    process.exit(0);
  }
  
  const dbData = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8"));
  
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(); // uses default from URI
    
    // Seed Worship Sessions
    if (dbData.worshipSessions && dbData.worshipSessions.length > 0) {
      const col = db.collection("worshipSessions");
      await col.deleteMany({});
      await col.insertMany(dbData.worshipSessions);
      console.log(`Inserted ${dbData.worshipSessions.length} worship sessions`);
    }
    
    // Seed Church Events
    if (dbData.churchEvents && dbData.churchEvents.length > 0) {
      const col = db.collection("churchEvents");
      await col.deleteMany({});
      await col.insertMany(dbData.churchEvents);
      console.log(`Inserted ${dbData.churchEvents.length} church events`);
    }
    
    // Seed Service Items
    if (dbData.serviceItems && dbData.serviceItems.length > 0) {
      const col = db.collection("serviceItems");
      await col.deleteMany({});
      await col.insertMany(dbData.serviceItems);
      console.log(`Inserted ${dbData.serviceItems.length} service items`);
    }
    
    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
}

run();
