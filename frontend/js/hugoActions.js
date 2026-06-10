export function createHugoActionHandler(deps) {
  return function executeHugoAction(message, tasks) {
    const normalized = normalizeChatText(message);

    if (includesAny(normalized, ["crear tarea", "nueva tarea", "agregar tarea", "cargar tarea", "crear una tarea", "agregar una tarea"])) {
      deps.form.reset();
      deps.form.dueDate.value = deps.todayOffset(1);
      deps.renderChecklistEditor(deps.taskChecklist, []);
      deps.setView("task");
      return { reply: "Te abri el formulario de nueva tarea. Completa titulo, fecha limite, tipo y dificultad; despues toca Crear tarea." };
    }

    if (includesAny(normalized, ["ver agenda", "abrir agenda", "ir a agenda", "agenda completa"])) {
      deps.setView("agenda");
      return { reply: "Te abri la agenda completa. Desde ahi podes buscar, filtrar y abrir cualquier tarea para editarla." };
    }

    if (includesAny(normalized, ["ir al inicio", "ver inicio", "abrir inicio", "dashboard", "panel"])) {
      deps.setView("dashboard");
      return { reply: "Te lleve al panel principal. Ahi ves metricas, foco proximo, calendario y acciones rapidas." };
    }

    if (includesAny(normalized, ["editar", "modificar", "cambiar", "eliminar", "borrar"])) {
      const task = findTaskMention(message, tasks);
      if (task) {
        deps.openTaskDetail(task.id);
        const deleteIntent = includesAny(normalized, ["eliminar", "borrar"]);
        return {
          reply: deleteIntent
            ? `Te abri "${task.title}". Para eliminarla, toca el boton Eliminar y confirma la accion.`
            : `Te abri "${task.title}" para editarla. Cambia los datos que necesites y toca Guardar tarea.`,
        };
      }

      deps.setView("agenda");
      return {
        reply:
          "Te abri la agenda para que elijas la tarea. Entra a una tarjeta para editarla; si queres eliminarla, usa el boton Eliminar dentro de esa tarea.",
      };
    }

    return null;
  };
}

function findTaskMention(message, tasks) {
  const normalized = normalizeChatText(message);
  return tasks.find((task) => {
    const title = normalizeChatText(task.title || "");
    return title && normalized.includes(title);
  });
}

function includesAny(text, options) {
  return options.some((option) => text.includes(option));
}

function normalizeChatText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
