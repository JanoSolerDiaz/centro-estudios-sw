/**
 * Notificaciones del recordatorio de sesión (R-26): envoltorio mínimo sobre `Notification` (el
 * objeto global, para leer/pedir el permiso) y `ServiceWorkerRegistration#showNotification` (para
 * disparar el aviso), inyectable — mismo criterio exacto que `nucleo/registroServiceWorker.ts`
 * envolviendo `navigator.serviceWorker`: la interfaz es la porción mínima que la orquestación
 * necesita, y los globales reales del navegador (`window.Notification`,
 * `navigator.serviceWorker.ready`) ya la cumplen estructuralmente sin ningún adaptador en
 * `main.ts`. `ServiceWorkerRegistration#showNotification` es el mecanismo que exige la propia spec
 * de R-26 (requisito 3) en vez de `new Notification(...)` directo, porque solo el primero funciona
 * de forma consistente con el Service Worker ya registrado por R-09.
 *
 * Sin test posible de la implementación real (mismo criterio ya documentado para
 * `registrarServiceWorker`, R-09/R-26): `jsdom` no implementa `Notification` ni
 * `ServiceWorkerRegistration#showNotification`. Lo que sí se testea, en este mismo módulo con un
 * `FabricaNotificacionNavegador`/`RegistroParaNotificar` de mentira, es que `pedirPermiso`/`permiso`
 * delegan tal cual y que `mostrar` espera el registro y le pasa el cuerpo/etiqueta/datos correctos;
 * la orquestación de CUÁNDO llamarlos (qué sesión, con qué texto, una sola vez por sesión) vive y
 * se testea en `ui/pantallaMiHorario.ts`.
 */

/** La porción de `Notification` (el objeto global, no una instancia) que hace falta. */
export interface FabricaNotificacionNavegador {
  readonly permission: NotificationPermission;
  /** Solo debe llamarse tras un gesto explícito de la persona (requisito 1 de R-26): el propio
   * navegador ignora la llamada — sin mostrar ningún diálogo — fuera de un gesto de usuario. */
  requestPermission(): Promise<NotificationPermission>;
}

/** La porción de `ServiceWorkerRegistration` que hace falta para disparar una notificación local —
 * a diferencia de `RegistroServiceWorker` de `registroServiceWorker.ts`, que gestiona el ciclo de
 * vida de una versión nueva, no el disparo de avisos. */
export interface RegistroParaNotificar {
  showNotification(titulo: string, opciones?: NotificationOptions): Promise<void>;
}

export interface OpcionesRecordatorioSesion {
  readonly cuerpo: string;
  /** Agrupa/sustituye cualquier notificación anterior con la MISMA etiqueta — el sistema operativo
   * nunca apila dos avisos con el mismo `tag`, así que una re-entrega accidental de la misma sesión
   * no duplica el aviso en pantalla. */
  readonly etiqueta: string;
  /** `inicioUtcMs`: instante (época, milisegundos) en que empieza la sesión — lo lee
   * `notificationclick` en `sw.js` para decidir a dónde navegar al tocar el aviso (requisito 4). */
  readonly datos: Readonly<{ inicioUtcMs: number }>;
}

export interface NotificadorRecordatorio {
  permiso(): NotificationPermission;
  pedirPermiso(): Promise<NotificationPermission>;
  mostrar(titulo: string, opciones: OpcionesRecordatorioSesion): Promise<void>;
}

/** `registroListo` es normalmente `navigator.serviceWorker.ready` (una promesa que resuelve en
 * cuanto hay un Service Worker activo controlando la página, el mismo que registra R-09) — se
 * recibe ya como promesa, no como una función que la construya, porque solo tiene sentido pedirla
 * una vez por carga de página. */
export function crearNotificadorRecordatorioNavegador(
  fabricaNotificacion: FabricaNotificacionNavegador,
  registroListo: Promise<RegistroParaNotificar>,
): NotificadorRecordatorio {
  return {
    permiso: () => fabricaNotificacion.permission,
    pedirPermiso: () => fabricaNotificacion.requestPermission(),
    async mostrar(titulo, opciones) {
      const registro = await registroListo;
      await registro.showNotification(titulo, {
        body: opciones.cuerpo,
        tag: opciones.etiqueta,
        data: opciones.datos,
      });
    },
  };
}
