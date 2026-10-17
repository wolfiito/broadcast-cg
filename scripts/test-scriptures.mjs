import assert from "node:assert/strict"

// 1. Simulación de stripHtml
function stripHtml(input) {
  if (!input) return ""
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
}

// 2. Regex de versículos de LowerThird.tsx
const VERSE_NUMBER_RE = /(^|[\n\r.,!?;:()\[\]"”»]\s*)(\d{1,3})\s+(?=\p{L})/gu

function extractVerseSuperscripts(text) {
  const matches = []
  for (const match of text.matchAll(VERSE_NUMBER_RE)) {
    const [, lead, num] = match
    matches.push({ lead, num })
  }
  return matches
}

// 3. Lógica de parseSlideText para escrituras
const REFERENCE_RE =
  /^(?:[1-4](?:a|ra|da|ta|\s+de)?\s*)?\p{L}[\p{L}.]*(?:\s+\p{L}[\p{L}.]*){0,3}\s+\d{1,3}(?:[:.]\d{1,3}(?:\s*[-–]\s*\d{1,3})?)?(?:\s*\(?[A-Z0-9]{2,10}\)?)?$/ui

function isScriptureReference(line) {
  const trimmed = line.trim()
  return trimmed.length <= 48 && REFERENCE_RE.test(trimmed)
}

function parseTestSlide(raw, show) {
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  if (show?.isScripture) {
    let titleLines = lines
    let subtitleVers = show?.name

    if (lines.length >= 2) {
      const lastLine = lines[lines.length - 1] ?? ""
      if (lastLine === show?.name || isScriptureReference(lastLine)) {
        subtitleVers = lines.pop()
        titleLines = lines
      }
    }

    return {
      title: titleLines.join("\n"),
      subtitle: subtitleVers,
      kind: "scripture"
    }
  }
  return null
}

console.log("Iniciando pruebas de validación de escrituras...\n")

// Test 1: stripHtml
{
  const rawHtml = '<span class="undertitle">Genealogía de Jesús</span> &nbsp;23 Jesús mismo'
  const clean = stripHtml(rawHtml)
  assert.equal(clean, "Genealogía de Jesús  23 Jesús mismo")
  console.log("✔ Test 1: Limpieza de HTML (<span...>, &nbsp;) correcta")
}

// Test 2: VERSE_NUMBER_RE no convierte cantidades como '30 años' o '12 discípulos'
{
  const verseText = "23 Jesús mismo al comenzar su ministerio era como de 30 años, y llamó a 12 discípulos."
  const matches = extractVerseSuperscripts(verseText)
  
  assert.equal(matches.length, 1, "Solo debe encontrar 1 número de versículo")
  assert.equal(matches[0].num, "23", "El número de versículo detectado debe ser 23")
  console.log("✔ Test 2: '23' detectado como versículo; '30 años' y '12 discípulos' ignorados correctamente")
}

// Test 3: VERSE_NUMBER_RE detecta versículo subsiguiente tras coma o punto
{
  const multiVerse = "38 Por lo cual estoy seguro de que ni la muerte, ni la vida, 39 ni lo alto, ni lo profundo..."
  const matches = extractVerseSuperscripts(multiVerse)
  
  assert.equal(matches.length, 2, "Debe detectar los versículos 38 y 39")
  assert.equal(matches[0].num, "38")
  assert.equal(matches[1].num, "39")
  console.log("✔ Test 3: Múltiples versículos ('38' y '39') detectados con éxito")
}

// Test 4: parseSlideText no trunca versículos con frases finales cortas
{
  const rawVerse = "Porque de tal manera amó Dios al mundo\nmas tenga vida eterna."
  const result = parseTestSlide(rawVerse, { isScripture: true, name: "Juan 3:16" })
  
  assert.equal(result.kind, "scripture")
  assert.equal(result.subtitle, "Juan 3:16")
  assert.equal(result.title, "Porque de tal manera amó Dios al mundo\nmas tenga vida eterna.")
  console.log("✔ Test 4: Frase final corta ('mas tenga vida eterna.') preservada intacta")
}

// Test 5: parseSlideText remueve la cita si viene repetida en la última línea
{
  const rawWithRef = "Porque no envió Dios a su Hijo al mundo para condenar al mundo\nJuan 3:17"
  const result = parseTestSlide(rawWithRef, { isScripture: true, name: "Juan 3:17" })
  
  assert.equal(result.kind, "scripture")
  assert.equal(result.subtitle, "Juan 3:17")
  assert.equal(result.title, "Porque no envió Dios a su Hijo al mundo para condenar al mundo")
  console.log("✔ Test 5: Cita repetida en la última línea limpiada del cuerpo correctamente")
}

// Test 6: Diapositiva de 2 líneas de Coro en una alabanza (isSong: true) se mantiene como 'lyrics' y NO pasa a 'info'
{
  function parseFullSlide(raw, show, groupName) {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const title = lines.join("\n")
    const songKeywords = /coro|verso|verse|chorus|bridge|puente|estrofa|intro|outro|pre[- ]?coro|tag/i
    const isSong = Boolean(show?.isSong || songKeywords.test(`${show?.name ?? ""} ${groupName ?? ""}`))
    if (isSong) {
      return { title, kind: "lyrics" }
    }
    const [first, second] = lines
    if (lines.length === 2 && first && second) return { title: first, subtitle: second, kind: "info" }
    return { title, kind: "info" }
  }

  const chorusText = "Eres Santo, Dios poderoso\nDigno de recibir la gloria"
  const showSong = { name: "Cuan Grande es Dios", isSong: true, category: "mis_canciones" }
  const result = parseFullSlide(chorusText, showSong, "Coro")

  assert.equal(result.kind, "lyrics", "El coro de 2 líneas debe ser 'lyrics' y no 'info'")
  assert.equal(result.title, chorusText)
  console.log("✔ Test 6: Coro de 2 líneas clasificado correctamente como 'lyrics' (nunca como 'info')")
}

// Test 7: Anuncio real de 2 líneas en show normal sigue clasificándose como 'info'
{
  function parseFullSlide(raw, show, groupName) {
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    const title = lines.join("\n")
    const songKeywords = /coro|verso|verse|chorus|bridge|puente|estrofa|intro|outro|pre[- ]?coro|tag/i
    const isSong = Boolean(show?.isSong || songKeywords.test(`${show?.name ?? ""} ${groupName ?? ""}`))
    if (isSong) {
      return { title, kind: "lyrics" }
    }
    const [first, second] = lines
    if (lines.length === 2 && first && second) return { title: first, subtitle: second, kind: "info" }
    return { title, kind: "info" }
  }

  const announcement = "Reunión de Jóvenes\nViernes 7:00 PM · Auditorio"
  const showInfo = { name: "Avisos Parroquiales", isSong: false, category: "general" }
  const result = parseFullSlide(announcement, showInfo, "General")

  assert.equal(result.kind, "info")
  assert.equal(result.title, "Reunión de Jóvenes")
  assert.equal(result.subtitle, "Viernes 7:00 PM · Auditorio")
  console.log("✔ Test 7: Anuncio de 2 líneas en show normal clasificado correctamente como 'info'")
}

console.log("\n Todas las pruebas pasaron satisfactoriamente (7/7)")
