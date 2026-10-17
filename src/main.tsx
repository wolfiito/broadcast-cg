import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { probeLogo } from "@/components/brand/BrandLogo"
import { preloadFonts } from "@/lib/fonts"
import App from "./App"
import "./index.css"

const root = document.getElementById("root")
if (!root) throw new Error("No se encontró #root")

// Esperamos fuentes y logo (máx. 1.5 s) para que la primera entrada al aire no cambie de tipografía a media animación.
const fontsReady = Promise.race([Promise.all([preloadFonts(), probeLogo()]), new Promise<void>((r) => setTimeout(r, 1500))])

void fontsReady.then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
