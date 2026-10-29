import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./dessins.css', import.meta.url), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '');

/** Déclarations d'une règle de dessins.css, par propriété. */
function regle(selecteur: string): Record<string, string> {
  const bloc = css.match(new RegExp(`(^|\\n)${selecteur.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`))?.[2] ?? '';
  return Object.fromEntries(bloc.split(';').flatMap((d) => (d.includes(':') ? [d.split(':').map((s) => s.trim()) as [string, string]] : [])));
}

describe('dessins.css : « née X » sous le nom', () => {
  it('a la même largeur que le nom et laisse la place à la pente de l’italique', () => {
    const naissance = regle('.noeud .naissance');
    expect(naissance['max-width']).toBe(regle('.noeud .nom')['max-width']);
    expect(naissance['padding-inline']).toBe('2px');
  });
});
