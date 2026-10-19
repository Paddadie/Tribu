import "./style.css";
import { initPwa } from "./pwa";

const app = document.querySelector<HTMLElement>("#app");
if (app) {
  const titre = document.createElement("h1");
  titre.textContent = "Tribu";

  const version = document.createElement("p");
  version.className = "version";
  const date = new Date(__BUILD_DATE__).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  version.textContent = `v${__APP_VERSION__} · build du ${date}`;

  app.append(titre, version);
}

initPwa();
