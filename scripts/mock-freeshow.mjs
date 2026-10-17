/**
 * Simulador de la API de FreeShow (mismo protocolo Socket.IO que FreeShow real).
 * Permite diseñar y probar el CG sin FreeShow abierto.
 *
 *   npm run mock                 → puerto 5505, avanza cada 5 s
 *   npm run mock -- 5505 3000    → puerto, intervalo en ms
 *
 * Reproduce casos reales: rango de versículos con "limpiado" momentáneo entre ellos,
 * versículo muy largo, canción con metadatos (autor/CCLI) y un anuncio.
 * Datos ficticios / de dominio público. El número CCLI es ficticio.
 */
import { createServer } from "node:http"
import { Server } from "socket.io"

const PORT = Number(process.argv[2] ?? 5505)
/** Intervalo por defecto de 10s para permitir observar el cierre automático de la pleca a los 8s. */
const INTERVAL = Number(process.argv[3] ?? 10000)
/** FreeShow puede dejar la salida vacía un instante al pasar de versículo. */
const BLANK_GLITCH_MS = 250

// Estructura igual al tipo Show de FreeShow (solo los campos que usa el CG).
const SHOWS = {
  juan3: {
    name: "Juan 3:16-18",
    category: null,
    reference: { type: "scripture", data: {} },
    meta: {},
    slides: [
      "16 Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.\nJuan 3:16",
      "17 Porque no envió Dios a su Hijo al mundo para condenar al mundo, sino para que el mundo sea salvo por él.\nJuan 3:17",
      "18 El que en él cree, no es condenado; pero el que no cree, ya ha sido condenado, porque no ha creído en el nombre del unigénito Hijo de Dios.\nJuan 3:18",
    ],
  },
  romanos8: {
    name: "Romanos 8:38-39",
    category: null,
    reference: { type: "scripture", data: {} },
    meta: {},
    slides: [
      "38 Por lo cual estoy seguro de que ni la muerte, ni la vida, ni ángeles, ni principados, ni potestades, ni lo presente, ni lo por venir, 39 ni lo alto, ni lo profundo, ni ninguna otra cosa creada nos podrá separar del amor de Dios, que es en Cristo Jesús Señor nuestro.\nRomanos 8:38-39",
    ],
  },
  sublime: {
    name: "Sublime Gracia",
    category: "song",
    meta: { title: "Sublime Gracia", author: "John Newton", CCLI: "0000000" },
    slides: [
      "Sublime gracia del Señor\nque a mí, pecador, salvó\nFui ciego mas hoy veo yo,\nperdido y Él me halló",
      "Su gracia me enseñó a temer,\nmis dudas ahuyentó",
    ],
  },
  // Simulación de proyección directa de Biblia en vivo (id: 'temp', sin show guardado)
  lucas3: {
    isTemp: true,
    customDynamicValues: {
      scripture_reference: "Lucas 3:23",
      scripture_name: "Reina Valera 1960",
      scripture_book: "Lucas",
      scripture_chapter: "3",
      scripture_verses: "23",
    },
    tempItems: [
      {
        lines: [
          {
            text: [
              { value: '<span class="undertitle">Genealogía de Jesucristo</span> ' },
              { value: "23 " },
              { value: "Jesús mismo al comenzar su ministerio era como de 30 años, hijo, según se creía, de José, hijo de Elí," },
            ],
          },
        ],
      },
    ],
  },
  anuncio: {
    name: "Anuncios",
    category: "info",
    meta: {},
    slides: ["Reunión de jóvenes\nViernes 7:00 PM · Salón principal"],
  },
  expositor: {
    name: "Expositor",
    category: "info",
    meta: {},
    slides: ["Pastor Alejandro Morales\nMensaje: La Promesa de Dios"],
  },
}

// Secuencia: [showId, slideIndex] | null (= salida limpia)
const SEQUENCE = [
  ["lucas3", 0], null,
  ["juan3", 0], ["juan3", 1], ["juan3", 2], null,
  ["romanos8", 0], null,
  ["sublime", 0], ["sublime", 1], null,
  ["expositor", 0], null,
  ["anuncio", 0], null,
]

let step = 0
let blankUntil = 0
const current = () => (Date.now() < blankUntil ? null : SEQUENCE[step % SEQUENCE.length])

setInterval(() => {
  const prev = SEQUENCE[step % SEQUENCE.length]
  step++
  const next = SEQUENCE[step % SEQUENCE.length]
  // Mismo show → simulamos el parpadeo de FreeShow entre diapositivas.
  if (prev && next && prev[0] === next[0]) blankUntil = Date.now() + BLANK_GLITCH_MS
  console.log(next ? `→ ${next[0]} #${next[1]}` : "→ (limpio)")
}, INTERVAL)

function handle(action, payload) {
  const c = current()
  switch (action) {
    case "get_output_slide_text":
      // En proyecciones temporales directas, FreeShow suele devolver "" en get_output_slide_text
      if (c && SHOWS[c[0]]?.isTemp) return ""
      return c ? SHOWS[c[0]].slides[c[1]] : ""
    case "get_output": {
      if (!c) return { slide: null }
      if (SHOWS[c[0]]?.isTemp) {
        const item = SHOWS[c[0]]
        return {
          slide: {
            id: "temp",
            tempItems: item.tempItems,
            customDynamicValues: item.customDynamicValues,
          },
        }
      }
      return { slide: { id: c[0], layout: "default", index: c[1] } }
    }
    case "get_show": {
      const show = SHOWS[payload.id]
      return show ? { ...show, slides: {} } : null
    }
    default:
      return undefined
  }
}

// Este puerto es la API (Socket.IO), no la interfaz. Si alguien lo abre en el navegador, lo orientamos.
const http = createServer((req, res) => {
  if (req.url?.startsWith("/socket.io")) return // lo maneja Socket.IO
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  res.end(`<body style="font-family:system-ui;background:#0f172a;color:#e2e8f0;padding:40px">
    <h2>FreeShow simulado ✔</h2>
    <p>Este puerto (${PORT}) es la <b>API WebSocket</b>, no tiene interfaz visual.</p>
    <p>Para ver las plecas ejecuta <code>npm run dev</code> en otra terminal y abre
    <a style="color:#60a5fa" href="http://localhost:5173">http://localhost:5173</a></p></body>`)
})
const io = new Server(http, { cors: { origin: "*" } })

io.on("connection", (socket) => {
  console.log("Cliente conectado")
  socket.on("data", (raw) => {
    let data
    try {
      data = typeof raw === "string" ? JSON.parse(raw) : raw
    } catch {
      return
    }
    const result = handle(data.action, data)
    if (result === undefined) return
    // Igual que FreeShow: devuelve el payload original + data
    socket.emit("data", { ...data, data: result })
  })
})

http.listen(PORT, () => console.log(`FreeShow simulado en http://localhost:${PORT} (cambio cada ${INTERVAL} ms)`))
