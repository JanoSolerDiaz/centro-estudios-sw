import { mostrarPantallaInicial } from './pantallaInicial.ts';

const contenedorApp = document.querySelector<HTMLDivElement>('#app');

if (contenedorApp) {
  mostrarPantallaInicial(contenedorApp);
}
