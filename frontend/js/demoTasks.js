import { todayOffset } from "./dates.js";

export const demoTasks = [
  {
    id: crypto.randomUUID(),
    title: "TP Integrador con IA",
    subject: "",
    type: "Trabajo practico",
    dueDate: todayOffset(2),
    hours: 8,
    notes: "Completar aplicacion web, README, informe tecnico y despliegue online.",
    checklist: [
      { id: crypto.randomUUID(), text: "Revisar consigna", done: true },
      { id: crypto.randomUUID(), text: "Validar backend y base", done: true },
      { id: crypto.randomUUID(), text: "Probar deploy", done: false },
    ],
    difficulty: "Alta",
    status: "En progreso",
  },
  {
    id: crypto.randomUUID(),
    title: "Resumen de teorias del aprendizaje",
    subject: "",
    type: "Lectura",
    dueDate: todayOffset(5),
    hours: null,
    notes: "",
    checklist: [
      { id: crypto.randomUUID(), text: "Leer bibliografia base", done: false },
      { id: crypto.randomUUID(), text: "Armar cuadro comparativo", done: false },
    ],
    difficulty: "Media",
    status: "Pendiente",
  },
  {
    id: crypto.randomUUID(),
    title: "Parcial SQL",
    subject: "",
    type: "Parcial",
    dueDate: todayOffset(1),
    hours: 6,
    notes: "Practicar joins, subconsultas, normalizacion y consultas agrupadas.",
    checklist: [
      { id: crypto.randomUUID(), text: "Resolver 10 consultas", done: false },
      { id: crypto.randomUUID(), text: "Repasar normalizacion", done: false },
    ],
    difficulty: "Alta",
    status: "Pendiente",
  },
];
