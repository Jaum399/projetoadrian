import { beautyGallery, beautyHighlights, formatPrice, withImageFallback } from "../lib/storeUi";

export function HeroSection({ imageConfig, activeBanner, onSelectBanner }) {
  const currentBanner = imageConfig.heroBanners.find((banner) => banner.id === activeBanner) || imageConfig.heroBanners[0];

  return (
    <section className="hero" style={{ backgroundImage: `url(${currentBanner.image})` }}>
      <div className="hero-overlay">
        <p className="hero-kicker">MODELO VISUAL: {imageConfig.mode}</p>
        <h2>{currentBanner.title}</h2>
        <p>{currentBanner.subtitle}</p>
        <div className="hero-buttons">
          {imageConfig.heroBanners.map((banner) => (
            <button key={banner.id} className={activeBanner === banner.id ? "active-hero" : ""} onClick={() => onSelectBanner(banner.id)}>
              Banner {banner.id.replace("hero-", "")}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HighlightsSection() {
  return (
    <section className="beauty-highlights" aria-label="Destaques da loja">
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
  );
}

export function ProductCatalogSection({
  frontendFlows,
  categories,
  selectedShowcase,
  selectedCategory,
  catalogNotice,
  isCatalogLoading,
  visibleProducts,
  wishlistItems,
  isAdmin,
  onSelectShowcase,
  onSelectCategory,
  onAddToCart,
  onToggleWishlist,
  onEditProduct
}) {
  return (
    <>
      <section className="showcase-tabs">
        {frontendFlows.showcaseTabs.map((tab) => (
          <button key={tab.key} onClick={() => onSelectShowcase(tab.key)} className={selectedShowcase === tab.key ? "chip active" : "chip"}>
            {tab.label}
          </button>
        ))}
      </section>

      <section className="category-strip">
        {["Todos", ...categories].map((category) => (
          <button key={category} className={selectedCategory === category ? "chip active" : "chip"} onClick={() => onSelectCategory(category)}>
            {category}
          </button>
        ))}
      </section>

      {catalogNotice && <p className="image-note">{catalogNotice}</p>}

      <div className="section-head">
        <h3>Lancamentos e curadoria</h3>
        <p>Produtos com foco em venda consultiva para beleza e limpeza premium.</p>
      </div>

      <section className="product-grid">
        {isCatalogLoading && <p className="empty-list">Carregando catalogo...</p>}
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
                  <button className="add-btn" onClick={() => onAddToCart(product)}>
                    Adicionar
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => onToggleWishlist(product)}>
                    {wishlistItems.some((item) => item.id === product.id) ? "Salvo" : "Salvar"}
                  </button>
                </div>
                {isAdmin && (
                  <button type="button" className="link-button admin-inline-link" onClick={() => onEditProduct(product)}>
                    Editar no painel owner
                  </button>
                )}
              </div>
            </article>
          ))}
        {!isCatalogLoading && visibleProducts.length === 0 && <p className="empty-list">Nenhum item para os filtros atuais.</p>}
      </section>
    </>
  );
}

export function GallerySection() {
  return (
    <>
      <div className="section-head">
        <h3>Escolha pelo ritual</h3>
        <p>Da pele ao ambiente, uma loja com narrativa de lifestyle.</p>
      </div>

      <section className="beauty-gallery" aria-label="Galeria ilustrativa">
        {beautyGallery.map((item) => (
          <article key={item.id} className="gallery-card">
            <img src={item.image} alt={item.label} onError={withImageFallback} />
            <p>{item.label}</p>
          </article>
        ))}
      </section>
    </>
  );
}

export function CartDrawer({ isOpen, cartItems, subtotal, onClose, onUpdateQuantity, onCheckout }) {
  return (
    <>
      <aside className={isOpen ? "cart-drawer open" : "cart-drawer"}>
        <div className="cart-header">
          <h3>Seu carrinho</h3>
          <button onClick={onClose}>Fechar</button>
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
                    <button onClick={() => onUpdateQuantity(item.id, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => onUpdateQuantity(item.id, 1)}>+</button>
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
          <button className="checkout" onClick={onCheckout}>
            Finalizar compra
          </button>
        </div>
      </aside>

      {isOpen && <div className="overlay" onClick={onClose} />}
    </>
  );
}
