import { describe, expect, it, vi } from 'vitest';
import { exporterFichier } from './fichier';

const erreur = (name: string) => Object.assign(new Error(name), { name });

describe('exporterFichier', () => {
  it('partage le fichier quand le téléphone le permet', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const repli = vi.fn();
    const issue = await exporterFichier('tribu.json', '{}', 'application/json', { share, canShare: () => true }, repli);
    expect(issue).toBe('partage');
    const fichier = share.mock.calls[0][0].files[0] as File;
    expect(fichier.name).toBe('tribu.json');
    expect(await fichier.text()).toBe('{}');
    expect(repli).not.toHaveBeenCalled();
  });

  it('signale l’annulation sans télécharger', async () => {
    const repli = vi.fn();
    const share = vi.fn().mockRejectedValue(erreur('AbortError'));
    expect(await exporterFichier('t.json', '{}', 'application/json', { share, canShare: () => true }, repli)).toBe('annule');
    expect(repli).not.toHaveBeenCalled();
  });

  it('télécharge si le partage de fichiers n’existe pas', async () => {
    const repli = vi.fn();
    expect(await exporterFichier('t.json', '{}', 'application/json', {}, repli)).toBe('telecharge');
    expect(await exporterFichier('t.json', '{}', 'application/json', { share: vi.fn(), canShare: () => false }, repli)).toBe('telecharge');
    expect(repli).toHaveBeenCalledTimes(2);
  });

  it('télécharge si le partage est refusé pour une autre raison', async () => {
    const repli = vi.fn();
    const share = vi.fn().mockRejectedValue(erreur('NotAllowedError'));
    expect(await exporterFichier('t.json', '{}', 'application/json', { share, canShare: () => true }, repli)).toBe('telecharge');
    expect(repli).toHaveBeenCalledWith('t.json', '{}', 'application/json');
  });

  it('remonte l’erreur si même le téléchargement échoue', async () => {
    const repli = vi.fn(() => {
      throw new Error('bloqué');
    });
    await expect(exporterFichier('t.json', '{}', 'application/json', {}, repli)).rejects.toThrow('bloqué');
  });
});
