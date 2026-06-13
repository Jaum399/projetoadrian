# Adrian Future Store

App de vendas em React + Vite para cosmeticos, perfumaria, cabelos e produtos de limpeza premium.

Observacao: o projeto usa imagens editoriais para prototipacao visual. Antes de publicar, troque pelos ativos oficiais da marca.

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

### Fluxo recomendado de desenvolvimento

Para testar login, cadastro, painel admin e uploads com as rotas `/api` funcionando no frontend, use:

```bash
npm run dev:full
```

Esse fluxo sobe:

- o backend local do Vercel em `http://127.0.0.1:4173`
- o frontend Vite em `http://127.0.0.1:4174`

O Vite faz proxy automático de `/api` para `4173`.

## Conectar com MongoDB e liberar o owner

1. Copie o arquivo [.env.example](.env.example) para `.env`.
2. Preencha as variaveis abaixo:

- `MONGODB_URI` (string de conexao do MongoDB/Atlas)
- `MONGODB_DB` (nome do banco)
- `MONGODB_COLLECTION` (opcional, padrao: `products`)
- `MONGODB_USERS_COLLECTION` (opcional, padrao: `users`)
- `MONGODB_UPLOADS_BUCKET` (opcional, padrao: `productImages`)
- `ADMIN_EMAIL` (login do dono)
- `ADMIN_PASSWORD` (senha do dono)
- `ADMIN_NAME` (opcional)
- `ADMIN_CPF` (opcional)

3. No Vercel, cadastre as mesmas variaveis em Project Settings > Environment Variables.

Observacoes:
- A conexao com o Mongo acontece apenas no backend, em [api/auth.js](api/auth.js) e [api/products.js](api/products.js).
- O fallback local de autenticacao agora deve ser tratado como modo de demonstração. Para habilita-lo conscientemente, defina `VITE_ALLOW_LOCAL_AUTH_FALLBACK=true`.
- O usuario owner e garantido automaticamente no banco quando `ADMIN_EMAIL` e `ADMIN_PASSWORD` estiverem definidos.

## Painel administrativo

Quando o owner faz login, a area administrativa aparece no topo e permite:

- adicionar produtos
- alterar nome, categoria, badge e vitrine
- trocar precos
- remover itens da vitrine
- colar URL de imagem ou enviar arquivo local

### Upload de imagem

O painel admin agora envia arquivos reais para o MongoDB usando GridFS.

- a imagem e armazenada no bucket configurado em `MONGODB_UPLOADS_BUCKET`
- o produto salva apenas a URL retornada por [api/uploads.js](api/uploads.js)
- quando uma imagem antiga do GridFS e substituida ou o produto e removido, o backend tenta limpar o arquivo anterior

Esse modelo reduz o tamanho dos documentos e evita persistir `data URL` dentro do catalogo.

## Recursos atuais

- Login, cadastro e recuperacao de senha
- Fallback local quando o backend nao estiver configurado
- Painel owner para CRUD de produtos
- Upload local de imagem no admin
- Hero configuravel com banners editoriais
- Catalogo modularizado em componentes React menores
- Carrinho lateral com ajuste de quantidade
- Wishlist, pedidos e rastreio local
- Layout responsivo para mobile e desktop
