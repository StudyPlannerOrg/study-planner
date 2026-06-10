# Informe tecnico - Study Planner

## 1. Introduccion

Study Planner es una aplicacion full stack desarrollada como trabajo integrador para resolver un problema cotidiano de estudiantes: organizar tareas academicas, entregas, parciales y finales en una agenda clara, priorizada y facil de consultar.

La idea central fue construir una herramienta util, no solamente una lista de tareas. Por eso el sistema incorpora calendario, filtros, estados, subtareas, progreso, notificaciones y un asistente virtual llamado Hugo, que ayuda a decidir que actividad conviene atender primero.

## 2. Herramientas utilizadas

### Herramientas de desarrollo

- Visual Studio Code / entorno local de desarrollo.
- Git y GitHub para versionado, ramas y publicacion del repositorio.
- Node.js y npm para ejecutar el backend y validar el proyecto.
- Docker y Docker Compose para levantar app, PostgreSQL y n8n de forma local.
- PostgreSQL como base de datos relacional.
- Render y Neon como alternativa de despliegue online.
- n8n para automatizar recordatorios y preparar integraciones con IA.

### Herramientas de IA

- ChatGPT / Codex: apoyo principal durante el desarrollo.
- Hugo: asistente virtual propio de Study Planner, integrado dentro de la app.
- n8n: usado como puente para automatizaciones y para conectar Hugo con un flujo de IA mediante webhook.

Durante el proceso, la IA se uso para analizar la consigna, planificar el alcance, proponer arquitectura, generar codigo, revisar errores, mejorar pantallas y escribir documentacion.

## 3. Descripcion tecnica del sistema

Study Planner se organiza en tres grandes partes:

- Frontend: interfaz web construida con HTML, CSS y JavaScript vanilla.
- Backend: API REST desarrollada con Node.js y Express.
- Base de datos: PostgreSQL para guardar usuarios y tareas.

El usuario puede registrarse, iniciar sesion, crear tareas, agregar subtareas, filtrar la agenda, cambiar estados, eliminar actividades y consultar recomendaciones. Cada usuario ve solamente sus propias tareas gracias a la autenticacion con JWT.

La app tambien conserva un modo local con `localStorage` para que la experiencia no quede completamente bloqueada si el backend no esta disponible.

## 4. Arquitectura y componentes

### Frontend

El frontend esta dividido en archivos especificos para mantener orden:

- `frontend/index.html`: estructura principal de la app.
- `frontend/styles.css`: entrada de estilos.
- `frontend/css/`: estilos separados por base, landing, auth, app y responsive.
- `frontend/app.js`: coordinacion principal de la interfaz.
- `frontend/js/`: modulos de API, chatbot, calendario, fechas, storage, checklist, prioridad y utilidades.

La interfaz incluye:

- Landing page de presentacion.
- Registro e inicio de sesion.
- Inicio con metricas y prioridades.
- Nueva tarea.
- Agenda con calendario completo, filtros y paginacion.
- Detalle y edicion de tareas.
- Asistente flotante Hugo.

### Backend

El backend usa Express y separa responsabilidades:

- `backend/routes/`: rutas HTTP.
- `backend/services/`: reglas de negocio.
- `backend/repositories/`: consultas SQL.
- `backend/middleware/`: autenticacion y manejo de errores.
- `backend/utils/`: validaciones, mapeos y helpers.

Esto evita que toda la logica quede mezclada en un solo archivo y facilita mantener el proyecto.

### Base de datos

El esquema principal esta en `db/schema.sql`.

Tablas principales:

- `users`: guarda id, nombre, email, password hasheado y fecha de creacion.
- `tasks`: guarda tareas academicas asociadas a un usuario.

Cada tarea contiene titulo, tipo, fecha limite, hora opcional, descripcion, subtareas, dificultad y estado.

## 5. Sinergia con la IA

La IA ayudo principalmente en cinco momentos del proyecto.

### 5.1 Interpretacion de la consigna

La consigna era amplia y permitia varias soluciones. La IA ayudo a convertir esa consigna en un producto concreto: una agenda academica inteligente para estudiantes.

En lugar de hacer una app generica de tareas, se definio un enfoque academico:

- parciales;
- finales;
- trabajos practicos;
- lecturas;
- exposiciones;
- prioridades segun fecha, dificultad y progreso.

### 5.2 Diseno de arquitectura

La IA ayudo a separar el proyecto en frontend, backend, base de datos, documentacion, Docker y automatizaciones. Tambien sugirio una estructura con servicios y repositorios para no dejar toda la logica en las rutas Express.

Esta decision hizo que el proyecto quedara mas prolijo y defendible tecnicamente.

### 5.3 Programacion

La IA colaboro en:

- crear formularios y vistas del frontend;
- modularizar JavaScript;
- implementar autenticacion con JWT;
- conectar PostgreSQL;
- construir el CRUD de tareas;
- agregar filtros, paginacion y calendario;
- implementar el asistente Hugo;
- preparar workflows de n8n;
- mejorar estilos y responsive.

El codigo generado siempre requirio revision y ajustes, especialmente en detalles visuales, nombres de campos, validaciones y comportamiento de la interfaz.

### 5.4 Depuracion

La IA fue util para revisar errores de sintaxis, problemas de integracion y diferencias entre modo local, Docker y backend publicado. Tambien ayudo a detectar casos donde una solucion funcionaba en frontend pero necesitaba soporte real en backend o base de datos.

Ejemplos:

- agregar `name` al registro de usuario y al esquema SQL;
- mantener compatibilidad con usuarios existentes;
- validar que los filtros de agenda no rompieran el ordenamiento;
- evitar que la paginacion mostrara tareas fuera de pagina;
- revisar que `npm run check` siguiera pasando.

### 5.5 Testing y validacion

La IA ayudo a definir una validacion minima pero importante:

- ejecutar `npm run check`;
- revisar rutas principales;
- confirmar que los textos pedidos aparezcan o desaparezcan;
- verificar que el README y el informe mencionen IA, tecnologia y puesta en marcha;
- mantener un agente de revision en `scripts/repo-agent.js`.

## 6. Integracion de Hugo e IA

Hugo es el asistente virtual de Study Planner. En el frontend responde consultas sobre:

- que tarea hacer primero;
- que vence esta semana;
- como va el progreso;
- que tarea tiene mas riesgo;
- como crear o buscar tareas.

Hugo tiene una respuesta local basada en reglas, para que funcione sin depender de servicios externos. Ademas, el backend incluye `POST /api/hugo/chat`, que permite enviar el mensaje y las tareas actuales a un webhook de n8n. De esta forma, el proyecto queda preparado para conectar un modelo de IA sin exponer claves en el navegador.

## 7. Automatizaciones con n8n

n8n se uso como herramienta de automatizacion. El proyecto incluye workflows para:

- consultar tareas que vencen pronto;
- preparar recordatorios por email;
- conectar Hugo con un flujo externo mediante webhook.

Esto suma valor porque la app no queda limitada a una pantalla: tambien puede avisar al usuario cuando una entrega esta cerca.

## 8. Lecciones Aprendidas

### 8.1 La IA acelera, pero no reemplaza la revision

La IA puede generar codigo rapido, pero no siempre entiende todos los detalles del proyecto. Fue necesario revisar nombres, rutas, estilos, validaciones y compatibilidad con la base de datos.

### 8.2 Pedir cambios concretos da mejores resultados

Los mejores avances aparecieron cuando las instrucciones fueron especificas: que texto cambiar, que vista modificar, como ordenar una tarjeta o que filtros agregar.

### 8.3 La arquitectura importa aunque el proyecto sea chico

Separar rutas, servicios, repositorios y utilidades hizo que el backend fuera mas claro. En el frontend, separar modulos tambien ayudo a mantener el crecimiento de la app.

### 8.4 Docker reduce problemas de entorno

El proyecto usa PostgreSQL y n8n, por lo que Docker Compose simplifica mucho la ejecucion local. Sin Docker, cada integrante tendria que instalar y configurar varias herramientas.

### 8.5 Documentar tambien es parte del desarrollo

El README y este informe no son accesorios: explican como ejecutar, que tecnologias se usaron y como intervino la IA. Para una entrega academica, esa claridad es tan importante como el codigo.

## 9. Desafios encontrados

- Definir un alcance posible sin hacer una app demasiado grande.
- Mantener la interfaz simple aunque tenga calendario, filtros, metricas y asistente.
- Integrar autenticacion, base de datos y modo local sin romper la experiencia.
- Lograr que Hugo sea util sin depender obligatoriamente de una API externa.
- Ordenar el trabajo en ramas y commits claros.
- Evitar que la IA genere cambios desconectados del estilo visual existente.
- Escribir documentacion clara, honesta y presentable.

## 10. Resultado final

El resultado es una aplicacion full stack funcional, con identidad propia, backend real, base de datos, Docker, automatizaciones y documentacion. Study Planner no solo permite cargar tareas: ayuda a decidir que estudiar primero y muestra el estado academico de forma clara.

El proyecto queda preparado para presentarse, ejecutarse localmente y evolucionar con mejoras futuras.

## 11. Posibles mejoras futuras

- Recuperacion de password.
- Exportacion de tareas a CSV o PDF.
- Notificaciones push reales.
- Integracion final con un modelo LLM desde n8n.
- Roles de usuario.
- Estadisticas semanales de rendimiento.
- Sincronizacion con Google Calendar.

## 12. Comandos de validacion usados

```bash
npm run check
```

Este comando revisa sintaxis de backend, frontend y scripts. Fue usado como validacion principal antes de cerrar cambios.
