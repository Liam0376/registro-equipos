# Registro de Equipos

Registro de estudiantes con **asignación automática de equipos**. Los estudiantes
se registran con un formulario (matrícula, nombre, carrera, semestre) y el
servidor los asigna al equipo que menos integrantes tiene, manteniendo los
equipos equilibrados. Es un proyecto **independiente del scoreboard** y puede
correr al mismo tiempo.

## Instalación

### 1. Instalar Node.js (si no lo tienes)

**Requisito:** Node.js **20.19 o superior** (recomendado: la versión LTS 22).
Con Node 18 el proyecto no compila (Vite 8 lo exige), por eso los pasos de
abajo instalan la versión actual.

**macOS (Homebrew):**
```bash
brew install node
```

**Linux (Debian/Ubuntu):**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install -y nodejs
```

**Windows:** Descarga el instalador desde https://nodejs.org/ (el botón LTS).

Para verificar que quedó bien:
```bash
node -v   # debería mostrar v20.19.0 o superior (idealmente v22.x)
npm -v    # debería mostrar un número de versión
```

### 2. Clonar e instalar dependencias

```bash
git clone https://github.com/Liam0376/registro-equipos.git
cd registro-equipos
npm install
```

## Iniciar

```bash
npm start
```

Esto levanta el servidor en **http://localhost:3002**.

```
  ┌─────────────────────────────────────────────┐
  │      Registro de Equipos — Servidor         │
  ├─────────────────────────────────────────────┤
  │  Local:    http://localhost:3002            │
  │  Red:      http://192.168.1.XX:3002        │
  │                                             │
  │  Los estudiantes entran a la portada        │
  │  y se les asigna equipo automáticamente.    │
  └─────────────────────────────────────────────┘
```

**Para usar desde otros dispositivos** (celulares, otras computadoras), abrí la
URL que dice "Red" en el navegador de cada dispositivo.

## Rutas

| Ruta          | Uso                                                               |
| ------------- | ----------------------------------------------------------------- |
| `/`           | Registro — formulario del estudiante, asigna equipo al instante  |
| `/admin`      | Crear/eliminar equipos, ver registros, des-registrar, reiniciar  |

**Tip:** Dejá `/admin` abierto en la computadora del organizador y el `/` en
cada dispositivo donde se registren los estudiantes.

## Correr a la par de Scoreboard

Este proyecto usa el puerto **3002** por defecto para no chocar con scoreboard
(que usa el **3001**). Los dos pueden correr al mismo tiempo:

```bash
# Terminal 1 — scoreboard
cd scoreboard
npm start                 # http://localhost:3001

# Terminal 2 — registro de equipos
cd registro-equipos
npm start                 # http://localhost:3002
```

Si por alguna razón necesitás otro puerto, usá la variable `PORT`:

```bash
PORT=4000 npm start       # corre en http://localhost:4000
```

## Cómo funciona

- El servidor (`server.ts`) guarda equipos y estudiantes en un archivo `data.json`
  en la computadora del organizador. **La página es solo un formulario**: nunca se
  modifican los datos desde los dispositivos de la red.
- La asignación es automática y **balanceada**: el servidor elige el equipo que
  menos integrantes tiene (con rotación entre empatados para que ningún equipo
  quede favorecido).
- Los equipos solo pueden modificarse desde la computadora que corre el servidor
  (`localhost`). Desde la red nadie puede crear, editar ni borrar equipos.
- Los dispositivos de la red solo ven el formulario y los contadores por equipo;
  **no ven los datos personales** de los otros estudiantes (cada uno recibe
  únicamente su propia inscripción). La zona de administración está oculta.
- Los datos persisten: si apagás y prendés el servidor, todo sigue ahí.
- Además, cada navegador guarda una copia local (`localStorage`), así que si la
  conexión se corta, la pantalla sigue mostrando los últimos datos.

## Desarrollo (para programadores)

Si querés modificar el código y ver los cambios al instante:

```bash
# Terminal 1 — el servidor
npm run server

# Terminal 2 — el dev server de Vite (hot reload)
npm run dev
```

Abrí http://localhost:5173 en el navegador.

## Build de producción

```bash
npm run build    # genera dist/
npm start        # levanta el servidor sirviendo dist/
```

## Stack

Vite + React 19 + TypeScript + Tailwind CSS v4 + React Router + WebSocket (ws)