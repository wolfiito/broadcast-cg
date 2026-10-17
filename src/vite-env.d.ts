/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FREESHOW_HOST?: string
  readonly VITE_FREESHOW_PORT?: string
  readonly VITE_FREESHOW_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** OBS Browser Source inyecta este objeto. Lo usamos para detectar si estamos "al aire". */
interface Window {
  obsstudio?: {
    pluginVersion: string
    onVisibilityChange?: (visible: boolean) => void
    onActiveChange?: (active: boolean) => void
  }
}
