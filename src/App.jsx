import { useEffect, useMemo, useState } from "react";
import { frontendFlows, imageConfig } from "./config/storeConfig";
import { products as fallbackProducts } from "./data/products";
import {
  AccountPanel,
  AdminPanel,
  AuthPanel,
  HomeCallout,
  OrdersPanel,
  SupportPanel,
  TrackingPanel,
  WishlistPanel
} from "./components/FlowPanels";
import {
  CartDrawer,
  GallerySection,
  HeroSection,
  HighlightsSection,
  ProductCatalogSection
} from "./components/StoreSections";
import {
  ADMIN_PRODUCT_DEFAULT,
  AUTH_DEFAULT_FORM,
  AUTH_REMEMBERED_EMAIL_KEY,
  AUTH_SESSION_KEY,
  AUTH_USERS_KEY,
  ORDER_HISTORY_KEY,
  WISHLIST_KEY,
  createTrackingCode,
  getJson,
  getPasswordStrength,
  normalizeCpf,
  normalizeIdentifier,
  readLocalJson
} from "./lib/storeUi";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").trim();
const ALLOW_LOCAL_AUTH_FALLBACK =
  String(import.meta.env.VITE_ALLOW_LOCAL_AUTH_FALLBACK || "false").toLowerCase() === "true";

function buildApiUrl(path) {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
}

// Helper to handle API responses and detect session expiry
function handleApiResponse(response) {
  if (response.status === 401) {
    // Session expired or invalid - this will be handled by the caller
    return { isSessionExpired: true, response };
  }
  return { isSessionExpired: false, response };
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
  const [isAuthLoading, setIsAuthLoading] = useState(false);

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

  const [allProducts, setAllProducts] = useState(fallbackProducts);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [catalogSource, setCatalogSource] = useState("fallback");
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(imageConfig.heroBanners[0].id);

  const [adminForm, setAdminForm] = useState(ADMIN_PRODUCT_DEFAULT);
  const [adminMessage, setAdminMessage] = useState("");
  const [isAdminSaving, setIsAdminSaving] = useState(false);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  const accountLinks = useMemo(() => {
    if (!isAdmin) {
      return frontendFlows.accountLinks;
    }

    return [...frontendFlows.accountLinks, { key: "admin", label: "Area Admin" }];
  }, [isAdmin]);

  const categories = useMemo(() => {
    const nextCategories = [];

    allProducts.forEach((product) => {
      if (!product?.category || nextCategories.includes(product.category)) {
        return;
      }

      nextCategories.push(product.category);
    });

    return nextCategories;
  }, [allProducts]);

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

  const currentUserOrders = useMemo(() => {
    if (!currentUser?.email) {
      return [];
    }

    return orderHistory.filter((order) => order.customer === currentUser.email);
  }, [currentUser, orderHistory]);

  useEffect(() => {
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(currentUser));
      // Also save session token separately for easy access in API calls
      if (currentUser.sessionToken) {
        localStorage.setItem("x-session-token", currentUser.sessionToken);
      }
      return;
    }

    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem("x-session-token");
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  useEffect(() => {
    if (rememberedEmail) {
      window.localStorage.setItem(AUTH_REMEMBERED_EMAIL_KEY, rememberedEmail);
      return;
    }

    window.localStorage.removeItem(AUTH_REMEMBERED_EMAIL_KEY);
  }, [rememberedEmail]);

  async function loadCatalog() {
    try {
      setIsCatalogLoading(true);
      const response = await fetch(buildApiUrl("/api/products"));
      const payload = await getJson(response);
      const nextProducts = Array.isArray(payload?.products) ? payload.products : [];

      setAllProducts(nextProducts.length > 0 ? nextProducts : fallbackProducts);
      setCatalogNotice(payload?.message || "");
      setCatalogSource(payload?.source || "fallback");
    } catch {
      setAllProducts(fallbackProducts);
      setCatalogNotice("Sem conexao com a API. Exibindo vitrine local.");
      setCatalogSource("fallback");
    } finally {
      setIsCatalogLoading(false);
    }
  }

  useEffect(() => {
    loadCatalog();
  }, []);

  function setAuthField(field, value) {
    setAuthForm((previous) => ({ ...previous, [field]: value }));
  }

  function setAdminField(field, value) {
    setAdminForm((previous) => ({ ...previous, [field]: value }));
  }

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
      return;
    }

    setAuthForm(AUTH_DEFAULT_FORM);
  }

  function getLocalAuthResult(action, payload) {
    const identifier = normalizeIdentifier(payload.email);
    const identifierCpf = normalizeCpf(identifier);
    const password = payload.password.trim();
    const cpf = normalizeCpf(payload.cpf);

    if (action === "register") {
      const emailExists = registeredUsers.some((user) => user.email === identifier);
      const cpfExists = registeredUsers.some(
        (user) => normalizeCpf(user.cpf || "") === cpf
      );

      if (emailExists || cpfExists) {
        throw new Error("E-mail ou CPF ja cadastrados neste navegador.");
      }

      const nextUser = {
        name: payload.name.trim(),
        cpf,
        email: identifier,
        password,
        role: "customer"
      };

      setRegisteredUsers((previous) => [...previous, nextUser]);
      return {
        user: nextUser,
        message: "Conta criada localmente neste navegador.",
        source: "fallback"
      };
    }

    if (action === "reset") {
      const hasEmailIdentifier = identifier.includes("@");
      const hasCpfIdentifier = identifierCpf.length === 11;
      let changed = false;

      setRegisteredUsers((previous) =>
        previous.map((user) => {
          const matchesEmail = hasEmailIdentifier && user.email === identifier;
          const matchesCpf =
            hasCpfIdentifier && normalizeCpf(user.cpf || "") === identifierCpf;

          if (!matchesEmail && !matchesCpf) {
            return user;
          }

          changed = true;
          return { ...user, password };
        })
      );

      if (!changed) {
        throw new Error("Nenhuma conta encontrada para redefinicao local.");
      }

      return {
        message: "Senha atualizada localmente.",
        source: "fallback"
      };
    }

    const matchedUser = registeredUsers.find((user) => {
      const matchesEmail = identifier.includes("@") && user.email === identifier;
      const matchesCpf = identifierCpf.length === 11 && normalizeCpf(user.cpf) === identifierCpf;
      return (matchesEmail || matchesCpf) && user.password === password;
    });

    if (!matchedUser) {
      throw new Error("Credenciais invalidas. Verifique e tente novamente.");
    }

    return {
      user: matchedUser,
      message: "Login local realizado com sucesso.",
      source: "fallback"
    };
  }

  async function handleAuthSubmit(event) {
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
        setAuthMessage("Informe um e-mail valido para o cadastro.");
        return;
      }
      if (cpf.length !== 11) {
        setAuthMessage("Informe um CPF valido com 11 digitos.");
        return;
      }
      if (!password || password.length < 8) {
        setAuthMessage("A senha precisa ter pelo menos 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setAuthMessage("A confirmacao de senha nao confere.");
        return;
      }
      if (getPasswordStrength(password).score < 2) {
        setAuthMessage("Use uma senha mais forte com letras, numeros ou simbolos.");
        return;
      }
    }

    if (authView === "reset") {
      if (!identifier) {
        setAuthMessage("Informe o e-mail ou CPF da conta.");
        return;
      }
      if (!identifier.includes("@") && identifierCpf.length !== 11) {
        setAuthMessage("Informe um e-mail valido ou CPF com 11 digitos.");
        return;
      }
      if (!password || password.length < 8) {
        setAuthMessage("Crie uma nova senha com pelo menos 8 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        setAuthMessage("A confirmacao de senha nao confere.");
        return;
      }
    }

    if (authView === "login") {
      if (!identifier || !password) {
        setAuthMessage("Preencha e-mail ou CPF e a senha para continuar.");
        return;
      }
      if (!identifier.includes("@") && identifierCpf.length !== 11) {
        setAuthMessage("Informe um e-mail valido ou CPF com 11 digitos.");
        return;
      }
    }

    try {
      setIsAuthLoading(true);
      let payload;

      try {
        const response = await fetch(buildApiUrl("/api/auth"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            authView === "login"
              ? { action: "login", identifier, password }
              : authView === "reset"
                ? { action: "reset", identifier, password }
                : { action: "register", name, cpf, email: identifier, password }
          )
        });

        payload = await getJson(response);
      } catch (error) {
        const isNetworkFailure =
          error instanceof TypeError || /fetch|network/i.test(String(error.message || ""));

        if (!isNetworkFailure || !ALLOW_LOCAL_AUTH_FALLBACK) {
          throw error;
        }

        payload = getLocalAuthResult(authView, {
          name,
          cpf,
          email: identifier,
          password
        });
      }

      if (payload?.source === "fallback") {
        payload = getLocalAuthResult(authView, {
          name,
          cpf,
          email: identifier,
          password
        });
      }

      if (authView === "reset") {
        setAuthForm(AUTH_DEFAULT_FORM);
        setAuthView("login");
        setAuthMessage(payload.message || "Senha atualizada com sucesso.");
        return;
      }

      const sessionUser = {
        name: payload.user.name,
        cpf: normalizeCpf(payload.user.cpf || ""),
        email: payload.user.email,
        role: payload.user.role || "customer",
        sessionToken: payload.sessionToken || ""
      };

      setCurrentUser(sessionUser);
      setRememberedEmail(rememberLogin ? sessionUser.email : "");
      setAuthForm(AUTH_DEFAULT_FORM);
      setAuthMessage(payload.message || "Login realizado com sucesso.");
      setActiveFlow(sessionUser.role === "admin" ? "admin" : "account");
    } catch (error) {
      const isNetworkFailure =
        error instanceof TypeError || /fetch|network/i.test(String(error.message || ""));

      if (isNetworkFailure && !ALLOW_LOCAL_AUTH_FALLBACK) {
        setAuthMessage(
          "API de autenticacao indisponivel. Inicie o backend local completo ou configure VITE_API_BASE_URL."
        );
      } else {
        setAuthMessage(error.message || "Nao foi possivel autenticar.");
      }
    } finally {
      setIsAuthLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const sessionToken = localStorage.getItem("x-session-token");
      
      // Call logout API if there's an active session
      if (sessionToken) {
        try {
          const response = await fetch(buildApiUrl("/api/auth"), {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "x-session-token": sessionToken 
            },
            body: JSON.stringify({ action: "logout" })
          });
          
          // Log the API response but don't fail the local logout if API fails
          if (!response.ok) {
            console.warn("API logout failed, clearing local session anyway");
          }
        } catch (error) {
          console.warn("Could not reach API for logout:", error);
        }
      }
      
      // Clear all auth state from localStorage
      localStorage.removeItem("x-session-token");
      localStorage.removeItem("current-user");
      
      // Clear from React state
      setCurrentUser(null);
      setActiveFlow("home");
      setAuthMessage("Voce saiu da conta. Sessao encerrada com sucesso.");
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear local state even if there's an error
      localStorage.removeItem("x-session-token");
      localStorage.removeItem("current-user");
      setCurrentUser(null);
      setActiveFlow("home");
      setAuthMessage("Sessao encerrada.");
    }
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
      status: "Em curadoria",
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

    setTrackingResult({ found: true, order: matched });
  }

  function handleFlowAction(key) {
    if (key === "login" || key === "register") {
      openAuthView(key === "register" ? "register" : "login");
      return;
    }

    if (key === "admin") {
      if (isAdmin) {
        setActiveFlow("admin");
      } else {
        setAuthMessage("Somente o owner pode acessar a area administrativa.");
        openAuthView("login");
      }
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

    setActiveFlow(key);
  }

  function handleCategoryMenuClick(category) {
    setSelectedCategory(category);
    setActiveFlow("home");
  }

  function fillAdminForm(product) {
    setAdminMessage("");
    setActiveFlow("admin");
    setAdminForm({
      id: product.id,
      name: product.name,
      category: product.category,
      price: String(product.price),
      oldPrice: String(product.oldPrice),
      image: product.image,
      badge: product.badge,
      flow: product.flow,
      active: product.active !== false
    });
  }

  function resetAdminForm() {
    setAdminForm(ADMIN_PRODUCT_DEFAULT);
    setAdminMessage("");
  }

  async function handleAdminImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      if (!isAdmin || !currentUser?.sessionToken) {
        setAdminMessage("Somente o owner autenticado pode enviar imagens.");
        return;
      }

      setIsImageUploading(true);
      setAdminMessage("Enviando imagem para o storage...");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(buildApiUrl("/api/uploads"), {
        method: "POST",
        headers: {
          "x-session-token": currentUser.sessionToken
        },
        body: formData
      });

      // Check for session expiry
      if (response.status === 401) {
        setAdminMessage("Sessao expirada. Faca login novamente para enviar imagens.");
        handleLogout();
        return;
      }

      const payload = await getJson(response);
      
      if (!response.ok) {
        setAdminMessage(payload.error || "Nao foi possivel enviar a imagem.");
        return;
      }

      setAdminForm((previous) => ({ ...previous, image: payload.url }));
      setAdminMessage(payload.message || "Imagem enviada com sucesso.");
    } catch (error) {
      setAdminMessage(error.message || "Nao foi possivel enviar a imagem.");
    } finally {
      setIsImageUploading(false);
      event.target.value = "";
    }
  }

  async function handleAdminSubmit(event) {
    event.preventDefault();

    if (!isAdmin || !currentUser?.sessionToken) {
      setAdminMessage("Somente o owner autenticado pode editar o catalogo.");
      return;
    }

    if (!adminForm.name.trim() || !adminForm.image.trim()) {
      setAdminMessage("Preencha nome e imagem do produto.");
      return;
    }

    try {
      setIsAdminSaving(true);
      const response = await fetch(buildApiUrl("/api/products"), {
        method: adminForm.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-token": currentUser.sessionToken
        },
        body: JSON.stringify({
          ...adminForm,
          price: Number(adminForm.price),
          oldPrice: Number(adminForm.oldPrice || adminForm.price)
        })
      });

      // Check for session expiry
      if (response.status === 401) {
        setAdminMessage("Sessao expirada. Faca login novamente para editar o catalogo.");
        handleLogout();
        return;
      }

      const payload = await getJson(response);
      
      if (!response.ok) {
        setAdminMessage(payload.error || payload.message || "Nao foi possivel salvar o produto.");
        return;
      }

      setAdminMessage(payload.message || "Catalogo atualizado.");
      resetAdminForm();
      await loadCatalog();
    } catch (error) {
      setAdminMessage(error.message || "Nao foi possivel salvar o produto.");
    } finally {
      setIsAdminSaving(false);
    }
  }

  async function handleDeleteProduct(productId) {
    if (!isAdmin || !currentUser?.sessionToken) {
      setAdminMessage("Somente o owner autenticado pode remover produtos.");
      return;
    }

    try {
      setIsAdminSaving(true);
      const response = await fetch(buildApiUrl(`/api/products?id=${encodeURIComponent(productId)}`), {
        method: "DELETE",
        headers: {
          "x-session-token": currentUser.sessionToken
        }
      });

      // Check for session expiry
      if (response.status === 401) {
        setAdminMessage("Sessao expirada. Faca login novamente para remover produtos.");
        handleLogout();
        return;
      }

      const payload = await getJson(response);
      
      if (!response.ok) {
        setAdminMessage(payload.error || payload.message || "Nao foi possivel remover o produto.");
        return;
      }

      setAdminMessage(payload.message || "Produto removido da vitrine.");
      if (adminForm.id === productId) {
        resetAdminForm();
      }
      await loadCatalog();
    } catch (error) {
      setAdminMessage(error.message || "Nao foi possivel remover o produto.");
    } finally {
      setIsAdminSaving(false);
    }
  }

  function renderFlowPanel() {
    switch (activeFlow) {
      case "auth":
        return (
          <AuthPanel
            authView={authView}
            authForm={authForm}
            authMessage={authMessage}
            showPassword={showPassword}
            rememberLogin={rememberLogin}
            isAuthLoading={isAuthLoading}
            onOpenAuthView={openAuthView}
            onSetShowPassword={setShowPassword}
            onSetRememberLogin={setRememberLogin}
            onSetAuthForm={setAuthField}
            onClear={() => {
              setAuthForm(AUTH_DEFAULT_FORM);
              setAuthMessage("");
            }}
            onSubmit={handleAuthSubmit}
          />
        );
      case "account":
        return (
          <AccountPanel
            currentUser={currentUser}
            isAdmin={isAdmin}
            currentUserOrders={currentUserOrders}
            onOpenAdmin={() => setActiveFlow("admin")}
            onOpenLogin={() => openAuthView("login")}
            onLogout={handleLogout}
          />
        );
      case "orders":
        return (
          <OrdersPanel
            currentUser={currentUser}
            currentUserOrders={currentUserOrders}
            onOpenLogin={() => openAuthView("login")}
          />
        );
      case "wishlist":
        return (
          <WishlistPanel
            wishlistItems={wishlistItems}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
          />
        );
      case "support":
        return <SupportPanel />;
      case "tracking":
        return (
          <TrackingPanel
            trackingInput={trackingInput}
            trackingResult={trackingResult}
            onSetTrackingInput={setTrackingInput}
            onSubmit={handleTrackOrder}
            onClear={() => {
              setTrackingInput("");
              setTrackingResult(null);
            }}
          />
        );
      case "admin":
        return (
          <AdminPanel
            isAdmin={isAdmin}
            catalogSource={catalogSource}
            adminForm={adminForm}
            adminMessage={adminMessage}
            isAdminSaving={isAdminSaving}
            isImageUploading={isImageUploading}
            allProducts={allProducts}
            onSetAdminForm={setAdminField}
            onUploadImage={handleAdminImageUpload}
            onSubmit={handleAdminSubmit}
            onReset={resetAdminForm}
            onEdit={fillAdminForm}
            onDelete={handleDeleteProduct}
          />
        );
      default:
        return <HomeCallout />;
    }
  }

  return (
    <div className="store-app">
      <header className="header-shell">
        <div className="header-top">
          <p>
            {currentUser ? `Ola, ${currentUser.name}` : "Ola, visitante"} | {isAdmin ? "owner online" : "beauty commerce"}
          </p>
          <div className="top-links">
            {accountLinks.map((link) => (
              <button key={link.key} onClick={() => handleFlowAction(link.key)}>
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div className="header-main">
          <div className="brand">
            <span className="brand-kicker">beauty + home care</span>
            <h1>Adrian Future Store</h1>
          </div>

          <label className="search-wrap">
            <input
              placeholder="Busque skincare, maquiagem, perfumaria e limpeza premium"
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
          <span>Beauty commerce com linguagem premium</span>
          <span>Cosmeticos e home care em uma unica curadoria</span>
          <span>Painel owner conectado ao banco</span>
        </div>
      </header>

      <main className="content-grid">
        <aside className="category-sidebar" aria-label="Categorias da loja">
          <strong>Categorias</strong>
          {frontendFlows.categoryMenu.map((item) => (
            <button key={item} type="button" onClick={() => handleCategoryMenuClick(item)}>
              {item}
            </button>
          ))}
        </aside>

        <section className="main-column">
          <HeroSection imageConfig={imageConfig} activeBanner={activeBanner} onSelectBanner={setActiveBanner} />

          <p className="image-note">{imageConfig.note}</p>

          <section className="trust-strip" aria-label="Beneficios da loja">
            {frontendFlows.trustBadges.map((badge) => (
              <article key={badge.key} className="trust-card">
                <strong>{badge.title}</strong>
                <p>{badge.subtitle}</p>
              </article>
            ))}
          </section>

          <section className="showcase-tabs" aria-label="Buscas em alta">
            {frontendFlows.hotSearches.map((term) => (
              <button key={term} className="chip" onClick={() => setSearch(term)}>
                {term}
              </button>
            ))}
          </section>

          {renderFlowPanel()}

          <HighlightsSection />

          <ProductCatalogSection
            frontendFlows={frontendFlows}
            categories={categories}
            selectedShowcase={selectedShowcase}
            selectedCategory={selectedCategory}
            catalogNotice={catalogNotice}
            isCatalogLoading={isCatalogLoading}
            visibleProducts={visibleProducts}
            wishlistItems={wishlistItems}
            isAdmin={isAdmin}
            onSelectShowcase={setSelectedShowcase}
            onSelectCategory={setSelectedCategory}
            onAddToCart={addToCart}
            onToggleWishlist={toggleWishlist}
            onEditProduct={fillAdminForm}
          />

          <GallerySection />
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Adrian Future Store</strong>
          <p>Curadoria de cosmeticos, perfumaria e produtos de limpeza com linguagem premium.</p>
        </div>
        <p>Atendimento: seg a sab, 9h as 20h | WhatsApp (11) 99999-9999</p>
      </footer>

      <CartDrawer
        isOpen={isCartOpen}
        cartItems={cartItems}
        subtotal={subtotal}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={updateQuantity}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

export default App;
