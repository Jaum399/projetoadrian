import crypto from "crypto";
import { GridFSBucket, MongoClient, ObjectId } from "mongodb";

const DEFAULT_PRODUCT_COLLECTION = "products";
const DEFAULT_USER_COLLECTION = "users";
const DEFAULT_UPLOAD_BUCKET = "productImages";

let cachedClient;
let cachedClientPromise;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_DB);
}

export async function getClient() {
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

export async function getDb() {
  const dbName = process.env.MONGODB_DB;

  if (!dbName) {
    throw new Error("MONGODB_DB ausente");
  }

  const client = await getClient();
  return client.db(dbName);
}

export function getProductsCollectionName() {
  return process.env.MONGODB_COLLECTION || DEFAULT_PRODUCT_COLLECTION;
}

export function getUsersCollectionName() {
  return process.env.MONGODB_USERS_COLLECTION || DEFAULT_USER_COLLECTION;
}

export function getUploadsBucketName() {
  return process.env.MONGODB_UPLOADS_BUCKET || DEFAULT_UPLOAD_BUCKET;
}

export function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

export function createPasswordHash(password) {
  return crypto.createHash("sha256").update(String(password)).digest("hex");
}

export function createSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

// Session token expiry: 24 hours in milliseconds
export const SESSION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

export function getSessionTokenExpiry() {
  return new Date(Date.now() + SESSION_TOKEN_EXPIRY_MS).toISOString();
}

export function isSessionTokenExpired(expiryDateString) {
  if (!expiryDateString) return true;
  const expiryTime = new Date(expiryDateString).getTime();
  return expiryTime < Date.now();
}

export function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user._id ? String(user._id) : user.id,
    name: user.name,
    cpf: normalizeCpf(user.cpf),
    email: normalizeIdentifier(user.email),
    role: user.role === "admin" ? "admin" : "customer"
  };
}

export function getConfiguredAdminIdentity() {
  return {
    email: normalizeIdentifier(process.env.ADMIN_EMAIL || "admin@adrianbeauty.com"),
    cpf: normalizeCpf(process.env.ADMIN_CPF || "11111111111")
  };
}

export function isConfiguredAdminUser(user) {
  if (!user) {
    return false;
  }

  const adminIdentity = getConfiguredAdminIdentity();
  const userEmail = normalizeIdentifier(user.email);
  const userCpf = normalizeCpf(user.cpf);

  return user.role === "admin" && userEmail === adminIdentity.email && userCpf === adminIdentity.cpf;
}

export async function ensureAdminUser() {
  if (!isMongoConfigured()) {
    return null;
  }

  const adminEmail = normalizeIdentifier(process.env.ADMIN_EMAIL || "admin@adrianbeauty.com");
  const adminPassword = String(process.env.ADMIN_PASSWORD || "Admin123!");
  const adminName = String(process.env.ADMIN_NAME || "Administrador Adrian Beauty");
  const adminCpf = normalizeCpf(process.env.ADMIN_CPF || "11111111111");

  const db = await getDb();
  const users = db.collection(getUsersCollectionName());
  const existing = await users.findOne({ email: adminEmail });

  if (existing) {
    if (existing.role !== "admin") {
      await users.updateOne(
        { _id: existing._id },
        { $set: { role: "admin", updatedAt: new Date().toISOString() } }
      );
    }

    return sanitizeUser({ ...existing, role: "admin" });
  }

  const now = new Date().toISOString();
  const sessionToken = createSessionToken();
  const payload = {
    name: adminName,
    cpf: adminCpf,
    email: adminEmail,
    passwordHash: createPasswordHash(adminPassword),
    role: "admin",
    sessionToken,
    sessionTokenExpiresAt: getSessionTokenExpiry(),
    createdAt: now,
    updatedAt: now
  };

  const result = await users.insertOne(payload);
  return sanitizeUser({ ...payload, _id: result.insertedId });
}

export async function findUserBySession(token) {
  if (!token || !isMongoConfigured()) {
    return null;
  }

  const db = await getDb();
  const user = await db.collection(getUsersCollectionName()).findOne({ sessionToken: token });
  
  // Check if session token is expired
  if (user && isSessionTokenExpired(user.sessionTokenExpiresAt)) {
    // Token is expired, treat as if it doesn't exist
    return null;
  }
  
  return user;
}

export async function requireAdmin(req) {
  const token = String(req.headers["x-session-token"] || "").trim();
  const user = await findUserBySession(token);

  if (!isConfiguredAdminUser(user)) {
    return null;
  }

  return user;
}

export async function invalidateUserSession(userId) {
  if (!isMongoConfigured()) {
    return false;
  }

  try {
    const db = await getDb();
    const result = await db.collection(getUsersCollectionName()).updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          sessionToken: null,
          sessionTokenExpiresAt: null,
          updatedAt: new Date().toISOString()
        }
      }
    );
    return result.modifiedCount > 0;
  } catch {
    return false;
  }
}

export async function getUploadsBucket() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: getUploadsBucketName() });
}

export function getUploadUrl(fileId) {
  return `/api/uploads?id=${String(fileId)}`;
}

export function getUploadIdFromUrl(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue.startsWith("/api/uploads?id=")) {
    return null;
  }

  const id = rawValue.replace("/api/uploads?id=", "").trim();
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}