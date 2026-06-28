import {
  ensureAdminUser,
  getDb,
  getProductsCollectionName,
  getConfiguredAdminIdentity,
  getUploadIdFromUrl,
  getUploadsBucket,
  isMongoConfigured,
  requireAdmin
} from "./_lib/mongo.js";
import nodemailer from "nodemailer";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1615634262417-4f48f9f95f7a?auto=format&fit=crop&w=800&q=80";
const DEFAULT_FLOW = "novidades";
const ALLOWED_FLOWS = new Set(["novidades", "autocuidado", "casa-impecavel"]);
let emailTransport;

function toSafeInteger(value, defaultValue) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }

  return Math.max(parsed, 0);
}

function getMailConfig() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  const from = String(process.env.STOCK_ALERT_FROM || user).trim();
  const adminIdentity = getConfiguredAdminIdentity();
  const to = String(process.env.STOCK_ALERT_TO || adminIdentity.email || "").trim();

  if (!host || !port || !user || !pass || !from || !to) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
    to
  };
}

function getMailTransport(config) {
  if (!emailTransport) {
    emailTransport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth
    });
  }

  return emailTransport;
}

async function notifyStockDepleted(product) {
  const config = getMailConfig();
  if (!config) {
    return false;
  }

  const transport = getMailTransport(config);
  await transport.sendMail({
    from: config.from,
    to: config.to,
    subject: `[Estoque Zerado] ${product.name}`,
    text: [
      "Um produto ficou sem estoque.",
      "",
      `Produto: ${product.name}`,
      `Categoria: ${product.category}`,
      `Estoque atual: ${product.stock}`,
      `Preco atual: R$ ${Number(product.price || 0).toFixed(2)}`,
      "",
      "Acesse o painel administrativo para repor o estoque."
    ].join("\n")
  });

  return true;
}

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
      : "Feminino";

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
  const specifications =
    typeof product?.specifications === "string" && product.specifications.trim()
      ? product.specifications.trim()
      : "";
  const stock = toSafeInteger(product?.stock, 1);

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
    flow,
    specifications,
    stock,
    active: product?.active !== false
  };
}

function normalizeIncomingProduct(product) {
  const normalized = normalizeProduct(product, 0);

  if (!normalized) {
    return null;
  }

  return {
    ...normalized,
    active: product?.active !== false,
    updatedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  if (!["GET", "POST", "PUT", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  const collectionName = getProductsCollectionName();

  if (!isMongoConfigured()) {
    return res.status(503).json({
      source: "unavailable",
      products: [],
      message: "Catalogo indisponivel: variaveis do Mongo nao configuradas."
    });
  }

  try {
    await ensureAdminUser();
    const db = await getDb();
    const collection = db.collection(collectionName);
    const uploadsBucket = await getUploadsBucket();

    if (req.method === "GET") {
      const includeInactive = String(req.query?.includeInactive || "") === "true";
      const includeOutOfStock = String(req.query?.includeOutOfStock || "") === "true";
      const adminFromToken = await requireAdmin(req);
      const canUseAdminFilters = Boolean(adminFromToken);
      const docs = await collection
        .find(canUseAdminFilters && includeInactive ? {} : { active: { $ne: false } })
        .limit(200)
        .toArray();

      const normalized = docs
        .map((item, index) => normalizeProduct(item, index))
        .filter(Boolean)
        .filter((item) => {
          const shouldHideOutOfStock = !(canUseAdminFilters && includeOutOfStock);
          if (!shouldHideOutOfStock) {
            return true;
          }

          return item.stock > 0;
        });

      return res.status(200).json({
        source: "mongodb",
        products: normalized,
        message:
          normalized.length === 0
            ? "Catalogo vazio. Cadastre produtos no painel ADM."
            : ""
      });
    }

    const admin = await requireAdmin(req);

    if (!admin) {
      return res.status(401).json({ error: "Acesso administrativo necessario." });
    }

    if (req.method === "POST") {
      const nextProduct = normalizeIncomingProduct(req.body);

      if (!nextProduct) {
        return res.status(400).json({ error: "Produto invalido." });
      }

      const alertNeeded = nextProduct.stock === 0;
      const result = await collection.insertOne({
        ...nextProduct,
        createdAt: new Date().toISOString()
      });
      let stockAlertSent = false;
      if (alertNeeded) {
        stockAlertSent = await notifyStockDepleted(nextProduct).catch(() => false);
      }

      return res.status(200).json({
        source: "mongodb",
        product: { ...nextProduct, id: String(result.insertedId) },
        stockAlertSent,
        message:
          nextProduct.stock === 0
            ? "Produto cadastrado com estoque zero e ocultado da vitrine."
            : "Produto adicionado ao catalogo."
      });
    }

    if (req.method === "PUT") {
      const id = String(req.body?.id || "").trim();
      const nextProduct = normalizeIncomingProduct(req.body);

      if (!id || !nextProduct) {
        return res.status(400).json({ error: "Produto invalido para atualizacao." });
      }

      const { ObjectId } = await import("mongodb");
      const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
      const previousProduct = await collection.findOne(filter);
      const update = {
        $set: {
          name: nextProduct.name,
          category: nextProduct.category,
          price: nextProduct.price,
          oldPrice: nextProduct.oldPrice,
          image: nextProduct.image,
          badge: nextProduct.badge,
          flow: nextProduct.flow,
          specifications: nextProduct.specifications,
          stock: nextProduct.stock,
          active: req.body?.active !== false,
          updatedAt: new Date().toISOString()
        }
      };

      const result = await collection.findOneAndUpdate(filter, update, {
        returnDocument: "after"
      });

      if (!result) {
        return res.status(404).json({ error: "Produto nao encontrado." });
      }

      const previousUploadId = getUploadIdFromUrl(previousProduct?.image);
      const nextUploadId = getUploadIdFromUrl(nextProduct.image);

      if (
        previousUploadId &&
        (!nextUploadId || String(previousUploadId) !== String(nextUploadId))
      ) {
        await uploadsBucket.delete(previousUploadId).catch(() => null);
      }

      const previousStock = toSafeInteger(previousProduct?.stock, 1);
      const nextStock = nextProduct.stock;
      let stockAlertSent = false;
      if (previousStock > 0 && nextStock === 0) {
        stockAlertSent = await notifyStockDepleted(nextProduct).catch(() => false);
      }

      return res.status(200).json({
        source: "mongodb",
        product: normalizeProduct(result, 0),
        stockAlertSent,
        message: "Produto atualizado."
      });
    }

    const shouldClearAll =
      String(req.query?.all || req.body?.all || "").toLowerCase() === "true";

    if (shouldClearAll) {
      const docs = await collection.find({}, { projection: { image: 1 } }).toArray();
      const uploadIds = docs
        .map((item) => getUploadIdFromUrl(item?.image))
        .filter(Boolean);

      await Promise.all(uploadIds.map((uploadId) => uploadsBucket.delete(uploadId).catch(() => null)));
      const result = await collection.deleteMany({});

      return res.status(200).json({
        source: "mongodb",
        deletedCount: result.deletedCount || 0,
        message: "Catalogo zerado com sucesso."
      });
    }

    const id = String(req.query?.id || req.body?.id || "").trim();

    if (!id) {
      return res.status(400).json({ error: "Informe o produto a remover." });
    }

    const { ObjectId } = await import("mongodb");
    const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { id };
    const previousProduct = await collection.findOne(filter);
    const result = await collection.updateOne(filter, {
      $set: {
        active: false,
        updatedAt: new Date().toISOString()
      }
    });

    if (!result.matchedCount) {
      return res.status(404).json({ error: "Produto nao encontrado." });
    }

    const previousUploadId = getUploadIdFromUrl(previousProduct?.image);
    if (previousUploadId) {
      await uploadsBucket.delete(previousUploadId).catch(() => null);
    }

    return res.status(200).json({
      source: "mongodb",
      message: "Produto removido da vitrine."
    });
  } catch {
    return res.status(503).json({
      source: "unavailable",
      products: [],
      message: "Falha ao carregar o catalogo no MongoDB."
    });
  }
}