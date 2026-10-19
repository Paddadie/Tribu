// Petits utilitaires DOM : création d'éléments et icônes. Pas de framework.

export type Enfant = Node | string | null | false | undefined;
type Attributs = Record<string, unknown>;

/** Propriétés à affecter directement (et non via setAttribute) pour refléter l'état courant. */
const PROPRIETES = new Set(['value', 'checked', 'disabled', 'required', 'selected']);

/**
 * Crée un élément. `class` → className, `onclick`… → écouteur, `value`/`disabled`… → propriété,
 * le reste → attribut (false/undefined/null ignorés, true → attribut vide).
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  balise: K,
  attributs: Attributs = {},
  ...enfants: Enfant[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(balise);
  for (const [cle, valeur] of Object.entries(attributs)) {
    if (valeur === undefined || valeur === null || valeur === false) continue;
    if (cle === 'class') el.className = String(valeur);
    else if (cle.startsWith('on') && typeof valeur === 'function') {
      el.addEventListener(cle.slice(2), valeur as EventListener);
    } else if (PROPRIETES.has(cle)) (el as unknown as Attributs)[cle] = valeur;
    else el.setAttribute(cle, valeur === true ? '' : String(valeur));
  }
  for (const e of enfants) {
    if (e === null || e === false || e === undefined) continue;
    el.append(e);
  }
  return el;
}

/** Icônes (tracés SVG statiques, couleur héritée du texte). */
const TRACES = {
  recherche: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  retour: '<path d="M15 5l-7 7 7 7"/>',
  crayon: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  corbeille: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
} as const;

export function icone(nom: keyof typeof TRACES, taille = 20): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(taille));
  svg.setAttribute('height', String(taille));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = TRACES[nom];
  return svg;
}
