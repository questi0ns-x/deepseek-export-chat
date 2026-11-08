# deepseek-export-chat

Convierte un link público de DeepSeek (`https://chat.deepseek.com/share/...`) en un archivo Markdown.
Web estática (GitHub Pages). El parseo ocurre en el navegador.

## Por qué hace falta un proxy
El endpoint `https://chat.deepseek.com/api/v0/share/content?share_id=ID` no envía cabeceras CORS.
El navegador bloquea la llamada desde `github.io`. Solución: un Cloudflare Worker gratis.

## Montaje
1. Activa GitHub Pages: Settings > Pages > Deploy from branch > `main` / root.
2. Cloudflare > Workers > Create > pega `worker/worker.js` > Deploy.
   - Opcional: variable `ALLOWED_ORIGIN` = `https://<usuario>.github.io` para limitar el uso.
3. En la web, Opciones > pega la URL del Worker (o edita `DEFAULT_PROXY` en `index.html`).

Sin proxy: usa el "Plan B" (pegar el JSON a mano).
