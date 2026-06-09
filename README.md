# Study Planner

![Hugo, asistente virtual de Study Planner](frontend/assets/hugo-mascot.png)

Study Planner es una aplicacion full stack para organizar tareas academicas, entregas, parciales y horas de estudio. El sistema permite crear una cuenta, iniciar sesion, guardar tareas en PostgreSQL, filtrar la agenda, marcar avances y recibir recomendaciones de priorizacion con un asistente basado en reglas explicables.

El objetivo del proyecto es resolver un problema real de estudiantes: decidir que estudiar primero cuando hay varias materias, fechas limite y trabajos pendientes.

## Funcionalidades

- Registro e inicio de sesion con email y password.
- Backend propio con Node.js, Express y API REST.
- Base de datos PostgreSQL.
- Autenticacion con JWT.
- Alta, listado, actualizacion y eliminacion de tareas por usuario.
- Fallback local con `localStorage` si el backend no esta disponible.
- Agenda filtrable por texto y dificultad.
- Metricas de tareas activas, urgentes, entregas de la semana y horas pendientes.
- Hugo, asistente virtual de la app, calcula un puntaje de prioridad segun vencimiento, dificultad, tipo de tarea y carga horaria.
- Agente autonomo de revision del repositorio mediante GitHub Actions.

## Identidad visual

- Mascota/asistente virtual: Hugo, el buho de `frontend/assets/hugo-mascot.png`.
- La interfaz usa a Hugo en la navegacion, el favicon y el asistente flotante.
- Si se cuenta con el logo original exacto con texto, guardarlo como `frontend/assets/logo-original.png` y usarlo solo en piezas de marca/documentacion.

## Tecnologias usadas

- HTML5
- CSS3 responsive
- JavaScript vanilla
- Node.js
- Express
- PostgreSQL
- JWT
- bcryptjs
- GitHub Actions para validacion y agente autonomo
- IA utilizada durante el desarrollo: Codex / ChatGPT para analizar la consigna, elegir una idea viable, generar codigo, revisar estructura y documentar la entrega.

## Como ejecutar el proyecto

### Opcion 1: Node local

1. Instalar dependencias:

```bash
npm install
```

2. Crear un archivo `.env` usando `.env.example` como base. Este archivo es local y no se sube al repositorio:

```env
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/study_planner
JWT_SECRET=cambia-este-secreto-en-produccion
```

3. Verificar que las variables locales esten completas:

```bash
npm run check:env
```

4. Ejecutar la aplicacion:

```bash
npm start
```

5. Abrir:

```text
http://localhost:3000
```

El servidor crea las tablas necesarias usando `db/schema.sql` al iniciar.

### Opcion 2: Docker

Tambien se puede levantar la app con PostgreSQL usando Docker:

```bash
docker compose up --build
```

Luego abrir:

```text
http://localhost:3001
```

Este modo crea un contenedor para la app y otro para PostgreSQL.

## Base de datos

El proyecto usa PostgreSQL con dos tablas principales:

- `users`: guarda usuarios y password hasheado.
- `tasks`: guarda tareas academicas asociadas al usuario.

El esquema esta en:

```text
db/schema.sql
```

## API REST

Endpoints principales:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/demo
GET    /api/health
```

Las rutas de tareas requieren token JWT en el header:

```text
Authorization: Bearer <token>
```

## Despliegue recomendado

Para esta arquitectura conviene desplegar:

- Aplicacion Node/Express: Render.
- Base PostgreSQL: Neon.
- Repositorio: GitHub.

Variables necesarias en produccion:

```text
DATABASE_URL
JWT_SECRET
PORT
```

La guia paso a paso esta en `docs/deploy.md`.

## Trabajo colaborativo

El proyecto esta preparado para mostrar aportes individuales mediante ramas y pull requests. La guia esta en `docs/colaboracion.md`.

Ramas sugeridas:

```text
feature/frontend-ui
feature/backend-api
feature/database-auth
feature/docs-deploy
```

Cada integrante debe trabajar en su rama, hacer commits propios y abrir un Pull Request hacia `main`.

## Estructura

```text
.
|-- package.json
|-- Dockerfile
|-- docker-compose.yml
|-- .dockerignore
|-- render.yaml
|-- .env                  # local, ignorado por Git
|-- .env.example
|-- frontend/
|   |-- index.html
|   |-- styles.css
|   |-- app.js
|   |-- assets/
|   |   `-- hugo-mascot.png
|   |-- css/
|   |   |-- base.css
|   |   |-- landing.css
|   |   |-- auth.css
|   |   |-- app.css
|   |   `-- responsive.css
|   `-- js/
|       |-- config.js
|       |-- dates.js
|       |-- demoTasks.js
|       |-- helpers.js
|       `-- priority.js
|-- backend/
|   |-- server.js
|   |-- config.js
|   |-- db.js
|   |-- routes/
|   |-- middleware/
|   `-- utils/
|-- db/
|   `-- schema.sql
|-- scripts/
|   |-- repo-agent.js
|   `-- check-env.js
|-- docs/
|   |-- deploy.md
|   |-- colaboracion.md
|   |-- informe-tecnico.md
|   `-- consigna-tp-integrador.pdf
`-- .github/workflows/
    |-- ci.yml
    `-- agent-review.yml
```

## Bonus: agente autonomo

El repositorio incluye un agente autonomo de revision en `scripts/repo-agent.js`. Este agente se ejecuta con GitHub Actions y revisa automaticamente:

- Archivos obligatorios de la entrega.
- README con menciones al uso de IA.
- Informe tecnico con herramientas y lecciones aprendidas.
- Persistencia local en la app.
- Backend Express con API REST.
- Base PostgreSQL.
- Configuracion de despliegue en Render.
- Configuracion Docker.
- Existencia del asistente de priorizacion.
- Coherencia del enfoque academico de Study Planner.

El resultado queda disponible como artefacto del workflow `Autonomous Agent Review`.

## Checklist de entrega

- [ ] Repositorio publico creado.
- [ ] Demo online publicada.
- [ ] Base PostgreSQL configurada.
- [ ] Variables `DATABASE_URL` y `JWT_SECRET` configuradas en el hosting.
- [ ] Servicio web publicado en Render.
- [ ] Docker probado localmente si se presenta como alternativa.
- [ ] README completo.
- [ ] Informe tecnico incluido.
- [ ] Pipeline de CI ejecutado correctamente.
- [ ] Agente autonomo ejecutado correctamente.
- [ ] Ramas y pull requests de los 4 integrantes visibles en GitHub.
