import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Logic Circuit Simulator — drag-and-wire gates + truth tables (portfolio demo)
export default defineConfig({
  server: { host: "::", port: 5183 },
  plugins: [react()],
});
