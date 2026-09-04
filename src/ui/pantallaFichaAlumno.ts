/**
 * Ficha de alumno como pantalla completa (T-16, requisito 2, tercera de las tres pantallas):
 * sustituye a la versión de T-12/T-13 (lista con edición y personas de referencia en línea, ahora
 * en `pantallaListadoAlumnos.ts`) por una pantalla propia con CUATRO bloques — datos personales y
 * centro, personas de referencia, avatar (T-14) y horario (T-15) — cada uno con su propio estado de
 * carga, error y formulario, **aislados entre sí** (requisito 5: "un fallo al subir el avatar no
 * debe tirar la edición de los datos personales"). Por eso cada bloque se monta con su propia
 * función `montarBloqueX(contenedorDelBloque, ...)`, con sus propias variables `let` y su propio
 * `pintar()` que solo toca el DOM de SU bloque — nunca se repinta la pantalla entera al cambiar el
 * estado de un bloque, que es justo lo que rompería el requisito si un único `pintar()` reconstruyera
 * también los campos sin guardar de otro bloque.
 *
 * Dos modos, decididos por `deps.alumnoId` (`null` = alta nueva): en modo alta solo existe el
 * bloque de datos — personas de referencia, avatar y horario necesitan un `id` de alumno real, así
 * que se avisa de que hay que guardar primero. Al crear con éxito, `deps.alCrearAlumno(id)` deja que
 * quien monta la pantalla (el router de `aplicacion.ts`) navegue a la ficha ya en modo edición.
 *
 * Enteramente de `administrator` (igual que T-12): un `teacher` ve solo "No tienes acceso a esta
 * pantalla." y no se dispara ninguna petición de datos.
 */

import { ETIQUETA_DIA_SEMANA, type Rol, type CentroEstudios, type PersonaReferencia, type SlotHorario, type DiaSemana } from '../dominio/tipos.ts';
import { puedeGestionarFichaAlumno, puedeVerPersonasReferencia, puedeGestionarHorarios } from '../dominio/permisosUi.ts';
import { nombreCompletoAlumno } from '../dominio/alumno.ts';
import { buscarPersonaReferenciaDuplicada, normalizarTelefonoReferencia } from '../dominio/personaReferencia.ts';
import type { DatosNombreAlumno } from '../dominio/alumno.ts';
import { inicialesAlumno, colorMonograma, esTipoImagenOrigenAceptado } from '../dominio/avatarAlumno.ts';
import type { AlumnoConCentro, AlumnoConCentroYPersonas, DatosAlumno } from '../datos/alumnos.ts';
import type { DatosPersonaReferencia } from '../datos/personasReferencia.ts';
import type { ArchivoOrigenAvatar } from '../datos/avatarAlumno.ts';
import type { ProfesorParaSelector } from '../datos/profesores.ts';
import type { DatosNuevoSlot, CambiosSlot, ResultadoEscrituraSlot } from '../datos/slotsHorario.ts';
import { crearCampoTexto, crearZonaMensaje, crearBoton, crearMensajeErrorCampo } from './formularios.ts';
import { crearElemento } from './dom.ts';
import { mensajeAmigable } from '../nucleo/mensajesAbuso.ts';

export interface DependenciasPantallaFichaAlumno {
  readonly rol: Rol;
  /** `null` en modo alta: la pantalla solo pinta el bloque de datos hasta que exista un id real. */
  readonly alumnoId: string | null;
  listarCentrosParaSelector(): Promise<readonly CentroEstudios[]>;
  obtenerAlumno(id: string): Promise<AlumnoConCentroYPersonas>;
  crearAlumno(datos: DatosAlumno): Promise<AlumnoConCentroYPersonas>;
  editarAlumno(id: string, datos: DatosAlumno): Promise<AlumnoConCentro>;
  darDeBajaAlumno(id: string, motivo?: string): Promise<AlumnoConCentro>;
  reactivarAlumno(id: string): Promise<AlumnoConCentro>;
  crearPersonaReferencia(alumnoId: string, datos: DatosPersonaReferencia): Promise<PersonaReferencia>;
  editarPersonaReferencia(id: string, datos: DatosPersonaReferencia): Promise<PersonaReferencia>;
  eliminarPersonaReferencia(id: string): Promise<void>;
  /** `undefined` si Storage no ha podido firmar la URL (fichero borrado, red) — el bloque cae al
   * monograma, nunca a un hueco roto. */
  obtenerUrlAvatar(rutaBase: string): Promise<string | undefined>;
  subirAvatar(
    alumnoId: string,
    archivo: ArchivoOrigenAvatar,
    rutaBaseAnterior: string | null,
  ): Promise<{ readonly rutaBase: string }>;
  eliminarAvatar(alumnoId: string, rutaBaseActual: string): Promise<void>;
  listarSlotsDeAlumno(alumnoId: string): Promise<readonly SlotHorario[]>;
  listarProfesoresParaSelector(): Promise<readonly ProfesorParaSelector[]>;
  crearSlot(datos: DatosNuevoSlot): Promise<ResultadoEscrituraSlot>;
  modificarSlot(slotId: string, cambios: CambiosSlot, fechaEfecto: Date): Promise<ResultadoEscrituraSlot>;
  cesarSlot(slotId: string, fechaEfecto: Date): Promise<SlotHorario>;
  volver(): void;
  /** Se llama tras crear el alumno con éxito (modo alta), para que quien monta la pantalla navegue
   * a la ficha ya en modo edición — esta pantalla no se reconstruye a sí misma con un id nuevo. */
  alCrearAlumno(alumnoId: string): void;
}

// ---------------------------------------------------------------------------------------------
// Bloque 1: datos personales y centro (y, dentro de él, dar de baja / reactivar).
// ---------------------------------------------------------------------------------------------

interface CamposFormularioAlumno {
  readonly nombre: HTMLInputElement;
  readonly primerApellido: HTMLInputElement;
  readonly segundoApellido: HTMLInputElement;
  readonly centro: HTMLSelectElement;
  readonly email: HTMLInputElement;
  readonly telefono: HTMLInputElement;
}

function leerFormularioAlumno(campos: CamposFormularioAlumno): DatosAlumno {
  return {
    nombre: campos.nombre.value,
    primer_apellido: campos.primerApellido.value,
    segundo_apellido: campos.segundoApellido.value,
    centro_referencia_id: campos.centro.value,
    email_alumno: campos.email.value,
    telefono_alumno: campos.telefono.value,
  };
}

function rellenarFormularioAlumno(campos: CamposFormularioAlumno, alumno: AlumnoConCentro): void {
  campos.nombre.value = alumno.nombre;
  campos.primerApellido.value = alumno.primer_apellido;
  campos.segundoApellido.value = alumno.segundo_apellido ?? '';
  campos.centro.value = alumno.centro_referencia_id;
  campos.email.value = alumno.email_alumno ?? '';
  campos.telefono.value = alumno.telefono_alumno ?? '';
}

function crearSelectorCentro(documento: Document, id: string, centros: readonly CentroEstudios[]): HTMLSelectElement {
  const select = documento.createElement('select');
  select.id = id;
  select.required = true;
  for (const centro of centros) {
    const opcion = documento.createElement('option');
    opcion.value = centro.id;
    opcion.textContent = centro.activo ? centro.nombre : `${centro.nombre} (inactivo)`;
    select.append(opcion);
  }
  return select;
}

function crearCamposFormularioAlumno(
  documento: Document,
  contenedor: HTMLElement,
  prefijo: string,
  centros: readonly CentroEstudios[],
): CamposFormularioAlumno {
  const nombreCampo = crearCampoTexto(documento, `${prefijo}-nombre`, 'Nombre', 'text', 'off');
  const primerApellidoCampo = crearCampoTexto(documento, `${prefijo}-primer-apellido`, 'Primer apellido', 'text', 'off');
  const segundoApellidoCampo = crearCampoTexto(documento, `${prefijo}-segundo-apellido`, 'Segundo apellido (opcional)', 'text', 'off');
  segundoApellidoCampo.input.required = false;
  const emailCampo = crearCampoTexto(documento, `${prefijo}-email`, 'Email (opcional)', 'email', 'off');
  emailCampo.input.required = false;
  const telefonoCampo = crearCampoTexto(documento, `${prefijo}-telefono`, 'Teléfono (opcional)', 'text', 'off');
  telefonoCampo.input.required = false;

  const etiquetaCentro = crearElemento(documento, 'label', { texto: 'Centro de referencia', atributos: { for: `${prefijo}-centro` } });
  const selectCentro = crearSelectorCentro(documento, `${prefijo}-centro`, centros);

  contenedor.append(
    nombreCampo.contenedor,
    primerApellidoCampo.contenedor,
    segundoApellidoCampo.contenedor,
    etiquetaCentro,
    selectCentro,
    emailCampo.contenedor,
    telefonoCampo.contenedor,
  );

  return {
    nombre: nombreCampo.input,
    primerApellido: primerApellidoCampo.input,
    segundoApellido: segundoApellidoCampo.input,
    centro: selectCentro,
    email: emailCampo.input,
    telefono: telefonoCampo.input,
  };
}

interface DependenciasBloqueDatos {
  readonly centros: readonly CentroEstudios[];
  crearAlumno(datos: DatosAlumno): Promise<AlumnoConCentroYPersonas>;
  editarAlumno(id: string, datos: DatosAlumno): Promise<AlumnoConCentro>;
  darDeBajaAlumno(id: string, motivo?: string): Promise<AlumnoConCentro>;
  reactivarAlumno(id: string): Promise<AlumnoConCentro>;
  alCrearAlumno(alumnoId: string): void;
}

/** `alumnoInicial === undefined` es el modo alta. Devuelve nada: el bloque gestiona su propio DOM y
 * estado por completo, sin exponer nada a quien lo monta salvo `deps.alCrearAlumno`. */
function montarBloqueDatos(contenedorBloque: HTMLElement, deps: DependenciasBloqueDatos, alumnoInicial: AlumnoConCentro | undefined): void {
  const documento = contenedorBloque.ownerDocument;
  const esAlta = alumnoInicial === undefined;

  let alumno: AlumnoConCentro | undefined = alumnoInicial;
  let guardando = false;
  let error = '';
  let info = '';
  let confirmandoBaja = false;

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaInfo = crearZonaMensaje(documento, 'status');
  const formulario = documento.createElement('form');
  const campos = crearCamposFormularioAlumno(documento, formulario, 'ficha-datos', deps.centros);
  if (alumnoInicial) {
    rellenarFormularioAlumno(campos, alumnoInicial);
  }
  const botonGuardar = crearBoton(documento, esAlta ? 'Crear alumno' : 'Guardar datos');
  formulario.append(botonGuardar);

  const zonaBaja = documento.createElement('div');

  function pintarBaja(): void {
    zonaBaja.textContent = '';
    if (esAlta || !alumno) {
      return;
    }
    const alumnoActual = alumno;
    const estadoEl = crearElemento(documento, 'p', {
      texto: `Estado: ${alumnoActual.activo ? 'Activo' : 'Inactivo'}`,
    });
    zonaBaja.append(estadoEl);

    if (alumnoActual.activo) {
      if (confirmandoBaja) {
        const campoMotivo = crearCampoTexto(documento, 'ficha-motivo-baja', 'Motivo (opcional)', 'text', 'off');
        campoMotivo.input.required = false;
        const botonConfirmar = crearBoton(documento, 'Confirmar baja', 'button');
        botonConfirmar.addEventListener('click', () => {
          void (async () => {
            try {
              alumno = await deps.darDeBajaAlumno(alumnoActual.id, campoMotivo.input.value);
              confirmandoBaja = false;
              info = 'Alumno dado de baja.';
              pintar();
            } catch (motivoError) {
              error = mensajeAmigable(motivoError);
              pintar();
            }
          })();
        });
        const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
        botonCancelar.addEventListener('click', () => {
          confirmandoBaja = false;
          pintar();
        });
        zonaBaja.append(campoMotivo.contenedor, botonConfirmar, botonCancelar);
      } else {
        const botonDarDeBaja = crearBoton(documento, 'Dar de baja', 'button');
        botonDarDeBaja.addEventListener('click', () => {
          confirmandoBaja = true;
          pintar();
        });
        zonaBaja.append(botonDarDeBaja);
      }
    } else {
      const botonReactivar = crearBoton(documento, 'Reactivar', 'button');
      botonReactivar.addEventListener('click', () => {
        void (async () => {
          try {
            alumno = await deps.reactivarAlumno(alumnoActual.id);
            info = 'Alumno reactivado.';
            pintar();
          } catch (reactivarError) {
            error = mensajeAmigable(reactivarError);
            pintar();
          }
        })();
      });
      zonaBaja.append(botonReactivar);
    }
  }

  function pintar(): void {
    zonaError.textContent = error;
    zonaInfo.textContent = info;
    botonGuardar.disabled = guardando;
    pintarBaja();
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void (async () => {
      guardando = true;
      error = '';
      info = '';
      pintar();
      try {
        const datos = leerFormularioAlumno(campos);
        if (esAlta) {
          const creado = await deps.crearAlumno(datos);
          guardando = false;
          info = 'Alumno creado.';
          pintar();
          deps.alCrearAlumno(creado.id);
        } else if (alumno) {
          alumno = await deps.editarAlumno(alumno.id, datos);
          guardando = false;
          info = 'Datos guardados.';
          pintar();
        }
      } catch (guardarError) {
        guardando = false;
        error = mensajeAmigable(guardarError);
        pintar();
      }
    })();
  });

  contenedorBloque.append(formulario, zonaInfo, zonaError, zonaBaja);
  if (esAlta) {
    contenedorBloque.append(
      crearElemento(documento, 'p', {
        texto: 'Guarda los datos del alumno para poder añadir personas de referencia, avatar u horario.',
      }),
    );
  }
  pintar();
}

// ---------------------------------------------------------------------------------------------
// Bloque 2: personas de referencia (T-13, sin cambios de fondo — solo aislado en su propio bloque).
// ---------------------------------------------------------------------------------------------

interface CamposFormularioPersonaReferencia {
  readonly nombre: HTMLInputElement;
  readonly primerApellido: HTMLInputElement;
  readonly segundoApellido: HTMLInputElement;
  readonly telefono: HTMLInputElement;
  readonly email: HTMLInputElement;
}

function leerFormularioPersona(campos: CamposFormularioPersonaReferencia): DatosPersonaReferencia {
  return {
    nombre: campos.nombre.value,
    primer_apellido: campos.primerApellido.value,
    segundo_apellido: campos.segundoApellido.value,
    telefono_referencia: campos.telefono.value,
    email_referencia: campos.email.value,
  };
}

function rellenarFormularioPersona(campos: CamposFormularioPersonaReferencia, persona: PersonaReferencia): void {
  campos.nombre.value = persona.nombre;
  campos.primerApellido.value = persona.primer_apellido;
  campos.segundoApellido.value = persona.segundo_apellido ?? '';
  campos.telefono.value = persona.telefono_referencia;
  campos.email.value = persona.email_referencia ?? '';
}

function crearCamposFormularioPersona(documento: Document, contenedor: HTMLElement, prefijo: string): CamposFormularioPersonaReferencia {
  const nombreCampo = crearCampoTexto(documento, `${prefijo}-nombre`, 'Nombre', 'text', 'off');
  const primerApellidoCampo = crearCampoTexto(documento, `${prefijo}-primer-apellido`, 'Primer apellido', 'text', 'off');
  const segundoApellidoCampo = crearCampoTexto(documento, `${prefijo}-segundo-apellido`, 'Segundo apellido (opcional)', 'text', 'off');
  segundoApellidoCampo.input.required = false;
  const telefonoCampo = crearCampoTexto(documento, `${prefijo}-telefono`, 'Teléfono', 'text', 'off');
  const emailCampo = crearCampoTexto(documento, `${prefijo}-email`, 'Email (opcional)', 'email', 'off');
  emailCampo.input.required = false;

  contenedor.append(
    nombreCampo.contenedor,
    primerApellidoCampo.contenedor,
    segundoApellidoCampo.contenedor,
    telefonoCampo.contenedor,
    emailCampo.contenedor,
  );

  return {
    nombre: nombreCampo.input,
    primerApellido: primerApellidoCampo.input,
    segundoApellido: segundoApellidoCampo.input,
    telefono: telefonoCampo.input,
    email: emailCampo.input,
  };
}

interface DependenciasBloquePersonas {
  crearPersonaReferencia(datos: DatosPersonaReferencia): Promise<PersonaReferencia>;
  editarPersonaReferencia(id: string, datos: DatosPersonaReferencia): Promise<PersonaReferencia>;
  eliminarPersonaReferencia(id: string): Promise<void>;
}

function montarBloquePersonas(
  contenedorBloque: HTMLElement,
  deps: DependenciasBloquePersonas,
  personasIniciales: readonly PersonaReferencia[],
): void {
  const documento = contenedorBloque.ownerDocument;

  let personas: readonly PersonaReferencia[] = personasIniciales;
  let error = '';
  let avisoDuplicado = '';
  let idEnEdicion: string | null = null;
  let idConfirmandoEliminar: string | null = null;

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaAviso = crearZonaMensaje(documento, 'status');
  const listaEl = documento.createElement('div');

  function pintarFila(persona: PersonaReferencia): HTMLElement {
    const fila = documento.createElement('div');

    if (idEnEdicion === persona.id) {
      const formEdicion = documento.createElement('form');
      const campos = crearCamposFormularioPersona(documento, formEdicion, `persona-editar-${persona.id}`);
      rellenarFormularioPersona(campos, persona);
      const botonGuardar = crearBoton(documento, 'Guardar');
      const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
      botonCancelar.addEventListener('click', () => {
        idEnEdicion = null;
        pintar();
      });
      formEdicion.addEventListener('submit', (evento) => {
        evento.preventDefault();
        void (async () => {
          try {
            const actualizada = await deps.editarPersonaReferencia(persona.id, leerFormularioPersona(campos));
            personas = personas.map((p) => (p.id === actualizada.id ? actualizada : p));
            idEnEdicion = null;
            pintar();
          } catch (editarError) {
            error = mensajeAmigable(editarError);
            pintar();
          }
        })();
      });
      formEdicion.append(botonGuardar, botonCancelar);
      fila.append(formEdicion);
      return fila;
    }

    fila.append(
      crearElemento(documento, 'span', { texto: nombreCompletoAlumno(persona) }),
      crearElemento(documento, 'span', { texto: persona.telefono_referencia }),
    );
    if (persona.email_referencia) {
      fila.append(crearElemento(documento, 'span', { texto: persona.email_referencia }));
    }

    const botonEditar = crearBoton(documento, 'Editar', 'button');
    botonEditar.addEventListener('click', () => {
      idEnEdicion = persona.id;
      pintar();
    });
    fila.append(botonEditar);

    if (idConfirmandoEliminar === persona.id) {
      const botonConfirmar = crearBoton(documento, 'Confirmar eliminación', 'button');
      botonConfirmar.addEventListener('click', () => {
        void (async () => {
          try {
            await deps.eliminarPersonaReferencia(persona.id);
            personas = personas.filter((p) => p.id !== persona.id);
            idConfirmandoEliminar = null;
            pintar();
          } catch (eliminarError) {
            error = mensajeAmigable(eliminarError);
            pintar();
          }
        })();
      });
      const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
      botonCancelar.addEventListener('click', () => {
        idConfirmandoEliminar = null;
        pintar();
      });
      fila.append(
        crearElemento(documento, 'p', { texto: 'Esta acción es definitiva y no se puede deshacer.' }),
        botonConfirmar,
        botonCancelar,
      );
    } else {
      const botonEliminar = crearBoton(documento, 'Eliminar', 'button');
      botonEliminar.addEventListener('click', () => {
        idConfirmandoEliminar = persona.id;
        pintar();
      });
      fila.append(botonEliminar);
    }

    return fila;
  }

  function pintar(): void {
    zonaError.textContent = error;
    zonaAviso.textContent = avisoDuplicado;
    listaEl.textContent = '';
    if (personas.length === 0) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'Este alumno no tiene ninguna persona de referencia.' }));
    } else {
      for (const persona of personas) {
        listaEl.append(pintarFila(persona));
      }
    }
  }

  const formAlta = documento.createElement('form');
  const camposAlta = crearCamposFormularioPersona(documento, formAlta, 'persona-nueva');
  formAlta.append(crearBoton(documento, 'Añadir persona de referencia'));
  formAlta.addEventListener('submit', (evento) => {
    evento.preventDefault();
    void (async () => {
      const datos = leerFormularioPersona(camposAlta);
      const telefonoNormalizado = normalizarTelefonoReferencia(datos.telefono_referencia);
      avisoDuplicado = buscarPersonaReferenciaDuplicada({ ...datos, telefono_referencia: telefonoNormalizado }, personas)
        ? 'Ya existe una persona de referencia con el mismo nombre y teléfono para este alumno.'
        : '';
      try {
        const creada = await deps.crearPersonaReferencia(datos);
        personas = [...personas, creada];
        camposAlta.nombre.value = '';
        camposAlta.primerApellido.value = '';
        camposAlta.segundoApellido.value = '';
        camposAlta.telefono.value = '';
        camposAlta.email.value = '';
        pintar();
      } catch (crearError) {
        error = mensajeAmigable(crearError);
        pintar();
      }
    })();
  });

  contenedorBloque.append(zonaAviso, zonaError, listaEl, formAlta);
  pintar();
}

// ---------------------------------------------------------------------------------------------
// Bloque 3: avatar (T-14).
// ---------------------------------------------------------------------------------------------

interface DependenciasBloqueAvatar {
  readonly alumnoId: string;
  readonly datosNombre: DatosNombreAlumno;
  obtenerUrlAvatar(rutaBase: string): Promise<string | undefined>;
  subirAvatar(archivo: ArchivoOrigenAvatar, rutaBaseAnterior: string | null): Promise<{ readonly rutaBase: string }>;
  eliminarAvatar(rutaBaseActual: string): Promise<void>;
}

function montarBloqueAvatar(contenedorBloque: HTMLElement, deps: DependenciasBloqueAvatar, datosIniciales: { readonly id: string; readonly avatarRuta: string | null }): void {
  const documento = contenedorBloque.ownerDocument;
  const nombreCompleto = nombreCompletoAlumno(deps.datosNombre);
  const iniciales = inicialesAlumno(deps.datosNombre);
  const color = colorMonograma(datosIniciales.id);

  let rutaBase: string | null = datosIniciales.avatarRuta;
  let urlImagen: string | undefined;
  let cargandoImagen = rutaBase !== null;
  let subiendo = false;
  let error = '';

  const zonaError = crearZonaMensaje(documento, 'alert');
  const notaConsentimiento = crearElemento(documento, 'p', {
    texto:
      'Aviso provisional (T-25 sustituirá este texto por el definitivo del centro): subir la fotografía de un alumno menor de edad requiere el consentimiento informado de su tutor legal para el uso de su imagen, distinto del consentimiento general de tratamiento de datos. Obtener ese consentimiento es responsabilidad del centro, no de esta aplicación.',
  });
  const previsualizacion = documento.createElement('div');
  const inputArchivo = documento.createElement('input');
  inputArchivo.type = 'file';
  inputArchivo.accept = 'image/*';
  inputArchivo.id = 'ficha-avatar-archivo';
  const etiquetaArchivo = crearElemento(documento, 'label', { texto: 'Fotografía', atributos: { for: 'ficha-avatar-archivo' } });
  const botonSubir = crearBoton(documento, 'Subir', 'button');
  const botonQuitar = crearBoton(documento, 'Quitar avatar', 'button');

  function crearMonograma(): HTMLElement {
    const monograma = crearElemento(documento, 'div', {
      texto: iniciales,
      atributos: { 'aria-label': `${nombreCompleto} no tiene fotografía` },
    });
    monograma.style.backgroundColor = color;
    monograma.style.color = '#FFFFFF';
    monograma.style.display = 'inline-flex';
    monograma.style.alignItems = 'center';
    monograma.style.justifyContent = 'center';
    monograma.style.width = '96px';
    monograma.style.height = '96px';
    monograma.style.borderRadius = '50%';
    return monograma;
  }

  function pintarPrevisualizacion(): void {
    previsualizacion.textContent = '';
    if (rutaBase === null) {
      previsualizacion.append(crearMonograma());
      return;
    }
    if (cargandoImagen) {
      previsualizacion.append(crearElemento(documento, 'p', { texto: 'Cargando fotografía…' }));
      return;
    }
    if (urlImagen === undefined) {
      // Firma fallida (fichero borrado, red): monograma de respaldo, nunca un hueco roto.
      previsualizacion.append(crearMonograma());
      return;
    }
    const imagen = documento.createElement('img');
    imagen.src = urlImagen;
    imagen.alt = `Fotografía de ${nombreCompleto}`;
    imagen.width = 96;
    imagen.height = 96;
    previsualizacion.append(imagen);
  }

  function pintar(): void {
    zonaError.textContent = error;
    botonSubir.disabled = subiendo;
    botonSubir.textContent = subiendo ? 'Subiendo…' : rutaBase === null ? 'Subir' : 'Sustituir';
    botonQuitar.hidden = rutaBase === null;
    pintarPrevisualizacion();
  }

  async function cargarUrlSiHace(): Promise<void> {
    if (rutaBase === null) {
      return;
    }
    cargandoImagen = true;
    pintar();
    try {
      urlImagen = await deps.obtenerUrlAvatar(rutaBase);
    } catch {
      urlImagen = undefined;
    } finally {
      cargandoImagen = false;
      pintar();
    }
  }

  botonSubir.addEventListener('click', () => {
    const archivo = inputArchivo.files?.[0];
    if (!archivo) {
      error = 'Elige primero una fotografía.';
      pintar();
      return;
    }
    if (!esTipoImagenOrigenAceptado(archivo.type)) {
      error = 'Solo se admiten imágenes (JPEG, PNG, WebP o HEIC).';
      pintar();
      return;
    }
    subiendo = true;
    error = '';
    pintar();
    void (async () => {
      try {
        const resultado = await deps.subirAvatar({ tipo: archivo.type, tamanoBytes: archivo.size, datos: archivo }, rutaBase);
        rutaBase = resultado.rutaBase;
        inputArchivo.value = '';
        subiendo = false;
        await cargarUrlSiHace();
      } catch (subirError) {
        subiendo = false;
        error = mensajeAmigable(subirError);
        pintar();
      }
    })();
  });

  botonQuitar.addEventListener('click', () => {
    if (rutaBase === null) {
      return;
    }
    void (async () => {
      try {
        await deps.eliminarAvatar(rutaBase);
        rutaBase = null;
        urlImagen = undefined;
        pintar();
      } catch (eliminarError) {
        error = mensajeAmigable(eliminarError);
        pintar();
      }
    })();
  });

  contenedorBloque.append(previsualizacion, notaConsentimiento, zonaError, etiquetaArchivo, inputArchivo, botonSubir, botonQuitar);
  pintar();
  void cargarUrlSiHace();
}

// ---------------------------------------------------------------------------------------------
// Bloque 4: horario (T-15/T-16, requisito 3: fecha de efecto visible + nota de que el histórico no
// cambia).
// ---------------------------------------------------------------------------------------------

interface DependenciasBloqueHorario {
  readonly alumnoId: string;
  listarSlotsDeAlumno(): Promise<readonly SlotHorario[]>;
  listarProfesoresParaSelector(): Promise<readonly ProfesorParaSelector[]>;
  crearSlot(datos: DatosNuevoSlot): Promise<ResultadoEscrituraSlot>;
  modificarSlot(slotId: string, cambios: CambiosSlot, fechaEfecto: Date): Promise<ResultadoEscrituraSlot>;
  cesarSlot(slotId: string, fechaEfecto: Date): Promise<SlotHorario>;
}

function fechaUtcDeCampo(valorFecha: string): Date {
  return new Date(`${valorFecha}T00:00:00Z`);
}

function crearSelectorProfesor(documento: Document, id: string, profesores: readonly ProfesorParaSelector[]): HTMLSelectElement {
  const select = documento.createElement('select');
  select.id = id;
  select.required = true;
  for (const profesor of profesores) {
    const opcion = documento.createElement('option');
    opcion.value = profesor.id;
    opcion.textContent = profesor.nombre;
    select.append(opcion);
  }
  return select;
}

function crearSelectorDiaSemana(documento: Document, id: string): HTMLSelectElement {
  const select = documento.createElement('select');
  select.id = id;
  select.required = true;
  for (const [valor, texto] of Object.entries(ETIQUETA_DIA_SEMANA)) {
    const opcion = documento.createElement('option');
    opcion.value = valor;
    opcion.textContent = texto;
    select.append(opcion);
  }
  return select;
}

function montarBloqueHorario(contenedorBloque: HTMLElement, deps: DependenciasBloqueHorario): void {
  const documento = contenedorBloque.ownerDocument;

  let cargando = true;
  let error = '';
  let aviso = '';
  let slots: readonly SlotHorario[] = [];
  let profesores: readonly ProfesorParaSelector[] = [];
  let idEnEdicion: string | null = null;
  let idEnCese: string | null = null;

  const zonaError = crearZonaMensaje(documento, 'alert');
  const zonaAviso = crearZonaMensaje(documento, 'status');
  const notaHistorico = crearElemento(documento, 'p', {
    texto: 'Editar o cesar un horario no cambia el histórico: cada asistencia registrada guarda una copia del horario tal como estaba vigente en ese momento.',
  });
  const listaEl = documento.createElement('div');
  const formularioAlta = documento.createElement('form');

  function nombreProfesor(profesorId: string): string {
    return profesores.find((p) => p.id === profesorId)?.nombre ?? 'Profesor no disponible';
  }

  function pintarFilaEdicion(slot: SlotHorario): HTMLElement {
    const formEdicion = documento.createElement('form');
    const idProfesor = `slot-editar-profesor-${slot.id}`;
    const selectProfesor = crearSelectorProfesor(documento, idProfesor, profesores);
    selectProfesor.value = slot.profesor_id;
    const etiquetaProfesor = crearElemento(documento, 'label', { texto: 'Profesor', atributos: { for: idProfesor } });

    const idDia = `slot-editar-dia-${slot.id}`;
    const selectDia = crearSelectorDiaSemana(documento, idDia);
    selectDia.value = String(slot.dia_semana);
    const etiquetaDia = crearElemento(documento, 'label', { texto: 'Día de la semana', atributos: { for: idDia } });

    const idInicio = `slot-editar-inicio-${slot.id}`;
    const campoInicio = documento.createElement('input');
    campoInicio.type = 'time';
    campoInicio.id = idInicio;
    campoInicio.required = true;
    campoInicio.value = slot.hora_inicio.slice(0, 5);
    const etiquetaInicio = crearElemento(documento, 'label', { texto: 'Hora de inicio', atributos: { for: idInicio } });

    const idFin = `slot-editar-fin-${slot.id}`;
    const campoFin = documento.createElement('input');
    campoFin.type = 'time';
    campoFin.id = idFin;
    campoFin.required = true;
    campoFin.value = slot.hora_fin.slice(0, 5);
    const etiquetaFin = crearElemento(documento, 'label', { texto: 'Hora de fin', atributos: { for: idFin } });

    const campoAsignatura = crearCampoTexto(documento, `slot-editar-asignatura-${slot.id}`, 'Asignatura o grupo (opcional)', 'text', 'off');
    campoAsignatura.input.required = false;
    campoAsignatura.input.value = slot.asignatura_o_grupo ?? '';

    const idFechaEfecto = `slot-editar-fecha-efecto-${slot.id}`;
    const campoFechaEfecto = documento.createElement('input');
    campoFechaEfecto.type = 'date';
    campoFechaEfecto.id = idFechaEfecto;
    campoFechaEfecto.required = true;
    const etiquetaFechaEfecto = crearElemento(documento, 'label', { texto: 'Fecha de efecto', atributos: { for: idFechaEfecto } });

    const errorHora = crearMensajeErrorCampo(documento, campoFin, `slot-editar-fin-error-${slot.id}`);

    const botonGuardar = crearBoton(documento, 'Guardar');
    const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
    botonCancelar.addEventListener('click', () => {
      idEnEdicion = null;
      pintar();
    });

    formEdicion.addEventListener('submit', (evento) => {
      evento.preventDefault();
      if (campoFin.value <= campoInicio.value) {
        errorHora.establecer('La hora de fin debe ser posterior a la de inicio.');
        return;
      }
      errorHora.limpiar();
      void (async () => {
        try {
          const resultado = await deps.modificarSlot(
            slot.id,
            {
              profesor_id: selectProfesor.value,
              dia_semana: Number(selectDia.value) as DiaSemana,
              hora_inicio: campoInicio.value,
              hora_fin: campoFin.value,
              asignatura_o_grupo: campoAsignatura.input.value.trim().length > 0 ? campoAsignatura.input.value : null,
            },
            fechaUtcDeCampo(campoFechaEfecto.value),
          );
          aviso = resultado.avisoSolapeProfesor
            ? 'Aviso: este profesor ya tiene otro alumno en este mismo día y hora.'
            : '';
          idEnEdicion = null;
          await cargar();
        } catch (modificarError) {
          error = mensajeAmigable(modificarError);
          pintar();
        }
      })();
    });

    formEdicion.append(
      etiquetaProfesor,
      selectProfesor,
      etiquetaDia,
      selectDia,
      etiquetaInicio,
      campoInicio,
      etiquetaFin,
      campoFin,
      errorHora.elemento,
      campoAsignatura.contenedor,
      etiquetaFechaEfecto,
      campoFechaEfecto,
      botonGuardar,
      botonCancelar,
    );
    return formEdicion;
  }

  function pintarFilaCese(slot: SlotHorario): HTMLElement {
    const zona = documento.createElement('div');
    const idFechaEfecto = `slot-cesar-fecha-efecto-${slot.id}`;
    const campoFechaEfecto = documento.createElement('input');
    campoFechaEfecto.type = 'date';
    campoFechaEfecto.id = idFechaEfecto;
    campoFechaEfecto.required = true;
    const etiqueta = crearElemento(documento, 'label', { texto: 'Fecha de efecto del cese', atributos: { for: idFechaEfecto } });
    const botonConfirmar = crearBoton(documento, 'Confirmar cese', 'button');
    botonConfirmar.addEventListener('click', () => {
      if (!campoFechaEfecto.value) {
        return;
      }
      void (async () => {
        try {
          await deps.cesarSlot(slot.id, fechaUtcDeCampo(campoFechaEfecto.value));
          idEnCese = null;
          await cargar();
        } catch (cesarError) {
          error = mensajeAmigable(cesarError);
          pintar();
        }
      })();
    });
    const botonCancelar = crearBoton(documento, 'Cancelar', 'button');
    botonCancelar.addEventListener('click', () => {
      idEnCese = null;
      pintar();
    });
    zona.append(etiqueta, campoFechaEfecto, botonConfirmar, botonCancelar);
    return zona;
  }

  function pintarFila(slot: SlotHorario): HTMLElement {
    if (idEnEdicion === slot.id) {
      return pintarFilaEdicion(slot);
    }

    const fila = documento.createElement('div');
    fila.append(
      crearElemento(documento, 'span', { texto: nombreProfesor(slot.profesor_id) }),
      crearElemento(documento, 'span', { texto: ETIQUETA_DIA_SEMANA[slot.dia_semana] }),
      crearElemento(documento, 'span', { texto: `${slot.hora_inicio.slice(0, 5)}–${slot.hora_fin.slice(0, 5)}` }),
      crearElemento(documento, 'span', { texto: slot.asignatura_o_grupo ?? '—' }),
      crearElemento(documento, 'span', { texto: `Desde: ${slot.vigente_desde}` }),
      crearElemento(documento, 'span', {
        texto: slot.vigente_hasta === null ? 'Vigente' : `Hasta: ${slot.vigente_hasta}`,
      }),
    );

    if (slot.vigente_hasta === null) {
      const botonEditar = crearBoton(documento, 'Editar', 'button');
      botonEditar.addEventListener('click', () => {
        idEnEdicion = slot.id;
        idEnCese = null;
        pintar();
      });
      fila.append(botonEditar);

      if (idEnCese === slot.id) {
        fila.append(pintarFilaCese(slot));
      } else {
        const botonCesar = crearBoton(documento, 'Cesar', 'button');
        botonCesar.addEventListener('click', () => {
          idEnCese = slot.id;
          pintar();
        });
        fila.append(botonCesar);
      }
    }

    return fila;
  }

  function pintar(): void {
    zonaError.textContent = error;
    zonaAviso.textContent = aviso;
    listaEl.textContent = '';
    if (cargando) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'Cargando horario…' }));
      return;
    }
    if (slots.length === 0) {
      listaEl.append(crearElemento(documento, 'p', { texto: 'Este alumno no tiene ningún horario asignado.' }));
    } else {
      for (const slot of slots) {
        listaEl.append(pintarFila(slot));
      }
    }
  }

  async function cargar(): Promise<void> {
    cargando = true;
    error = '';
    pintar();
    try {
      slots = await deps.listarSlotsDeAlumno();
    } catch (cargarError) {
      error = mensajeAmigable(cargarError);
    } finally {
      cargando = false;
      pintar();
    }
  }

  const selectProfesorAlta = crearSelectorProfesor(documento, 'slot-nuevo-profesor', []);
  const etiquetaProfesorAlta = crearElemento(documento, 'label', { texto: 'Profesor', atributos: { for: 'slot-nuevo-profesor' } });
  const selectDiaAlta = crearSelectorDiaSemana(documento, 'slot-nuevo-dia');
  const etiquetaDiaAlta = crearElemento(documento, 'label', { texto: 'Día de la semana', atributos: { for: 'slot-nuevo-dia' } });
  const campoInicioAlta = documento.createElement('input');
  campoInicioAlta.type = 'time';
  campoInicioAlta.id = 'slot-nuevo-inicio';
  campoInicioAlta.required = true;
  const etiquetaInicioAlta = crearElemento(documento, 'label', { texto: 'Hora de inicio', atributos: { for: 'slot-nuevo-inicio' } });
  const campoFinAlta = documento.createElement('input');
  campoFinAlta.type = 'time';
  campoFinAlta.id = 'slot-nuevo-fin';
  campoFinAlta.required = true;
  const etiquetaFinAlta = crearElemento(documento, 'label', { texto: 'Hora de fin', atributos: { for: 'slot-nuevo-fin' } });
  const errorHoraAlta = crearMensajeErrorCampo(documento, campoFinAlta, 'slot-nuevo-fin-error');
  const campoAsignaturaAlta = crearCampoTexto(documento, 'slot-nuevo-asignatura', 'Asignatura o grupo (opcional)', 'text', 'off');
  campoAsignaturaAlta.input.required = false;
  const campoFechaEfectoAlta = documento.createElement('input');
  campoFechaEfectoAlta.type = 'date';
  campoFechaEfectoAlta.required = true;
  const etiquetaFechaEfectoAlta = crearElemento(documento, 'label', {
    texto: 'Fecha de efecto',
    atributos: { for: 'slot-nuevo-fecha-efecto' },
  });
  campoFechaEfectoAlta.id = 'slot-nuevo-fecha-efecto';

  formularioAlta.append(
    etiquetaProfesorAlta,
    selectProfesorAlta,
    etiquetaDiaAlta,
    selectDiaAlta,
    etiquetaInicioAlta,
    campoInicioAlta,
    etiquetaFinAlta,
    campoFinAlta,
    errorHoraAlta.elemento,
    campoAsignaturaAlta.contenedor,
    etiquetaFechaEfectoAlta,
    campoFechaEfectoAlta,
    crearBoton(documento, 'Añadir horario'),
  );

  formularioAlta.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (campoFinAlta.value <= campoInicioAlta.value) {
      errorHoraAlta.establecer('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    errorHoraAlta.limpiar();
    void (async () => {
      try {
        const resultado = await deps.crearSlot({
          alumno_id: deps.alumnoId,
          profesor_id: selectProfesorAlta.value,
          dia_semana: Number(selectDiaAlta.value) as DiaSemana,
          hora_inicio: campoInicioAlta.value,
          hora_fin: campoFinAlta.value,
          asignatura_o_grupo: campoAsignaturaAlta.input.value.trim().length > 0 ? campoAsignaturaAlta.input.value : null,
          vigente_desde: fechaUtcDeCampo(campoFechaEfectoAlta.value),
        });
        aviso = resultado.avisoSolapeProfesor ? 'Aviso: este profesor ya tiene otro alumno en este mismo día y hora.' : '';
        campoInicioAlta.value = '';
        campoFinAlta.value = '';
        campoAsignaturaAlta.input.value = '';
        campoFechaEfectoAlta.value = '';
        await cargar();
      } catch (crearError) {
        error = mensajeAmigable(crearError);
        pintar();
      }
    })();
  });

  contenedorBloque.append(notaHistorico, zonaAviso, zonaError, listaEl, formularioAlta);
  pintar();

  void (async () => {
    try {
      profesores = await deps.listarProfesoresParaSelector();
      for (const profesor of profesores) {
        const opcion = documento.createElement('option');
        opcion.value = profesor.id;
        opcion.textContent = profesor.nombre;
        selectProfesorAlta.append(opcion);
      }
    } catch (cargarProfesoresError) {
      error = mensajeAmigable(cargarProfesoresError);
      pintar();
    }
    await cargar();
  })();
}

// ---------------------------------------------------------------------------------------------
// Orquestación de la pantalla.
// ---------------------------------------------------------------------------------------------

export function mostrarPantallaFichaAlumno(contenedor: HTMLElement, deps: DependenciasPantallaFichaAlumno): void {
  contenedor.textContent = '';
  const documento = contenedor.ownerDocument;

  if (!puedeGestionarFichaAlumno(deps.rol)) {
    contenedor.append(crearElemento(documento, 'p', { texto: 'No tienes acceso a esta pantalla.' }));
    return;
  }

  const botonVolver = crearBoton(documento, 'Volver al listado', 'button');
  botonVolver.addEventListener('click', () => {
    deps.volver();
  });

  const bloqueDatos = documento.createElement('section');
  const bloquePersonas = documento.createElement('section');
  const bloqueAvatar = documento.createElement('section');
  const bloqueHorario = documento.createElement('section');

  // Referenciar un método de `deps` sin llamarlo (`crearAlumno: deps.crearAlumno`) dispara
  // `@typescript-eslint/unbound-method`: se envuelve aquí una única vez, en vez de en cada punto de
  // montaje de bloque, para no repetir el mismo `(x) => deps.x(...)` cuatro veces.
  const depsBloqueDatos: Omit<DependenciasBloqueDatos, 'centros'> = {
    crearAlumno: (datos) => deps.crearAlumno(datos),
    editarAlumno: (id, datos) => deps.editarAlumno(id, datos),
    darDeBajaAlumno: (id, motivo) => deps.darDeBajaAlumno(id, motivo),
    reactivarAlumno: (id) => deps.reactivarAlumno(id),
    alCrearAlumno: (id) => {
      deps.alCrearAlumno(id);
    },
  };

  if (deps.alumnoId === null) {
    contenedor.append(botonVolver, crearElemento(documento, 'h1', { texto: 'Nuevo alumno' }), bloqueDatos);
    montarBloqueDatos(bloqueDatos, { ...depsBloqueDatos, centros: [] }, undefined);

    void (async () => {
      try {
        const centros = await deps.listarCentrosParaSelector();
        bloqueDatos.textContent = '';
        montarBloqueDatos(bloqueDatos, { ...depsBloqueDatos, centros }, undefined);
      } catch (error) {
        bloqueDatos.textContent = '';
        bloqueDatos.append(crearElemento(documento, 'p', { texto: mensajeAmigable(error) }));
      }
    })();
    return;
  }

  const alumnoId = deps.alumnoId;
  const zonaErrorCarga = crearZonaMensaje(documento, 'alert');
  const areaContenido = documento.createElement('div');
  areaContenido.append(crearElemento(documento, 'p', { texto: 'Cargando ficha…' }));

  contenedor.append(botonVolver, crearElemento(documento, 'h1', { texto: 'Ficha de alumno' }), zonaErrorCarga, areaContenido);

  void (async () => {
    try {
      const [ficha, centros] = await Promise.all([deps.obtenerAlumno(alumnoId), deps.listarCentrosParaSelector()]);

      areaContenido.textContent = '';
      const titulo = crearElemento(documento, 'h2', { texto: nombreCompletoAlumno(ficha) });
      areaContenido.append(titulo);

      areaContenido.append(crearElemento(documento, 'h3', { texto: 'Datos y centro' }), bloqueDatos);
      montarBloqueDatos(bloqueDatos, { ...depsBloqueDatos, centros }, ficha);

      areaContenido.append(crearElemento(documento, 'h3', { texto: 'Avatar' }), bloqueAvatar);
      montarBloqueAvatar(
        bloqueAvatar,
        {
          alumnoId,
          datosNombre: ficha,
          obtenerUrlAvatar: (rutaBase) => deps.obtenerUrlAvatar(rutaBase),
          subirAvatar: (archivo, rutaBaseAnterior) => deps.subirAvatar(alumnoId, archivo, rutaBaseAnterior),
          eliminarAvatar: (rutaBaseActual) => deps.eliminarAvatar(alumnoId, rutaBaseActual),
        },
        { id: ficha.id, avatarRuta: ficha.avatar_ruta },
      );

      if (puedeVerPersonasReferencia(deps.rol)) {
        areaContenido.append(crearElemento(documento, 'h3', { texto: 'Personas de referencia' }), bloquePersonas);
        montarBloquePersonas(
          bloquePersonas,
          {
            crearPersonaReferencia: (datos) => deps.crearPersonaReferencia(alumnoId, datos),
            editarPersonaReferencia: (id, datos) => deps.editarPersonaReferencia(id, datos),
            eliminarPersonaReferencia: (id) => deps.eliminarPersonaReferencia(id),
          },
          ficha.personas_referencia,
        );
      }

      if (puedeGestionarHorarios(deps.rol)) {
        areaContenido.append(crearElemento(documento, 'h3', { texto: 'Horario' }), bloqueHorario);
        montarBloqueHorario(bloqueHorario, {
          alumnoId,
          listarSlotsDeAlumno: () => deps.listarSlotsDeAlumno(alumnoId),
          listarProfesoresParaSelector: () => deps.listarProfesoresParaSelector(),
          crearSlot: (datos) => deps.crearSlot(datos),
          modificarSlot: (slotId, cambios, fechaEfecto) => deps.modificarSlot(slotId, cambios, fechaEfecto),
          cesarSlot: (slotId, fechaEfecto) => deps.cesarSlot(slotId, fechaEfecto),
        });
      }
    } catch (error) {
      areaContenido.textContent = '';
      zonaErrorCarga.textContent = mensajeAmigable(error);
    }
  })();
}
