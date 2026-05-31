# Adrian Beauty Store

App de vendas para produtos de beleza feito em React + Vite, inspirado em layout de perfumaria premium.

Observacao: o projeto usa modelos ilustrativos de imagens para simular os fluxos visuais do frontend.

## Rodar localmente

1. Instale dependencias:

```bash
npm install
```

2. Inicie em desenvolvimento:

```bash
npm run dev
```

3. Abra o link exibido no terminal (normalmente http://localhost:5173).

## Conectar com MongoDB

1. Configure as variaveis de ambiente:

- `MONGODB_URI` (string de conexao do MongoDB/Atlas)
- `MONGODB_DB` (nome do banco)
- `MONGODB_COLLECTION` (opcional, padrao: `products`)

2. Em ambiente local, crie um arquivo `.env` na raiz com essas variaveis.
3. No Vercel, cadastre as mesmas variaveis em Project Settings > Environment Variables.

Observacao: a conexao com o Mongo acontece apenas no backend (`/api/products`).
Se as variaveis nao estiverem configuradas ou houver falha de conexao, o app usa automaticamente o catalogo ilustrativo local.

## Recursos atuais

- Header com fluxos de conta (entrar, cadastrar, conta, pedidos e desejos)
- Hero configuravel com banners ilustrativos
- Configuracoes centralizadas de imagens e fluxos em `src/config/storeConfig.js`
- Filtro por categoria
- Tabs de vitrine (Mais Desejados, Promocoes, Combos)
- Grade de produtos com preco promocional
- Carrinho lateral com ajuste de quantidade
- Subtotal calculado automaticamente
- Layout responsivo para mobile e desktop
