import { useEffect, useMemo, useState } from "react";
import { categories, products } from "./data/products";
import { frontendFlows, imageConfig } from "./config/storeConfig";

const ADMIN_STORAGE_KEY = "adrian-beauty-admin-config";

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

function App() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedShowcase, setSelectedShowcase] = useState("todos");
  const [activeFlow, setActiveFlow] = useState("home");
  const [search, setSearch] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [adminMode, setAdminMode] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [configState, setConfigState] = useState(getDefaultConfig);
  const [configJson, setConfigJson] = useState("");

  const [activeBanner, setActiveBanner] = useState(configState.imageConfig.heroBanners[0].id);

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed?.imageConfig?.heroBanners && parsed?.frontendFlows) {
        setConfigState(parsed);
        if (parsed.imageConfig.heroBanners[0]?.id) {
          setActiveBanner(parsed.imageConfig.heroBanners[0].id);
        }
      }
    } catch {
      setAdminMessage("Configuracao salva invalida. Usando padrao.");
    }
  }, []);

  useEffect(() => {
    setConfigJson(JSON.stringify(configState, null, 2));
  }, [configState]);

  const currentBanner =
    configState.imageConfig.heroBanners.find((banner) => banner.id === activeBanner) ||
    configState.imageConfig.heroBanners[0];

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const byCategory =
        selectedCategory === "Todos" || product.category === selectedCategory;
      const byShowcase =
        selectedShowcase === "todos" || product.flow === selectedShowcase;
      const bySearch =
        search.trim() === "" ||
        product.name.toLowerCase().includes(search.toLowerCase().trim());

      return byCategory && byShowcase && bySearch;
    });
  }, [search, selectedCategory, selectedShowcase]);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cartItems]
  );

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

  function handleFlowAction(key) {
    if (key === "login" || key === "register") {
      setActiveFlow("auth");
      return;
    }

    if (key === "support") {
      setActiveFlow("support");
      return;
    }

    if (key === "account") {
      setActiveFlow("account");
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

  function handleCategoryMenuClick(item) {
    const normalized = item.toLowerCase();

    if (normalized.includes("combos")) {
      setSelectedShowcase("combos");
      return;
    }

    if (normalized.includes("promoc")) {
      setSelectedShowcase("promocoes");
      return;
    }

    if (normalized.includes("desejados")) {
      setSelectedShowcase("mais-desejados");
      return;
    }

    const match = categories.find(
      (category) => category.toLowerCase() === normalized
    );

    if (match) {
      setSelectedCategory(match);
      return;
    }

    setSelectedCategory("Todos");
  }

  function updateBanner(index, field, value) {
    setConfigState((previous) => {
      const heroBanners = previous.imageConfig.heroBanners.map((banner, currentIndex) => {
        if (currentIndex !== index) {
          return banner;
        }

        return { ...banner, [field]: value };
      });

      return {
        ...previous,
        imageConfig: {
          ...previous.imageConfig,
          heroBanners
        }
      };
    });
  }

  function updateImageNote(value) {
    setConfigState((previous) => ({
      ...previous,
      imageConfig: {
        ...previous.imageConfig,
        note: value
      }
    }));
  }

  function updateFlowLabel(type, key, value) {
    setConfigState((previous) => ({
      ...previous,
      frontendFlows: {
        ...previous.frontendFlows,
        [type]: previous.frontendFlows[type].map((item) =>
          item.key === key ? { ...item, label: value } : item
        )
      }
    }));
  }

  function updateCategoryMenu(rawValue) {
    const categoryMenu = rawValue
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    setConfigState((previous) => ({
      ...previous,
      frontendFlows: {
        ...previous.frontendFlows,
        categoryMenu
      }
    }));
  }

  function saveConfig() {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(configState));
    setAdminMessage("Configuracao salva no navegador.");
  }

  function restoreDefaultConfig() {
    const defaultConfig = getDefaultConfig();
    setConfigState(defaultConfig);
    setActiveBanner(defaultConfig.imageConfig.heroBanners[0].id);
    setAdminMessage("Configuracao padrao restaurada.");
  }

  function applyJsonConfig() {
    try {
      const parsed = JSON.parse(configJson);
      if (!parsed?.imageConfig?.heroBanners || !parsed?.frontendFlows) {
        throw new Error();
      }

      setConfigState(parsed);
      if (parsed.imageConfig.heroBanners[0]?.id) {
        setActiveBanner(parsed.imageConfig.heroBanners[0].id);
      }
      setAdminMessage("JSON aplicado com sucesso.");
    } catch {
      setAdminMessage("JSON invalido. Verifique a estrutura e tente novamente.");
    }
  }

  return (
    <div className="store-app">
      <header className="header-shell">
        <div className="header-top">
          <p>
            Ola, visitante | fluxo ativo: <strong>{activeFlow}</strong>
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
            <span className="brand-kicker">adrian beauty</span>
            <h1>Perfumaria e Beleza</h1>
          </div>

          <label className="search-wrap">
            <input
              placeholder="O que voce esta buscando hoje?"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="header-actions">
            <button className="admin-toggle" onClick={() => setAdminMode((prev) => !prev)}>
              {adminMode ? "Fechar admin" : "Modo admin"}
            </button>
            <button className="cart-button" onClick={() => setIsCartOpen(true)}>
              Carrinho ({cartItems.reduce((sum, item) => sum + item.qty, 0)})
            </button>
          </div>
        </div>
      </header>

      <main className="content-grid">
        <aside className="category-sidebar">
          <strong>Categorias</strong>
          {configState.frontendFlows.categoryMenu.map((item) => (
            <button key={item} onClick={() => handleCategoryMenuClick(item)}>
              {item}
            </button>
          ))}
          <button onClick={() => setSelectedCategory("Todos")}>Ver todos</button>
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

          <section className="product-grid">
            {visibleProducts.map((product) => (
              <article key={product.id} className="product-card">
                <div className="image-wrapper">
                  <img src={product.image} alt={product.name} />
                  <span className="badge">{product.badge}</span>
                </div>
                <div className="product-body">
                  <small>{product.category}</small>
                  <h3>{product.name}</h3>
                  <p className="price-line">
                    <span className="price">{formatPrice(product.price)}</span>
                    <span className="old-price">{formatPrice(product.oldPrice)}</span>
                  </p>
                  <button className="add-btn" onClick={() => addToCart(product)}>
                    Adicionar
                  </button>
                </div>
              </article>
            ))}
            {visibleProducts.length === 0 && (
              <p className="empty-list">Nenhum item para os filtros atuais.</p>
            )}
          </section>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>Adrian Beauty Store</strong>
          <p>Fluxos de frontend inspirados em perfumaria com conteudo ilustrativo.</p>
        </div>
        <p>Atendimento: seg a sab, 9h as 20h</p>
      </footer>

      {adminMode && (
        <aside className="admin-panel">
          <div className="admin-head">
            <h3>Modo admin</h3>
            <button onClick={() => setAdminMode(false)}>Fechar</button>
          </div>

          <p className="admin-tip">
            Edite banners, textos e secoes sem alterar o codigo de layout.
          </p>

          <section className="admin-section">
            <h4>Banners</h4>
            {configState.imageConfig.heroBanners.map((banner, index) => (
              <div key={banner.id} className="admin-card">
                <strong>{banner.id}</strong>
                <input
                  value={banner.title}
                  onChange={(event) => updateBanner(index, "title", event.target.value)}
                  placeholder="Titulo"
                />
                <input
                  value={banner.subtitle}
                  onChange={(event) => updateBanner(index, "subtitle", event.target.value)}
                  placeholder="Subtitulo"
                />
                <input
                  value={banner.image}
                  onChange={(event) => updateBanner(index, "image", event.target.value)}
                  placeholder="URL da imagem"
                />
              </div>
            ))}
          </section>

          <section className="admin-section">
            <h4>Texto do aviso de imagem</h4>
            <textarea
              value={configState.imageConfig.note}
              onChange={(event) => updateImageNote(event.target.value)}
              rows={3}
            />
          </section>

          <section className="admin-section">
            <h4>Textos das abas de vitrine</h4>
            {configState.frontendFlows.showcaseTabs.map((tab) => (
              <label key={tab.key} className="admin-field">
                <span>{tab.key}</span>
                <input
                  value={tab.label}
                  onChange={(event) =>
                    updateFlowLabel("showcaseTabs", tab.key, event.target.value)
                  }
                />
              </label>
            ))}
          </section>

          <section className="admin-section">
            <h4>Textos dos links da barra superior</h4>
            {configState.frontendFlows.accountLinks.map((tab) => (
              <label key={tab.key} className="admin-field">
                <span>{tab.key}</span>
                <input
                  value={tab.label}
                  onChange={(event) =>
                    updateFlowLabel("accountLinks", tab.key, event.target.value)
                  }
                />
              </label>
            ))}
          </section>

          <section className="admin-section">
            <h4>Secoes do menu lateral</h4>
            <textarea
              value={configState.frontendFlows.categoryMenu.join("\n")}
              onChange={(event) => updateCategoryMenu(event.target.value)}
              rows={6}
            />
          </section>

          <section className="admin-section">
            <h4>Configuracao JSON</h4>
            <textarea
              value={configJson}
              onChange={(event) => setConfigJson(event.target.value)}
              rows={9}
            />
            <div className="admin-actions">
              <button onClick={applyJsonConfig}>Aplicar JSON</button>
              <button onClick={saveConfig}>Salvar no navegador</button>
              <button onClick={restoreDefaultConfig}>Restaurar padrao</button>
            </div>
            {adminMessage && <p className="admin-message">{adminMessage}</p>}
          </section>
        </aside>
      )}

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
                <img src={item.image} alt={item.name} />
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
          <button className="checkout">Finalizar compra</button>
        </div>
      </aside>

      {isCartOpen && <div className="overlay" onClick={() => setIsCartOpen(false)} />}
    </div>
  );
}

export default App;
