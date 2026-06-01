import { useEffect, useMemo, useState } from "react";
import { products as fallbackProducts } from "./data/products";
import { frontendFlows, imageConfig } from "./config/storeConfig";

const ILLUSTRATIVE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#182742"/><stop offset="100%" stop-color="#6f78ff"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="250" cy="120" r="180" fill="#5fe6ff" fill-opacity="0.18"/><circle cx="980" cy="720" r="240" fill="#a68cff" fill-opacity="0.2"/><text x="50%" y="52%" fill="#e9f4ff" font-size="62" font-family="Sora, Arial" text-anchor="middle">Imagem Ilustrativa</text></svg>`
)}`;

const IMAGE_FALLBACK_PHOTO =
  "https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=1200";

const AUTH_USERS_KEY = "adrian-beauty-users";
const AUTH_SESSION_KEY = "adrian-beauty-session";
const ORDER_HISTORY_KEY = "adrian-beauty-orders";
const WISHLIST_KEY = "adrian-beauty-wishlist";

const AUTH_DEFAULT_FORM = {
  name: "",
  cpf: "",
  email: "",
  password: "",
  confirmPassword: ""
};

const AUTH_REMEMBERED_EMAIL_KEY = "adrian-beauty-auth-email";

const TRACKING_STATUS_STEPS = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em separacao",
  "Enviado"
];

const beautyHighlights = [
  {
    id: "sensorial",
    title: "Jornada Sensorial",
    subtitle: "Aromas, texturas e cuidado premium no seu ritual.",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "rotina",
    title: "Rotina Inteligente",
    subtitle: "Selecoes para dia, noite e ocasiões especiais.",
    image:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "signature",
    title: "Colecao Signature",
    subtitle: "Fragrancias e skincare em edicao curada.",
    image:
      "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80"
  }
];

const beautyGallery = [
  {
    id: "g1",
    label: "Glow Atelier",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "g2",
    label: "Studio Perfumaria",
    image:
      "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1400&q=80"
  }
];

function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function getDefaultConfig() {
  return {
    imageConfig: JSON.parse(JSON.stringify(imageConfig)),
    frontendFlows: JSON.parse(JSON.stringify(frontendFlows))
  };
}

function withImageFallback(event) {
  const stage = event.currentTarget.dataset.fallbackStage || "0";

  if (stage === "0") {
    event.currentTarget.dataset.fallbackStage = "1";
    event.currentTarget.src = IMAGE_FALLBACK_PHOTO;
    return;
  }

  if (stage === "1") {
    event.currentTarget.dataset.fallbackStage = "2";
    event.currentTarget.src = ILLUSTRATIVE_PLACEHOLDER;
    return;
  }
}

function readLocalJson(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function formatOrderDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function createTrackingCode(orderId) {
  return `LP${String(orderId).replace(/\D/g, "").slice(-8).padStart(8, "0")}`;
}

function normalizeCpf(value) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function normalizeIdentifier(value) {
  return value.trim().toLowerCase();
}

function getPasswordStrength(password) {
  const value = password.trim();

  if (!value) {
    return { label: "Senha vazia", score: 0 };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) {
    return { label: "Fraca", score };
  }

  if (score === 2) {
    return { label: "Média", score };
  }

  return { label: "Forte", score };
}

function formatCpfInput(value) {
  const digits = normalizeCpf(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedShowcase, setSelectedShowcase] = useState("todos");
  const [activeFlow, setActiveFlow] = useState("home");
  const [authView, setAuthView] = useState("login");
  const [authForm, setAuthForm] = useState(AUTH_DEFAULT_FORM);
  const [authMessage, setAuthMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState(() =>
    readLocalJson(AUTH_SESSION_KEY, null)
  );
  const [registeredUsers, setRegisteredUsers] = useState(() =>
    readLocalJson(AUTH_USERS_KEY, [])
  );
  const [rememberedEmail, setRememberedEmail] = useState(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return window.localStorage.getItem(AUTH_REMEMBERED_EMAIL_KEY) || "";
  });
  const [orderHistory, setOrderHistory] = useState(() =>
    readLocalJson(ORDER_HISTORY_KEY, [])
  );
  const [wishlistItems, setWishlistItems] = useState(() =>
    readLocalJson(WISHLIST_KEY, [])
  );
  const [search, setSearch] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingResult, setTrackingResult] = useState(null);

  const configState = useMemo(getDefaultConfig, []);
  const [allProducts, setAllProducts] = useState(fallbackProducts);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [catalogNotice, setCatalogNotice] = useState("");

  const [activeBanner, setActiveBanner] = useState(configState.imageConfig.heroBanners[0].id);

  useEffect(() => {
    let ignore = false;

    async function loadCatalog() {
      try {
        setIsCatalogLoading(true);
        setCatalogNotice("");

        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Falha ao carregar catalogo");
        }

        const payload = await response.json();
        const nextProducts = Array.isArray(payload?.products) ? payload.products : [];

        if (ignore) {
          return;
        }

        if (nextProducts.length > 0) {
          setAllProducts(nextProducts);
        } else {
          setAllProducts(fallbackProducts);
        }

        if (payload?.source === "fallback" && payload?.message) {
          setCatalogNotice(payload.message);
        }
      } catch {
        if (ignore) {
          return;
        }

        setAllProducts(fallbackProducts);
        setCatalogNotice("Sem conexao com API. Exibindo catalogo ilustrativo local.");
      } finally {
        if (!ignore) {
          setIsCatalogLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      ignore = true;
    };
  }, []);

  const categories = useMemo(() => {
    const values = [];

    allProducts.forEach((product) => {
      if (typeof product?.category !== "string" || !product.category.trim()) {
        return;
      }

      if (!values.includes(product.category)) {
        values.push(product.category);
      }
    });

    return values;
  }, [allProducts]);

  const currentBanner =
    configState.imageConfig.heroBanners.find((banner) => banner.id === activeBanner) ||
    configState.imageConfig.heroBanners[0];

  const visibleProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const byCategory =
        selectedCategory === "Todos" || product.category === selectedCategory;
      const byShowcase =
        selectedShowcase === "todos" || product.flow === selectedShowcase;
      const bySearch =
        search.trim() === "" ||
        product.name.toLowerCase().includes(search.toLowerCase().trim());

      return byCategory && byShowcase && bySearch;
    });
  }, [allProducts, search, selectedCategory, selectedShowcase]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );

  useEffect(() => {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(currentUser));
      return;
    }

    localStorage.removeItem(AUTH_SESSION_KEY);
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (rememberedEmail) {
      window.localStorage.setItem(AUTH_REMEMBERED_EMAIL_KEY, rememberedEmail);
      return;
    }

    window.localStorage.removeItem(AUTH_REMEMBERED_EMAIL_KEY);
  }, [rememberedEmail]);

  function addToCart(product) {
    setCartItems((previous) => {
      const existing = previous.find((item) => item.id === product.id);
      if (existing) {
        return previous.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }

      return [...previous, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  }

  function updateQuantity(id, delta) {
    setCartItems((previous) =>
      previous
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(item.qty + delta, 0) } : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function toggleWishlist(product) {
    setWishlistItems((previous) => {
      const exists = previous.some((item) => item.id === product.id);
      if (exists) {
        return previous.filter((item) => item.id !== product.id);
      }

      return [product, ...previous];
    });
  }

  function openAuthView(view) {
    setAuthView(view);
    setShowPassword(false);
    setAuthMessage("");
    setActiveFlow("auth");

    if (view === "login") {
      setAuthForm((previous) => ({
        ...AUTH_DEFAULT_FORM,
        email: rememberedEmail || previous.email
      }));
      setRememberLogin(true);
      return;
    }

    if (view === "reset") {
      setAuthForm(AUTH_DEFAULT_FORM);
      return;
    }

    setAuthForm(AUTH_DEFAULT_FORM);
  }

  function handleFlowAction(key) {
    if (key === "login" || key === "register") {
      openAuthView(key === "register" ? "register" : "login");
      return;
    }

    if (key === "support") {
      setActiveFlow("support");
      return;
    }

    if (key === "account") {
      if (currentUser) {
        setActiveFlow("account");
      } else {
        openAuthView("login");
      }
      return;
    }

    if (key === "orders") {
      setActiveFlow("orders");
      return;
    }

    if (key === "wishlist") {
      setActiveFlow("wishlist");
      return;
    }

    if (key === "tracking") {
      setActiveFlow("tracking");
      return;
    }

    setActiveFlow("home");
  }

  function handleAuthSubmit(event) {
    event.preventDefault();

    const identifier = normalizeIdentifier(authForm.email);
    const identifierCpf = normalizeCpf(identifier);
    const cpf = normalizeCpf(authForm.cpf.trim());
    const password = authForm.password.trim();
    const confirmPassword = authForm.confirmPassword.trim();
    const name = authForm.name.trim();

    if (authView === "register") {
      if (!name) {
        setAuthMessage("Informe seu nome para criar a conta.");
        return;
      }

      if (!identifier.includes("@")) {
        setAuthMessage("Informe um e-mail válido para o cadastro.");
        return;
      }

      if (cpf.length !== 11) {
        setAuthMessage("Informe um CPF válido com 11 dígitos.");
        return;
      }

      if (!password || password.length < 8) {
        setAuthMessage("A senha precisa ter pelo menos 8 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        setAuthMessage("A confirmação de senha não confere.");
        return;
      }

      if (getPasswordStrength(password).score < 2) {
        setAuthMessage("Use uma senha mais forte com letras e números.");
        return;
      }

      const emailExists = registeredUsers.some((user) => user.email === identifier);
      if (emailExists) {
        setAuthMessage("Este e-mail já possui cadastro.");
        return;
      }

      const cpfExists = registeredUsers.some(
        (user) => normalizeCpf(user.cpf || "") === cpf
      );
      if (cpfExists) {
        setAuthMessage("Este CPF já possui cadastro.");
        return;
      }

      const nextUser = { name, cpf, email: identifier, password };
      setRegisteredUsers((previous) => [...previous, nextUser]);
      setCurrentUser({ name, cpf, email: identifier });
      setRememberedEmail(identifier);
      setAuthForm(AUTH_DEFAULT_FORM);
      setAuthMessage("Conta criada com sucesso. Você já entrou.");
      setActiveFlow("account");
      setAuthView("login");
      return;
    }

    if (authView === "reset") {
      if (!identifier) {
        setAuthMessage("Informe o e-mail ou CPF da conta para redefinir a senha.");
        return;
      }

      const hasEmailIdentifier = identifier.includes("@");
      const hasCpfIdentifier = identifierCpf.length === 11;

      if (!hasEmailIdentifier && !hasCpfIdentifier) {
        setAuthMessage("Informe um e-mail válido ou CPF com 11 dígitos.");
        return;
      }

      if (!password || password.length < 8) {
        setAuthMessage("Crie uma nova senha com pelo menos 8 caracteres.");
        return;
      }

      if (password !== confirmPassword) {
        setAuthMessage("A confirmação de senha não confere.");
        return;
      }

      const updatedUsers = registeredUsers.map((user) => {
        const matchesEmail = hasEmailIdentifier && user.email === identifier;
        const matchesCpf =
          hasCpfIdentifier && normalizeCpf(user.cpf || "") === identifierCpf;

        if (!matchesEmail && !matchesCpf) {
          return user;
        }

        return {
          ...user,
          password
        };
      });

      const changed = updatedUsers.some((user, index) => user !== registeredUsers[index]);

      if (!changed) {
        setAuthMessage("Nenhuma conta foi localizada com esses dados.");
        return;
      }

      setRegisteredUsers(updatedUsers);
      setAuthForm(AUTH_DEFAULT_FORM);
      setAuthView("login");
      setAuthMessage("Senha atualizada. Use a nova senha para entrar.");
      return;
    }

    if (!identifier || !password) {
      setAuthMessage("Preencha e-mail/CPF e senha para continuar.");
      return;
    }

    const hasEmailIdentifier = identifier.includes("@");
    const hasCpfIdentifier = identifierCpf.length === 11;

    if (!hasEmailIdentifier && !hasCpfIdentifier) {
      setAuthMessage("Informe um e-mail válido ou CPF com 11 dígitos.");
      return;
    }

    const matchedUser = registeredUsers.find((user) => {
      const matchesEmail = hasEmailIdentifier && user.email === identifier;
      const matchesCpf =
        hasCpfIdentifier && normalizeCpf(user.cpf || "") === identifierCpf;

      return (matchesEmail || matchesCpf) && user.password === password;
    });

    if (!matchedUser) {
      setAuthMessage("Credenciais inválidas. Verifique e tente novamente.");
      return;
    }

    setCurrentUser({
      name: matchedUser.name,
      cpf: normalizeCpf(matchedUser.cpf || ""),
      email: matchedUser.email
    });
    setRememberedEmail(rememberLogin ? matchedUser.email : "");
    setAuthForm(AUTH_DEFAULT_FORM);
    setAuthMessage("Login realizado com sucesso.");
    setActiveFlow("account");
  }

  function handleLogout() {
    setCurrentUser(null);
    setActiveFlow("home");
    setAuthMessage("Você saiu da conta.");
  }

  function handleCheckout() {
    if (!currentUser) {
      setAuthMessage("Entre ou cadastre-se para finalizar a compra.");
      openAuthView("login");
      setIsCartOpen(false);
      return;
    }

    if (cartItems.length === 0) {
      return;
    }

    const orderId = `order-${Date.now()}`;
    const order = {
      id: orderId,
      createdAt: new Date().toISOString(),
      total: subtotal,
      items: cartItems,
      customer: currentUser.email,
      status: "Em processamento",
      trackingCode: createTrackingCode(orderId)
    };

    setOrderHistory((previous) => [order, ...previous]);
    setCartItems([]);
    setIsCartOpen(false);
    setActiveFlow("orders");
    setAuthMessage("Compra finalizada com sucesso.");
  }

  function handleTrackOrder(event) {
    event.preventDefault();

    const normalized = trackingInput.trim().toUpperCase();
    if (!normalized) {
      setTrackingResult({
        found: false,
        message: "Informe um codigo de rastreio para consultar."
      });
      return;
    }

    const matched = orderHistory.find(
      (order) => String(order.trackingCode || "").toUpperCase() === normalized
    );

    if (!matched) {
      setTrackingResult({
        found: false,
        message: "Codigo nao localizado. Revise o numero e tente novamente."
      });
      return;
    }

    setTrackingResult({
      found: true,
      order: matched
    });
  }

  const renderFlowPanel = () => {
    if (activeFlow === "auth") {
      const isLogin = authView === "login";
      const isRegister = authView === "register";
      const isReset = authView === "reset";
      const authTitle = isRegister
        ? "Criar sua conta"
        : isReset
          ? "Recuperar acesso"
          : "Entrar na sua conta";
      const authDescription = isRegister
        ? "Cadastre-se para acompanhar pedidos, finalizar compras e salvar sua experiência."
        : isReset
          ? "Redefina sua senha com segurança e volte a acessar sua conta em poucos passos."
          : "Use e-mail ou CPF para entrar rapidamente e retomar seus pedidos, desejos e checkout.";
      const primaryLabel = isRegister
        ? "Criar conta"
        : isReset
          ? "Atualizar senha"
          : "Entrar";

      return (
        <section className="flow-panel auth-panel">
          <div className="flow-copy">
            <p className="flow-kicker">Acesso seguro</p>
            <h3>{authTitle}</h3>
            <p>{authDescription}</p>
            <div className="flow-benefits auth-benefits">
              <span>{isRegister ? "Cadastro em 1 minuto" : "Checkout protegido"}</span>
              <span>{isReset ? "Recuperação local" : "Histórico local de pedidos"}</span>
              <span>{isLogin ? "Acesso por e-mail ou CPF" : "Atalho para minha conta"}</span>
            </div>
            <div className="auth-steps">
              <span>1. Escolha o fluxo</span>
              <span>2. Preencha os dados</span>
              <span>3. Entre ou atualize a senha</span>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <div className="auth-switch auth-tabs">
              <button type="button" className={isLogin ? "chip active" : "chip"} onClick={() => openAuthView("login")}>
                Login
              </button>
              <button type="button" className={isRegister ? "chip active" : "chip"} onClick={() => openAuthView("register")}>
                Cadastro
              </button>
              <button type="button" className={isReset ? "chip active" : "chip"} onClick={() => openAuthView("reset")}>
                Recuperar senha
              </button>
            </div>

            {isRegister && (
              <>
                <label className="field-group">
                  <span>Nome completo</span>
                  <input
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm((previous) => ({ ...previous, name: event.target.value }))
                    }
                    placeholder="Seu nome"
                  />
                </label>

                <label className="field-group">
                  <span>CPF</span>
                  <input
                    inputMode="numeric"
                    value={authForm.cpf}
                    onChange={(event) =>
                      setAuthForm((previous) => ({
                        ...previous,
                        cpf: formatCpfInput(event.target.value)
                      }))
                    }
                    placeholder="000.000.000-00"
                  />
                </label>
              </>
            )}

            <label className="field-group">
              <span>{isLogin || isReset ? "E-mail ou CPF" : "E-mail"}</span>
              <input
                type={isLogin || isReset ? "text" : "email"}
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm((previous) => ({ ...previous, email: event.target.value }))
                }
                placeholder={isLogin || isReset ? "voce@exemplo.com ou CPF" : "voce@exemplo.com"}
              />
            </label>

            {(isRegister || isReset) && (
              <label className="field-group">
                <span>{isReset ? "Nova senha" : "Senha"}</span>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={authForm.password}
                    onChange={(event) =>
                      setAuthForm((previous) => ({ ...previous, password: event.target.value }))
                    }
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((previous) => !previous)}
                  >
                    {showPassword ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </label>
            )}

            {(isRegister || isReset) && (
              <label className="field-group">
                <span>Confirmar senha</span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={authForm.confirmPassword}
                  onChange={(event) =>
                    setAuthForm((previous) => ({
                      ...previous,
                      confirmPassword: event.target.value
                    }))
                  }
                  placeholder="Repita a senha"
                />
              </label>
            )}

            {isLogin && (
              <label className="remember-row">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(event) => setRememberLogin(event.target.checked)}
                />
                <span>Lembrar meu e-mail neste navegador</span>
              </label>
            )}

            {(isRegister || isReset || isLogin) && authForm.password && (
              <div className="strength-meter" aria-live="polite">
                <span
                  className={
                    getPasswordStrength(authForm.password).score >= 3
                      ? "strength strong"
                      : getPasswordStrength(authForm.password).score === 2
                        ? "strength medium"
                        : "strength weak"
                  }
                />
                <p>Força da senha: {getPasswordStrength(authForm.password).label}</p>
              </div>
            )}

            {isLogin && (
              <button
                type="button"
                className="link-button"
                onClick={() => openAuthView("reset")}
              >
                Esqueci minha senha
              </button>
            )}

            <div className="auth-actions">
              <button type="submit" className="add-btn">
                {primaryLabel}
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setAuthForm(AUTH_DEFAULT_FORM);
                  setAuthMessage("");
                  setShowPassword(false);
                }}
              >
                Limpar
              </button>
            </div>

            <p className="auth-footnote">
              {isLogin
                ? "Use CPF se quiser entrar sem lembrar o e-mail cadastrado."
                : isReset
                  ? "A alteração vale imediatamente para o próximo acesso."
                  : "Seu cadastro é salvo localmente neste navegador para testes do fluxo."}
            </p>

            {authMessage && <p className="flow-message">{authMessage}</p>}
          </form>
        </section>
      );
    }

    if (activeFlow === "account") {
      return (
        <section className="flow-panel account-panel">
          <div className="flow-copy">
            <p className="flow-kicker">Minha conta</p>
            <h3>{currentUser ? `Olá, ${currentUser.name}` : "Acesse sua conta"}</h3>
            <p>
              Consulte seus dados, pedidos recentes e acompanhe sua rotina de compras.
            </p>
          </div>

          {currentUser ? (
            <div className="account-grid">
              <article className="info-card">
                <strong>Dados da conta</strong>
                <p>{currentUser.name}</p>
                <p>{currentUser.cpf ? formatCpfInput(currentUser.cpf) : "CPF não informado"}</p>
                <p>{currentUser.email}</p>
                <button type="button" className="ghost-btn" onClick={handleLogout}>
                  Sair
                </button>
              </article>

              <article className="info-card">
                <strong>Pedidos recentes</strong>
                {currentUserOrders.length === 0 ? (
                  <p>Sem pedidos ainda. Finalize sua primeira compra.</p>
                ) : (
                  <div className="mini-list">
                    {currentUserOrders.slice(0, 3).map((order) => (
                      <div key={order.id} className="mini-row">
                        <span>{formatOrderDate(order.createdAt)}</span>
                        <strong>{formatPrice(order.total)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          ) : (
            <button type="button" className="add-btn" onClick={() => openAuthView("login")}>
              Entrar para acessar a conta
            </button>
          )}
        </section>
      );
    }

    if (activeFlow === "orders") {
      return (
        <section className="flow-panel orders-panel">
          <div className="flow-copy">
            <p className="flow-kicker">Pedidos</p>
            <h3>Resumo de compras</h3>
            <p>Veja o histórico dos pedidos realizados nesta navegação.</p>
          </div>

          {currentUser ? (
            currentUserOrders.length === 0 ? (
              <p className="empty-list">Nenhum pedido realizado ainda.</p>
            ) : (
              <div className="orders-list">
                {currentUserOrders.map((order) => (
                  <article key={order.id} className="order-card">
                    <div className="order-head">
                      <strong>{formatOrderDate(order.createdAt)}</strong>
                      <span>{order.status}</span>
                    </div>
                    <p>Rastreio: {order.trackingCode || "Não disponível"}</p>
                    <p>{order.items.length} item(ns)</p>
                    <strong>{formatPrice(order.total)}</strong>
                  </article>
                ))}
              </div>
            )
          ) : (
            <button type="button" className="add-btn" onClick={() => openAuthView("login")}>
              Entre para visualizar seus pedidos
            </button>
          )}
        </section>
      );
    }

    if (activeFlow === "wishlist") {
      return (
        <section className="flow-panel wishlist-panel">
          <div className="flow-copy">
            <p className="flow-kicker">Desejos</p>
            <h3>Sua lista curada</h3>
            <p>Salve produtos para rever depois e montar uma compra mais estratégica.</p>
          </div>

          {wishlistItems.length === 0 ? (
            <p className="empty-list">Nenhum item salvo ainda. Use o coração nos cards.</p>
          ) : (
            <div className="orders-list">
              {wishlistItems.map((item) => (
                <article key={item.id} className="order-card wishlist-card">
                  <div className="order-head">
                    <strong>{item.name}</strong>
                    <span>{item.category}</span>
                  </div>
                  <p>{item.badge}</p>
                  <div className="wishlist-actions">
                    <strong>{formatPrice(item.price)}</strong>
                    <div className="wishlist-buttons">
                      <button type="button" className="ghost-btn" onClick={() => addToCart(item)}>
                        Adicionar ao carrinho
                      </button>
                      <button type="button" className="ghost-btn" onClick={() => toggleWishlist(item)}>
                        Remover
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (activeFlow === "support") {
      return (
        <section className="flow-panel support-panel">
          <div className="flow-copy">
            <p className="flow-kicker">Atendimento</p>
            <h3>Suporte boutique</h3>
            <p>Canal de atendimento para dúvidas, trocas e orientações de rotina.</p>
          </div>

          <div className="account-grid">
            <article className="info-card">
              <strong>WhatsApp</strong>
              <p>{configState.frontendFlows.support.whatsapp}</p>
            </article>
            <article className="info-card">
              <strong>E-mail</strong>
              <p>{configState.frontendFlows.support.email}</p>
            </article>
            <article className="info-card">
              <strong>Horario</strong>
              <p>{configState.frontendFlows.support.hours}</p>
            </article>
            <article className="info-card">
              <strong>Postagem</strong>
              <p>{configState.frontendFlows.support.eta}</p>
            </article>
          </div>
        </section>
      );
    }

    if (activeFlow === "tracking") {
      return (
        <section className="flow-panel support-panel">
          <div className="flow-copy">
            <p className="flow-kicker">Rastrear pedido</p>
            <h3>Acompanhe sua entrega</h3>
            <p>
              Digite o codigo de rastreio para consultar o ultimo status do pedido.
            </p>
            <div className="flow-benefits">
              {TRACKING_STATUS_STEPS.map((step) => (
                <span key={step}>{step}</span>
              ))}
            </div>
          </div>

          <form className="auth-form" onSubmit={handleTrackOrder}>
            <label className="field-group">
              <span>Codigo de rastreio</span>
              <input
                value={trackingInput}
                onChange={(event) => setTrackingInput(event.target.value.toUpperCase())}
                placeholder="Ex: LP12345678"
              />
            </label>

            <div className="auth-actions">
              <button type="submit" className="add-btn">
                Consultar pedido
              </button>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setTrackingInput("");
                  setTrackingResult(null);
                }}
              >
                Limpar
              </button>
            </div>

            {trackingResult?.found && trackingResult.order && (
              <article className="info-card">
                <strong>Status: {trackingResult.order.status}</strong>
                <p>Pedido: {trackingResult.order.id}</p>
                <p>Rastreio: {trackingResult.order.trackingCode}</p>
                <p>Data: {formatOrderDate(trackingResult.order.createdAt)}</p>
                <p>Total: {formatPrice(trackingResult.order.total)}</p>
              </article>
            )}

            {trackingResult?.found === false && (
              <p className="empty-list">{trackingResult.message}</p>
            )}
          </form>
        </section>
      );
    }

    return null;
  };

  function handleCategoryMenuClick(item) {
    const normalized = item.toLowerCase();

    if (normalized.includes("combos")) {
      setSelectedShowcase("combos");
      setActiveFlow("home");
      return;
    }

    if (normalized.includes("promoc")) {
      setSelectedShowcase("promocoes");
      setActiveFlow("home");
      return;
    }

    if (normalized.includes("desejados")) {
      setSelectedShowcase("mais-desejados");
      setActiveFlow("home");
      return;
    }

    if (normalized.includes("wishlist") || normalized.includes("desejos")) {
      setActiveFlow("wishlist");
      return;
    }

    const match = categories.find(
      (category) => category.toLowerCase() === normalized
    );

    if (match) {
      setSelectedCategory(match);
      setActiveFlow("home");
      return;
    }

    setSelectedCategory("Todos");
    setActiveFlow("home");
  }

  return (
    <div className="store-app">
      <header className="header-shell">
        <div className="header-top">
          <p>
            {currentUser
              ? `Olá, ${currentUser.name}`
              : "Olá, visitante"} | Entrar ou cadastrar
          </p>
          <div className="top-links">
            {configState.frontendFlows.accountLinks.map((link) => (
              <button key={link.key} onClick={() => handleFlowAction(link.key)}>
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="header-main">
          <div className="brand">
            <span className="brand-kicker">perfumaria ltda</span>
            <h1>Adrian Beauty Store</h1>
          </div>

          <label className="search-wrap">
            <input
              placeholder="O que voce esta buscando hoje?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="header-actions">
            <button className="cart-button" onClick={() => setIsCartOpen(true)}>
              Carrinho ({cartItems.reduce((sum, item) => sum + item.qty, 0)})
            </button>
          </div>
        </div>

        <div className="shipping-strip" aria-label="Informacoes da loja">
          <span>Entregamos para todo o Brasil</span>
          <span>Perfumes originais e importados</span>
          <span>Parcelamento em ate 6x sem juros</span>
        </div>
      </header>

      <main className="content-grid">
        <aside className="category-sidebar" aria-label="Categorias da loja">
          <strong>Categorias</strong>
          {configState.frontendFlows.categoryMenu.map((item) => (
            <button key={item} type="button" onClick={() => handleCategoryMenuClick(item)}>
              {item}
            </button>
          ))}
        </aside>

        <section className="main-column">
          <section
            className="hero"
            style={{ backgroundImage: `url(${currentBanner.image})` }}
          >
            <div className="hero-overlay">
              <p className="hero-kicker">
                CONFIGURACAO DE IMAGEM: {configState.imageConfig.mode}
              </p>
              <h2>{currentBanner.title}</h2>
              <p>{currentBanner.subtitle}</p>
              <div className="hero-buttons">
                {configState.imageConfig.heroBanners.map((banner) => (
                  <button
                    key={banner.id}
                    className={activeBanner === banner.id ? "active-hero" : ""}
                    onClick={() => setActiveBanner(banner.id)}
                  >
                    Banner {banner.id.replace("hero-", "")}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <p className="image-note">{configState.imageConfig.note}</p>

          <section className="trust-strip" aria-label="Beneficios da loja">
            {configState.frontendFlows.trustBadges.map((badge) => (
              <article key={badge.key} className="trust-card">
                <strong>{badge.title}</strong>
                <p>{badge.subtitle}</p>
              </article>
            ))}
          </section>

          <section className="showcase-tabs" aria-label="Buscas em alta">
            {configState.frontendFlows.hotSearches.map((term) => (
              <button key={term} className="chip" onClick={() => setSearch(term)}>
                {term}
              </button>
            ))}
          </section>

          {renderFlowPanel()}

          <section className="beauty-highlights" aria-label="Destaques ilustrativos">
            {beautyHighlights.map((item) => (
              <article key={item.id} className="highlight-card">
                <img src={item.image} alt={item.title} onError={withImageFallback} />
                <div className="highlight-overlay">
                  <strong>{item.title}</strong>
                  <p>{item.subtitle}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="showcase-tabs">
            {configState.frontendFlows.showcaseTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedShowcase(tab.key)}
                className={selectedShowcase === tab.key ? "chip active" : "chip"}
              >
                {tab.label}
              </button>
            ))}
          </section>

          <section className="category-strip">
            {["Todos", ...categories].map((category) => (
              <button
                key={category}
                className={selectedCategory === category ? "chip active" : "chip"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </section>

          {catalogNotice && <p className="image-note">{catalogNotice}</p>}

          <div className="section-head">
            <h3>Lancamentos</h3>
            <p>Vitrine com os destaques mais procurados do momento.</p>
          </div>

          <section className="product-grid">
            {isCatalogLoading && (
              <p className="empty-list">Carregando catalogo...</p>
            )}
            {!isCatalogLoading &&
              visibleProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <div className="image-wrapper">
                    <img src={product.image} alt={product.name} onError={withImageFallback} />
                    <span className="badge">{product.badge}</span>
                  </div>
                  <div className="product-body">
                    <small>{product.category}</small>
                    <h3>{product.name}</h3>
                    <p className="price-line">
                      <span className="price">{formatPrice(product.price)}</span>
                      <span className="old-price">{formatPrice(product.oldPrice)}</span>
                    </p>
                    <div className="product-actions">
                      <button className="add-btn" onClick={() => addToCart(product)}>
                        Adicionar
                      </button>
                      <button
                        type="button"
                        className="ghost-btn product-wishlist"
                        onClick={() => toggleWishlist(product)}
                      >
                        {wishlistItems.some((item) => item.id === product.id)
                          ? "Salvo"
                          : "Salvar"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            {!isCatalogLoading && visibleProducts.length === 0 && (
              <p className="empty-list">Nenhum item para os filtros atuais.</p>
            )}
          </section>

          <div className="section-head">
            <h3>Escolha pelo estilo</h3>
            <p>Colecoes para cada assinatura olfativa.</p>
          </div>

          <section className="beauty-gallery" aria-label="Galeria ilustrativa">
            {beautyGallery.map((item) => (
              <article key={item.id} className="gallery-card">
                <img src={item.image} alt={item.label} onError={withImageFallback} />
                <p>{item.label}</p>
              </article>
            ))}
          </section>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Adrian Beauty Store</strong>
          <p>Curadoria de fragrancias premium com atendimento boutique.</p>
        </div>
        <p>Atendimento: seg a sab, 9h as 20h | WhatsApp (11) 99999-9999</p>
      </footer>

      <aside className={isCartOpen ? "cart-drawer open" : "cart-drawer"}>
        <div className="cart-header">
          <h3>Seu carrinho</h3>
          <button onClick={() => setIsCartOpen(false)}>Fechar</button>
        </div>

        {cartItems.length === 0 ? (
          <p className="empty">Seu carrinho esta vazio.</p>
        ) : (
          <div className="cart-list">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} onError={withImageFallback} />
                <div>
                  <p>{item.name}</p>
                  <small>{formatPrice(item.price)}</small>
                  <div className="qty-control">
                    <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="cart-footer">
          <p>
            Subtotal: <strong>{formatPrice(subtotal)}</strong>
          </p>
          <button className="checkout" onClick={handleCheckout}>
            Finalizar compra
          </button>
        </div>
      </aside>

      {isCartOpen && <div className="overlay" onClick={() => setIsCartOpen(false)} />}
    </div>
  );
}

export default App;
