
1 de 22.670
(sin asunto)
Recibidos

sebastian baloa <sebabaloa@gmail.com>
Adjuntos
18:56 (hace 0 minutos)
para mí


 1 archivo adjunto
•  Analizado por Gmail
Redactar:
Mensaje nuevo
MinimizarVentana externaCerrar
Destinatarios
Asunto
# 📘 AcústicaSounds – Backend API (README_BACKEND.md)

**Proyecto:** AcústicaSounds  
**Módulo:** Backend API (Express + MongoDB)  
**Versión:** MVP – Incremento 1  
**Fecha:** 2025-07-20  
**Autor:** @sebabaloa

---

## 📁 Estructura del backend

```
apps/api/
├── src/
│   └── index.js              ← Servidor Express y conexión MongoDB
├── .env                      ← Variables de entorno (no versionado)
├── .gitignore                ← Ignora `.env` y `node_modules/`
├── package.json              ← Configuración de scripts y dependencias
```

---

## 🔧 Tecnologías utilizadas

- **Node.js** + **Express**
- **MongoDB Atlas**
- **mongoose** (ODM)
- **dotenv** (manejo de configuración)
- **cors** (CORS middleware)

---

## 🚀 Setup local

### 1. Instalar dependencias

```bash
cd apps/api
npm npm init -y
npm install express cors dotenv mongoose
```

### 2. Crear archivo `.env`

```
PORT=3001
MONGODB_URI=mongodb+srv://<usuario>:<clave>@acusticasounds-cluster.XXXX.mongodb.net/acusticasounds?retryWrites=true&w=majority
```

⚠️ Codifica caracteres especiales en la contraseña (ej: `!` → `%21`)

### 3. Iniciar el servidor

```bash
npm run dev
```

---

## ✅ Funcionalidades del Incremento 1

- ✅ Estructura básica Express (`src/index.js`)
- ✅ Middleware `cors` y `express.json()`
- ✅ Endpoint de prueba `GET /ping → { ok: true }`
- ✅ Conexión a MongoDB Atlas validada por consola

---

## 📄 `.env.example`

```env
PORT=
MONGODB_URI=
```

---

## 🧪 Verificación

| Acción                 | Resultado esperado                     |
|------------------------|-----------------------------------------|
| `npm run dev`          | `API server running at http://localhost:3001` |
| GET `/ping`            | `{ "ok": true }` en JSON               |
| Conexión MongoDB       | Mensaje ✅ en consola                   |

---

## 📦 Commit asociado

```bash
feat(api): conexión a MongoDB Atlas finalizada y API activa en /ping
```

---

## 📌 Próximos pasos (Incremento 2)

- Modelo `Usuario` con validación
- Registro (`POST /register`)
- Hash de contraseñas
- Guardar usuarios en MongoDB