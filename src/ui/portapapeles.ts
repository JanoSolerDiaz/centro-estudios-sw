/**
 * Copia texto al portapapeles del sistema usando la Clipboard API del navegador (R-05, requisito 2:
 * "copiar el texto al portapapeles... siempre"). Aislada en su propia función para poder inyectar un
 * doble en los tests — `jsdom` no implementa `navigator.clipboard` — y para que quien la llame no
 * dependa de si el navegador soporta la API: si no existe o falla, la promesa se rechaza y quien
 * llama decide qué mostrar (en `pantallaRegistrosSlot.ts`, el mensaje sigue visible en un
 * `<textarea readonly>` como alternativa manual, que es lo que hace que "funcione sin conexión"
 * incluso si el copiado automático fallara: es solo texto ya en pantalla).
 *
 * Sin test propio de esta función real, mismo criterio documentado para `FabricaProcesadoImagen` de
 * T-14 (`datos/avatarAlumno.ts`): lo que se testea es la orquestación contra la interfaz inyectable
 * (`copiarAlPortapapeles` en `DependenciasPantallaRegistrosSlot`), no la API del navegador en sí.
 */
export async function copiarAlPortapapelesDelNavegador(texto: string): Promise<void> {
  await navigator.clipboard.writeText(texto);
}
