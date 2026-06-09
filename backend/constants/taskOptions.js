const TASK_TYPES = ["Trabajo practico", "Parcial", "Final", "Lectura", "Exposicion"];
const TASK_DIFFICULTIES = ["Baja", "Media", "Alta"];
const TASK_STATUSES = ["Pendiente", "En progreso", "Terminada"];

const DIFFICULTY_POINTS = {
  Alta: 24,
  Media: 14,
  Baja: 6,
};

const TYPE_POINTS = {
  Final: 24,
  Parcial: 22,
  "Trabajo practico": 16,
  Exposicion: 14,
  Lectura: 8,
};

module.exports = {
  DIFFICULTY_POINTS,
  TASK_DIFFICULTIES,
  TASK_STATUSES,
  TASK_TYPES,
  TYPE_POINTS,
};
