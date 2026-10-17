import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath, URL } from "node:url"
import { cgRelay } from "./server/cgRelay"

export default defineConfig(({ mode }) => {
  // Prefijo OBS_ (no VITE_): estas variables solo las lee el servidor y nunca llegan al navegador.
  // La contraseña va en .env.local, que no se versiona.
  const env = loadEnv(mode, process.cwd(), "OBS_")

  return {
    plugins: [
      react(),
      tailwindcss(),
      cgRelay({ obsUrl: env.OBS_WS_URL || "ws://127.0.0.1:4455", obsPassword: env.OBS_WS_PASSWORD || undefined }),
    ],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    // Rutas relativas: permite abrir dist/index.html como "Local file" en OBS.
    base: "./",
    server: { port: 5173, host: true },
    css: {
      modules: { localsConvention: "camelCaseOnly" },
    },
  }
})
