// Petits utilitaires DOM : création d'éléments et icônes. Pas de framework.

export type Enfant = Node | string | null | false | undefined;
type Attributs = Record<string, unknown>;

/** Propriétés à affecter directement (et non via setAttribute) pour refléter l'état courant. */
const PROPRIETES = new Set(['value', 'checked', 'disabled', 'required', 'selected']);

/**
 * Crée un élément. `class` → className, `onclick`… → écouteur, `value`/`disabled`… → propriété,
 * le reste → attribut (false/undefined/null ignorés, true → attribut vide).
 */
export function h<K extends keyof HTMLElementTagNameMap>(balise: K, attributs: Attributs = {}, ...enfants: Enfant[]): HTMLElementTagNameMap[K] {
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
  revenir: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  crayon: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
  coche: '<path d="M5 12l5 5 9-10"/>',
  corbeille: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  coeur: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
  coeurBrise: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/><path d="M12 7.4l-1.6 3.2 2.6 2-1.4 3"/>',
  haut: '<path d="M12 19V6M6 11l6-6 6 6"/>',
  bas: '<path d="M12 5v13M6 13l6 6 6-6"/>',
  famille:
    '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 13.6c2.9.2 5 2.2 5 5.4"/>',
  alerte: '<path d="M12 3L2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  cote: '<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
  ami: '<circle cx="9" cy="8.5" r="3"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><path d="M15.5 14.1c2.4.1 4.2 1.7 4.8 4.4"/>',
  croix: '<path d="M6 6l12 12M18 6L6 18"/>',
  moins: '<path d="M5 12h14"/>',
  arbre: '<circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M12 7.5V12M6 16.5V12h12v4.5"/>',
  echange: '<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
  reglages:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
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
