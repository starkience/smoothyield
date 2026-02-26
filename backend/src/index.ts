import express from "express";
import cors from "cors";
import { config } from "./config";
import { apiRouter } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api", apiRouter);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on :${config.port}`);
});
