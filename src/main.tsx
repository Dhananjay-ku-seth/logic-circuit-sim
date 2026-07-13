import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// No StrictMode: this app attaches imperative window pointer listeners for drag/wire.
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
