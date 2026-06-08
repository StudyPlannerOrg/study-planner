# Informe tecnico - Study Planner

## Proyecto

Study Planner es una aplicacion full stack para organizar tareas academicas. El sistema permite registrar usuarios, iniciar sesion, guardar tareas en PostgreSQL, consultar una agenda, filtrar informacion y priorizar el estudio mediante un asistente inteligente basado en reglas explicables.

## Herramientas de IA utilizadas

- Codex / ChatGPT: analisis de consigna, ideacion del proyecto, definicion del alcance, generacion del prototipo, revision de documentacion y armado de checklist.
- Prompts usados:
  - "Lee y analiza el PDF de esta carpeta para pensar que hacer y hacer el integrador".
  - "Dame ideas de proyectos viables para el integrador".
  - "Como seria con el gestor de tareas?".
  - "Que se llame Study Planner o algo asi".
  - "Necesito frontend + backend Node/Express + PostgreSQL".

## Como ayudo la IA

La IA ayudo a transformar una consigna amplia en una propuesta concreta y defendible: una herramienta para estudiantes que ordena tareas segun urgencia academica.

El proyecto evoluciono desde una app estatica hacia una arquitectura full stack con frontend, API REST propia, autenticacion y base PostgreSQL.

Tambien colaboro en la generacion de una interfaz responsive, la definicion de datos demo, la logica de persistencia local, el backend Express, el esquema de base de datos y el asistente de priorizacion.

Ademas, se incorporo un agente autonomo de revision del repositorio. Este agente se ejecuta en GitHub Actions y genera un informe automatico con controles sobre documentacion, archivos obligatorios, backend, base de datos y coherencia del asistente.

## Arquitectura

El sistema se divide en:

- Frontend: HTML, CSS y JavaScript vanilla.
- Backend: Node.js con Express.
- Base de datos: PostgreSQL.
- Autenticacion: JWT con password hasheado mediante bcryptjs.
- Persistencia alternativa: `localStorage` si el backend no esta disponible.
- Despliegue: Render para la aplicacion y Neon para PostgreSQL.
- Contenedores: Docker y Docker Compose como alternativa local.

## Trabajo colaborativo

El equipo trabaja con ramas por integrante para que el historial de GitHub muestre aportes individuales. La estrategia propuesta es:

- `feature/frontend-ui`: interfaz, formularios, agenda y filtros.
- `feature/backend-api`: rutas Express y CRUD de tareas.
- `feature/database-auth`: esquema PostgreSQL, login, JWT y seguridad.
- `feature/docs-deploy`: README, informe, CI, agente autonomo y despliegue.

Cada rama debe integrarse a `main` mediante Pull Request. Esto permite mostrar commits, revisiones y merges de cada integrante.

## Integracion de inteligencia

El asistente analiza cada tarea activa y calcula un puntaje de prioridad de 0 a 100. Para eso considera:

- Dias restantes hasta la fecha limite.
- Dificultad declarada por el usuario.
- Tipo de tarea: parcial, final, trabajo practico, lectura o exposicion.
- Horas estimadas de trabajo.
- Estado actual de avance.

La decision es explicable: cada recomendacion informa por que conviene priorizar una tarea o dejarla para despues.

## Backend, persistencia y despliegue

El backend expone una API REST:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`

La base PostgreSQL tiene dos tablas:

- `users`: usuarios registrados con password hasheado.
- `tasks`: tareas asociadas a cada usuario.

Cada consulta de tareas se filtra por el usuario autenticado, evitando que un usuario acceda a datos de otro.

Para el despliegue se usa Render como Web Service Node.js. La base PostgreSQL se aloja en Neon y se conecta al backend mediante la variable de entorno `DATABASE_URL`.

Como alternativa de ejecucion local, se agrego Docker Compose con dos servicios: uno para la app Node/Express y otro para PostgreSQL.

## Agente autonomo del repositorio

El archivo `scripts/repo-agent.js` implementa un agente de calidad que colabora con el proyecto sin intervencion manual. En cada push o pull request, el workflow `Autonomous Agent Review` ejecuta el agente y sube un informe como artefacto.

Este agente cumple una funcion autonoma y verificable: revisar que la entrega mantenga los elementos pedidos por la consigna, incluyendo backend, base de datos, documentacion y asistente de priorizacion.

## Desafios encontrados

- Definir un alcance realista para dos semanas de desarrollo.
- Pasar de app estatica a arquitectura full stack sin perder simplicidad.
- Evitar guardar passwords en texto plano.
- Mantener separadas las tareas por usuario.
- Documentar claramente el uso de IA sin exagerar capacidades.
- Sumar backend sin romper la posibilidad de usar la app en modo local.

## Lecciones aprendidas

- La IA es especialmente util para convertir una consigna abierta en tareas concretas.
- Conviene pedir soluciones desplegables y verificables, no solo ideas.
- Los modelos aceleran la implementacion, pero requieren supervision para mantener coherencia, seguridad y claridad.
- JWT y hashing de passwords son necesarios cuando se implementa autenticacion propia.
- Una app pequena, terminada y documentada suele ser mejor entrega que una arquitectura grande incompleta.

## Posibles mejoras

- Agregar refresh tokens.
- Agregar recuperacion de password.
- Exportar la agenda a CSV.
- Agregar calendario mensual.
- Incorporar recordatorios por email.
- Reemplazar el asistente basado en reglas por un modelo LLM con clave configurable.
