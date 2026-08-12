// @ts-ignore: module types may be missing in this environment
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";

// @ts-ignore: allow side-effect CSS imports without type declarations
import "./styles/index.css";
// @ts-ignore: allow side-effect CSS imports without type declarations
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <App />
);