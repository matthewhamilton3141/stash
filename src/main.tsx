import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import Capture from "./Capture";

// One bundle serves both windows; pick the view by window label.
const isCapture = getCurrentWindow().label === "capture";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isCapture ? <Capture /> : <App />}</React.StrictMode>
);
