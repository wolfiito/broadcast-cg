# Guía de operación: FreeShow → CG → OBS

**Idea general:** el operador solo maneja **FreeShow**. El CG lee lo que FreeShow tiene al aire
y lo dibuja como pleca en OBS automáticamente.

```
FreeShow (proyectas)  ──API 5505──▶  CG (iniciar-cg.bat)  ──URL 5173──▶  OBS (Fuente de navegador)
```

---

## Parte A · Configuración inicial (una sola vez)

### A1. FreeShow: activar la API
1. FreeShow → **Configuración (engrane) → Conexiones**.
2. Activa **API (WebSocket / REST)**. Puerto: **5505** (déjalo así).
3. *(Opcional)* Si le pones contraseña, crea el archivo `broadcast-cg/.env.local` con:
   ```
   VITE_FREESHOW_TOKEN=tu_contraseña
   ```
   Este archivo **no se comparte ni se sube a ningún repositorio**.
4. Asegúrate de que FreeShow tenga **una salida (output) activa**. El CG lee lo que está en
   esa salida; si está apagada, no llega nada.

> El nombre exacto de la opción puede variar entre versiones de FreeShow; busca "API" o "WebSocket".

### A2. CG: primer arranque
1. Doble clic en **`iniciar-cg.bat`**. La primera vez instala dependencias (tarda unos minutos).
2. Abre **http://localhost:5173** en tu navegador. Ahí está el **panel de control**.
3. Verifica arriba a la derecha: **● FreeShow conectado** (punto verde).

### A3. Logo de la iglesia
1. Copia el logo a `broadcast-cg/public/brand/logo.png`.
   - Debe ser un **PNG real** (fondo transparente ideal, ≥ 400 px de alto).
   - ⚠️ No renombres un `.svg` a `.png`: no carga. Si tu logo es SVG, guárdalo como `logo.svg`
     y agrega `&logo=brand/logo.svg` a la URL de OBS.
2. Cierra la ventana del CG y vuelve a abrir `iniciar-cg.bat`.

### A4. Elegir el diseño (en el panel, http://localhost:5173)
| Sección | Recomendado para iglesia |
| --- | --- |
| **Tema** | *Sereno* (general) · *Modern Worship* (si usarás mucho letras) |
| **Identidad** | Logo en pleca ✔ · Logo en blanco ✔ · Color de acento institucional |
| **Comportamiento** | Mantener pleca: **0.7 s** · Créditos de canción: **1ª diapositiva** |

Prueba con los botones de ejemplo + **CUE + TAKE**, y **OUT** para quitarla.

### A5. OBS: agregar la pleca
1. En el panel del CG, pulsa **Copiar URL** (incluye tema, color, logo y comportamiento).
2. En OBS: **Fuentes → + → Navegador** → nómbrala *"CG Plecas"*.
3. Propiedades:
   | Campo | Valor |
   | --- | --- |
   | Archivo local | ☐ desmarcado |
   | URL | *(pega la URL copiada)* |
   | Ancho / Alto | **1920 × 1080** (o la *resolución base* de tu OBS) |
   | Usar velocidad de fotogramas personalizada | ☑ **60** |
   | Apagar la fuente cuando no sea visible | ☐ **desmarcado** |
   | Actualizar el navegador cuando la escena se active | ☐ **desmarcado** |
   | CSS personalizado | déjalo como viene |
4. Coloca la fuente **encima** de la cámara en la lista de fuentes.
5. **Para tenerla en todas las escenas:** crea una escena "CG" con esa fuente y agrégala como
   *Escena* (fuente anidada) dentro de cada escena de cámara. Así hay una sola conexión.
6. OBS → **Ajustes → Avanzado → Aceleración por hardware de fuentes de navegador** ☑ (reinicia OBS).

> **Importante:** OBS tiene su propio navegador interno; **no ve** lo que configuras en Chrome.
> Cada vez que cambies algo en el panel, vuelve a **Copiar URL** y pégala en la fuente de OBS.

### A6. Pantallas "Comenzamos pronto" y "Gracias por acompañarnos"
1. En el panel → **Pantallas**: elige la hora de inicio y pulsa **Copiar URL** de cada una.
2. En OBS crea **dos escenas** ("Inicio" y "Final"), cada una con una fuente **Navegador 1920×1080** con su URL.
3. La cuenta regresiva llega a cero a la hora indicada y cambia a "En unos momentos".
   Si el horario cambia, vuelve a copiar la URL de "Comenzamos pronto".

### A7. Serie del mes
- En el panel → *Identidad*: escribe **Nombre de la iglesia** (ej. *Lampei*) y **Serie** (ej. *Lucas · Octubre*).
- Elige el tema de la serie (octubre: **Lucas · Octubre**) y vuelve a **Copiar URL** a OBS (las 3 fuentes).
- El mes siguiente: nuevo tema + nueva leyenda; OBS no cambia, solo las URLs.

### A8. Control desde el celular (freeshow-remote)
1. OBS → **Herramientas → Ajustes del servidor WebSocket** → *Habilitar servidor WebSocket* (puerto 4455).
   Pulsa *Mostrar información de conexión* y copia la contraseña.
2. En `broadcast-cg/.env.local` agrega (este archivo **no se comparte ni se sube a ningún repositorio**):
   ```
   OBS_WS_PASSWORD=la_contraseña_de_obs
   ```
3. Reinicia `iniciar-cg.bat`. Desde el celular, abre el control remoto (`http://IP-DE-LA-PC:5174`) → menú **⋯**:
   - **Plecas**: Mostrar / Quitar, texto manual, auto/manual, «EN VIVO», logo y tema.
   - **Escenas OBS**: un toque cambia la escena al aire.
4. Los ajustes que cambies (desde el celular o desde el panel `localhost:5173`) llegan a OBS solos;
   ya no hace falta volver a *Copiar URL* en cada cambio. Para que sobrevivan a reiniciar el CG,
   sigue guardándolos en la URL de OBS (A5).

---

## Parte B · Cada servicio (checklist)

1. ☐ Abrir **FreeShow** (API activa, salida encendida).
2. ☐ Doble clic en **`iniciar-cg.bat`** — **no cerrar** esa ventana durante la transmisión.
3. ☐ Abrir **OBS** (la fuente se conecta sola; si se abrió antes que el CG, se reconecta en ≤ 5 s).
   Si cambió la hora de inicio, actualiza la URL de la escena "Inicio" (A6).
4. ☐ **Prueba:** proyecta un versículo en FreeShow → debe aparecer en OBS. Limpia → desaparece.

### Durante el servicio
| Haces en FreeShow | Pasa en OBS |
| --- | --- |
| Proyectas un versículo | Entra la pleca con animación |
| Pasas al siguiente versículo | La pleca **se queda**; solo cambia el texto (fundido) |
| Pasas a la siguiente estrofa | Igual: solo cambia el texto |
| Cambias de versículo a canción | Sale la pleca de versículo y entra la de canción |
| Limpias la salida | La pleca sale (≈ 0.7 s después) |

---

## Parte C · Si algo falla

| Síntoma | Causa probable / solución |
| --- | --- |
| Panel dice **Sin conexión** | FreeShow cerrado o API desactivada (A1). |
| Panel dice **Contraseña inválida** | Revisa `.env.local` y reinicia `iniciar-cg.bat`. |
| Conectado pero no sale nada | FreeShow sin **salida activa** (A1.4), o modo **MANUAL** en el panel. |
| En el navegador sí, en OBS no | URL vieja en OBS → **Copiar URL** y pegar de nuevo. Clic derecho en la fuente → *Actualizar*. |
| La pleca sale y entra entre versículos | Sube *Mantener pleca* a 1.2 s y vuelve a copiar la URL a OBS. |
| No aparece el logo | Archivo no es PNG real o nombre distinto (A3). |
| Abrir `localhost:5505` no muestra nada | Normal: es la API de FreeShow, no una página. El panel es `localhost:5173`. |

### FreeShow en otra computadora
En la URL de OBS cambia `host=localhost` por la **IP de la PC de FreeShow** (ej. `host=192.168.1.20`)
y permite FreeShow en el Firewall de Windows de esa PC.
