import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { crc32, encoderPng } from './png';

/** Blocs d'un PNG : type, données, et CRC vérifié. */
function lireBlocs(octets: Uint8Array): { type: string; donnees: Uint8Array; crcJuste: boolean }[] {
  const v = new DataView(octets.buffer, octets.byteOffset);
  const blocs = [];
  for (let i = 8; i < octets.length;) {
    const n = v.getUint32(i);
    const type = String.fromCharCode(...octets.subarray(i + 4, i + 8));
    blocs.push({ type, donnees: octets.subarray(i + 8, i + 8 + n), crcJuste: v.getUint32(i + 8 + n) === crc32(octets.subarray(i + 4, i + 8 + n)) });
    i += 12 + n;
  }
  return blocs;
}

/** Pixels RGBA de `l` × `h` dont chaque octet dépend de sa position. */
function motif(l: number, h: number, y0 = 0): Uint8Array {
  const px = new Uint8Array(l * h * 4);
  for (let i = 0; i < px.length; i++) px[i] = (i + y0 * l * 4) % 251;
  return px;
}

describe('crc32', () => {
  it('donne la valeur connue du bloc IEND', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });
});

describe('encoderPng', () => {
  it('assemble les bandes en un PNG valide qui rend exactement les pixels fournis', async () => {
    const [l, h] = [7, 5];
    const blob = await encoderPng(l, h, [motif(l, 2), motif(l, 2, 2), motif(l, 1, 4)]);
    expect(blob.type).toBe('image/png');
    const octets = new Uint8Array(await blob.arrayBuffer());
    expect([...octets.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const blocs = lireBlocs(octets);
    expect(blocs.map((b) => b.type)).toEqual(['IHDR', 'IDAT', 'IEND']);
    expect(blocs.every((b) => b.crcJuste)).toBe(true);
    const entete = new DataView(blocs[0].donnees.buffer, blocs[0].donnees.byteOffset);
    expect([entete.getUint32(0), entete.getUint32(4)]).toEqual([l, h]);
    expect([...blocs[0].donnees.subarray(8)]).toEqual([8, 6, 0, 0, 0]);
    // Chaque ligne : octet de filtre 0 puis les pixels, dans l'ordre des bandes.
    const brut = inflateSync(blocs[1].donnees);
    const attendu = motif(l, h);
    expect(brut.length).toBe(h * (l * 4 + 1));
    for (let y = 0; y < h; y++) {
      expect(brut[y * (l * 4 + 1)]).toBe(0);
      expect([...brut.subarray(y * (l * 4 + 1) + 1, (y + 1) * (l * 4 + 1))]).toEqual([...attendu.subarray(y * l * 4, (y + 1) * l * 4)]);
    }
  });

  it('refuse une image incomplète ou une bande de travers', async () => {
    await expect(encoderPng(4, 3, [motif(4, 2)])).rejects.toThrow('Image incomplète');
    await expect(encoderPng(4, 3, [new Uint8Array(5)])).rejects.toThrow('Bande de taille inattendue');
    await expect(encoderPng(4, 1, [motif(4, 2)])).rejects.toThrow('Bande de taille inattendue');
  });
});
