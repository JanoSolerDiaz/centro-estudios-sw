/**
 * Persistencia de sesión entre recargas de página (T-09, requisito 4: "almacenamiento de la sesión
 * con la opción más conservadora posible y documentada, riesgo de XSS explícito"). Decisión: se
 * persiste **solo el `refresh_token`**, nunca el `access_token` (vive en memoria, dentro de
 * `gestorSesion.ts`, y se vuelve a pedir uno nuevo en cada arranque) — así, si algún día hay un XSS
 * (mitigado hoy por la prohibición de `innerHTML`, T-01, y en el futuro por la CSP de T-25), lo
 * único expuesto en el almacenamiento del navegador es un token que por sí solo no basta para
 * autenticar peticiones, solo para pedir uno nuevo.
 *
 * Se usa `sessionStorage`, no `localStorage`: sobrevive a una recarga accidental de la pestaña
 * (el caso real que preocupa en clase, requisito 5: "sesión larga... que no le caduque con la
 * lista a medias"), pero se borra sola al cerrar la pestaña, en vez de persistir indefinidamente en
 * el dispositivo — una ventana de exposición menor que `localStorage` sin sacrificar el caso de uso
 * real. Nunca se lee `sessionStorage` directamente aquí: el `Storage` llega inyectado, mismo patrón
 * que `Reloj`/`Temporizador`/`instalarCapturaErrores` con `window`, para poder testear sin `jsdom`
 * (cualquier objeto que cumpla la forma mínima de `Storage` sirve en un test).
 */

export interface SesionPersistida {
  readonly refreshToken: string;
}

export interface AlmacenSesion {
  leer(): SesionPersistida | null;
  guardar(sesion: SesionPersistida): void;
  borrar(): void;
}

const CLAVE_ALMACEN = 'gestoracademia.sesion';

export function crearAlmacenSesionWebStorage(storage: Storage): AlmacenSesion {
  return {
    leer() {
      const valor = storage.getItem(CLAVE_ALMACEN);
      if (valor === null) {
        return null;
      }
      let datos: unknown;
      try {
        datos = JSON.parse(valor);
      } catch {
        return null;
      }
      const refreshToken = (datos as { refreshToken?: unknown } | null)?.refreshToken;
      return typeof refreshToken === 'string' ? { refreshToken } : null;
    },
    guardar(sesion) {
      storage.setItem(CLAVE_ALMACEN, JSON.stringify(sesion));
    },
    borrar() {
      storage.removeItem(CLAVE_ALMACEN);
    },
  };
}

/** Almacén en memoria, para tests y para cuando no hay `Storage` disponible. No sobrevive a nada:
 * cada instancia empieza vacía. */
export function crearAlmacenSesionEnMemoria(): AlmacenSesion {
  let sesion: SesionPersistida | null = null;
  return {
    leer: () => sesion,
    guardar: (nueva) => {
      sesion = nueva;
    },
    borrar: () => {
      sesion = null;
    },
  };
}
