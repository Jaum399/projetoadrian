import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

const ADMIN_SESSION_KEY = "adrian-beauty-session";

function makeResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => payload
  };
}

describe("Fluxo admin para vitrine", () => {
  let products;

  beforeEach(() => {
    products = [
      {
        id: "base-1",
        name: "Produto Inicial",
        category: "Feminino",
        price: 100,
        oldPrice: 120,
        image: "https://example.com/base.jpg",
        badge: "Destaque",
        flow: "novidades",
        specifications: "Item base",
        stock: 3,
        active: true
      }
    ];

    localStorage.clear();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, options = {}) => {
        const path = String(url);
        const method = String(options.method || "GET").toUpperCase();

        if (path.startsWith("/api/products") && method === "GET") {
          const includeOutOfStock = path.includes("includeOutOfStock=true");
          const payloadProducts = includeOutOfStock
            ? products
            : products.filter((item) => Number(item.stock || 0) > 0 && item.active !== false);

          return makeResponse({ source: "mongodb", products: payloadProducts, message: "" });
        }

        if (path === "/api/products" && method === "POST") {
          const body = JSON.parse(String(options.body || "{}"));
          const created = {
            id: `p-${products.length + 1}`,
            name: body.name,
            category: body.category,
            price: Number(body.price),
            oldPrice: Number(body.oldPrice),
            image: body.image,
            badge: body.badge,
            flow: body.flow,
            specifications: body.specifications || "",
            stock: Number(body.stock || 0),
            active: body.active !== false
          };

          products = [created, ...products];

          return makeResponse({ source: "mongodb", product: created, message: "Produto adicionado ao catalogo." });
        }

        if (path === "/api/products" && method === "PUT") {
          const body = JSON.parse(String(options.body || "{}"));
          const targetId = String(body.id || "");

          products = products.map((item) => {
            if (item.id !== targetId) {
              return item;
            }

            return {
              ...item,
              name: body.name,
              category: body.category,
              price: Number(body.price),
              oldPrice: Number(body.oldPrice),
              image: body.image,
              badge: body.badge,
              flow: body.flow,
              specifications: body.specifications || "",
              stock: Number(body.stock || 0),
              active: body.active !== false
            };
          });

          const updated = products.find((item) => item.id === targetId);
          return makeResponse({ source: "mongodb", product: updated, message: "Produto atualizado." });
        }

        if (path === "/api/auth") {
          return makeResponse({ source: "mongodb", message: "ok" });
        }

        return makeResponse({ error: "not found" }, false, 404);
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("mostra no front do cliente o produto criado no painel admin", async () => {
    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        name: "Admin",
        cpf: "11111111111",
        email: "admin@teste.com",
        role: "admin",
        sessionToken: "token-admin"
      })
    );

    const user = userEvent.setup();
    render(<App />);

    await screen.findByText("Produto Inicial");

    await user.click(screen.getByRole("button", { name: "Area Admin" }));

    await user.type(screen.getByPlaceholderText("Ex: Serum Night Reset"), "Perfume Teste Masculino");
    await user.type(screen.getByPlaceholderText("199.90"), "179.9");
    await user.type(screen.getByPlaceholderText("249.90"), "229.9");
    await user.type(screen.getByPlaceholderText("Novo drop"), "Novo");
    await user.clear(screen.getByPlaceholderText("Ex: 12"));
    await user.type(screen.getByPlaceholderText("Ex: 12"), "8");
    await user.type(screen.getByPlaceholderText("https://... ou use upload"), "https://example.com/perfume.jpg");
    await user.type(
      screen.getByPlaceholderText("Ex: Eau de parfum 100ml, fixacao intensa, amadeirado"),
      "Eau de parfum 100ml"
    );

    await user.click(screen.getByRole("button", { name: "Adicionar produto" }));

    await waitFor(() => {
      expect(products.some((item) => item.name === "Perfume Teste Masculino")).toBe(true);
    });

    cleanup();

    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        name: "Cliente",
        cpf: "22222222222",
        email: "cliente@teste.com",
        role: "customer",
        sessionToken: "token-customer"
      })
    );

    render(<App />);

    expect(await screen.findByText("Perfume Teste Masculino")).toBeInTheDocument();
    expect(screen.getByText("Estoque: 8 unidade(s)")).toBeInTheDocument();
  });

  it("nao exibe para cliente produto com estoque zerado", async () => {
    products = [
      ...products,
      {
        id: "out-1",
        name: "Produto Sem Estoque",
        category: "Masculino",
        price: 149.9,
        oldPrice: 199.9,
        image: "https://example.com/out.jpg",
        badge: "Esgotado",
        flow: "novidades",
        specifications: "Sem disponibilidade",
        stock: 0,
        active: true
      }
    ];

    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        name: "Cliente",
        cpf: "33333333333",
        email: "cliente2@teste.com",
        role: "customer",
        sessionToken: "token-customer"
      })
    );

    render(<App />);

    await screen.findByText("Produto Inicial");
    expect(screen.queryByText("Produto Sem Estoque")).not.toBeInTheDocument();
  });

  it("volta a exibir para cliente quando estoque e reposto", async () => {
    products = [
      ...products,
      {
        id: "restore-1",
        name: "Produto Reposicao",
        category: "Masculino",
        price: 159.9,
        oldPrice: 199.9,
        image: "https://example.com/restore.jpg",
        badge: "Reposicao",
        flow: "novidades",
        specifications: "Produto para teste de reposicao",
        stock: 0,
        active: true
      }
    ];

    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        name: "Admin",
        cpf: "11111111111",
        email: "admin@teste.com",
        role: "admin",
        sessionToken: "token-admin"
      })
    );

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Area Admin" }));
    await screen.findByText("Produto Reposicao");

    const productCards = screen.getAllByText("Produto Reposicao");
    const productCard = productCards[productCards.length - 1].closest("article");
    const editButton = productCard?.querySelector("button");

    expect(editButton).toBeTruthy();

    await user.click(editButton);
    await user.clear(screen.getByPlaceholderText("Ex: 12"));
    await user.type(screen.getByPlaceholderText("Ex: 12"), "6");
    await user.click(screen.getByRole("button", { name: "Atualizar produto" }));

    await waitFor(() => {
      const updated = products.find((item) => item.id === "restore-1");
      expect(updated?.stock).toBe(6);
    });

    cleanup();

    localStorage.setItem(
      ADMIN_SESSION_KEY,
      JSON.stringify({
        name: "Cliente",
        cpf: "33333333333",
        email: "cliente2@teste.com",
        role: "customer",
        sessionToken: "token-customer"
      })
    );

    render(<App />);

    expect(await screen.findByText("Produto Reposicao")).toBeInTheDocument();
    expect(screen.getByText("Estoque: 6 unidade(s)")).toBeInTheDocument();
  });
});
