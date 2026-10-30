// Encodeur PNG minimal (RGBA 8 bits) : assemble une image dessinée par bandes, sans jamais tenir l'image entière dans
// un canvas. Les lignes passent au fil de l'eau dans CompressionStream('deflate'), qui produit le format zlib
// qu'attend le bloc IDAT (et non 'deflate-raw').

const TABLE_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 des blocs PNG (calculé sur le type et les données, pas sur la longueur). */
export function crc32(octets: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < octets.length; i++) c = TABLE_CRC[(c ^ octets[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function bloc(type: string, donnees: Uint8Array): Uint8Array {
  const b = new Uint8Array(12 + donnees.length);
  const v = new DataView(b.buffer);
  v.setUint32(0, donnees.length);
  for (let i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i);
  b.set(donnees, 8);
  v.setUint32(8 + donnees.length, crc32(b.subarray(4, 8 + donnees.length)));
  return b;
}

const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

/** PNG `largeur` × `hauteur` à partir de bandes de pixels RGBA, de haut en bas ; chaque bande n'est lue qu'au moment d'être compressée. */
export async function encoderPng(largeur: number, hauteur: number, bandes: Iterable<Uint8ClampedArray | Uint8Array>): Promise<Blob> {
  const ligne = largeur * 4;
  const cs = new CompressionStream('deflate');
  // La lecture démarre avant l'écriture : sinon la contre-pression bloque les écritures.
  const compresse = new Response(cs.readable).arrayBuffer();
  compresse.catch(() => undefined);
  const ecrivain = cs.writable.getWriter();
  let lignes = 0;
  try {
    for (const px of bandes) {
      const n = px.length / ligne;
      if (!Number.isInteger(n) || lignes + n > hauteur) throw new Error('Bande de taille inattendue');
      // Chaque ligne commence par l'octet de filtre 0 (aucun filtre).
      const brut = new Uint8Array(n * (ligne + 1));
      for (let y = 0; y < n; y++) brut.set(px.subarray(y * ligne, (y + 1) * ligne), y * (ligne + 1) + 1);
      await ecrivain.write(brut);
      lignes += n;
    }
    if (lignes !== hauteur) throw new Error('Image incomplète');
    await ecrivain.close();
  } catch (e) {
    await ecrivain.abort(e).catch(() => undefined);
    throw e;
  }
  const entete = new Uint8Array(13);
  const v = new DataView(entete.buffer);
  v.setUint32(0, largeur);
  v.setUint32(4, hauteur);
  entete.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA, deflate, filtrage standard, sans entrelacement
  return new Blob([SIGNATURE, bloc('IHDR', entete), bloc('IDAT', new Uint8Array(await compresse)), bloc('IEND', new Uint8Array())], { type: 'image/png' });
}
