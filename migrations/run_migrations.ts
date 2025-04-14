import { db } from "../server/db";
import { readFileSync } from "fs";
import path from "path";

async function runMigrations() {
  console.log("Running migrations...");
  
  try {
    // Read and execute SQL migration file
    const migrationPath = path.join(__dirname, "add_is_hidden_to_analyses.sql");
    const sql = readFileSync(migrationPath, "utf-8");
    
    // Execute the SQL
    await db.execute(sql);
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();