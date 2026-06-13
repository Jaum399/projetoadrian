import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import formidable from "formidable";
import { ObjectId } from "mongodb";
import {
  ensureAdminUser,
  getUploadUrl,
  getUploadsBucket,
  isMongoConfigured,
  requireAdmin
} from "./_lib/mongo.js";

export const config = {
  api: {
    bodyParser: false
  }
};

function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: 8 * 1024 * 1024,
    filter: ({ mimetype }) => Boolean(mimetype && mimetype.startsWith("image/"))
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ fields, files });
    });
  });
}

function getFirstFile(files) {
  const candidate = files?.file;

  if (Array.isArray(candidate)) {
    return candidate[0] || null;
  }

  return candidate || null;
}

export default async function handler(req, res) {
  if (!isMongoConfigured()) {
    return res.status(503).json({ error: "MongoDB nao configurado para uploads." });
  }

  await ensureAdminUser();
  const bucket = await getUploadsBucket();

  if (req.method === "GET") {
    const id = String(req.query?.id || "").trim();
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Arquivo invalido." });
    }

    const file = await bucket.find({ _id: new ObjectId(id) }).next();
    if (!file) {
      return res.status(404).json({ error: "Arquivo nao encontrado." });
    }

    res.setHeader("Content-Type", file.contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = bucket.openDownloadStream(file._id);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).end("Arquivo nao encontrado.");
      }
    });
    stream.pipe(res);
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  const admin = await requireAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: "Acesso administrativo necessario." });
  }

  try {
    const { files } = await parseForm(req);
    const file = getFirstFile(files);

    if (!file) {
      return res.status(400).json({ error: "Selecione uma imagem para upload." });
    }

    const filename = file.originalFilename || `product-${Date.now()}`;
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: file.mimetype || "application/octet-stream",
      metadata: {
        uploadedBy: admin.email,
        createdAt: new Date().toISOString()
      }
    });

    await pipeline(fs.createReadStream(file.filepath), uploadStream);

    return res.status(200).json({
      source: "mongodb-gridfs",
      fileId: String(uploadStream.id),
      url: getUploadUrl(uploadStream.id),
      message: "Imagem enviada com sucesso."
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Nao foi possivel enviar a imagem."
    });
  }
}