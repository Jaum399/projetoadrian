export const ILLUSTRATIVE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#04111f"/><stop offset="50%" stop-color="#0e2b4c"/><stop offset="100%" stop-color="#8be5c2"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="220" cy="130" r="190" fill="#8be5c2" fill-opacity="0.15"/><circle cx="1000" cy="690" r="260" fill="#f4c57f" fill-opacity="0.16"/><text x="50%" y="52%" fill="#edf8ff" font-size="62" font-family="Manrope, Arial" text-anchor="middle">Adrian Future Care</text></svg>`
)}`;

export const IMAGE_FALLBACK_PHOTO =
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80";

export const AUTH_USERS_KEY = "adrian-beauty-users";
export const AUTH_SESSION_KEY = "adrian-beauty-session";
export const ORDER_HISTORY_KEY = "adrian-beauty-orders";
export const WISHLIST_KEY = "adrian-beauty-wishlist";
export const AUTH_REMEMBERED_EMAIL_KEY = "adrian-beauty-auth-email";

export const AUTH_DEFAULT_FORM = {
  name: "",
  cpf: "",
  email: "",
  password: "",
  confirmPassword: ""
};

export const ADMIN_PRODUCT_DEFAULT = {
  id: "",
  name: "",
  category: "Feminino",
  price: "",
  oldPrice: "",
  image: "",
  badge: "Novo drop",
  flow: "novidades",
  specifications: "",
  stock: "1",
  active: true
};

export const TRACKING_STATUS_STEPS = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em curadoria",
  "Enviado"
];

export const beautyHighlights = [
  {
    id: "sensorial",
    title: "Skincare de Alta Performance",
    subtitle: "Texturas premium, rotina guiada e resultado visivel em casa.",
    image:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "clean-home",
    title: "Casa Impecavel com Design",
    subtitle: "Produtos de limpeza com apelo visual sofisticado e praticidade real.",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "signature",
    title: "Beauty Vault",
    subtitle: "Perfumaria, maquiagem e haircare editados como um closet de luxo.",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=80"
  }
];

export const beautyGallery = [
  {
    id: "g1",
    label: "Glow Lab",
    image:
      "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "g2",
    label: "Home Care Studio",
    image:
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=1400&q=80"
  }
];

export function formatPrice(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value) || 0);
}

export function readLocalJson(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

export function withImageFallback(event) {
  const stage = event.currentTarget.dataset.fallbackStage || "0";

  if (stage === "0") {
    event.currentTarget.dataset.fallbackStage = "1";
    event.currentTarget.src = IMAGE_FALLBACK_PHOTO;
    return;
  }

  if (stage === "1") {
    event.currentTarget.dataset.fallbackStage = "2";
    event.currentTarget.src = ILLUSTRATIVE_PLACEHOLDER;
  }
}

export function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function normalizeIdentifier(value) {
  return String(value || "").trim().toLowerCase();
}

export function formatCpfInput(value) {
  const digits = normalizeCpf(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatOrderDate(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function createTrackingCode(orderId) {
  return `AF${String(orderId).replace(/\D/g, "").slice(-8).padStart(8, "0")}`;
}

export function getPasswordStrength(password) {
  const value = String(password || "").trim();

  if (!value) {
    return { label: "Senha vazia", score: 0 };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 1) return { label: "Fraca", score };
  if (score === 2) return { label: "Media", score };
  return { label: "Forte", score };
}

export async function getJson(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || "Falha na operacao.");
  }

  return payload;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem selecionada."));
    reader.readAsDataURL(file);
  });
}
