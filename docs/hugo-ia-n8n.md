# Hugo con IA usando n8n

Hugo ya responde dentro del frontend con reglas locales. Para sumar IA real sin exponer claves en el navegador, el flujo recomendado es:

1. El usuario escribe en Hugo.
2. El frontend llama a `POST /api/hugo/chat`.
3. El backend agrega usuario y tareas actuales.
4. El backend llama a un webhook de n8n.
5. n8n usa un modelo de IA y devuelve una respuesta corta.
6. Si n8n falla o no esta configurado, Hugo usa su respuesta local.

## Variables

Agregar en `.env`:

```env
HUGO_N8N_WEBHOOK_URL=https://tu-n8n/webhook/hugo-study-planner
HUGO_N8N_SECRET=un-secreto-compartido
```

`HUGO_N8N_SECRET` se envia como header `x-hugo-secret`. En n8n conviene validarlo antes de llamar al modelo.

## Payload que recibe n8n

```json
{
  "message": "Predecime mi riesgo",
  "user": {
    "id": "uuid",
    "email": "alumno@email.com"
  },
  "tasks": [
    {
      "title": "TP Integrador",
      "type": "Trabajo practico",
      "dueDate": "2026-06-12",
      "dueTime": "20:00",
      "difficulty": "Alta",
      "status": "Pendiente",
      "notes": "Pendiente defensa",
      "checklist": [
        { "text": "Completar informe", "done": false }
      ]
    }
  ]
}
```

## Respuesta esperada

n8n puede devolver cualquiera de estas formas:

```json
{ "reply": "Tu mayor riesgo es el TP Integrador porque vence pronto y tiene bajo avance." }
```

Tambien se aceptan `message`, `text` u `output`.

## Prompt sugerido para el nodo de IA

```text
Sos Hugo, asistente academico de Study Planner. Responde en espanol rioplatense, breve y accionable.
Usa solamente las tareas recibidas. Si haces una prediccion, explicala como estimacion basada en vencimiento, dificultad, estado y subtareas, no como certeza.
No inventes fechas ni materias. Devuelve maximo 4 oraciones.

Pregunta del usuario: {{$json.message}}
Tareas: {{JSON.stringify($json.tasks)}}
```

