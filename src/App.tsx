import { runtimeConfig } from "@/config/runtime"
import { ControlPanel } from "@/components/ControlPanel/ControlPanel"
import { HoldingScreen, readScreenParam } from "@/components/screens/HoldingScreen"
import { LowerThird } from "@/components/LowerThird/LowerThird"
import { LiveBug } from "@/components/overlays/LiveBug"
import { LogoBug } from "@/components/overlays/LogoBug"
import { SafeAreaGuides } from "@/components/overlays/SafeAreaGuides"
import { BroadcastCanvas } from "@/components/stage/BroadcastCanvas"
import { useAutoHide } from "@/hooks/useAutoHide"
import { useFreeShowSocket } from "@/hooks/useFreeShowSocket"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useRelay } from "@/hooks/useRelay"
import { useGraphicsStore } from "@/store/useGraphicsStore"
import { ThemeProvider } from "@/themes/ThemeProvider"

/** Ancho del panel (400) + márgenes. */
const PANEL_RESERVED_PX = 432

const SCREEN = readScreenParam()

export default function App() {
  // Pantallas completas ("Comenzamos pronto" / "Gracias"): sin FreeShow ni panel.
  if (SCREEN) {
    return (
      <ThemeProvider>
        <BroadcastCanvas>
          <HoldingScreen kind={SCREEN} />
        </BroadcastCanvas>
      </ThemeProvider>
    )
  }
  return <GraphicsApp />
}

function GraphicsApp() {
  const { panel } = runtimeConfig
  const showSafeAreas = useGraphicsStore((s) => s.showSafeAreas)

  const { reconnect } = useFreeShowSocket({
    host: runtimeConfig.host,
    port: runtimeConfig.port,
    token: runtimeConfig.token,
    pollMs: runtimeConfig.pollMs,
    debounceMs: runtimeConfig.debounceMs,
    enabled: !runtimeConfig.offline,
  })
  useAutoHide()
  useKeyboardShortcuts(panel)
  // Control remoto (celular) a través del servidor del CG.
  useRelay()

  return (
    <ThemeProvider>
      {/* En OBS no hay damero ni panel: solo gráficos sobre transparente. */}
      <div className={panel ? "preview-backdrop fixed inset-0" : "fixed inset-0"}>
        {/* En preview reservamos el ancho del panel para ver el cuadro completo, con su borde. */}
        <BroadcastCanvas reserveRight={panel ? PANEL_RESERVED_PX : 0}>
          <LowerThird />
          <LiveBug />
          <LogoBug />
          {panel && showSafeAreas && <SafeAreaGuides />}
        </BroadcastCanvas>
      </div>
      {panel && <ControlPanel onReconnect={reconnect} />}
    </ThemeProvider>
  )
}
