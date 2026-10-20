import { registerSW } from 'virtual:pwa-register';
import { afficherBandeau } from './ui/bandeau';

// Enregistre le service worker (mode prompt : une nouvelle version attend, et
// un bandeau propose de l'installer ; il ne disparaît pas seul). En plus du
// contrôle fait par le navigateur à chaque navigation, on relance une
// vérification quand l'appli revient au premier plan : une PWA installée est
// rarement rechargée à froid.
export function initPwa(): void {
  const mettreAJour = registerSW({
    immediate: true,
    onNeedRefresh() {
      afficherBandeau('Nouvelle version prête.', { libelle: 'Mettre à jour', faire: () => void mettreAJour(true) }, Infinity);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update().catch(() => {
            // Hors ligne : on réessaiera à la prochaine ouverture.
          });
        }
      });
    },
    onRegisterError(error) {
      console.error("Échec de l'enregistrement du service worker :", error);
    },
  });
}
