import { useSyncExternalStore } from "react"
import { BRAND_LOGO_URL } from "@/config/brand"
import { useGraphicsStore } from "@/store/useGraphicsStore"
import styles from "./BrandLogo.module.css"

/*
 * El logo se verifica UNA vez al arrancar (main.tsx espera a `probeLogo` hasta 1.5 s).
 * Así la pleca conoce su tamaño final desde el primer frame. Si la carga tarda más,
 * los componentes se actualizan solos cuando termina. Si no existe el archivo, no se muestra.
 */
let logoAvailable = false
let probing: Promise<void> | null = null
const listeners = new Set<() => void>()

export function probeLogo(): Promise<void> {
  probing ??= new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      logoAvailable = true
      listeners.forEach((notify) => notify())
      resolve()
    }
    img.onerror = () => resolve()
    img.src = BRAND_LOGO_URL
  })
  return probing
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

/** Reactivo: re-renderiza cuando el logo termina de cargar. */
export function useLogoAvailable(): boolean {
  return useSyncExternalStore(subscribe, () => logoAvailable)
}

export function BrandLogo({ className }: { className?: string | undefined }) {
  const mono = useGraphicsStore((s) => s.brand.logoMono)
  const available = useLogoAvailable()
  if (!available) return null
  return (
    <img
      src={BRAND_LOGO_URL}
      alt=""
      draggable={false}
      className={[className, mono ? styles["mono"] : ""].filter(Boolean).join(" ")}
    />
  )
}
