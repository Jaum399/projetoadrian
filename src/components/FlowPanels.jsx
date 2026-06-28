import { useEffect, useState } from "react";
import { frontendFlows } from "../config/storeConfig";
import {
  TRACKING_STATUS_STEPS,
  formatCpfInput,
  formatOrderDate,
  formatPrice,
  getPasswordStrength,
  withImageFallback
} from "../lib/storeUi";

export function AuthPanel({
  authView,
  authForm,
  authMessage,
  showPassword,
  rememberLogin,
  isAuthLoading,
  onOpenAuthView,
  onSetShowPassword,
  onSetRememberLogin,
  onSetAuthForm,
  onClear,
  onSubmit
}) {
  const isLogin = authView === "login";
  const isRegister = authView === "register";
  const isReset = authView === "reset";
  const authStrength = getPasswordStrength(authForm.password);

  return (
    <section className="flow-panel futuristic-panel">
      <div className="flow-copy">
        <p className="flow-kicker">Identity layer</p>
        <h3>
          {isRegister
            ? "Crie sua Beauty ID"
            : isReset
              ? "Recupere o acesso"
              : "Entre no Beauty Vault"}
        </h3>
        <p>
          Fluxo de conta preparado para cliente final e acesso exclusivo do owner ao painel de catalogo.
        </p>
        <div className="flow-benefits">
          <span>Cadastro com CPF</span>
          <span>Login por e-mail ou CPF</span>
          <span>Painel administrativo protegido</span>
        </div>
        <div className="signal-card">
          <strong>Banco + fallback</strong>
          <p>
            Quando o MongoDB estiver ativo, cadastro e login ficam persistentes. Sem banco, o app continua testavel no navegador.
          </p>
        </div>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <div className="auth-switch auth-tabs">
          <button type="button" className={isLogin ? "chip active" : "chip"} onClick={() => onOpenAuthView("login")}>
            Login
          </button>
          <button type="button" className={isRegister ? "chip active" : "chip"} onClick={() => onOpenAuthView("register")}>
            Cadastro
          </button>
          <button type="button" className={isReset ? "chip active" : "chip"} onClick={() => onOpenAuthView("reset")}>
            Recuperar
          </button>
        </div>

        {isRegister && (
          <div className="auth-grid">
            <label className="field-group">
              <span>Nome completo</span>
              <input
                value={authForm.name}
                onChange={(event) => onSetAuthForm("name", event.target.value)}
                placeholder="Seu nome"
              />
            </label>
            <label className="field-group">
              <span>CPF</span>
              <input
                inputMode="numeric"
                value={authForm.cpf}
                onChange={(event) => onSetAuthForm("cpf", formatCpfInput(event.target.value))}
                placeholder="000.000.000-00"
              />
            </label>
          </div>
        )}

        <label className="field-group">
          <span>{isLogin || isReset ? "E-mail ou CPF" : "E-mail"}</span>
          <input
            type={isLogin || isReset ? "text" : "email"}
            value={authForm.email}
            onChange={(event) => onSetAuthForm("email", event.target.value)}
            placeholder={isLogin || isReset ? "voce@exemplo.com ou CPF" : "voce@exemplo.com"}
          />
        </label>

        <label className="field-group">
          <span>{isReset ? "Nova senha" : "Senha"}</span>
          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              value={authForm.password}
              onChange={(event) => onSetAuthForm("password", event.target.value)}
              placeholder="••••••••"
            />
            <button type="button" className="password-toggle" onClick={() => onSetShowPassword((previous) => !previous)}>
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </label>

        {(isRegister || isReset) && (
          <label className="field-group">
            <span>Confirmar senha</span>
            <input
              type={showPassword ? "text" : "password"}
              value={authForm.confirmPassword}
              onChange={(event) => onSetAuthForm("confirmPassword", event.target.value)}
              placeholder="Repita a senha"
            />
          </label>
        )}

        {isLogin && (
          <label className="remember-row">
            <input type="checkbox" checked={rememberLogin} onChange={(event) => onSetRememberLogin(event.target.checked)} />
            <span>Lembrar meu e-mail neste navegador</span>
          </label>
        )}

        {authForm.password && (
          <div className="strength-meter" aria-live="polite">
            <span
              className={
                authStrength.score >= 3
                  ? "strength strong"
                  : authStrength.score === 2
                    ? "strength medium"
                    : "strength weak"
              }
            />
            <p>Forca da senha: {authStrength.label}</p>
          </div>
        )}

        {isLogin && (
          <button type="button" className="link-button" onClick={() => onOpenAuthView("reset")}>
            Esqueci minha senha
          </button>
        )}

        <div className="auth-actions">
          <button type="submit" className="add-btn" disabled={isAuthLoading}>
            {isAuthLoading
              ? "Processando..."
              : isRegister
                ? "Criar conta"
                : isReset
                  ? "Atualizar senha"
                  : "Entrar"}
          </button>
          <button type="button" className="ghost-btn" onClick={onClear}>
            Limpar
          </button>
        </div>

        <p className="auth-footnote">
          Owner: configure ADMIN_EMAIL e ADMIN_PASSWORD no backend para liberar a area administrativa.
        </p>

        {authMessage && <p className="flow-message">{authMessage}</p>}
      </form>
    </section>
  );
}

export function AccountPanel({
  currentUser,
  isAdmin,
  currentUserOrders,
  profileMessage,
  isProfileSaving,
  onOpenAdmin,
  onOpenLogin,
  onUpdateProfile,
  onClearProfileMessage,
  onLogout
}) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", cpf: "" });

  useEffect(() => {
    if (!currentUser) {
      setIsEditingProfile(false);
      setProfileForm({ name: "", cpf: "" });
      return;
    }

    setProfileForm({
      name: currentUser.name || "",
      cpf: formatCpfInput(currentUser.cpf || "")
    });
  }, [currentUser]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const saved = await onUpdateProfile({
      name: profileForm.name,
      cpf: profileForm.cpf
    });

    if (saved) {
      setIsEditingProfile(false);
    }
  }

  return (
    <section className="flow-panel futuristic-panel">
      <div className="flow-copy">
        <p className="flow-kicker">Minha conta</p>
        <h3>{currentUser ? `Ola, ${currentUser.name}` : "Acesse sua conta"}</h3>
        <p>Consulte dados, pedidos recentes e acesse o historico de recompra.</p>
      </div>

      {currentUser ? (
        <div className="account-grid">
          <article className="info-card">
            <strong>Perfil</strong>
            <p>{currentUser.name}</p>
            <p>{currentUser.cpf ? formatCpfInput(currentUser.cpf) : "CPF nao informado"}</p>
            <p>{currentUser.email}</p>
            <p>Perfil: {isAdmin ? "Owner" : "Cliente"}</p>

            {isEditingProfile ? (
              <form className="account-edit-form" onSubmit={handleProfileSubmit}>
                <label className="field-group">
                  <span>Nome completo</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((previous) => ({
                        ...previous,
                        name: event.target.value
                      }))
                    }
                    placeholder="Seu nome"
                    required
                  />
                </label>

                <label className="field-group">
                  <span>CPF</span>
                  <input
                    inputMode="numeric"
                    value={profileForm.cpf}
                    onChange={(event) =>
                      setProfileForm((previous) => ({
                        ...previous,
                        cpf: formatCpfInput(event.target.value)
                      }))
                    }
                    placeholder="000.000.000-00"
                    required
                  />
                </label>

                <div className="inline-actions">
                  <button type="submit" className="add-btn" disabled={isProfileSaving}>
                    {isProfileSaving ? "Salvando..." : "Salvar dados"}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileForm({
                        name: currentUser.name || "",
                        cpf: formatCpfInput(currentUser.cpf || "")
                      });
                      onClearProfileMessage();
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setIsEditingProfile(true);
                  onClearProfileMessage();
                }}
              >
                Alterar informacoes pessoais
              </button>
            )}

            {profileMessage && <p className="flow-message">{profileMessage}</p>}

            <div className="inline-actions">
              {isAdmin && (
                <button type="button" className="add-btn" onClick={onOpenAdmin}>
                  Abrir area admin
                </button>
              )}
              <button type="button" className="ghost-btn" onClick={onLogout}>
                Sair
              </button>
            </div>
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
        <button type="button" className="add-btn" onClick={onOpenLogin}>
          Entrar para acessar a conta
        </button>
      )}
    </section>
  );
}

export function OrdersPanel({ currentUser, currentUserOrders, onOpenLogin }) {
  return (
    <section className="flow-panel futuristic-panel">
      <div className="flow-copy">
        <p className="flow-kicker">Pedidos</p>
        <h3>Resumo de compras</h3>
        <p>Veja o historico de pedidos realizados nesta navegacao.</p>
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
                <p>Rastreio: {order.trackingCode || "Nao disponivel"}</p>
                <p>{order.items.length} item(ns)</p>
                <strong>{formatPrice(order.total)}</strong>
              </article>
            ))}
          </div>
        )
      ) : (
        <button type="button" className="add-btn" onClick={onOpenLogin}>
          Entre para visualizar seus pedidos
        </button>
      )}
    </section>
  );
}

export function WishlistPanel({ wishlistItems, onAddToCart, onToggleWishlist }) {
  return (
    <section className="flow-panel futuristic-panel">
      <div className="flow-copy">
        <p className="flow-kicker">Desejos</p>
        <h3>Sua lista curada</h3>
        <p>Salve produtos para rever depois e montar uma compra mais estrategica.</p>
      </div>

      {wishlistItems.length === 0 ? (
        <p className="empty-list">Nenhum item salvo ainda. Use o botao salvar nos cards.</p>
      ) : (
        <div className="orders-list">
          {wishlistItems.map((item) => (
            <article key={item.id} className="order-card">
              <div className="order-head">
                <strong>{item.name}</strong>
                <span>{item.category}</span>
              </div>
              <p>{item.badge}</p>
              <div className="wishlist-actions">
                <strong>{formatPrice(item.price)}</strong>
                <div className="wishlist-buttons">
                  <button type="button" className="ghost-btn" onClick={() => onAddToCart(item)}>
                    Adicionar ao carrinho
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => onToggleWishlist(item)}>
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

export function SupportPanel() {
  return (
    <section className="flow-panel futuristic-panel">
      <div className="flow-copy">
        <p className="flow-kicker">Concierge</p>
        <h3>Atendimento boutique</h3>
        <p>Suporte para fragrancias, presentes e selecao premium feminino e masculino.</p>
      </div>

      <div className="support-grid">
        <article className="info-card">
          <strong>WhatsApp</strong>
          <p>{frontendFlows.support.whatsapp}</p>
        </article>
        <article className="info-card">
          <strong>E-mail</strong>
          <p>{frontendFlows.support.email}</p>
        </article>
        <article className="info-card">
          <strong>Horario</strong>
          <p>{frontendFlows.support.hours}</p>
        </article>
        <article className="info-card">
          <strong>Postagem</strong>
          <p>{frontendFlows.support.eta}</p>
        </article>
      </div>
    </section>
  );
}

export function TrackingPanel({ trackingInput, trackingResult, onSetTrackingInput, onSubmit, onClear }) {
  return (
    <section className="flow-panel futuristic-panel">
      <div className="flow-copy">
        <p className="flow-kicker">Rastrear pedido</p>
        <h3>Acompanhe sua entrega</h3>
        <p>Digite o codigo de rastreio para consultar o ultimo status do pedido.</p>
        <div className="flow-benefits">
          {TRACKING_STATUS_STEPS.map((step) => (
            <span key={step}>{step}</span>
          ))}
        </div>
      </div>

      <form className="auth-form" onSubmit={onSubmit}>
        <label className="field-group">
          <span>Codigo de rastreio</span>
          <input value={trackingInput} onChange={(event) => onSetTrackingInput(event.target.value.toUpperCase())} placeholder="Ex: AF12345678" />
        </label>

        <div className="auth-actions">
          <button type="submit" className="add-btn">
            Consultar pedido
          </button>
          <button type="button" className="ghost-btn" onClick={onClear}>
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

        {trackingResult?.found === false && <p className="empty-list">{trackingResult.message}</p>}
      </form>
    </section>
  );
}

export function AdminPanel({
  isAdmin,
  catalogSource,
  adminForm,
  adminMessage,
  isAdminSaving,
  isImageUploading,
  allProducts,
  onSetAdminForm,
  onUploadImage,
  onSubmit,
  onReset,
  onEdit,
  onDelete
}) {
  return (
    <section className="flow-panel futuristic-panel admin-panel">
      <div className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="flow-kicker">Owner console</p>
            <h3>Painel administrativo</h3>
            <p>Cadastre produtos com estoque, especificacoes, preco e imagem para atualizar a vitrine em tempo real.</p>
          </div>
          <div className="signal-card compact">
            <strong>Fonte do catalogo</strong>
            <p>{catalogSource === "mongodb" ? "MongoDB online" : "Catalogo indisponivel"}</p>
          </div>
        </div>

        {!isAdmin ? (
          <p className="empty-list">Esta area e exclusiva do owner autenticado.</p>
        ) : (
          <>
            <form className="auth-form admin-form" onSubmit={onSubmit}>
              <div className="auth-grid">
                <label className="field-group">
                  <span>Nome do produto</span>
                  <input value={adminForm.name} onChange={(event) => onSetAdminForm("name", event.target.value)} placeholder="Ex: Serum Night Reset" />
                </label>
                <label className="field-group">
                  <span>Categoria</span>
                  <select value={adminForm.category} onChange={(event) => onSetAdminForm("category", event.target.value)}>
                    {frontendFlows.categoryMenu.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="auth-grid auth-grid-3">
                <label className="field-group">
                  <span>Preco atual</span>
                  <input inputMode="decimal" value={adminForm.price} onChange={(event) => onSetAdminForm("price", event.target.value)} placeholder="199.90" />
                </label>
                <label className="field-group">
                  <span>Preco anterior</span>
                  <input inputMode="decimal" value={adminForm.oldPrice} onChange={(event) => onSetAdminForm("oldPrice", event.target.value)} placeholder="249.90" />
                </label>
                <label className="field-group">
                  <span>Badge</span>
                  <input value={adminForm.badge} onChange={(event) => onSetAdminForm("badge", event.target.value)} placeholder="Novo drop" />
                </label>
                <label className="field-group">
                  <span>Quantidade em estoque</span>
                  <input inputMode="numeric" value={adminForm.stock} onChange={(event) => onSetAdminForm("stock", event.target.value)} placeholder="Ex: 12" />
                </label>
              </div>

              <div className="auth-grid">
                <label className="field-group">
                  <span>Imagem do produto</span>
                  <input value={adminForm.image} onChange={(event) => onSetAdminForm("image", event.target.value)} placeholder="https://... ou use upload" />
                </label>
                <label className="field-group">
                  <span>Vitrine</span>
                  <select value={adminForm.flow} onChange={(event) => onSetAdminForm("flow", event.target.value)}>
                    {frontendFlows.showcaseTabs.filter((tab) => tab.key !== "todos").map((tab) => (
                      <option key={tab.key} value={tab.key}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field-group">
                <span>Especificacoes</span>
                <input value={adminForm.specifications} onChange={(event) => onSetAdminForm("specifications", event.target.value)} placeholder="Ex: Eau de parfum 100ml, fixacao intensa, amadeirado" />
              </label>

              <label className="field-group admin-upload-field">
                <span>Upload de imagem</span>
                <input type="file" accept="image/*" onChange={onUploadImage} disabled={isImageUploading || catalogSource !== "mongodb"} />
              </label>

              {isImageUploading && <p className="auth-footnote">Enviando imagem para o GridFS...</p>}

              {adminForm.image && (
                <div className="admin-image-preview">
                  <img src={adminForm.image} alt={adminForm.name || "Preview do produto"} onError={withImageFallback} />
                  <p>Preview salvo no produto. O upload agora e persistido em storage GridFS e a URL fica registrada no catalogo.</p>
                </div>
              )}

              <label className="remember-row">
                <input type="checkbox" checked={adminForm.active} onChange={(event) => onSetAdminForm("active", event.target.checked)} />
                <span>Produto ativo na vitrine</span>
              </label>

              <div className="auth-actions">
                <button type="submit" className="add-btn" disabled={isAdminSaving || catalogSource !== "mongodb"}>
                  {isAdminSaving ? "Salvando..." : adminForm.id ? "Atualizar produto" : "Adicionar produto"}
                </button>
                <button type="button" className="ghost-btn" onClick={onReset}>
                  Novo formulario
                </button>
              </div>

              {catalogSource !== "mongodb" && (
                <p className="auth-footnote">
                  Configure MONGODB_URI, MONGODB_DB, ADMIN_EMAIL e ADMIN_PASSWORD para liberar persistencia e owner real.
                </p>
              )}

              {adminMessage && <p className="flow-message">{adminMessage}</p>}
            </form>

            <div className="admin-products-grid">
              {allProducts.map((product) => (
                <article key={product.id} className="admin-product-card">
                  <img src={product.image} alt={product.name} onError={withImageFallback} />
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.category}</p>
                    <p>
                      {formatPrice(product.price)}
                      <span className="admin-badge">{product.badge}</span>
                    </p>
                    {product.specifications && <p>{product.specifications}</p>}
                    <p className="stock-line">Estoque: {Number(product.stock || 0)} unidade(s)</p>
                  </div>
                  <div className="wishlist-buttons">
                    <button type="button" className="ghost-btn" onClick={() => onEdit(product)}>
                      Editar
                    </button>
                    <button type="button" className="ghost-btn danger-btn" onClick={() => onDelete(product.id)} disabled={catalogSource !== "mongodb" || isAdminSaving}>
                      Remover
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function HomeCallout() {
  return (
    <section className="flow-panel futuristic-panel home-callout">
      <div className="flow-copy">
        <p className="flow-kicker">Store concept</p>
        <h3>Uma loja premium com catalogo feminino e masculino</h3>
        <p>O projeto agora suporta cadastro, login, area administrativa e catalogo editavel para a operacao do dono.</p>
        <div className="flow-benefits">
          <span>Beauty + home care</span>
          <span>Painel de produtos</span>
          <span>Experiencia premium mobile-first</span>
        </div>
      </div>
      <div className="signal-card">
        <strong>Fluxo pronto para crescimento</strong>
        <p>Quando o owner fizer login com o usuario admin do banco, pode adicionar produtos, trocar imagens e ajustar precos sem editar codigo.</p>
      </div>
    </section>
  );
}
