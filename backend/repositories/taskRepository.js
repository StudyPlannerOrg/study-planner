const crypto = require("node:crypto");
const { pool } = require("../db");

const TASK_COLUMNS = "id, title, type, due_date, due_time, hours, notes, checklist, difficulty, status";

async function listTasksByUser(userId) {
  const result = await pool.query(
    `select ${TASK_COLUMNS}
     from tasks
     where user_id = $1
     order by due_date asc, created_at asc`,
    [userId]
  );
  return result.rows;
}

async function findTaskByUser(taskId, userId) {
  const result = await pool.query(
    `select ${TASK_COLUMNS}
     from tasks
     where id = $1 and user_id = $2`,
    [taskId, userId]
  );
  return result.rows[0] || null;
}

async function createTask(userId, task) {
  const id = crypto.randomUUID();
  const result = await pool.query(
    `insert into tasks (id, user_id, title, type, due_date, due_time, hours, notes, checklist, difficulty, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     returning ${TASK_COLUMNS}`,
    toTaskValues(id, userId, task)
  );
  return result.rows[0];
}

async function updateTask(taskId, userId, normalizedTask, changedKeys) {
  const fields = [];
  const values = [];

  changedKeys.forEach((key) => {
    const column = toColumnName(key);
    values.push(key === "checklist" ? JSON.stringify(normalizedTask[key]) : normalizedTask[key]);
    fields.push(`${column} = $${values.length}`);
  });

  values.push(taskId, userId);
  const result = await pool.query(
    `update tasks set ${fields.join(", ")}
     where id = $${values.length - 1} and user_id = $${values.length}
     returning ${TASK_COLUMNS}`,
    values
  );

  return result.rows[0] || null;
}

async function deleteTask(taskId, userId) {
  const result = await pool.query("delete from tasks where id = $1 and user_id = $2", [taskId, userId]);
  return result.rowCount > 0;
}

async function replaceDemoTasks(userId, tasks) {
  await pool.query("delete from tasks where user_id = $1", [userId]);
  for (const task of tasks) {
    await pool.query(
      `insert into tasks (id, user_id, title, type, due_date, due_time, hours, notes, checklist, difficulty, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      toTaskValues(crypto.randomUUID(), userId, task)
    );
  }
}

async function listDueReminderRows() {
  const result = await pool.query(
    `select tasks.id, tasks.title, tasks.type, tasks.due_date, tasks.due_time, tasks.hours,
            tasks.notes, tasks.checklist, tasks.difficulty, tasks.status, users.email
     from tasks
     join users on users.id = tasks.user_id
     where tasks.status <> 'Terminada'
       and tasks.due_date between current_date and current_date + interval '1 day'
     order by tasks.due_date asc, tasks.difficulty desc, tasks.created_at asc`
  );
  return result.rows;
}

function toTaskValues(id, userId, task) {
  return [id, userId, task.title, task.type, task.dueDate, task.dueTime, task.hours, task.notes, JSON.stringify(task.checklist), task.difficulty, task.status];
}

function toColumnName(key) {
  if (key === "dueDate") return "due_date";
  if (key === "dueTime") return "due_time";
  return key;
}

module.exports = {
  createTask,
  deleteTask,
  findTaskByUser,
  listDueReminderRows,
  listTasksByUser,
  replaceDemoTasks,
  updateTask,
};
