import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./routes.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.PORT || 8000;
const SYNAPSE_HTML_DIR = path.resolve(__dirname, "../synapsehtml");

const app = express();
app.use(cors({
        exposedHeaders: ["X-Synapse-Api"],
}))
app.use((req, res, next) => {
        res.set("X-Synapse-Api", "true");
        next();
})
app.use(express.json())
app.use(routes)

app.use(express.static(SYNAPSE_HTML_DIR));

app.listen(PORT, () => {
        console.log(`Running now!! Porta ativa: ${PORT}`)
})
