/**
 * GoTrue redirige el enlace de recuperación de contraseña del correo a la URL de la aplicación con
 * los tokens en el fragmento (`#access_token=...&type=recovery&refresh_token=...`), nunca en la
 * query string (así el servidor que sirve la página no los ve en ningún log de acceso). Esta
 * función es pura — recibe el `hash` como texto, nunca lee `location` directamente — para poder
 * testearla sin `jsdom` (T-09, requisito 9: pantalla de establecer contraseña nueva al volver del
 * enlace del correo).
 */

export interface ParametrosRecuperacion {
  readonly accessToken: string;
}

export function parsearParametrosRecuperacion(hash: string): ParametrosRecuperacion | undefined {
  const cadena = hash.startsWith('#') ? hash.slice(1) : hash;
  if (cadena.length === 0) {
    return undefined;
  }
  const parametros = new URLSearchParams(cadena);
  if (parametros.get('type') !== 'recovery') {
    return undefined;
  }
  const accessToken = parametros.get('access_token');
  return accessToken ? { accessToken } : undefined;
}
