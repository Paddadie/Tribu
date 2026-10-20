// @vitest-environment happy-dom
// Bandeau : temporaire par défaut, persistant pour « Nouvelle version prête ».

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { afficherBandeau } from './bandeau';

const texte = () => document.querySelector('.bandeau')?.textContent ?? null;

describe('bandeau', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it('un bandeau temporaire disparaît seul', () => {
    afficherBandeau('Fiche supprimée.');
    expect(texte()).toBe('Fiche supprimée.');
    vi.advanceTimersByTime(8000);
    expect(texte()).toBeNull();
  });

  it('un bandeau persistant reste, revient après un temporaire et part avec son action', () => {
    const faire = vi.fn();
    afficherBandeau('Nouvelle version prête.', { libelle: 'Mettre à jour', faire }, Infinity);
    vi.advanceTimersByTime(60_000);
    expect(texte()).toContain('Nouvelle version prête.');

    afficherBandeau('Fiche supprimée.');
    expect(texte()).toBe('Fiche supprimée.');
    vi.advanceTimersByTime(8000);
    expect(texte()).toContain('Nouvelle version prête.');

    document.querySelector<HTMLButtonElement>('.bandeau-action')!.click();
    expect(faire).toHaveBeenCalledOnce();
    expect(texte()).toBeNull();
  });
});
