# deepseek-export-chat

Convierte un link público de DeepSeek (`https://chat.deepseek.com/share/...`) en un archivo Markdown.

Stack: Vite, React, TypeScript, Tailwind CSS v4 y componentes de [Magic UI](https://magicui.design)
(`shimmer-button`, `magic-card`, `border-beam`, `blur-fade`, `dot-pattern`, `text-animate`).
El parseo ocurre en el navegador.

## Por qué hace falta un proxy
`https://chat.deepseek.com/api/v0/share/content?share_id=ID` no envía cabeceras CORS.
El navegador bloquea la llamada desde `github.io`. Solución: un Cloudflare Worker (`worker/worker.js`).
Sin proxy, usa el "Plan B" en la web: pegar el JSON a mano.

## Desarrollo
```
npm install
npm run dev
npm run build
```

## Despliegue
Ejecuta `npm run build` (genera `docs/`) y haz commit. Settings > Pages > Source: Deploy from branch > `main` / `/docs`.

## Añadir más componentes Magic UI
```
npx shadcn@latest add "https://magicui.design/r/<componente>.json"
```
