import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAnalytics } from "@/lib/analytics";

const PRELOAD_RELOAD_KEY = "internext-preload-reload-at";
const PRELOAD_RELOAD_COOLDOWN_MS = 60_000;

window.addEventListener("vite:preloadError", (event) => {
  const lastReloadAt = Number(window.sessionStorage.getItem(PRELOAD_RELOAD_KEY) || 0);
  if (Date.now() - lastReloadAt < PRELOAD_RELOAD_COOLDOWN_MS) {
    return;
  }

  event.preventDefault();
  window.sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  window.location.reload();
});

initAnalytics();
createRoot(document.getElementById("root")!).render(<App />);
