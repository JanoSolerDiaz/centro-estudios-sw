import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFetchSimulado, type PeticionSimulada } from './pruebas/dobleHttp.ts';
import { crearClientePostgrest } from './postgrest.ts';
import { crearClienteAlmacenamiento } from './almacenamiento.ts';
import {
  procesarAvatar,
  subirAvatarAlumno,
  eliminarAvatarAlumno,
  urlsAvataresEnLote,
  type FabricaProcesadoImagen,
  type BitmapImagen,
  type LienzoDibujo,
} from './avatarAlumno.ts';
import { FicheroDemasiadoGrande, SinPermiso, TipoDeFicheroNoPermitido } from './erroresDominio.ts';
import { crearRelojFijo } from '../nucleo/reloj.ts';
import { crearLimitadorTasa, ErrorLimiteAlcanzado } from '../nucleo/limitadorTasa.ts';

function crearPostgrest(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClientePostgrest({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

function crearAlmacenamiento(manejador: Parameters<typeof crearFetchSimulado>[0]) {
  return crearClienteAlmacenamiento({
    urlBase: 'https://proyecto.supabase.co',
    claveAnonima: 'clave-anonima',
    fetchImpl: crearFetchSimulado(manejador),
  });
}

/** Fábrica de mentira: registra qué lado se pidió y con qué recorte, y devuelve un Blob marcado
 * para poder comprobar qué llamada produjo qué derivada — sin decodificar ni pintar ningún píxel
 * real (ver la cabecera de `avatarAlumno.ts` sobre por qué eso no se testea aquí). */
function crearFabricaDeMentira(bitmap: BitmapImagen) {
  const llamadas: { lado: number; recorte: unknown; tipo: string; calidad: number | undefined }[] = [];
  let bitmapCerrado = false;
  const fabrica: FabricaProcesadoImagen = {
    crearBitmap() {
      return Promise.resolve({ ...bitmap, close: () => (bitmapCerrado = true) });
    },
    crearLienzo(lado) {
      const lienzo: LienzoDibujo = {
        dibujarRecortado(bitmapRecibido, recorte) {
          llamadas.push({ lado, recorte, tipo: '', calidad: undefined });
        },
        aBlob(tipo, calidad) {
          const llamada = llamadas[llamadas.length - 1];
          if (llamada) {
            llamada.tipo = tipo;
            llamada.calidad = calidad;
          }
          return Promise.resolve(new Blob([`lado:${String(lado)}`], { type: tipo }));
        },
      };
      return lienzo;
    },
  };
  return { fabrica, llamadas, bitmapCerrado: () => bitmapCerrado };
}

void test('procesarAvatar genera una derivada de 512 y otra de 96, ambas image/webp', async () => {
  const { fabrica, llamadas } = crearFabricaDeMentira({ width: 4000, height: 3000 });

  const { principal, mini } = await procesarAvatar(new Blob(['origen']), fabrica);

  assert.equal(llamadas.length, 2);
  assert.deepEqual(
    llamadas.map((l) => l.lado),
    [512, 96],
  );
  assert.ok(llamadas.every((l) => l.tipo === 'image/webp'));
  assert.equal(principal.type, 'image/webp');
  assert.equal(mini.type, 'image/webp');
});

void test('procesarAvatar recorta al cuadrado centrado antes de generar cada derivada', async () => {
  const { fabrica, llamadas } = crearFabricaDeMentira({ width: 4000, height: 3000 });

  await procesarAvatar(new Blob(['origen']), fabrica);

  for (const llamada of llamadas) {
    assert.deepEqual(llamada.recorte, { x: 500, y: 0, lado: 3000 });
  }
});

void test('procesarAvatar libera el bitmap decodificado aunque el dibujado falle', async () => {
  let cerrado = false;
  const fabrica: FabricaProcesadoImagen = {
    crearBitmap() {
      return Promise.resolve({ width: 100, height: 100, close: () => (cerrado = true) });
    },
    crearLienzo() {
      return {
        dibujarRecortado() {
          throw new Error('fallo simulado de dibujado');
        },
        aBlob() {
          return Promise.resolve(new Blob());
        },
      };
    },
  };

  await assert.rejects(() => procesarAvatar(new Blob(['x']), fabrica));
  assert.equal(cerrado, true);
});

void test('subirAvatarAlumno rechaza un fichero que no es imagen sin llamar a ninguna red', async () => {
  let llamadasHttp = 0;
  const postgrest = crearPostgrest(() => {
    llamadasHttp += 1;
    return { estado: 200, cuerpo: [] };
  });
  const almacenamiento = crearAlmacenamiento(() => {
    llamadasHttp += 1;
    return { estado: 200, cuerpo: {} };
  });
  const { fabrica } = crearFabricaDeMentira({ width: 100, height: 100 });

  await assert.rejects(
    () =>
      subirAvatarAlumno(
        { postgrest, almacenamiento, fabrica },
        'a1',
        'admin1',
        { tipo: 'application/pdf', tamanoBytes: 1000, datos: new Blob(['x']) },
        null,
      ),
    TipoDeFicheroNoPermitido,
  );
  assert.equal(llamadasHttp, 0);
});

void test('subirAvatarAlumno rechaza un fichero demasiado grande sin procesarlo', async () => {
  const postgrest = crearPostgrest(() => ({ estado: 200, cuerpo: [] }));
  const almacenamiento = crearAlmacenamiento(() => ({ estado: 200, cuerpo: {} }));
  const { fabrica, llamadas } = crearFabricaDeMentira({ width: 100, height: 100 });

  await assert.rejects(
    () =>
      subirAvatarAlumno(
        { postgrest, almacenamiento, fabrica },
        'a1',
        'admin1',
        { tipo: 'image/jpeg', tamanoBytes: 16 * 1024 * 1024, datos: new Blob(['x']) },
        null,
      ),
    FicheroDemasiadoGrande,
  );
  assert.equal(llamadas.length, 0);
});

void test('subirAvatarAlumno sube las dos derivadas, actualiza avatar_ruta y, sin avatar anterior, no borra nada', async () => {
  const peticionesAlmacenamiento: PeticionSimulada[] = [];
  const peticionesPostgrest: PeticionSimulada[] = [];
  const postgrest = crearPostgrest((p) => {
    peticionesPostgrest.push(p);
    return { estado: 204, cuerpo: undefined };
  });
  const almacenamiento = crearAlmacenamiento((p) => {
    peticionesAlmacenamiento.push(p);
    return { estado: 200, cuerpo: { Key: 'ok' } };
  });
  const { fabrica } = crearFabricaDeMentira({ width: 4000, height: 4000 });

  const { rutaBase } = await subirAvatarAlumno(
    { postgrest, almacenamiento, fabrica, generarUuid: () => 'uuid-fijo' },
    'a1',
    'admin1',
    { tipo: 'image/jpeg', tamanoBytes: 1000, datos: new Blob(['x']) },
    null,
  );

  assert.equal(rutaBase, 'alumno/a1/uuid-fijo/');
  const subidas = peticionesAlmacenamiento.filter((p) => p.metodo === 'POST');
  assert.equal(subidas.length, 2);
  assert.ok(subidas.some((p) => p.url.endsWith('/storage/v1/object/avatares/alumno/a1/uuid-fijo/avatar.webp')));
  assert.ok(subidas.some((p) => p.url.endsWith('/storage/v1/object/avatares/alumno/a1/uuid-fijo/avatar-mini.webp')));
  assert.equal(peticionesAlmacenamiento.some((p) => p.metodo === 'DELETE'), false);

  const patch = peticionesPostgrest.find((p) => p.metodo === 'PATCH');
  assert.ok(patch);
  assert.equal((patch.cuerpo as Record<string, unknown>).avatar_ruta, 'alumno/a1/uuid-fijo/');
  const url = new URL(patch.url);
  assert.equal(url.searchParams.get('id'), 'eq.a1');
});

void test('subirAvatarAlumno con avatar anterior sube lo nuevo, cambia el puntero y SOLO ENTONCES borra lo viejo', async () => {
  const orden: string[] = [];
  const postgrest = crearPostgrest(() => {
    orden.push('actualizar-puntero');
    return { estado: 204, cuerpo: undefined };
  });
  const almacenamiento = crearAlmacenamiento((p) => {
    orden.push(p.metodo === 'DELETE' ? 'borrar-antiguo' : 'subir-nuevo');
    return { estado: 200, cuerpo: {} };
  });
  const { fabrica } = crearFabricaDeMentira({ width: 100, height: 100 });

  await subirAvatarAlumno(
    { postgrest, almacenamiento, fabrica, generarUuid: () => 'uuid-nuevo' },
    'a1',
    'admin1',
    { tipo: 'image/png', tamanoBytes: 500, datos: new Blob(['x']) },
    'alumno/a1/uuid-viejo/',
  );

  assert.deepEqual(orden, ['subir-nuevo', 'subir-nuevo', 'actualizar-puntero', 'borrar-antiguo']);
  const borrado = orden.filter((o) => o === 'borrar-antiguo');
  assert.equal(borrado.length, 1);
});

void test('subirAvatarAlumno respeta el límite de tasa inyectado (contrato de T-06)', async () => {
  const postgrest = crearPostgrest(() => ({ estado: 204, cuerpo: undefined }));
  const almacenamiento = crearAlmacenamiento(() => ({ estado: 200, cuerpo: {} }));
  const { fabrica } = crearFabricaDeMentira({ width: 100, height: 100 });
  const limitador = crearLimitadorTasa({ maximo: 1, ventanaMs: 60_000, reloj: crearRelojFijo(new Date('2026-01-01T10:00:00Z')) });

  await subirAvatarAlumno(
    { postgrest, almacenamiento, fabrica, limitador },
    'a1',
    'admin1',
    { tipo: 'image/jpeg', tamanoBytes: 100, datos: new Blob(['x']) },
    null,
  );

  await assert.rejects(
    () =>
      subirAvatarAlumno(
        { postgrest, almacenamiento, fabrica, limitador },
        'a2',
        'admin1',
        { tipo: 'image/jpeg', tamanoBytes: 100, datos: new Blob(['x']) },
        null,
      ),
    ErrorLimiteAlcanzado,
  );
});

void test('subirAvatarAlumno propaga SinPermiso cuando un teacher intenta subir (RLS)', async () => {
  const postgrest = crearPostgrest(() => ({ estado: 204, cuerpo: undefined }));
  const almacenamiento = crearAlmacenamiento(() => ({
    estado: 403,
    cuerpo: { message: 'new row violates row-level security policy' },
  }));
  const { fabrica } = crearFabricaDeMentira({ width: 100, height: 100 });

  await assert.rejects(
    () =>
      subirAvatarAlumno(
        { postgrest, almacenamiento, fabrica },
        'a1',
        'teacher1',
        { tipo: 'image/jpeg', tamanoBytes: 100, datos: new Blob(['x']) },
        null,
      ),
    SinPermiso,
  );
});

void test('eliminarAvatarAlumno pone avatar_ruta a NULL y borra las dos derivadas', async () => {
  const peticionesPostgrest: PeticionSimulada[] = [];
  const peticionesAlmacenamiento: PeticionSimulada[] = [];
  const postgrest = crearPostgrest((p) => {
    peticionesPostgrest.push(p);
    return { estado: 204, cuerpo: undefined };
  });
  const almacenamiento = crearAlmacenamiento((p) => {
    peticionesAlmacenamiento.push(p);
    return { estado: 200, cuerpo: [] };
  });

  await eliminarAvatarAlumno({ postgrest, almacenamiento }, 'a1', 'alumno/a1/uuid-viejo/');

  const patch = peticionesPostgrest.find((p) => p.metodo === 'PATCH');
  assert.ok(patch);
  assert.equal((patch.cuerpo as Record<string, unknown>).avatar_ruta, null);

  assert.equal(peticionesAlmacenamiento.length, 1);
  const borrado = peticionesAlmacenamiento[0];
  assert.ok(borrado);
  assert.equal(borrado.metodo, 'DELETE');
  assert.deepEqual(borrado.cuerpo, {
    prefixes: ['alumno/a1/uuid-viejo/avatar.webp', 'alumno/a1/uuid-viejo/avatar-mini.webp'],
  });
});

void test('urlsAvataresEnLote firma la variante pedida de TODOS los alumnos en una sola petición', async () => {
  let numeroDePeticiones = 0;
  const almacenamiento = crearAlmacenamiento(() => {
    numeroDePeticiones += 1;
    return {
      estado: 200,
      cuerpo: [
        { path: 'alumno/a1/u1/avatar-mini.webp', signedURL: '/x?token=1', error: null },
        { path: 'alumno/a2/u2/avatar-mini.webp', signedURL: '/x?token=2', error: null },
      ],
    };
  });

  const resultado = await urlsAvataresEnLote(
    almacenamiento,
    [
      { alumnoId: 'a1', rutaBase: 'alumno/a1/u1/' },
      { alumnoId: 'a2', rutaBase: 'alumno/a2/u2/' },
    ],
    'mini',
    60,
  );

  assert.equal(numeroDePeticiones, 1);
  assert.equal(resultado.size, 2);
  assert.ok(resultado.get('a1')?.endsWith('token=1'));
  assert.ok(resultado.get('a2')?.endsWith('token=2'));
});

void test('urlsAvataresEnLote sin alumnos no hace ninguna petición', async () => {
  let numeroDePeticiones = 0;
  const almacenamiento = crearAlmacenamiento(() => {
    numeroDePeticiones += 1;
    return { estado: 200, cuerpo: [] };
  });

  const resultado = await urlsAvataresEnLote(almacenamiento, [], 'mini', 60);

  assert.equal(numeroDePeticiones, 0);
  assert.equal(resultado.size, 0);
});

void test('urlsAvataresEnLote omite un alumno cuyo path el servidor no devolvió firmado', async () => {
  const almacenamiento = crearAlmacenamiento(() => ({
    estado: 200,
    cuerpo: [{ path: 'alumno/a1/u1/avatar-mini.webp', signedURL: '/x?token=1', error: null }],
  }));

  const resultado = await urlsAvataresEnLote(
    almacenamiento,
    [
      { alumnoId: 'a1', rutaBase: 'alumno/a1/u1/' },
      { alumnoId: 'a2', rutaBase: 'alumno/a2/u2/' },
    ],
    'mini',
    60,
  );

  assert.equal(resultado.size, 1);
  assert.ok(resultado.has('a1'));
  assert.equal(resultado.has('a2'), false);
});
