import { useState, type ReactNode } from "react"
import { useLogoAvailable } from "@/components/brand/BrandLogo"
import { ACCENT_PRESETS, BRAND_LOGO_URL } from "@/config/brand"
import type { ContentKind, SongCreditsMode } from "@/lib/freeshow/parseSlide"
import { SHORTCUTS } from "@/hooks/useKeyboardShortcuts"
import { buildObsUrl, buildScreenUrl, useGraphicsStore, type ConnectionStatus, type GraphicContent } from "@/store/useGraphicsStore"
import { THEMES } from "@/themes/registry"
import { THEME_IDS } from "@/themes/types"

/* ───────────────────────────── Piezas de UI ───────────────────────────── */

const STATUS_UI: Record<ConnectionStatus, { label: string; dot: string }> = {
  connected: { label: "FreeShow conectado", dot: "bg-emerald-400" },
  connecting: { label: "Conectando…", dot: "bg-amber-400 animate-pulse" },
  disconnected: { label: "Desconectado", dot: "bg-zinc-500" },
  error: { label: "Sin conexión", dot: "bg-red-500" },
  unauthorized: { label: "Contraseña inválida", dot: "bg-red-500" },
  disabled: { label: "Modo offline", dot: "bg-zinc-600" },
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-white/10 pt-4">
      <h3 className="mb-2.5 text-[11px] font-bold tracking-[0.14em] text-zinc-400 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function Monitor({ label, tone, content, live }: { label: string; tone: "red" | "green"; content: GraphicContent | null; live?: boolean }) {
  const border = tone === "red" ? (live ? "border-red-500 shadow-[0_0_0_1px_rgb(239_68_68)]" : "border-red-500/30") : "border-emerald-500/50"
  const badge = tone === "red" ? (live ? "bg-red-600" : "bg-red-950 text-red-300") : "bg-emerald-700"
  return (
    <div className={`min-h-[84px] rounded-lg border bg-black/40 p-2.5 ${border}`}>
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${badge}`}>{label}</span>
      {content && <span className="ml-1.5 text-[10px] text-zinc-500 uppercase">{KIND_LABEL[content.kind]}</span>}
      {content ? (
        <>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-white">{content.title}</p>
          {content.subtitle && <p className="mt-0.5 truncate text-[11px] text-zinc-400">{content.subtitle}</p>}
        </>
      ) : (
        <p className="mt-1.5 text-[12px] text-zinc-600 italic">vacío</p>
      )}
    </div>
  )
}

function Toggle({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-sm hover:bg-white/10">
      <span>{children}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-blue-500" />
    </label>
  )
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: ReadonlyArray<readonly [T, string]>
  onChange: (value: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-black/40 p-1 text-[11px] font-bold">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-md px-1.5 py-1.5 ${value === v ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

const KIND_LABEL: Record<ContentKind, string> = { scripture: "Versículo", lyrics: "Canción", info: "Info" }

const inputCls =
  "w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none"

const EXAMPLES = [
  { title: "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito.", subtitle: "Juan 3:16", kind: "scripture" },
  { title: "Ana Martínez", subtitle: "Directora de Alabanza", kind: "info" },
  { title: "Sublime gracia del Señor\nque a mí, pecador, salvó", subtitle: "Sublime Gracia · John Newton", kind: "lyrics" },
  { title: "Bienvenidos a nuestra transmisión en vivo", subtitle: "Servicio dominical · 11:00 AM", kind: "info" },
] as const

const CLEAR_HOLD_OPTIONS: ReadonlyArray<readonly [number, string]> = [
  [0, "0 s"],
  [400, "0.4 s"],
  [700, "0.7 s"],
  [1200, "1.2 s"],
  [2500, "2.5 s"],
]

const SONG_CREDITS_OPTIONS: ReadonlyArray<readonly [SongCreditsMode, string]> = [
  ["first", "1ª diapositiva"],
  ["always", "Siempre"],
  ["never", "Nunca"],
]

/* ───────────────────────────── Panel ───────────────────────────── */

/**
 * Panel del operador. NO se renderiza dentro de OBS (se detecta window.obsstudio),
 * así la Browser Source queda 100% transparente.
 */
export function ControlPanel({ onReconnect }: { onReconnect: () => void }) {
  const s = useGraphicsStore()
  const [title, setTitle] = useState<string>(EXAMPLES[0].title)
  const [subtitle, setSubtitle] = useState<string>(EXAMPLES[0].subtitle)
  const [kind, setKind] = useState<ContentKind | "auto">("auto")
  const cueManual = () => s.cue(kind === "auto" ? { title, subtitle } : { title, subtitle, kind })
  const [copied, setCopied] = useState<string | null>(null)
  const [startTime, setStartTime] = useState("11:00")
  const logoAvailable = useLogoAvailable()

  const status = STATUS_UI[s.connection.status]

  const obsUrl = buildObsUrl(s)

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      window.setTimeout(() => setCopied(null), 1500)
    } catch {
      /* portapapeles bloqueado: el usuario puede copiar la URL visible */
    }
  }

  return (
    <aside className="fixed top-4 right-4 bottom-4 z-[100] flex w-[400px] flex-col gap-4 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 p-5 font-['Montserrat'] text-zinc-100 shadow-2xl backdrop-blur-xl">
      {/* Encabezado */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight">Broadcast CG</h2>
          <p className="text-[11px] text-zinc-500">Motor de plecas para OBS · FreeShow</p>
        </div>
        <button
          onClick={onReconnect}
          title={s.connection.error ?? s.connection.url}
          className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-semibold hover:bg-white/10"
        >
          <span className={`size-2 rounded-full ${status.dot}`} />
          {status.label}
        </button>
      </header>

      {/* Buses */}
      <div className="grid grid-cols-2 gap-2">
        <Monitor label="PREVIEW" tone="green" content={s.preview} />
        <Monitor label={s.onAir ? "● AL AIRE" : "PROGRAM"} tone="red" content={s.program} live={s.onAir} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={s.take}
          className="rounded-lg bg-red-600 py-3 text-sm font-extrabold tracking-wider uppercase hover:bg-red-500 active:scale-[0.98]"
        >
          Take / In
        </button>
        <button
          onClick={s.hide}
          className="rounded-lg border border-zinc-600 py-3 text-sm font-extrabold tracking-wider uppercase hover:bg-zinc-800 active:scale-[0.98]"
        >
          Out
        </button>
      </div>

      <Section title="Fuente FreeShow">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/40 p-1 text-xs font-bold">
          {(["auto", "manual"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => s.setFollowMode(mode)}
              className={`rounded-md py-2 ${s.followMode === mode ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              {mode === "auto" ? "AUTO → al aire" : "MANUAL → preview"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          {s.followMode === "auto"
            ? "Cada diapositiva de FreeShow sale al aire de inmediato."
            : "FreeShow llena PREVIEW; tú decides cuándo hacer TAKE."}
        </p>
      </Section>

      <Section title="Editor manual">
        <textarea
          rows={3}
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              cueManual()
              useGraphicsStore.getState().take()
            }
          }}
          placeholder="Texto principal"
        />
        <input className={`${inputCls} mt-2`} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Subtítulo / referencia" />
        <div className="mt-2">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[["auto", "Auto"], ["scripture", "Versículo"], ["lyrics", "Canción"], ["info", "Info"]]}
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={cueManual} className="rounded-md bg-emerald-700 py-2 text-xs font-bold uppercase hover:bg-emerald-600">
            Cue a preview
          </button>
          <button
            onClick={() => {
              cueManual()
              useGraphicsStore.getState().take()
            }}
            className="rounded-md bg-blue-600 py-2 text-xs font-bold uppercase hover:bg-blue-500"
          >
            Cue + Take
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.subtitle}
              onClick={() => {
                setTitle(ex.title)
                setSubtitle(ex.subtitle)
                setKind(ex.kind)
              }}
              className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
            >
              {ex.subtitle}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Tema">
        <div className="grid grid-cols-2 gap-1.5">
          {THEME_IDS.map((id, i) => (
            <button
              key={id}
              onClick={() => s.setTheme(id)}
              title={THEMES[id].description}
              className={`rounded-md px-2.5 py-2 text-left text-xs font-semibold ${s.themeId === id ? "bg-amber-500/90 text-black" : "bg-white/5 text-zinc-300 hover:bg-white/10"
                }`}
            >
              <span className="mr-1.5 opacity-60">{i + 1}</span>
              {THEMES[id].label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Identidad de la iglesia">
        <div className="mb-2 flex items-center gap-3 rounded-md bg-black/40 p-2.5">
          {logoAvailable ? (
            <img src={BRAND_LOGO_URL} alt="Logo" className={`h-10 w-auto max-w-[120px] object-contain ${s.brand.logoMono ? "brightness-0 invert" : ""}`} />
          ) : (
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Sin logo. Colócalo en <code className="text-zinc-300">public/brand/logo.png</code> y recarga.
            </p>
          )}
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            className={inputCls}
            value={s.brand.churchName}
            onChange={(e) => s.setBrand({ churchName: e.target.value })}
            placeholder="Nombre de la iglesia"
          />
          <input
            className={inputCls}
            value={s.brand.seriesLabel}
            onChange={(e) => s.setBrand({ seriesLabel: e.target.value })}
            placeholder="Serie (ej. Lucas · Octubre)"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Toggle checked={s.brand.logoInPleca} onChange={() => s.setBrand({ logoInPleca: !s.brand.logoInPleca })}>
            Logo dentro de la pleca
          </Toggle>
          <Toggle checked={s.brand.logoBug} onChange={() => s.setBrand({ logoBug: !s.brand.logoBug })}>
            Logo como marca de agua (esquina)
          </Toggle>
          <Toggle checked={s.brand.logoMono} onChange={() => s.setBrand({ logoMono: !s.brand.logoMono })}>
            Logo en blanco (monocromático)
          </Toggle>
        </div>
        <p className="mt-3 mb-1.5 text-[11px] text-zinc-400">Color de acento</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.hex}
              title={p.name}
              onClick={() => s.setBrand({ accent: p.hex })}
              className={`size-7 rounded-full border-2 ${s.brand.accent.toLowerCase() === p.hex ? "border-white" : "border-transparent"}`}
              style={{ background: p.hex }}
            />
          ))}
          <label className="ml-1 flex items-center gap-1.5 text-[11px] text-zinc-400" title="Color institucional">
            <input type="color" value={s.brand.accent} onChange={(e) => s.setBrand({ accent: e.target.value })} className="size-7 cursor-pointer rounded bg-transparent" />
            Propio
          </label>
        </div>
      </Section>

      <Section title="Comportamiento">
        <p className="mb-1.5 text-[11px] text-zinc-400">Mantener la pleca si FreeShow limpia por un instante</p>
        <Segmented value={s.clearHoldMs} onChange={s.setClearHoldMs} options={CLEAR_HOLD_OPTIONS} />
        <p className="mt-1.5 mb-3 text-[11px] leading-relaxed text-zinc-500">
          Entre versículos la pleca se queda y solo cambia el texto. Sube el valor si aún ves que sale y entra.
        </p>
        <p className="mb-1.5 text-[11px] text-zinc-400">Créditos de canción (título · autor · CCLI)</p>
        <Segmented value={s.songCredits} onChange={s.setSongCredits} options={SONG_CREDITS_OPTIONS} />
      </Section>

      <Section title="Pantallas (escenas propias en OBS)">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm">Comenzamos pronto</span>
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              inicio
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="rounded bg-black/60 px-2 py-1 text-xs text-white" />
            </label>
            <button
              onClick={() => copy("inicio", buildScreenUrl(s, "inicio", startTime))}
              className="rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-bold uppercase hover:bg-white/15"
            >
              {copied === "inicio" ? "¡Copiada!" : "Copiar URL"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm">Gracias por acompañarnos</span>
            <button
              onClick={() => copy("fin", buildScreenUrl(s, "fin"))}
              className="rounded-md bg-white/10 px-2.5 py-1.5 text-[11px] font-bold uppercase hover:bg-white/15"
            >
              {copied === "fin" ? "¡Copiada!" : "Copiar URL"}
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Crea en OBS una escena para cada una con una fuente de navegador 1920×1080. La cuenta regresiva llega a cero a la hora indicada.
          </p>
        </div>
      </Section>

      <Section title="Utilidades">
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-3 py-2 text-sm">
            <span>Auto-ocultar</span>
            <select
              value={s.autoHideSeconds}
              onChange={(e) => s.setAutoHideSeconds(Number(e.target.value))}
              className="rounded bg-black/60 px-2 py-1 text-xs"
            >
              {[0, 8, 12, 20, 30, 60].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Desactivado" : `${n} s`}
                </option>
              ))}
            </select>
          </label>
          <Toggle checked={s.showSafeAreas} onChange={s.toggleSafeAreas}>
            Guías de áreas seguras
          </Toggle>
          <Toggle checked={s.liveBug.enabled} onChange={() => s.setLiveBug({ enabled: !s.liveBug.enabled })}>
            Bug “{s.liveBug.label}” + reloj
          </Toggle>
        </div>
      </Section>

      <Section title="URL para OBS (Browser Source 1920×1080)">
        <code className="block rounded-md bg-black/60 p-2 text-[11px] break-all text-zinc-300">{obsUrl}</code>
        <button onClick={() => copy("obs", obsUrl)} className="mt-2 w-full rounded-md bg-white/10 py-2 text-xs font-bold uppercase hover:bg-white/15">
          {copied === "obs" ? "¡Copiada!" : "Copiar URL"}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          Dentro de OBS el panel se oculta solo y el fondo es transparente. La contraseña de FreeShow no se incluye en la URL: configúrala en
          <code className="mx-1 text-zinc-400">.env.local</code>.
        </p>
      </Section>

      <Section title="Atajos">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-zinc-300">{key}</dt>
              <dd className="text-zinc-500">{desc}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </aside>
  )
}
