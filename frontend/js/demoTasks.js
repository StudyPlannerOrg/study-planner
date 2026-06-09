import { todayOffset } from "./dates.js";

export const demoTasks = [
  {
    id: crypto.randomUUID(),
    title: "TP Integrador con IA",
    subject: "Gestion de Desarrollo de Software",
    type: "Trabajo practico",
    dueDate: todayOffset(2),
    hours: 8,
    notes: "Completar aplicacion web, README, informe tecnico y despliegue online.",
    difficulty: "Alta",
    status: "En progreso",
  },
  {
    id: crypto.randomUUID(),
    title: "Resumen de patrones",
    subject: "Arquitectura de Software",
    type: "Lectura",
    dueDate: todayOffset(5),
    hours: 3,
    notes: "Preparar resumen de patrones MVC, capas y repositorio para la clase.",
    difficulty: "Media",
    status: "Pendiente",
  },
  {
    id: crypto.randomUUID(),
    title: "Parcial SQL",
    subject: "Base de Datos",
    type: "Parcial",
    dueDate: todayOffset(1),
    hours: 6,
    notes: "Practicar joins, subconsultas, normalizacion y consultas agrupadas.",
    difficulty: "Alta",
    status: "Pendiente",
  },
];
