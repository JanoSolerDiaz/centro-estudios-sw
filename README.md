# GestorAcademia

Aplicación web para que una academia o centro de estudios lleve el control diario de sus alumnos
y de su asistencia real: la hora que queda registrada es la de verdad, la lista aparece sola a
partir del horario, y lo que se corrige deja rastro en vez de desaparecer.

- **Qué es y por qué** (producto, dominio, cumplimiento): [`PROYECTO.md`](./PROYECTO.md).
- **Cómo arrancarlo en local, estructura del código, convenciones**:
  [`DEVELOPERS.md`](./DEVELOPERS.md).
- **Estado del desarrollo, qué falta, próxima tarea**:
  [`roadmap/SEGUIMIENTO.md`](./roadmap/SEGUIMIENTO.md).
- **Modelo de datos** (tablas, RPC, políticas de acceso, en español): [`db/MODELO.md`](./db/MODELO.md).
- **Endurecimiento y paso a producción** (cabeceras, superficie de ataque, RGPD, textos legales):
  [`roadmap/PRODUCCION_T25.md`](./roadmap/PRODUCCION_T25.md).

## Arranque rápido

```
npm install
npm run typecheck && npm run lint && npm test && npm run build
```

Sirve el directorio raíz con cualquier servidor estático y abre `index.html` (necesita
`npm run build` antes: el navegador carga `dist/ui/main.js`). Detalle completo, incluidas las
variables de entorno y los dos entornos de Supabase (`dev`/`prod`), en `DEVELOPERS.md`.

## Stack

VanillaJS + TypeScript, DOM nativo, sin frameworks ni SDK de terceros en tiempo de ejecución.
Persistencia en PostgreSQL (Supabase), consumida por su API REST (PostgREST/GoTrue/Storage) con
`fetch` nativo — `@supabase/supabase-js` está vetado. Sin bundler: `tsc` compila a ES modules
nativos. `dependencies` de `package.json` permanece vacío por diseño.
