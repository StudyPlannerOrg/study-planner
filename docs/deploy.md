# Despliegue - Study Planner

Esta guia usa:

- GitHub para el repositorio.
- Neon para PostgreSQL.
- Render para publicar la app Node/Express.
- n8n en Docker local y tambien como Web Service en Render para automatizaciones online.

## 1. Subir el proyecto a GitHub

1. Crear un repositorio publico en GitHub.
2. Subir todos los archivos del proyecto.
3. Verificar que esten incluidos:

```text
backend/server.js
package.json
db/schema.sql
frontend/index.html
frontend/app.js
frontend/styles.css
README.md
docs/informe-tecnico.md
render.yaml
```

## 2. Crear base PostgreSQL en Neon

1. Entrar a Neon.
2. Crear un nuevo proyecto.
3. Crear o usar la base por defecto.
4. Copiar la connection string.

Debe tener un formato parecido a:

```text
postgresql://usuario:password@host.neon.tech/dbname?sslmode=require
```

Esa URL se va a usar como `DATABASE_URL` en Render.

No hace falta ejecutar manualmente `db/schema.sql`: el servidor crea las tablas al iniciar.

## 3. Crear Web Service de la app en Render

1. Entrar a Render.
2. Elegir `New > Web Service`.
3. Conectar el repositorio de GitHub.
4. Configurar:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free
```

5. Agregar variables de entorno:

```text
DATABASE_URL=<connection string de Neon>
JWT_SECRET=<un texto largo y dificil de adivinar>
NODE_ENV=production
N8N_SHARED_SECRET=<texto secreto compartido con n8n>
```

6. Crear el servicio.

Render va a instalar dependencias, iniciar Express y publicar una URL.

## 4. Crear n8n en Render

Hay dos ambientes de n8n:

```text
Docker local: http://localhost:5679
Render online: https://study-planner-n8n.onrender.com
```

Para que la app publicada en Render pueda enviar mails, necesita usar el n8n online. Se puede crear desde el `render.yaml`, que ya incluye el servicio `study-planner-n8n` con la imagen Docker oficial de n8n.

Variables para `study-planner-n8n` en Render:

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
DB_POSTGRESDB_DATABASE=<nombre de base Neon>
DB_POSTGRESDB_USER=<usuario Neon>
DB_POSTGRESDB_PASSWORD=<password Neon>
N8N_ENCRYPTION_KEY=<texto largo fijo, no cambiar despues>
N8N_HOST=study-planner-n8n.onrender.com
WEBHOOK_URL=https://study-planner-n8n.onrender.com/
N8N_EDITOR_BASE_URL=https://study-planner-n8n.onrender.com/
```

Notas importantes:

- `N8N_ENCRYPTION_KEY` debe quedar fijo. Si cambia, n8n puede perder acceso a credenciales guardadas.
- Para n8n online conviene usar Neon/PostgreSQL. No depender de almacenamiento temporal del contenedor.
- En Render Free el servicio puede dormirse. El primer webhook puede tardar mas si n8n estaba dormido.
- Si se cambia el nombre del servicio en Render, tambien cambiar `N8N_HOST`, `WEBHOOK_URL` y `N8N_EDITOR_BASE_URL`.

Luego, dentro de n8n, crear el usuario inicial y configurar el workflow programado de recordatorios.

### Workflow recomendado para recordatorios

Para no mandar mails por cada tarea creada, usar un workflow programado:

```text
Schedule Trigger -> HTTP Request -> If -> Gmail
```

Configurar `Schedule Trigger` para ejecutarse una vez por dia, por ejemplo a las 08:00.

Configurar `HTTP Request`:

```text
Method: GET
URL: https://study-planner.onrender.com/api/tasks/due-reminders
Header:
  x-n8n-secret: <N8N_SHARED_SECRET>
```

La respuesta tiene:

```json
{
  "generatedAt": "2026-06-09T21:00:00.000Z",
  "reminders": [
    {
      "event": "task.due_reminder",
      "user": { "email": "usuario@ejemplo.com" },
      "task": { "title": "TP Integrador", "dueDate": "2026-06-10" },
      "reminder": { "label": "Vence mañana", "dueInDays": 1 }
    }
  ]
}
```

Luego agregar `If` con la condicion:

```text
{{ $json.reminders.length }} is greater than 0
```

Y en Gmail:

```text
To: {{$json.reminders[0].user.email}}
Subject: {{$json.reminders[0].reminder.label}}: {{$json.reminders[0].task.title}}
Message: La tarea {{$json.reminders[0].task.title}} {{$json.reminders[0].reminder.label}}.
```

## 5. Probar la demo

1. Abrir la URL publica de Render.
2. Crear una cuenta desde la app.
3. Cargar una tarea.
4. Refrescar la pagina.
5. Iniciar sesion y verificar que la tarea siga guardada.
6. Crear una tarea que venza hoy o mañana.
7. Ejecutar el workflow programado de n8n manualmente y verificar que llegue el mail.

## 6. Link para entregar

Entregar:

- URL publica de Render.
- URL publica de n8n si se muestra la automatizacion.
- URL del repositorio GitHub.
- Informe tecnico incluido en `docs/informe-tecnico.md`.

## Alternativa local con Docker

Para probar la app completa sin instalar PostgreSQL local:

```bash
docker compose up --build
```

Luego abrir:

```text
http://localhost:3001
```

Docker crea:

- `app`: servidor Node/Express.
- `postgres`: base PostgreSQL local.
- `n8n`: automatizaciones locales en `http://localhost:5679`.

En Docker local, n8n consulta:

```text
http://app:3000/api/tasks/due-reminders
```

En Render, n8n consulta:

```text
https://study-planner.onrender.com/api/tasks/due-reminders
```
