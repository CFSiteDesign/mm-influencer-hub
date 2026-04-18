import { installStorageShim } from "./lib/storage-shim";
// Must run BEFORE any module that touches localStorage (incl. Supabase client).
installStorageShim();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
