import postgres from "postgres";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:12345678@192.168.1.30:5432/postgres";
const sql = postgres(DATABASE_URL);
export default sql;