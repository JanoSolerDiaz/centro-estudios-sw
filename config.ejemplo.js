// GestorAcademia — plantilla de configuración del cliente (T-08).
//
// Copia este fichero a `config.js` (en la raíz, junto a `index.html`) y rellena los valores.
// `config.js` está en `.gitignore` y NO se commitea nunca — mismo régimen que `.env.local`.
//
// Es la única forma de que la URL del proyecto y la clave anónima lleguen al navegador: el
// proyecto no usa bundler (§0.2), así que no hay `import.meta.env`. `index.html` carga este script
// ANTES que `dist/ui/main.js`, y `src/datos/configuracion.ts` lee `window.__CONFIG__` (con un
// mensaje claro en español si falta). En despliegue, el hosting (proveedor `<pendiente>`, T-25)
// genera este fichero a partir de sus propias variables de entorno — nunca a mano.
//
// Solo van aquí las dos credenciales que §0.2 permite en el cliente: la URL del proyecto y la
// clave ANÓNIMA (pública por diseño). El access token de la Management API, la contraseña de la
// base de datos y la clave service_role NUNCA van en este fichero.
window.__CONFIG__ = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
