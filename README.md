<div align="center">
  <img src="frontend/assets/hugo-mascot.png" alt="Hugo, asistente virtual de Study Planner" width="130" />

  <h1>Study Planner</h1>
  <p><strong>Organiza tus entregas, parciales y pendientes en un plan claro.</strong></p>

  <p>
    <a href="https://study-planner-05jn.onrender.com/">Abrir la app online</a>
  </p>
</div>

## Menu

- [Descripcion](#descripcion)
- [Funcionalidades](#funcionalidades)
- [Como se usa la app](#como-se-usa-la-app)
- [Tecnologias e IA utilizadas](#tecnologias-e-ia-utilizadas)
- [Guia rapida para poner en marcha el proyecto](#guia-rapida-para-poner-en-marcha-el-proyecto)
- [Scripts utiles](#scripts-utiles)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Bonus: agente autonomo](#bonus-agente-autonomo)
- [Documentacion adicional](#documentacion-adicional)

## Descripcion

Study Planner es una aplicacion web creada para estudiantes que necesitan ordenar materias, entregas, parciales, finales y trabajos practicos sin perder tiempo decidiendo por donde empezar.

La app funciona como una agenda academica inteligente: permite cargar tareas, marcar avances, dividir actividades en subtareas, ver un calendario completo y recibir ayuda de Hugo, el asistente virtual del proyecto. Hugo orienta al usuario con recomendaciones simples sobre prioridades, vencimientos, progreso y riesgo academico.

La idea principal es que el estudiante pueda entrar a la app y responder rapidamente tres preguntas:

- Que tengo pendiente?
- Que vence primero?
- Que deberia hacer ahora?

## Funcionalidades

- Crear una cuenta e ingresar para tener una agenda personal.
- Cargar tareas academicas con titulo, fecha limite, hora, tipo, dificultad y descripcion.
- Agregar subtareas para dividir trabajos grandes en pasos mas faciles.
- Ver un inicio con resumen de tareas activas, urgentes, pendientes y vencimientos cercanos.
- Consultar un calendario completo para ubicar entregas por fecha.
- Filtrar tareas por texto, estado, dificultad, fecha, prioridad y progreso.
- Ordenar la lista para encontrar mas rapido lo importante.
- Marcar una tarea como pendiente, en progreso o terminada.
- Editar o eliminar tareas cuando cambian las fechas o prioridades.
- Recibir notificaciones internas sobre entregas importantes.
- Usar a Hugo para preguntar que conviene hacer primero, que vence esta semana o como va el avance.
- Usar la app en modo local si el backend no esta disponible.

## Como se usa la app

1. Entrar a la app desde el link online o ejecutarla localmente.
2. Crear una cuenta con nombre, email y password.
3. Ir a "Nueva tarea" y cargar una actividad academica.
4. Completar fecha limite, dificultad, tipo de tarea y subtareas si corresponde.
5. Revisar el inicio para ver prioridades y proximos vencimientos.
6. Abrir la agenda para ver el calendario y el listado completo.
7. Usar filtros cuando haya muchas tareas cargadas.
8. Cambiar el estado de cada tarea a medida que se avanza.
9. Consultar a Hugo si se necesita una recomendacion rapida.

## Tecnologias e IA utilizadas

<p>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111111" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/n8n-EA4B71?style=for-the-badge&logo=n8n&logoColor=white" alt="n8n" />
  <img src="https://img.shields.io/badge/Render-000000?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
  <img src="https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=neon&logoColor=111111" alt="Neon" />
  <img src="https://img.shields.io/badge/ChatGPT%20%2F%20Codex-412991?style=for-the-badge&logo=openai&logoColor=white" alt="ChatGPT Codex" />
</p>

La IA se uso como apoyo durante el desarrollo para analizar la consigna, planificar el alcance, programar partes del frontend y backend, depurar errores, mejorar la interfaz y preparar la documentacion final.

Herramientas de IA y automatizacion usadas:

- ChatGPT / Codex: apoyo principal para programacion, revision y documentacion.
- Hugo: asistente virtual propio dentro de Study Planner.
- n8n: automatizacion de recordatorios y puente para conectar Hugo con flujos de IA.

El detalle completo esta en [`docs/informe-tecnico.md`](docs/informe-tecnico.md).

## Guia rapida para poner en marcha el proyecto

### Opcion recomendada: Docker

Esta opcion levanta la app, la base de datos y n8n con un solo comando:

```bash
docker compose up --build
```

Luego abrir:

```text
http://localhost:3001
```

n8n local:

```text
http://localhost:5679
```

### Opcion local con Node.js

1. Instalar dependencias:

```bash
npm install
```

2. Crear un archivo `.env` usando `.env.example` como base:

```env
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/study_planner
JWT_SECRET=cambia-este-secreto-en-produccion
N8N_SHARED_SECRET=
HUGO_N8N_WEBHOOK_URL=
HUGO_N8N_SECRET=
```

3. Verificar variables:

```bash
npm run check:env
```

4. Ejecutar:

```bash
npm start
```

5. Abrir:

```text
http://localhost:3000
```

## Scripts utiles

```bash
npm run check
```

Valida sintaxis de backend, frontend y scripts.

```bash
npm run check:env
```

Revisa que las variables de entorno esten configuradas.

```bash
npm run agent
```

Ejecuta la revision automatica del repositorio.

## Estructura del proyecto

```text
.                                      # Carpeta raiz del proyecto
|-- backend/                           # Servidor, API, autenticacion y logica del backend
|   |-- constants/                     # Opciones fijas usadas por las tareas
|   |-- middleware/                    # Validacion de token y manejo de errores
|   |-- repositories/                  # Consultas a PostgreSQL
|   |-- routes/                        # Endpoints de auth, tareas y Hugo
|   |-- services/                      # Reglas de negocio y prioridad
|   |-- utils/                         # Helpers, validaciones y mapeos
|   |-- config.js                      # Lectura centralizada de variables de entorno
|   |-- db.js                          # Conexion e inicializacion de PostgreSQL
|   `-- server.js                      # Entrada principal del backend Express
|-- db/
|   `-- schema.sql                     # Tablas y migraciones simples de la base
|-- docs/                              # Documentacion complementaria del proyecto
|   |-- colaboracion.md                # Guia de ramas y trabajo en equipo
|   |-- deploy.md                      # Guia de publicacion en Render y Neon
|   |-- hugo-ia-n8n.md                 # Integracion de Hugo con n8n e IA
|   `-- informe-tecnico.md             # Bitacora tecnica de la entrega
|-- frontend/                          # Interfaz web de Study Planner
|   |-- assets/                        # Imagenes y recursos visuales
|   |-- css/                           # Estilos separados por pantalla y responsive
|   |-- js/                            # Modulos reutilizables del frontend
|   |   |-- agenda.js                  # Filtros, ordenamiento y paginacion de agenda
|   |   |-- api.js                     # Comunicacion con el backend
|   |   |-- calendar.js                # Render de calendario resumido y completo
|   |   |-- chatHistory.js             # Persistencia del historial de Hugo
|   |   |-- chatbot.js                 # Respuestas locales de Hugo
|   |   |-- checklist.js               # Subtareas y editor de checklist
|   |   |-- config.js                  # Claves usadas en localStorage
|   |   |-- dashboard.js               # Metricas y panel de prioridad del inicio
|   |   |-- dates.js                   # Formato y normalizacion de fechas
|   |   |-- demoTasks.js               # Tareas demo para modo local
|   |   |-- helpers.js                 # Utilidades generales
|   |   |-- hugoActions.js             # Acciones locales que Hugo puede ejecutar
|   |   |-- modals.js                  # Contenido de modales de calendario y metricas
|   |   |-- notifications.js           # Avisos internos de estudio
|   |   |-- priority.js                # Calculo de prioridad academica
|   |   |-- storage.js                 # Persistencia local
|   |   |-- taskCards.js               # Render de tarjetas de tareas
|   |   `-- taskUtils.js               # Utilidades comunes de tareas
|   |-- app.js                         # Coordinador principal de eventos y estado
|   |-- index.html                     # Estructura visual de la aplicacion
|   `-- styles.css                     # Archivo que importa todos los estilos
|-- n8n/
|   `-- workflows/                     # Workflows listos para importar
|       |-- local/                     # Automatizaciones para Docker local
|       `-- online/                    # Automatizaciones para entorno publicado
|-- scripts/
|   |-- check-env.js                   # Verifica variables de entorno
|   `-- repo-agent.js                  # Agente autonomo de revision
|-- Dockerfile                         # Imagen de la app
|-- docker-compose.yml                 # App + PostgreSQL + n8n en local
|-- package.json                       # Dependencias y scripts npm
|-- render.yaml                        # Configuracion sugerida para Render
`-- README.md                          # Presentacion principal del proyecto
```

## Bonus: agente autonomo

El proyecto incluye un pequeno agente de revision pensado como una ayuda extra para la entrega. No modifica la app ni reemplaza una revision humana: simplemente revisa que el repositorio tenga los elementos importantes antes de presentar.

Cuando se ejecuta, controla puntos como:

- que exista README e informe tecnico;
- que se mencione el uso de IA;
- que haya backend, base de datos y frontend;
- que Docker y n8n esten documentados;
- que la app mantenga el enfoque academico.

Para usarlo:

```bash
npm run agent
```

Si todo esta correcto, muestra un resumen con los controles aprobados.

## Documentacion adicional

- Informe tecnico: [`docs/informe-tecnico.md`](docs/informe-tecnico.md)
- Guia de deploy: [`docs/deploy.md`](docs/deploy.md)
- Integracion Hugo + n8n: [`docs/hugo-ia-n8n.md`](docs/hugo-ia-n8n.md)
- Guia de trabajo colaborativo: [`docs/colaboracion.md`](docs/colaboracion.md)
