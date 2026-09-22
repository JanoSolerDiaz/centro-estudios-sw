/**
 * Preferencia del recordatorio de sesión (R-26, requisito 2): "activado" o "apagado", guardada POR
 * DISPOSITIVO — nunca viaja al servidor, no es un dato del perfil. Mismo patrón de inyección que
 * `nucleo/almacenSesion.ts` (interfaz + implementación real sobre `Storage` + implementación en
 * memoria para tests), pero sobre `localStorage`, no `sessionStorage`: a diferencia del
 * `refreshToken` de la sesión (que debe borrarse solo al cerrar la pestaña), esta preferencia es un
 * ajuste del dispositivo que debe sobrevivir a cerrar la pestaña o el navegador — es justo lo
 * contrario de "sesión larga que no debe persistir más de la cuenta" que motivó `sessionStorage`
 * allí. No hay ningún dato personal ni sensible que proteger aquí, así que la ventana de exposición
 * más amplia de `localStorage` no es un riesgo nuevo.
 */

export type PreferenciaRecordatorio = 'activado' | 'apagado';

export interface AlmacenPreferenciaRecordatorio {
  /** `'apagado'` si nunca se guardó nada o el valor guardado no es reconocible — mismo criterio de
   * "apagado por defecto" que pide el requisito 1 de R-26. */
  leer(): PreferenciaRecordatorio;
  guardar(preferencia: PreferenciaRecordatorio): void;
}

const CLAVE_ALMACEN = 'gestoracademia.recordatorioSesion';

export function crearAlmacenPreferenciaRecordatorioWebStorage(storage: Storage): AlmacenPreferenciaRecordatorio {
  return {
    leer() {
      const valor = storage.getItem(CLAVE_ALMACEN);
      return valor === 'activado' ? 'activado' : 'apagado';
    },
    guardar(preferencia) {
      storage.setItem(CLAVE_ALMACEN, preferencia);
    },
  };
}

/** Almacén en memoria, para tests. No sobrevive a nada: cada instancia empieza en `'apagado'`. */
export function crearAlmacenPreferenciaRecordatorioEnMemoria(): AlmacenPreferenciaRecordatorio {
  let preferencia: PreferenciaRecordatorio = 'apagado';
  return {
    leer: () => preferencia,
    guardar: (nueva) => {
      preferencia = nueva;
    },
  };
}
