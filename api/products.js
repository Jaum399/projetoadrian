import { MongoClient } from "mongodb";
import { products as fallbackProducts } from "../src/data/products.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1615634262417-4f48f9f95f7a?auto=format&fit=crop&w=800&q=80";
const DEFAULT_FLOW = "mais-desejados";
const ALLOWED_FLOWS = new Set(["mais-desejados", "promocoes", "combos"]);

let cachedClient;
let cachedClientPromise;

function toNumber(value, defaultValue) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function normalizeProduct(product, index) {
  const name = typeof product?.name === "string" ? product.name.trim() : "";
  if (!name) {
    return null;
  }

  const category =
    typeof product?.category === "string" && product.category.trim()
      ? product.category.trim()
      : "Perfumes";

  const price = toNumber(product?.price, 0);
  const oldPrice = toNumber(product?.oldPrice, price);
  const image =
    typeof product?.image === "string" && product.image.trim()
      ? product.image.trim()
      : FALLBACK_IMAGE;
  const badge =
    typeof product?.badge === "string" && product.badge.trim()
      ? product.badge.trim()
      : "Destaque";

  const rawFlow =
    typeof product?.flow === "string" ? product.flow.trim().toLowerCase() : "";
  const flow = ALLOWED_FLOWS.has(rawFlow) ? rawFlow : DEFAULT_FLOW;

  return {
    id: product?._id ? String(product._id) : `mongo-${index + 1}`,
    name,
    category,
    price,
    oldPrice,
    image,
    badge,
    flow
  };
}

async function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI ausente");
  }

  if (cachedClient) {
    return cachedClient;
  }

  if (!cachedClientPromise) {
    cachedClientPromise = MongoClient.connect(uri);
  }

  cachedClient = await cachedClientPromise;
  return cachedClient;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const dbName = process.env.MONGODB_DB;
  const collectionName = process.env.MONGODB_COLLECTION || "products";

  if (!process.env.MONGODB_URI || !dbName) {
    return res.status(200).json({
      source: "fallback",
      products: fallbackProducts,
      message: "Variaveis do Mongo nao configuradas."
    });
  }

  try {
    const client = await getClient();
    const docs = await client
      .db(dbName)
      .collection(collectionName)
      .find({ active: { $ne: false } })
      .limit(120)
      .toArray();

    const normalized = docs
      .map((item, index) => normalizeProduct(item, index))
      .filter(Boolean);

    if (normalized.length === 0) {
      return res.status(200).json({
        source: "fallback",
        products: fallbackProducts,
        message: "Colecao vazia. Exibindo catalogo ilustrativo."
      });
    }

    return res.status(200).json({
      source: "mongodb",
      products: normalized
    });
  } catch {
    return res.status(200).json({
      source: "fallback",
      products: fallbackProducts,
      message: "Falha ao carregar Mongo. Exibindo catalogo ilustrativo."
    });
  }
}