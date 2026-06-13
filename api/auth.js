import {
  createPasswordHash,
  createSessionToken,
  ensureAdminUser,
  getDb,
  getUsersCollectionName,
  getSessionTokenExpiry,
  invalidateUserSession,
  isMongoConfigured,
  normalizeCpf,
  normalizeIdentifier,
  sanitizeUser
} from "./_lib/mongo.js";

function sendFallback(res, message) {
  return res.status(200).json({
    source: "fallback",
    message
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido" });
  }

  if (!isMongoConfigured()) {
    return sendFallback(
      res,
      "Banco nao configurado. O frontend continuara operando com armazenamento local."
    );
  }

  await ensureAdminUser();

  const action = String(req.body?.action || "").trim();
  const db = await getDb();
  const users = db.collection(getUsersCollectionName());

  if (action === "register") {
    const name = String(req.body?.name || "").trim();
    const email = normalizeIdentifier(req.body?.email);
    const cpf = normalizeCpf(req.body?.cpf);
    const password = String(req.body?.password || "").trim();

    if (!name || !email.includes("@") || cpf.length !== 11 || password.length < 8) {
      return res.status(400).json({ error: "Dados invalidos para cadastro." });
    }

    const duplicate = await users.findOne({
      $or: [{ email }, { cpf }]
    });

    if (duplicate) {
      return res.status(409).json({ error: "E-mail ou CPF ja cadastrados." });
    }

    const sessionToken = createSessionToken();
    const now = new Date().toISOString();
    const payload = {
      name,
      email,
      cpf,
      passwordHash: createPasswordHash(password),
      role: "customer",
      sessionToken,
      sessionTokenExpiresAt: getSessionTokenExpiry(),
      createdAt: now,
      updatedAt: now
    };

    const result = await users.insertOne(payload);

    return res.status(200).json({
      source: "mongodb",
      user: sanitizeUser({ ...payload, _id: result.insertedId }),
      sessionToken,
      message: "Conta criada com sucesso."
    });
  }

  if (action === "login") {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const cpf = normalizeCpf(identifier);
    const password = String(req.body?.password || "").trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: "Informe as credenciais." });
    }

    const query = identifier.includes("@")
      ? { email: identifier }
      : cpf.length === 11
        ? { cpf }
        : null;

    if (!query) {
      return res.status(400).json({ error: "Informe e-mail ou CPF valido." });
    }

    const user = await users.findOne(query);

    if (!user || user.passwordHash !== createPasswordHash(password)) {
      return res.status(401).json({ error: "Credenciais invalidas." });
    }

    const sessionToken = createSessionToken();
    const sessionTokenExpiresAt = getSessionTokenExpiry();
    await users.updateOne(
      { _id: user._id },
      { 
        $set: { 
          sessionToken, 
          sessionTokenExpiresAt,
          updatedAt: new Date().toISOString() 
        } 
      }
    );

    return res.status(200).json({
      source: "mongodb",
      user: sanitizeUser({ ...user, sessionToken }),
      sessionToken,
      message: user.role === "admin"
        ? "Painel administrativo liberado."
        : "Login realizado com sucesso."
    });
  }

  if (action === "reset") {
    const identifier = normalizeIdentifier(req.body?.identifier);
    const cpf = normalizeCpf(identifier);
    const password = String(req.body?.password || "").trim();

    if (!identifier || password.length < 8) {
      return res.status(400).json({ error: "Dados invalidos para redefinicao." });
    }

    const query = identifier.includes("@")
      ? { email: identifier }
      : cpf.length === 11
        ? { cpf }
        : null;

    if (!query) {
      return res.status(400).json({ error: "Informe e-mail ou CPF valido." });
    }

    const result = await users.updateOne(query, {
      $set: {
        passwordHash: createPasswordHash(password),
        updatedAt: new Date().toISOString()
      }
    });

    if (!result.matchedCount) {
      return res.status(404).json({ error: "Conta nao localizada." });
    }

    return res.status(200).json({
      source: "mongodb",
      message: "Senha atualizada com sucesso."
    });
  }

  if (action === "logout") {
    const sessionToken = String(req.headers["x-session-token"] || "").trim();
    
    if (!sessionToken) {
      return res.status(400).json({ error: "Nenhuma sessao ativa." });
    }

    const user = await users.findOne({ sessionToken });
    
    if (!user) {
      return res.status(401).json({ error: "Sessao invalida ou expirada." });
    }

    // Invalidate the session
    await invalidateUserSession(String(user._id));

    return res.status(200).json({
      source: "mongodb",
      message: "Logout realizado com sucesso."
    });
  }

  return res.status(400).json({ error: "Acao nao suportada." });
}