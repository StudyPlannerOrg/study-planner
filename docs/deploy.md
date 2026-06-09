# Despliegue - Study Planner

Esta guia usa:

- GitHub para el repositorio.
- Neon para PostgreSQL.
- Render para publicar la app Node/Express.

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

## 3. Crear Web Service en Render

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
```

6. Crear el servicio.

Render va a instalar dependencias, iniciar Express y publicar una URL.

## 4. Probar la demo

1. Abrir la URL publica de Render.
2. Crear una cuenta desde la app.
3. Cargar una tarea.
4. Refrescar la pagina.
5. Iniciar sesion y verificar que la tarea siga guardada.

## 5. Link para entregar

Entregar:

- URL publica de Render.
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
