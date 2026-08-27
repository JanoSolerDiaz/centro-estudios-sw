/** Hash de inmutabilidad de una migración (T-07): SHA-256 del contenido tal cual está en disco. */

import { createHash } from 'node:crypto';

export function calcularHash(contenido: string): string {
  return createHash('sha256').update(contenido, 'utf8').digest('hex');
}
