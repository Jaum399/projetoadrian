import { useEffect, useMemo, useState } from "react";
import { products as fallbackProducts } from "./data/products";
import { frontendFlows, imageConfig } from "./config/storeConfig";

const ILLUSTRATIVE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#182742"/><stop offset="100%" stop-color="#6f78ff"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="250" cy="120" r="180" fill="#5fe6ff" fill-opacity="0.18"/><circle cx="980" cy="720" r="240" fill="#a68cff" fill-opacity="0.2"/><text x="50%" y="52%" fill="#e9f4ff" font-size="62" font-family="Sora, Arial" text-anchor="middle">Imagem Ilustrativa</text></svg>`
)}`;

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
  if (event.currentTarget.dataset.fallbackApplied === "true") {
    return;
  }

  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = ILLUSTRATIVE_PLACEHOLDER;
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedShowcase, setSelectedShowcase] = useState("todos");
  const [activeFlow, setActiveFlow] = useState("home");
  const [search, setSearch] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

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

  return (
    <div className="store-app">
      <header className="header-shell">
        <div className="header-top">
          <p>
            Bem-vinda a Adrian Beauty | fluxo ativo: <strong>{activeFlow}</strong>
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
                    <button className="add-btn" onClick={() => addToCart(product)}>
                      Adicionar
                    </button>
                  </div>
                </article>
              ))}
            {!isCatalogLoading && visibleProducts.length === 0 && (
              <p className="empty-list">Nenhum item para os filtros atuais.</p>
            )}
          </section>

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
          <p>Curadoria de beleza premium com imagens e conteudo ilustrativo.</p>
        </div>
        <p>Atendimento boutique: seg a sab, 9h as 20h</p>
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
          <button className="checkout">Finalizar compra</button>
        </div>
      </aside>

      {isCartOpen && <div className="overlay" onClick={() => setIsCartOpen(false)} />}
    </div>
  );
}

export default App;
