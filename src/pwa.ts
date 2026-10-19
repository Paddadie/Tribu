import { registerSW } from "virtual:pwa-register";

// Enregistre le service worker (mode autoUpdate : une nouvelle version est
// activée puis la page se recharge toute seule). En plus du contrôle fait par
// le navigateur à chaque navigation, on relance une vérification quand l'appli
// revient au premier plan : une PWA installée est rarement rechargée à froid.
export function initPwa(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
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
