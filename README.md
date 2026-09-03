<div align="center">

# 🏥 Medical

**Sistema de gestión de citas médicas**
<br/>
Aplicación web para agendar citas médicas en línea, portal por rol
(administración, recepción, doctor y paciente), historial clínico, resultados de
exámenes, pagos con comprobante y notificaciones en tiempo real.

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-24.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br/>

🌐 **Dominio previsto:** `medical.criveradev.com` &nbsp;·&nbsp;
📡 **API prevista:** `api.medical.criveradev.com` &nbsp;·&nbsp;
🐛 **[Reportar bug](https://github.com/criveradev/Medical/issues)**

<br/>

> Esas URLs quedan disponibles después de completar el despliegue manual. La
> cuenta local de demostración es **admin@medical.com** / **Admin1234**; nunca
> uses esas credenciales en producción.

</div>

---

## 📋 Tabla de contenidos

- [Sobre el proyecto](#-sobre-el-proyecto)
- [Funcionalidades](#-funcionalidades)
- [Stack tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Primeros pasos](#-primeros-pasos)
- [Variables de entorno](#-variables-de-entorno)
- [Versionado de la API](#-versionado-de-la-api)
- [Endpoints de la API](#-endpoints-de-la-api)
- [Roles y permisos](#-roles-y-permisos)
- [Tests](#-tests)
- [Despliegue](#-despliegue)
- [CI/CD y releases](#-cicd-y-releases)
- [Roadmap](#-roadmap)
- [Licencia](#-licencia)
- [Desarrollado por](#-developed-by)

---

## 🎯 Sobre el proyecto

**Medical** es un sistema full-stack de gestión de citas médicas desarrollado como
proyecto de portafolio. El objetivo fue construir una aplicación realista de extremo
a extremo: una API REST segura con control de acceso por rol, modelado de entidades
y relaciones en MongoDB, autenticación con tokens de acceso y refresco,
notificaciones en tiempo real y una interfaz reactiva por perfil de usuario.

Cubre los conceptos que aparecen en cualquier sistema profesional: autenticación y
autorización granular, CRUD completo de varios recursos relacionados, subida de archivos
a CDN, generación de documentos (recetas, comprobantes y reportes en PDF/Excel), caché,
envío de correos y trabajo programado (recordatorios automáticos).

El repositorio es un **monorepo** con dos paquetes: **`medical-server`** (la API) y
**`medical-client`** (la interfaz web).

---

## ✨ Funcionalidades

### 🔐 Autenticación y seguridad
- Inicio de sesión con tokens de acceso y refresco (rotación de refresh token)
- Cookies HttpOnly/Secure, protección CSRF y segundo factor TOTP con recuperación
- Refresh tokens hasheados en base de datos (SHA-256) y revocables al cerrar sesión
- Contraseñas hasheadas con bcrypt
- Control de acceso por rol y acción (RBAC) sobre cada módulo
- Aislamiento a nivel de objeto: un paciente solo accede a sus propios datos (anti-IDOR)
- Sanitización contra XSS e inyección NoSQL, Helmet, CORS y rate limiting
- Archivos validados por firma binaria, auditoría y correlación de peticiones
- Monitoreo de errores con Sentry y logs estructurados con redacción de secretos

### 📅 Gestión de citas
- Agenda de citas con verificación de disponibilidad real del doctor
- Prevención de solapamiento de horarios
- Estados de cita (pendiente, confirmada, completada, cancelada, no asistió)
- Edición y cancelación de citas
- Correo automático al agendar y recordatorio el día previo (cron)

### 👥 Pacientes y doctores
- Registro de pacientes (RUT chileno con formato automático, RUT como contraseña inicial)
- Gestión de doctores con matrícula automática y editable, especialidad y horarios
- Foto de perfil para cualquier usuario (subida a Cloudinary con redimensionado en cliente)

### 📋 Clínico
- Historial clínico por atención (al registrarlo, la cita se marca como completada)
- Recetas médicas descargables en PDF con formato de receta chilena
- Resultados de exámenes con archivo adjunto, descargables por el paciente

### 💳 Pagos
- Registro de pagos por cita (una cita = un pago) con varios métodos
- Total recaudado y filtros por estado y fecha
- Comprobante de pago descargable como respaldo

### 📊 Reportes
- Reporte estadístico por doctor y reporte general de administración
- Exportación a PDF y Excel
- Dashboard con gráficos por rol (recaudación, citas por estado y por mes)

### 🔔 Experiencia de usuario
- Notificaciones en tiempo real con Socket.io (autenticadas, por sala/rol)
- Toasts de feedback, estados de carga y estados vacíos
- Portal adaptado al rol: cada usuario ve solo lo que le corresponde
- Interfaz responsiva con Tailwind CSS

---

## 🛠 Stack tecnológico

### Backend (`medical-server`)

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| Node.js | 24.x LTS | Entorno de ejecución |
| Express | 5.x | Framework HTTP |
| MongoDB / Mongoose | 7.x / 9.x | Base de datos documental y ODM |
| Redis (ioredis) | 5.x | Caché con degradación controlada |
| JSON Web Token | 9.x | Autenticación (access + refresh) |
| bcryptjs | 3.x | Hash de contraseñas |
| Socket.io | 4.x | Notificaciones en tiempo real |
| Multer / Cloudinary SDK | 2.x / 2.x | Subida de archivos a CDN |
| Nodemailer | 9.x | Envío de correos |
| node-cron | 4.x | Recordatorios programados |
| PDFKit + ExcelJS | — | Generación de reportes PDF/Excel |
| express-validator | 7.x | Validación de entrada |
| Helmet · CORS · rate-limit · sanitize | — | Seguridad |
| Sentry · Winston · Morgan | — | Observabilidad y logs |
| Swagger (swagger-jsdoc) | — | Documentación de la API |
| Jest / Supertest | 30.x / 7.x | Pruebas de integración |

### Frontend (`medical-client`)

| Tecnología | Versión | Uso |
|-----------|---------|-----|
| React | 18.x | Librería de interfaz |
| Vite | 6.x | Bundler y servidor de desarrollo |
| Tailwind CSS | 4.x | Estilos utilitarios (plugin de Vite) |
| React Router DOM | 7.x | Navegación SPA |
| Recharts | 2.x | Gráficos del dashboard |
| lucide-react | — | Iconos |
| socket.io-client | 4.x | Notificaciones en tiempo real |
| react-phone-number-input | 3.x | Campo de teléfono internacional |
| Playwright | 1.62.x | Pruebas E2E en Chromium |

### Infraestructura

| Servicio | Uso |
|---------|-----|
| MongoDB | Base de datos (local o Atlas) |
| Redis | Caché (opcional; si no está, degrada sin romper) |
| Cloudinary | Almacenamiento de imágenes y archivos |
| Docker Compose | Frontend + backend + MongoDB + Redis + runner E2E |

---

## 🏗 Arquitectura

```mermaid
flowchart LR
    WEB["Frontend React<br/>medical.criveradev.com"]
    API["API Express + Socket.io<br/>api.medical.criveradev.com"]
    DB[(MongoDB)]
    CACHE[(Redis)]
    FILES[Cloudinary]
    EMAIL[Resend]
    ERRORS[Sentry]

    WEB <-->|HTTPS / WebSocket| API
    API --> DB
    API --> CACHE
    API --> FILES
    API --> EMAIL
    API --> ERRORS
```

> Ambos dominios (`medical.criveradev.com` y `api.medical.criveradev.com`) son
> subdominios propios gestionados en **Cloudflare DNS**, que apuntan respectivamente
> a Vercel y Render mediante registros CNAME.

### Arquitectura del backend por capas

```
Petición HTTP
     │
     ▼
┌──────────────┐
│   ROUTES     │  Define URLs y conecta con controladores
├──────────────┤
│ MIDDLEWARE   │  JWT auth · RBAC · scope paciente · validación · uploads · errores
├──────────────┤
│ CONTROLLERS  │  Lógica de negocio por recurso
├──────────────┤
│  SERVICES    │  Caché · notificaciones · correos · recordatorios · exportar
├──────────────┤
│   MODELS     │  Esquemas Mongoose (User, Role, Paciente, Doctor, Cita…)
├──────────────┤
│   MONGODB    │  Persistencia
└──────────────┘
```

---

## 📁 Estructura del proyecto

```
Medical/
│
├── medical-server/                  # API REST (Express)
│   ├── src/
│   │   ├── config/                  # env, db, redis, cloudinary, multer, logger, Swagger y Sentry
│   │   ├── models/                  # User, Role, Paciente, Doctor, Cita, Historial, Pago, Resultado, Departamento, Especialidad
│   │   ├── controllers/             # Casos de uso HTTP compartidos por los contratos públicos
│   │   ├── routes/
│   │   │   ├── index.js             # Registro de versiones públicas
│   │   │   └── v1/                  # Contrato HTTP v1, recursos y documentación
│   │   ├── middleware/              # auth (JWT/RBAC/scope), validar, sanitizar, xss, errores, morgan
│   │   ├── services/                # cache, notificaciones (Socket.io), email, recordatorios (cron), exportar (PDF/Excel)
│   │   ├── seed/                    # roles.seed.js · admin.seed.js · catalogos.seed.js
│   │   └── app.js                   # App Express (middlewares, rutas versionadas, Swagger)
│   ├── tests/                       # Jest + Supertest
│   ├── scripts/docker-test.sh       # Suite aislada y limpieza de contenedores de prueba
│   ├── scripts/docker-e2e.sh        # Stack completo, seeds y flujo E2E
│   ├── Dockerfile
│   ├── docker-compose.yml           # app completa + perfiles test y e2e
│   ├── .env.example
│   └── package.json
│
├── medical-client/                  # Interfaz web (React + Vite)
│   ├── src/
│   │   ├── lib/                      # api (fetch + refresh token), format, roles, receta, voucher
│   │   ├── hooks/                    # useFetch, useMiFicha, useMiDoctor
│   │   ├── context/                  # AuthContext, NotificationsContext (Socket.io), ToastContext
│   │   ├── components/               # Navbar, Footer, ui (primitivos), portal/ (Layout, ProtectedRoute, NotificationBell)
│   │   ├── pages/                    # Home, Login y portal/ por rol (admin, doctor, paciente)
│   │   ├── data/                     # Contenido de marketing de la landing
│   │   ├── App.jsx                   # Rutas (público + portal protegido)
│   │   └── main.jsx
│   ├── e2e/                         # Flujos de usuario con Playwright
│   ├── Dockerfile                   # desarrollo, build, producción y runner E2E
│   ├── nginx.conf                   # SPA y proxy al backend para producción Docker
│   ├── playwright.config.js
│   ├── vite.config.js               # Proxy /api y /socket.io → :3000
│   └── package.json
│
├── .github/workflows/               # CI, CodeQL, releases y despliegue productivo
├── render.yaml                      # Blueprint declarativo del backend
├── scripts/set-version.sh           # Sincroniza manualmente la versión del producto
├── version.txt                      # Versión única del producto
├── CHANGELOG.md
├── LICENSE
└── README.md
```

> Este es el único README del repositorio. La referencia interactiva de la API
> está disponible en Swagger (`/api/v1/docs`).

---

## 🚀 Primeros pasos

### Requisitos previos

- **Node.js** v24 LTS — [Descargar](https://nodejs.org/)
- **npm** v11 o superior (incluido con Node)
- **MongoDB** en local, o una cuenta en [MongoDB Atlas](https://www.mongodb.com/atlas)
- Cuenta en [Cloudinary](https://cloudinary.com/) (gratuita) para subir archivos
- _(Opcional)_ **Redis** para caché · **Docker** para levantar todo en contenedores

### 1. Clonar el repositorio

```bash
git clone https://github.com/criveradev/Medical.git
cd Medical
```

### 2. Instalar dependencias

```bash
# Backend
cd medical-server && npm ci

# Frontend
cd ../medical-client && npm ci
```

### 3. Configurar variables de entorno

```bash
# Backend
cp medical-server/.env.example medical-server/.env

# Frontend (opcional en desarrollo; el proxy de Vite funciona sin esta variable)
cp medical-client/.env.example medical-client/.env
```

Edita `medical-server/.env` con tus credenciales (ver sección
[Variables de entorno](#-variables-de-entorno)).

### 4. Sembrar datos iniciales

```bash
cd medical-server
npm run seed:roles    # Crea los roles del sistema
npm run seed:catalogos # Crea departamentos y especialidades
npm run seed:admin    # Crea el usuario administrador inicial
```

Credenciales por defecto del administrador:

```
Email:    admin@medical.com
Password: Admin1234
```

> 🔒 Estas credenciales solo son el fallback de desarrollo. En producción el seed
> exige `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD`, con una contraseña de al menos
> 12 caracteres, y nunca imprime el secreto en logs.

### 5. Ejecutar en desarrollo

Abre **dos terminales**:

```bash
# Terminal 1 — Backend (http://localhost:3000)
cd medical-server && npm run dev

# Terminal 2 — Frontend (http://localhost:4200)
cd medical-client && npm run dev
```

El frontend hace proxy de `/api` y `/socket.io` al backend, así que no hay
problemas de CORS en desarrollo.

### 6. Verificar

Abre `http://localhost:4200`, inicia sesión con el admin y prueba el portal.
La documentación de la API queda en `http://localhost:3000/api/v1/docs`.

### Alternativa recomendada: Docker

Levanta la aplicación completa sin instalar Node.js, MongoDB ni Redis en tu
máquina:

```bash
cd medical-server
npm run docker:up
npm run docker:logs         # opcional: seguir frontend y backend
```

Servicios disponibles:

| Servicio | URL |
|----------|-----|
| Frontend | `http://localhost:4200` |
| Backend | `http://localhost:3000` |
| Swagger v1 | `http://localhost:3000/api/v1/docs` |

MongoDB y Redis solo están disponibles dentro de la red de Compose. El código
fuente se monta en modo lectura; Vite y Nodemon recargan sus respectivos
servicios cuando detectan cambios.

El archivo `.env` es opcional. Si existe, Compose usa sus valores para habilitar
Cloudinary, email, Sentry o reemplazar las claves locales de desarrollo.

Inicializa los datos y, cuando termines, detén los servicios:

```bash
npm run docker:seed:roles
npm run docker:seed:catalogos
npm run docker:seed:admin
npm run docker:down
```

---

## 🔐 Variables de entorno

### Backend — `medical-server/.env`

```env
# Servidor
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
APP_TIME_ZONE=America/Santiago
LOG_LEVEL=info
GRACEFUL_SHUTDOWN_TIMEOUT_MS=25000
CLIENT_URL=http://localhost:4200
ENABLE_REMINDER_CRON=true
COOKIE_SAME_SITE=lax
RATE_LIMIT_MAX=1000
LOGIN_RATE_MAX=100
AUDIT_RETENTION_DAYS=365

# Base de datos — MongoDB
MONGO_URI=mongodb://localhost:27017/medical_db

# Redis — caché opcional (si no está, la app degrada a MongoDB sin errores).
# Opción A: una sola URL (proveedores gestionados; rediss:// activa TLS solo).
REDIS_URL=
# Opción B: host/puerto por separado (Redis local).
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT — genera secretos con:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=cadena_aleatoria_minimo_32_caracteres
JWT_REFRESH_SECRET=otra_cadena_aleatoria_distinta
JWT_EXPIRES=15m
BCRYPT_ROUNDS=12
AUDIT_LOG_SECRET=tercera_cadena_aleatoria_minimo_32_caracteres
MFA_ENCRYPTION_KEY=cuarta_cadena_aleatoria_minimo_32_caracteres

# Solo se leen al ejecutar npm run seed:admin.
ADMIN_EMAIL=admin@medical.com
ADMIN_INITIAL_PASSWORD=

# Email — elige Resend o SMTP.
# Resend: EMAIL_FROM es obligatorio y debe pertenecer a un dominio verificado.
RESEND_API_KEY=
EMAIL_FROM=noreply@notify.criveradev.com

# SMTP alternativo para desarrollo local.
EMAIL_HOST=smtp.mail.me.com
EMAIL_PORT=587
EMAIL_USER=tu_correo
EMAIL_PASS=tu_password_de_aplicacion

# Cloudinary — cloudinary.com → Dashboard → API Keys
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Sentry — monitoreo de errores (opcional)
SENTRY_DSN=tu_dsn_de_sentry
```

`CLIENT_URL` acepta varios orígenes separados por comas. Si se define
`RESEND_API_KEY`, el backend usa la API HTTP de Resend e ignora la configuración
SMTP; en ese modo `EMAIL_FROM` es obligatorio.

### Frontend — `medical-client/.env`

```env
# Vacía en desarrollo para usar el proxy de Vite.
# En producción debe ser la URL pública del backend, sin barra final.
VITE_API_URL=https://api.medical.criveradev.com
```

> ⚠️ **Nunca subas secretos ni archivos `.env` al repositorio.** El `.gitignore`
> raíz excluye `Medical.env` y los `.env` de ambos paquetes; aun así, mueve las
> credenciales a la plataforma de despliegue y rota cualquier secreto que haya
> sido compartido previamente. En modo test no se envían correos reales.

---

## 🔢 Versionado de la API

El único contrato público es `/api/v1`. Express monta `routes/index.js` en
`/api`; ese router registra `routes/v1/index.js` en `/v1`, y el router de la
versión compone sus recursos y su documentación.

Solo se versiona el límite HTTP (`routes/v1`): rutas, validación y forma de la
respuesta. Los controladores, servicios y modelos permanecen compartidos hasta
que exista una incompatibilidad real. Una futura `v2` debe publicar su propio
router y contrato OpenAPI; no se crea duplicando toda la aplicación.

No existe alias ni fallback sin versión: `/api/*` y `/api/docs` responden `404`.
Cada versión debe declarar explícitamente todos los recursos que publica y
mantener su propio contrato OpenAPI.

El frontend usa rutas de recurso como `/citas` o `/auth/login` y
`medical-client/src/lib/api.js` las resuelve contra una única base
`/api/v1`. No existen reescrituras silenciosas de URLs sin versión.

## 🔌 Endpoints de la API

URL base en producción: `https://api.medical.criveradev.com/api/v1` · Documentación interactiva: `/api/v1/docs`

> En desarrollo local: `http://localhost:3000/api/v1`
> Las rutas sin `/v1` no están publicadas.

### 🔑 Autenticación y usuarios

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `POST` | `/auth/login` | Iniciar sesión | — |
| `GET` | `/auth/csrf` | Emitir protección CSRF para el navegador | — |
| `POST` | `/auth/refresh` | Renovar access token | — |
| `POST` | `/auth/mfa/verify` | Completar un login con TOTP o recuperación | — |
| `POST` | `/auth/logout` | Cerrar sesión (revoca refresh) | ✅ |
| `GET` | `/auth/perfil` | Mi perfil | ✅ |
| `PUT` | `/auth/perfil/foto` | Subir foto de perfil | ✅ |
| `PUT` | `/auth/cambiar-password` | Cambiar contraseña | ✅ |
| `POST` | `/auth/mfa/setup` | Iniciar configuración TOTP | ✅ |
| `POST` | `/auth/mfa/confirm` | Confirmar y activar TOTP | ✅ |
| `POST` | `/auth/mfa/disable` | Deshabilitar TOTP y revocar sesión | ✅ |
| `POST` | `/auth/usuarios` | Crear usuario | 🛡 |
| `GET` | `/auth/usuarios` | Listar usuarios | 🛡 |
| `PUT` | `/auth/usuarios/:id` | Editar usuario | 🛡 |
| `DELETE` | `/auth/usuarios/:id` | Eliminar usuario | 🛡 |
| `POST` | `/auth/usuarios/:id/revocar-sesiones` | Revocar todas las sesiones | 🛡 |
| `DELETE` | `/auth/usuarios/:id/mfa` | Restablecer MFA | 🛡 |
| `GET` | `/auditoria` | Consultar eventos de auditoría paginados | 🛡 |

### 📅 Endpoints de citas

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/citas` | Listar citas (con filtros) | 🛡 |
| `GET` | `/citas/:id` | Ver una cita | 🛡 |
| `GET` | `/citas/disponibilidad/:doctorId` | Horarios disponibles | 🛡 |
| `POST` | `/citas` | Agendar cita | 🛡 |
| `PUT` | `/citas/:id` | Editar cita | 🛡 |
| `PUT` | `/citas/:id/estado` | Cambiar estado | 🛡 |

### 👤 Pacientes

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/pacientes/mi-ficha` | Mi ficha (paciente) | ✅ |
| `GET` | `/pacientes` | Listar pacientes | 🛡 |
| `GET` | `/pacientes/:id` | Ver paciente | 🛡 |
| `POST` | `/pacientes` | Crear paciente | 🛡 |
| `PUT` | `/pacientes/:id` | Editar paciente | 🛡 |
| `PUT` | `/pacientes/:id/foto` | Subir foto | 🛡 |
| `DELETE` | `/pacientes/:id` | Eliminar paciente | 🛡 |

### 🩺 Doctores

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/doctores/mi-perfil` | Mi perfil (doctor) | ✅ |
| `GET` | `/doctores/siguiente-matricula` | Matrícula sugerida | 🛡 |
| `GET` | `/doctores` | Listar doctores | 🛡 |
| `GET` | `/doctores/:id` | Ver doctor | 🛡 |
| `GET` | `/doctores/disponibilidad/:doctorId` | Disponibilidad | 🛡 |
| `POST` | `/doctores` | Crear doctor | 🛡 |
| `PUT` | `/doctores/:id` | Editar doctor | 🛡 |
| `PUT` | `/doctores/:id/horarios` | Editar horarios | 🛡 |
| `PUT` | `/doctores/:id/foto` | Subir foto | 🛡 |

### 📋 Historial · 🧪 Resultados

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/historial/paciente/:pacienteId` | Historial de un paciente | 🛡 |
| `GET` | `/historial/:id` | Ver registro | 🛡 |
| `POST` | `/historial` | Registrar atención (receta) | 🛡 |
| `PUT` | `/historial/:id` | Editar registro | 🛡 |
| `GET` | `/resultados/paciente/:pacienteId` | Resultados de un paciente | 🛡 |
| `GET` | `/resultados/:id` | Ver resultado | 🛡 |
| `POST` | `/resultados` | Subir resultado (archivo) | 🛡 |
| `PUT` | `/resultados/:id` | Editar resultado | 🛡 |
| `DELETE` | `/resultados/:id` | Eliminar resultado | 🛡 |

### 💳 Pagos · 📊 Reportes · 🏢 Catálogos

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|:----:|
| `GET` | `/pagos` | Listar pagos (filtros + total) | 🛡 |
| `GET` | `/pagos/:id` | Ver pago | 🛡 |
| `POST` | `/pagos` | Registrar pago | 🛡 |
| `PUT` | `/pagos/:id` | Editar pago | 🛡 |
| `PUT` | `/pagos/:id/anular` | Anular pago | 🛡 |
| `GET` | `/reportes/doctor/:doctorId` | Reporte por doctor | 🛡 |
| `GET` | `/reportes/doctor/:doctorId/pdf` | Reporte PDF | 🛡 |
| `GET` | `/reportes/doctor/:doctorId/excel` | Reporte Excel | 🛡 |
| `GET` | `/reportes/admin` | Reporte general | 🛡 |
| `GET` | `/departamentos` · `/especialidades` | Catálogos (+ CRUD) | 🛡 |

> **Auth:** `—` público · `✅` requiere sesión · `🛡` requiere sesión + permiso de rol (RBAC).

### Autenticación en peticiones protegidas

El frontend usa cookies `HttpOnly`, `Secure` en producción y un token CSRF de
doble envío; los JWT no quedan accesibles desde JavaScript. Para clientes de
servidor o pruebas también se admite:

```http
Authorization: Bearer <tu_access_token>
```

### Códigos de respuesta

| Código | Significado |
|--------|-------------|
| `200` | OK |
| `201` | Creado |
| `202` | Se requiere completar el segundo factor |
| `400` | Datos inválidos |
| `401` | Sin token o token inválido/expirado |
| `403` | Sin permiso sobre el recurso |
| `404` | Recurso no encontrado |
| `409` | Conflicto (duplicado / solapamiento) |
| `422` | Clave de idempotencia reutilizada con otros datos |
| `429` | Demasiadas peticiones (rate limit) |
| `500` | Error interno del servidor |

---

## 👮 Roles y permisos

El acceso se controla por **rol** y **acción** sobre cada módulo (RBAC), y además
con aislamiento a nivel de objeto para el paciente.

| Rol | Acceso principal |
|-----|------------------|
| **Administrador** | Acceso total: usuarios, doctores, catálogos y reportes |
| **Recepcionista** | Agenda, pacientes y pagos |
| **Enfermero** | Apoyo clínico según permisos asignados |
| **Doctor** | Su agenda, registrar atenciones/recetas y subir resultados |
| **Paciente** | Solo sus propias citas, historial, resultados y pagos |

---

## 🧪 Tests

El backend incluye una suite de integración con **Jest + Supertest** y el
frontend un flujo E2E con **Playwright**.

La opción recomendada no necesita MongoDB instalado ni un archivo `.env`:

```bash
cd medical-server
npm run docker:test
```

Este comando construye la etapa `test` del Dockerfile, crea un MongoDB temporal
en memoria, ejecuta Jest y elimina los contenedores al terminar. Usa un proyecto
Compose separado, por lo que nunca toca la base persistente de desarrollo.

También puedes ejecutar las pruebas sin Docker contra una base exclusiva:

```bash
cd medical-server
export MONGO_TEST_URI=mongodb://127.0.0.1:27017/medical_test
npm test               # Ejecuta toda la suite
npm run test:watch     # Modo watch
npm run test:coverage  # Con reporte de cobertura
```

La carpeta `medical-server/tests` contiene 19 archivos de suite. El entorno de
pruebas desactiva el envío de correos reales y la conexión a Redis.

Las pruebas de componentes del frontend se ejecutan por separado:

```bash
cd medical-client
npm test
npm run build
```

Para probar la aplicación completa en Chromium:

```bash
cd medical-server
npm run docker:e2e
```

El comando levanta y espera el stack, crea los roles y el administrador de
desarrollo, y valida un flujo observable completo: protección de rutas, login,
dashboard, creación/edición/desactivación de un departamento, uso exclusivo del
contrato `/api/v1` y logout. La imagen y el paquete de Playwright usan la misma
versión para evitar incompatibilidades entre el runner y los navegadores.

El reporte HTML queda en `medical-client/playwright-report/`; capturas, vídeos y
trazas de los fallos quedan en `medical-client/test-results/`.

---

## 🚢 Despliegue

El proyecto utiliza servicios gestionados y un **dominio propio** administrado
mediante Cloudflare DNS:

| Pieza | Servicio | Notas |
|-------|----------|-------|
| Frontend | **Vercel** | sitio estático (Vite) · `medical.criveradev.com` |
| Backend / API | **Render** | Web Service Node · `api.medical.criveradev.com` |
| DNS / Dominio | **Cloudflare** | registros CNAME hacia Vercel y Render |
| Base de datos | **MongoDB Atlas** | clúster M0 |
| Caché | **Upstash** (Redis) | vía `REDIS_URL` (TLS) |
| Archivos | **Cloudinary** | imágenes y documentos |
| Email | **Resend** (API HTTP) | dominio propio autenticado (SPF + DKIM + DMARC) |
| Errores | **Sentry** | opcional |

El backend usa `process.env.PORT`, limita CORS a `CLIENT_URL`, publica healthchecks
de liveness/readiness y finaliza conexiones de forma controlada. `render.yaml`
declara el servicio, desactiva el autodeploy por commit y reserva producción para
tags publicados por el pipeline.

> El frontend usa `VITE_API_URL` para apuntar al backend: déjala **vacía** en
> desarrollo (proxy de Vite) y ponla con la URL del backend en producción.

### 1. Subir el repositorio a GitHub

Antes de inicializar Git, importa las credenciales de `Medical.env` en un gestor
de secretos y retira el archivo cuando deje de ser necesario. El `.gitignore` raíz
lo excluye, pero conviene confirmar igualmente que no aparezca en `git status`.

```bash
git init
git add .
git status --short
git commit -m "chore: prepare deployment"
git branch -M main
git remote add origin https://github.com/criveradev/Medical.git
git push -u origin main
```

> No continúes con el commit si `Medical.env`, `.env` u otro archivo sensible
> aparece en el área preparada.

### 2. Base de datos — MongoDB Atlas

1. Crea un clúster gratuito (M0) en [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. En **Network Access**, permite únicamente las redes necesarias. Si el proveedor
   no ofrece IP de salida fija y debes usar `0.0.0.0/0`, compénsalo con un usuario
   exclusivo, contraseña robusta y privilegios mínimos sobre la base requerida.
3. En **Database Access** crea un usuario y copia la cadena de conexión
   (`mongodb+srv://...`); será tu `MONGO_URI`.

### 3. Backend — Render

Crea el servicio importando el Blueprint `render.yaml`. Si prefieres configurarlo
manualmente, usa estos valores:

| Campo | Valor |
|-------|-------|
| Root Directory | `medical-server` |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/health/ready` |
| Auto-Deploy | `Off` |

Agrega las variables de entorno (ver [Variables de entorno](#-variables-de-entorno)),
con `MONGO_URI` de Atlas y `CLIENT_URL` = `https://medical.criveradev.com` (paso 4 y 5).
Mantén `COOKIE_SAME_SITE=lax` cuando web y API usen los subdominios propios
indicados. Usa `none` solo si temporalmente están en dominios de proveedores
distintos; en producción la cookie siempre se emite con `Secure`.
`SENTRY_DSN` y `REDIS_*` son opcionales; si defines `SENTRY_DSN`, comprueba que el DSN
corresponda al **proyecto de Sentry que estás mirando** (cada proyecto tiene su propio DSN)
y que el servidor arranque **sin** el aviso `⚠️ SENTRY_DSN no está definido`.
El Blueprint inicializa roles y catálogos de forma idempotente. Crea el administrador
una sola vez desde un entorno seguro:

```bash
cd medical-server
NODE_ENV=production \
MONGO_URI="<cadena de Atlas>" \
ADMIN_EMAIL="<correo del administrador>" \
ADMIN_INITIAL_PASSWORD="<contraseña aleatoria de al menos 12 caracteres>" \
npm run seed:admin
```

No agregues esas variables permanentemente al Web Service. Cambia la contraseña
inicial al entrar por primera vez.

### 4. Frontend — Vercel

Importa el repo en [vercel.com](https://vercel.com):

| Campo | Valor |
|-------|-------|
| Root Directory | `medical-client` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Agrega la variable de entorno `VITE_API_URL` con la URL pública del backend
(sin barra final), por ejemplo `https://api.medical.criveradev.com`.
El `vercel.json` incluido se encarga del fallback de rutas de React Router.

### 5. Dominio propio — Cloudflare

El proyecto usa subdominios propios en vez de las URLs `.vercel.app` / `.onrender.com`:

1. En **Vercel** → proyecto → Settings → Domains → agrega `medical.criveradev.com`.
   Crea en Cloudflare el registro que indique el panel de Vercel:
   ```
   CNAME   medical   <valor indicado por Vercel>   (Proxy: Solo DNS / DNS only)
   ```
2. En **Render** → servicio backend → Settings → Custom Domains → agrega
   `api.medical.criveradev.com` y copia el valor CNAME que entrega Render. Agrégalo
   en Cloudflare:
   ```
   CNAME   api.medical   <valor entregado por Render>   (Proxy: Solo DNS / DNS only)
   ```
3. Deja el proxy de Cloudflare en **"Solo DNS"** (nube gris) hasta que ambos dominios
   queden verificados y con SSL emitido en sus respectivos paneles.
4. **No toques** los registros existentes de la raíz (`@`, `www`) ni los de email
   transaccional (`_domainkey`, TXT de verificación, `_dmarc`) — son independientes
   y no se ven afectados por agregar estos subdominios.

### 6. Conectar ambos

En Render, asegúrate de que `CLIENT_URL` quede exactamente como
`https://medical.criveradev.com` (con `https://`, sin slash final) → esto resuelve
el CORS tanto de Express como de Socket.io para el nuevo dominio.

> ⚠️ **Error común:** si `CLIENT_URL` queda sin el prefijo `https://` (por ejemplo
> `medical.criveradev.com` a secas), el backend rechaza el origen con un error
> `403` / *CORS no exitoso*, porque la comparación de origen es por texto exacto.

### 7. Caché — Redis (Upstash)

Crea una base Redis gratuita en [upstash.com](https://upstash.com), copia la URL
de la pestaña **TCP** (empieza con `rediss://`, con TLS) y agrégala en Render:

```
REDIS_URL=rediss://default:TU_PASSWORD@xxxx.upstash.io:6379
```

Es opcional: sin `REDIS_URL`, la app funciona consultando MongoDB directamente.

### 8. Email — Resend por API HTTP

> Si el proveedor bloquea la salida SMTP, usa la **API HTTP de Resend**. El backend
> la selecciona automáticamente cuando existe `RESEND_API_KEY`.

1. Crea cuenta en [resend.com](https://resend.com) y **autentica tu dominio**
   (SPF + DKIM) o verifica un remitente; define ese correo en `EMAIL_FROM`.
2. En Resend → **API Keys** → genera una clave (`re_...`).
3. En Render agrega:
   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM=noreply@notify.criveradev.com
   ```

> Los recordatorios usan un lease distribuido en MongoDB para que solo una instancia
> los procese. El backend debe permanecer activo a la hora programada; en planes que
> suspenden el servicio conviene mover la ejecución a un scheduler gestionado.

Para un scheduler externo, configura las mismas variables del backend, define
`ENABLE_REMINDER_CRON=false` en el servicio web y programa diariamente:

```bash
cd medical-server
npm run reminders:once
```

### Imagen Docker de producción

El Dockerfile contiene una etapa final sin dependencias de desarrollo y ejecuta
el proceso como usuario sin privilegios:

```bash
cd medical-server
docker build --target production -t medical-api .
```

El frontend también incluye una imagen de producción servida por Nginx:

```bash
cd medical-client
docker build --target production -t medical-web .
```

El `docker-compose.yml` está orientado al desarrollo y a pruebas locales, no al
despliegue de producción.

---

## 🔄 CI/CD y releases

El repositorio usa una sola versión para frontend y backend. `version.txt`, ambos
`package.json` y ambos lockfiles deben tener siempre la misma versión.

### Flujo de entrega

1. Cada pull request hacia `main` ejecuta auditoría de dependencias, build del
   frontend, pruebas de integración, build de imágenes de producción y E2E.
2. Configura `CI success` como check obligatorio de la regla de protección de
   `main`. Exige pull request, una aprobación y rama actualizada.
3. Cuando decidas publicar, ejecuta `scripts/set-version.sh`, actualiza
   `CHANGELOG.md` y fusiona esos cambios mediante un pull request.
4. Desde GitHub Actions ejecuta manualmente **Create release**. El workflow valida
   las cinco fuentes de versión y crea el tag inmutable `vX.Y.Z` y el GitHub Release.
5. Ejecuta manualmente **Deploy production**. Tras la aprobación del environment,
   despliega Render usando el SHA exacto del tag, espera `/health/ready`, despliega
   Vercel y ejecuta smoke tests.

Prefijos de commit relevantes:

- `fix:` incrementa patch.
- `feat:` incrementa minor.
- `feat!:` o un footer `BREAKING CHANGE:` incrementa major.
- `docs:`, `test:`, `refactor:` y `chore:` documentan cambios sin forzar por sí
  solos una nueva versión.

La versión del producto y `/api/v1` son conceptos distintos: un release `v1.4.2`
puede seguir publicando el contrato HTTP `/api/v1` mientras no existan cambios
incompatibles.

### Configuración de GitHub

Crea el environment `production`, restringido a la rama `main`, con aprobación
manual y sin permitir autoaprobación. El workflow valida por separado que el tag
SemVer exista y apunte al SHA esperado antes de acceder a este environment.
Configura allí:

| Tipo | Nombre | Valor |
|------|--------|-------|
| Secret | `RENDER_DEPLOY_HOOK_URL` | Deploy hook secreto del Web Service |
| Secret | `VERCEL_TOKEN` | Token de automatización de Vercel |
| Secret | `VERCEL_ORG_ID` | ID de la cuenta o equipo de Vercel |
| Secret | `VERCEL_PROJECT_ID` | ID del proyecto Vercel |
| Variable | `PRODUCTION_API_URL` | `https://api.medical.criveradev.com` |
| Variable | `PRODUCTION_WEB_URL` | `https://medical.criveradev.com` |

No se necesita un access token personal para releases. **Create release** solo se
ejecuta por solicitud manual y utiliza el token efímero de GitHub Actions, limitado
a esa ejecución y al permiso `contents: write`.

En Vercel mantiene `VITE_API_URL=https://api.medical.criveradev.com` en el entorno
Production. Desactiva el despliegue automático de producción desde Git para evitar
que un merge se publique antes de crear el release; los previews de pull request
pueden permanecer habilitados.

### Primer release y rollback

El baseline actual es `1.0.0`. Después de que CI esté verde, abre **Actions →
Create release → Run workflow**, introduce `1.0.0` y confirma. No crees el tag con
Git: el workflow manual lo genera solo después de validar las versiones.

Para una versión posterior, prepara primero un pull request:

```bash
./scripts/set-version.sh 1.1.0
# Actualiza CHANGELOG.md antes de confirmar los cambios.
git add version.txt CHANGELOG.md medical-server/package.json \
  medical-server/package-lock.json medical-client/package.json \
  medical-client/package-lock.json
git commit -m "chore: release 1.1.0"
```

Una vez fusionado y con CI verde, ejecuta manualmente **Create release** y luego
**Deploy production** con el tag, la versión y el SHA publicados.

Para rollback, abre **Deploy production**, ejecútalo manualmente con un tag anterior
existente y su versión. El workflow vuelve a validar que el tag, el SHA y las cinco
fuentes de versión coincidan. Nunca muevas ni reemplaces un tag publicado.

---

## 🗺 Roadmap

### Actual ✅
- [x] Autenticación con access + refresh token (hasheado y revocable)
- [x] Cookies HttpOnly, CSRF, MFA TOTP y revocación global de sesiones
- [x] RBAC por módulo/acción + aislamiento de datos del paciente
- [x] CRUD de citas con disponibilidad y anti-solapamiento concurrente
- [x] Pacientes y doctores (matrícula automática/editable, horarios, fotos)
- [x] Historial clínico + recetas en PDF
- [x] Resultados de exámenes con archivos en Cloudinary
- [x] Pagos con comprobante descargable
- [x] Reportes con gráficos y exportación PDF/Excel
- [x] Notificaciones en tiempo real (Socket.io) y correos
- [x] Recordatorios idempotentes con lease distribuido y caché con Redis
- [x] Auditoría, idempotencia de escrituras y validación binaria de archivos
- [x] Seguridad: Helmet, CORS, rate limiting, sanitización y Sentry
- [x] Tests de integración y E2E (Jest, Supertest y Playwright), Swagger y Docker
- [x] Contrato HTTP v1 aislado, sin alias ni fallback implícito

### Próximamente
- [ ] Pago en línea integrado (pasarela)
- [ ] Búsqueda y filtros avanzados en listados
- [ ] Modo oscuro

---

## 📄 Licencia

Distribuido bajo la licencia MIT. Ver [`LICENSE`](./LICENSE) para más información.

---

### 👨🏻‍💻 Developed by

<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://res.cloudinary.com/docscluster/image/upload/v1782698757/logo-dark_qddsa3.svg">
    <source
      media="(prefers-color-scheme: light)"
      srcset="https://res.cloudinary.com/docscluster/image/upload/v1782698757/logo-light_wilpp4.svg">
    <img
      alt="criveradev"
      src="https://res.cloudinary.com/docscluster/image/upload/v1782698757/logo-light_wilpp4.svg"
      width="200">
  </picture>
</p>
