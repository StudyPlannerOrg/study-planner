# Guia de configuracion y deploy - Study Planner

Esta guia sirve para dejar listo el entorno completo del proyecto: local con Node, local con Docker, base online en Neon, deploy en Render, n8n y Gmail con Google OAuth.

## 1. Variables de entorno

Si, el proyecto necesita archivo `.env` para ejecutar la app fuera de Docker.

Crear `.env` en la raiz del proyecto usando `.env.example` como base:

```env
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/study_planner
JWT_SECRET=cambia-este-secreto-en-produccion
N8N_SHARED_SECRET=
```

Variables:

- `PORT`: puerto interno de Express. Local con Node usa `3000`. Docker publica la app en `3001`, pero internamente sigue usando `3000`.
- `DATABASE_URL`: connection string de PostgreSQL. Puede ser local, Docker o Neon.
- `JWT_SECRET`: secreto para firmar tokens de login. Debe ser largo y no compartirse publicamente.
- `N8N_SHARED_SECRET`: secreto compartido entre n8n y la API para consultar recordatorios. En Docker el valor usado es `docker-n8n-secret`.

Importante: no subir `.env` al repositorio ni pasarlo por WhatsApp/Discord. El `.env` actual del proyecto contiene datos reales de Neon y debe tratarse como secreto. Para compartir configuracion, usar `.env.example` o esta guia.

## 2. Ejecucion local con Node

Requisitos:

- Node.js instalado.
- PostgreSQL disponible localmente o una base Neon.

Pasos:

```bash
npm install
npm run check:env
npm start
```

Abrir:

```text
http://localhost:3000
```

Si usan PostgreSQL local, crear la base `study_planner` y configurar:

```env
DATABASE_URL=postgres://usuario:password@localhost:5432/study_planner
```

El servidor crea las tablas automáticamente al iniciar usando `db/schema.sql`.

## 3. Ejecucion local con Docker

Requisitos:

- Docker Desktop abierto.

Comando:

```bash
docker compose up --build
```

Servicios:

- App: `http://localhost:3001`
- n8n: `http://localhost:5679`
- PostgreSQL: contenedor interno `postgres`

En Docker no hace falta crear `.env`, porque `docker-compose.yml` ya define:

```env
PORT=3000
DATABASE_URL=postgres://studyplanner:studyplanner@postgres:5432/study_planner
JWT_SECRET=docker-local-secret
N8N_SHARED_SECRET=docker-n8n-secret
```

## 4. Base online en Neon

1. Entrar a Neon.
2. Crear un proyecto nuevo.
3. Copiar la connection string.
4. Verificar que tenga formato similar a:

```text
postgresql://usuario:password@host.neon.tech/neondb?sslmode=require
```

Esa URL se usa como `DATABASE_URL` en Render.

No hace falta ejecutar `db/schema.sql` manualmente: la app crea o actualiza las tablas al iniciar.

## 5. Deploy de la app en Render

Crear un Web Service en Render:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /api/health
```

Variables en Render para el servicio `study-planner`:

```text
NODE_ENV=production
DATABASE_URL=<connection string de Neon>
JWT_SECRET=<texto largo y secreto>
N8N_SHARED_SECRET=<mismo secreto que usara n8n>
```

Render puede generar `JWT_SECRET`, pero `N8N_SHARED_SECRET` conviene definirlo manualmente para copiarlo tambien en n8n.

## 6. n8n local

Abrir:

```text
http://localhost:5679
```

Importar el workflow local:

```text
n8n/workflows/local/avisos-por-vencimiento.local.json
```

El workflow local debe llamar a:

```text
GET http://app:3000/api/tasks/due-reminders
Header: x-n8n-secret = docker-n8n-secret
```

La URL `http://app:3000` solo funciona dentro de Docker Compose. Si n8n corre fuera de Docker, usar `http://localhost:3000` o `http://localhost:3001` segun donde este publicada la app.

## 7. n8n online en Render

El archivo `render.yaml` ya incluye el servicio `study-planner-n8n` con la imagen oficial de n8n.

Variables para ese servicio:

```text
N8N_PORT=10000
N8N_LISTEN_ADDRESS=0.0.0.0
N8N_PROTOCOL=https
GENERIC_TIMEZONE=America/Argentina/Buenos_Aires
TZ=America/Argentina/Buenos_Aires
N8N_RUNNERS_ENABLED=true
DB_TYPE=postgresdb
DB_POSTGRESDB_SSL_ENABLED=true
DB_POSTGRESDB_SCHEMA=public
DB_POSTGRESDB_HOST=<host de Neon>
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=<nombre de base>
DB_POSTGRESDB_USER=<usuario>
DB_POSTGRESDB_PASSWORD=<password>
N8N_ENCRYPTION_KEY=<texto largo fijo>
N8N_HOST=<host publico de n8n, sin https>
WEBHOOK_URL=https://<host publico de n8n>/
N8N_EDITOR_BASE_URL=https://<host publico de n8n>/
```

`N8N_ENCRYPTION_KEY` no debe cambiarse despues de guardar credenciales, porque n8n la usa para cifrarlas.

En n8n online, el HTTP Request debe llamar a la app publicada:

```text
GET https://<url-publica-de-study-planner>/api/tasks/due-reminders
Header: x-n8n-secret = <mismo N8N_SHARED_SECRET configurado en Render>
```

Importar el workflow online:

```text
n8n/workflows/online/avisos-por-vencimiento.online.json
```

El workflow online usa `{{$env.N8N_SHARED_SECRET}}` para no guardar el secreto dentro del JSON. En Render, configurar esa variable tambien en el servicio de n8n con el mismo valor usado por la app.

## 8. Google OAuth para Gmail en n8n

Para que n8n pueda mandar mails con Gmail:

1. Entrar a Google Cloud Console.
2. Crear un proyecto o usar uno existente.
3. Ir a `APIs & Services > Library`.
4. Habilitar `Gmail API`.
5. Ir a `APIs & Services > OAuth consent screen`.
6. Elegir `External` si usan cuentas personales.
7. Completar nombre de app, email de soporte y datos requeridos.
8. Agregar como test users los correos que vayan a conectar Gmail.
9. Ir a `APIs & Services > Credentials`.
10. Crear credenciales `OAuth client ID`.
11. Elegir tipo `Web application`.
12. En n8n, crear credencial `Gmail OAuth2` y copiar la `OAuth Redirect URL` que muestra n8n.
13. Pegar esa URL en Google como `Authorized redirect URI`.
14. Copiar `Client ID` y `Client Secret` de Google a la credencial Gmail de n8n.
15. Conectar la cuenta y aceptar permisos.

Notas:

- En n8n local, la redirect URL suele usar `http://localhost:5679/...`.
- En n8n online, la redirect URL debe usar el dominio publico de Render.
- Si cambia el dominio de n8n, hay que actualizar tambien la redirect URI en Google Cloud.
- El workflow exportado puede traer el nombre de una credencial, pero no trae el token real. Cada integrante debe reconectar su Gmail.

## 9. Workflow de recordatorios

El workflow incluido hace:

```text
Schedule Trigger -> HTTP Request -> If -> Gmail
```

La API responde con tareas que vencen hoy o mañana:

```text
GET /api/tasks/due-reminders
```

La respuesta contiene:

```json
{
  "generatedAt": "2026-06-09T21:00:00.000Z",
  "reminders": []
}
```

El nodo `If` debe verificar:

```text
{{ $json.reminders.length }} is greater than 0
```

El nodo Gmail usa datos como:

```text
{{$json.reminders[0].user.email}}
{{$json.reminders[0].task.title}}
{{$json.reminders[0].reminder.label}}
```

Antes de activar el workflow, crear una tarea que venza hoy o mañana y probarlo manualmente.

## 10. Validacion antes de entregar

Ejecutar:

```bash
npm run check
```

Checklist:

- La app abre local o en Docker.
- Registro y login funcionan.
- Las tareas se guardan en PostgreSQL.
- El asistente Hugo prioriza tareas.
- `/api/health` responde `ok: true`.
- `/api/tasks/due-reminders` responde solo con el header correcto de n8n; si falta `N8N_SHARED_SECRET`, no autoriza la consulta.
- El README explica ejecucion, deploy, IA usada y n8n.
- `docs/informe-tecnico.md` esta completo.
- GitHub Actions corre sin errores.
- Render tiene la app online.
- n8n tiene el workflow importado y la credencial Gmail conectada.

## 11. Archivos importantes

```text
.env.example
docker-compose.yml
render.yaml
db/schema.sql
backend/server.js
backend/routes/auth.js
backend/routes/tasks.js
frontend/index.html
frontend/app.js
frontend/js/api.js
frontend/js/chatbot.js
frontend/js/checklist.js
frontend/js/notifications.js
frontend/js/storage.js
frontend/js/taskUtils.js
docs/deploy.md
docs/informe-tecnico.md
n8n/workflows/local/avisos-por-vencimiento.local.json
n8n/workflows/online/avisos-por-vencimiento.online.json
```
