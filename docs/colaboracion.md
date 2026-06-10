# Guia de colaboracion

El proyecto debe mostrar aportes de los 4 integrantes mediante ramas y pull requests.

## Ramas sugeridas

Cada integrante trabaja en una rama propia:

```text
main
feature/frontend-ui
feature/backend-api
feature/database-auth
feature/docs-deploy
```

Distribucion recomendada:

- Integrante 1: `feature/frontend-ui`
  - Ajustes de interfaz.
  - Formularios.
  - Agenda y filtros.

- Integrante 2: `feature/backend-api`
  - Rutas Express.
  - CRUD de tareas.
  - Validaciones de API.

- Integrante 3: `feature/database-auth`
  - Esquema PostgreSQL.
  - Registro/login.
  - JWT y seguridad por usuario.

- Integrante 4: `feature/docs-deploy`
  - README.
  - Informe tecnico.
  - Render, Neon, CI y agente autonomo.

## Flujo de trabajo

1. Actualizar `main`.

```bash
git checkout main
git pull origin main
```

2. Crear rama propia.

```bash
git checkout -b feature/nombre-de-la-rama
```

3. Hacer cambios y commits.

```bash
git add .
git commit -m "Descripcion clara del aporte"
```

4. Subir la rama.

```bash
git push -u origin feature/nombre-de-la-rama
```

5. Crear Pull Request hacia `main`.

6. Otro integrante revisa y aprueba el Pull Request.

7. Mergear a `main`.

