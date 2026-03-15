import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

window.addEventListener('error', (e) => {
  if (e.message && (
    e.message.includes('WebGL') ||
    e.message.includes('Failed to create WebGL context') ||
    e.message.includes('maplibregl')
  )) {
    e.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason || '');
  if (
    msg.includes('WebGL') ||
    msg.includes('Failed to create WebGL context') ||
    msg.includes('maplibregl')
  ) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
