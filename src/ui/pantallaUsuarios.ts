/**
 * Pantalla de administración de usuarios y roles (T-24, requisito 1): listado con filtro por rol y
 * estado, edición de nombre, cambio de rol entre los tres valores y desactivación — nunca borrado
 * (§0.2). Exclusiva de `administrator` (`puedeGestionarUsuarios`, `permisosUi.ts`): ni `teacher` ni
 * `student` tienen ruta a esta pantalla en ningún router.
 *
 * El alta de un usuario nuevo, forzar un cambio de contraseña o revocar una sesión (requisito 3 de
 * T-24) exigen la clave de administración de Supabase, prohibida en el cliente (§0.2): no hay ningún control aquí
 * para eso, es un procedimiento manual documentado en `DEVELOPERS.md`.
 *
 * El invariante "no dejar el sistema sin ningún administrator activo" (requisito 4) lo impone de
 * verdad el trigger `perfil_before_update` de la base de datos
 * (`db/009_administracion_usuarios.sql`); `dejariaSinAdministratorActivo`
 * (`dominio/administracionUsuarios.ts`) es solo la MISMA comprobación replicada aquí para poder
 * deshabilitar el control y explicar por qué, antes de que el servidor tenga que rechazarlo — mismo
 * patrón que `pantallaRegistrosSlot.ts` (T-21) con `puedeCambiarSlotAtribuido`.
 */

import type { Rol, Perfil } from '../dominio/tipos.ts';
import { ETIQUETA_ROL } from '../dominio/tipos.ts';
import { puedeGestionarUsuarios } from '../dominio/permisosUi.ts';
import { dejariaSinAdministratorActivo } from '../dominio/administracionUsuarios.ts';
import type { OpcionesListarUsuarios, CambiosUsuario, FiltroEstadoUsuario } from '../datos/usuarios.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton } from './formularios.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaUsuarios {
  readonly rol: Rol;
  listarUsuarios(opciones: OpcionesListarUsuarios): Promise<readonly Perfil[]>;
  actualizarUsuario(id: string, cambios: CambiosUsuario): Promise<Perfil>;
}

const ROLES: readonly Rol[] = ['administrator', 'teacher', 'student'];

const MENSAJE_ULTIMO_ADMINISTRATOR =
  'No se puede aplicar: dejaría al sistema sin ningún administrator activo. Asciende a otro usuario a administrator antes de continuar.';

export function mostrarPantallaUsuarios(contenedor: HTMLElement, deps: DependenciasPantallaUsuarios): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeGestionarUsuarios(deps.rol)) {
    const aviso = documento.createElement('p');
    aviso.textContent = 'No tienes acceso a la administración de usuarios.';
    contenedor.append(aviso);
    return;
  }

  let cargando = true;
  let errorCarga = '';
  let usuarios: readonly Perfil[] = [];
  let filtroRol: Rol | 'todos' = 'todos';
  let filtroEstado: FiltroEstadoUsuario = 'activos';
  let busqueda = '';
  let idEnEdicionNombre: string | null = null;
  let idConfirmandoDesactivar: string | null = null;

  const titulo = documento.createElement('h1');
  titulo.textContent = 'Usuarios';

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaInfo = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('div');

  const campoBusqueda = crearCampoTexto(documento, 'usuarios-busqueda', 'Buscar por nombre', 'text', 'off');
  campoBusqueda.input.required = false;

  async function cargar(): Promise<void> {
    cargando = true;
    errorCarga = '';
    pintar();
    try {
      usuarios = await deps.listarUsuarios({
        ...(filtroRol === 'todos' ? {} : { rol: filtroRol }),
        estado: filtroEstado,
        busqueda,
      });
    } catch (error) {
      errorCarga = mensajeAmigable(error);
    } finally {
      cargando = false;
      pintar();
    }
  }

  async function aplicarCambio(objetivo: Perfil, cambio: CambiosUsuario): Promise<void> {
    if (dejariaSinAdministratorActivo(usuarios, objetivo, cambio)) {
      zonaInfo.textContent = MENSAJE_ULTIMO_ADMINISTRATOR;
      return;
    }
    zonaInfo.textContent = '';
    try {
      await deps.actualizarUsuario(objetivo.id, cambio);
      idEnEdicionNombre = null;
      idConfirmandoDesactivar = null;
      await cargar();
    } catch (error) {
      errorCarga = mensajeAmigable(error);
      pintar();
    }
  }

  function pintarFila(usuario: Perfil): HTMLElement {
    const fila = documento.createElement('div');

    if (idEnEdicionNombre === usuario.id) {
      const formEdicion = documento.createElement('form');
      const campo = crearCampoTexto(documento, `usuario-nombre-${usuario.id}`, 'Nombre', 'text', 'off');
      campo.input.value = usuario.nombre;
      const botonGuardar = crearBoton(documento, 'Guardar');
      const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
      botonCancelar.addEventListener('click', () => {
        idEnEdicionNombre = null;
        pintar();
      });
      formEdicion.addEventListener('submit', (evento) => {
        evento.preventDefault();
        void aplicarCambio(usuario, { nombre: campo.input.value });
      });
      formEdicion.append(campo.contenedor, botonGuardar, botonCancelar);
      fila.append(formEdicion);
      return fila;
    }

    const nombreEl = documento.createElement('span');
    nombreEl.textContent = usuario.nombre;
    const estadoEl = documento.createElement('span');
    estadoEl.textContent = usuario.activo ? 'Activo' : 'Inactivo';
    fila.append(nombreEl, estadoEl);

    const botonEditarNombre = crearBoton(documento, 'Editar nombre', 'button');
    botonEditarNombre.addEventListener('click', () => {
      idEnEdicionNombre = usuario.id;
      pintar();
    });
    fila.append(botonEditarNombre);

    const selectRol = documento.createElement('select');
    selectRol.setAttribute('aria-label', `Rol de ${usuario.nombre}`);
    for (const rol of ROLES) {
      const opcion = documento.createElement('option');
      opcion.value = rol;
      opcion.textContent = ETIQUETA_ROL[rol];
      opcion.selected = rol === usuario.rol;
      selectRol.append(opcion);
    }
    const bloquearloDegradaria = ROLES.filter((rol) => rol !== usuario.rol).every((rol) =>
      dejariaSinAdministratorActivo(usuarios, usuario, { rol }),
    );
    selectRol.disabled = bloquearloDegradaria;
    selectRol.addEventListener('change', () => {
      const rolNuevo = selectRol.value as Rol;
      if (rolNuevo === usuario.rol) {
        return;
      }
      void aplicarCambio(usuario, { rol: rolNuevo }).then(() => {
        selectRol.value = usuario.rol;
      });
    });
    fila.append(selectRol);

    if (idConfirmandoDesactivar === usuario.id) {
      const avisoEl = documento.createElement('span');
      avisoEl.setAttribute('role', 'status');
      avisoEl.textContent = `¿Confirmas desactivar a ${usuario.nombre}? No podrá iniciar sesión hasta que se reactive.`;
      const botonConfirmar = crearBoton(documento, 'Confirmar desactivación', 'button');
      botonConfirmar.addEventListener('click', () => {
        void aplicarCambio(usuario, { activo: false });
      });
      const botonCancelarBaja = crearBoton(documento, 'Cancelar', 'button');
      botonCancelarBaja.addEventListener('click', () => {
        idConfirmandoDesactivar = null;
        pintar();
      });
      fila.append(avisoEl, botonConfirmar, botonCancelarBaja);
      return fila;
    }

    if (usuario.activo) {
      const botonDesactivar = crearBoton(documento, 'Desactivar', 'button');
      botonDesactivar.disabled = dejariaSinAdministratorActivo(usuarios, usuario, { activo: false });
      botonDesactivar.addEventListener('click', () => {
        idConfirmandoDesactivar = usuario.id;
        pintar();
      });
      fila.append(botonDesactivar);
    } else {
      const botonReactivar = crearBoton(documento, 'Reactivar', 'button');
      botonReactivar.addEventListener('click', () => {
        void aplicarCambio(usuario, { activo: true });
      });
      fila.append(botonReactivar);
    }

    return fila;
  }

  function pintar(): void {
    zonaError.textContent = errorCarga;
    listaEl.textContent = '';

    if (cargando) {
      const cargandoEl = documento.createElement('p');
      cargandoEl.textContent = 'Cargando…';
      listaEl.append(cargandoEl);
      return;
    }

    if (usuarios.length === 0) {
      const vacioEl = documento.createElement('p');
      vacioEl.textContent = 'No hay ningún usuario que coincida con este filtro.';
      listaEl.append(vacioEl);
      return;
    }

    for (const usuario of usuarios) {
      listaEl.append(pintarFila(usuario));
    }
  }

  campoBusqueda.input.addEventListener('input', () => {
    busqueda = campoBusqueda.input.value;
    void cargar();
  });

  const selectFiltroRol = documento.createElement('select');
  selectFiltroRol.id = 'usuarios-filtro-rol';
  const etiquetaFiltroRol = documento.createElement('label');
  etiquetaFiltroRol.setAttribute('for', 'usuarios-filtro-rol');
  etiquetaFiltroRol.textContent = 'Rol';
  const opcionTodosRoles = documento.createElement('option');
  opcionTodosRoles.value = 'todos';
  opcionTodosRoles.textContent = 'Todos';
  selectFiltroRol.append(opcionTodosRoles);
  for (const rol of ROLES) {
    const opcion = documento.createElement('option');
    opcion.value = rol;
    opcion.textContent = ETIQUETA_ROL[rol];
    selectFiltroRol.append(opcion);
  }
  selectFiltroRol.addEventListener('change', () => {
    filtroRol = selectFiltroRol.value === 'todos' ? 'todos' : (selectFiltroRol.value as Rol);
    void cargar();
  });

  const selectFiltroEstado = documento.createElement('select');
  selectFiltroEstado.id = 'usuarios-filtro-estado';
  const etiquetaFiltroEstado = documento.createElement('label');
  etiquetaFiltroEstado.setAttribute('for', 'usuarios-filtro-estado');
  etiquetaFiltroEstado.textContent = 'Estado';
  for (const [valor, texto] of [
    ['activos', 'Activos'],
    ['inactivos', 'Inactivos'],
    ['todos', 'Todos'],
  ] as const) {
    const opcion = documento.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    selectFiltroEstado.append(opcion);
  }
  selectFiltroEstado.value = filtroEstado;
  selectFiltroEstado.addEventListener('change', () => {
    filtroEstado = selectFiltroEstado.value as FiltroEstadoUsuario;
    void cargar();
  });

  contenedor.append(
    titulo,
    etiquetaFiltroRol,
    selectFiltroRol,
    etiquetaFiltroEstado,
    selectFiltroEstado,
    campoBusqueda.contenedor,
    zonaInfo,
    zonaError,
    listaEl,
  );

  void cargar();
}
