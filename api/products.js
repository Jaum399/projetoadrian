import {
  ensureAdminUser,
  getDb,
  getProductsCollectionName,
  getUploadIdFromUrl,
  getUploadsBucket,
  isMongoConfigured,
  requireAdmin
} from "./_lib/mongo.js";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1615634262417-4f48f9f95f7a?auto=format&fit=crop&w=800&q=80";
const DEFAULT_FLOW = "novidades";
const ALLOWED_FLOWS = new Set(["novidades", "autocuidado", "casa-impecavel"]);

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
      : "Skincare";

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
      const docs = await collection
        .find(includeInactive ? {} : { active: { $ne: false } })
        .limit(200)
        .toArray();

      const normalized = docs
        .map((item, index) => normalizeProduct(item, index))
        .filter(Boolean);

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

      const result = await collection.insertOne({
        ...nextProduct,
        createdAt: new Date().toISOString()
      });

      return res.status(200).json({
        source: "mongodb",
        product: { ...nextProduct, id: String(result.insertedId) },
        message: "Produto adicionado ao catalogo."
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

      return res.status(200).json({
        source: "mongodb",
        product: normalizeProduct(result, 0),
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