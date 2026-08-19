import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { CatalogProvider } from "./lib/catalog-context";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <CatalogProvider>
        <App />
      </CatalogProvider>
    </HashRouter>
  </StrictMode>,
);
