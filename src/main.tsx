import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./App";
import Capture from "./Capture";

// One bundle serves all windows; pick the view by window label. New capture
// windows spawned by ⌘⇧N get labels like "capture-0", "capture-1", ...
const isCapture = getCurrentWindow().label.startsWith("capture");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>{isCapture ? <Capture /> : <App />}</React.StrictMode>
);
