
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";
import * as fs from "fs";

const client = new Anthropic();

// Data storage
const DATA_FILE = "habits_data.json";

interface HabitEntry {
  date: string;
  habit: string;
  completed: boolean;
  notes?: string;
}

interface HabitsData {
  habits: string[];
  entries: HabitEntry[];
}

// Initialize or load data
function loadData(): HabitsData {
  if (fs.existsSync(DATA_FILE)) {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
  }
  return { habits: [], entries: [] };
}

function saveData(data: HabitsData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Habit tracking functions
function addHabit(data: HabitsData, habitName: string): void {
  if (!data.habits.includes(habitName)) {
    data.habits.push(habitName);
    saveData(data);
    console.log(`✓ Hábito "${habitName}" agregado exitosamente.`);
  } else {
    console.log(`El hábito "${habitName}" ya existe.`);
  }
}

function recordHabit(
  data: HabitsData,
  habitName: string,
  completed: boolean,
  notes?: string
): void {
  if (!data.habits.includes(habitName)) {
    console.log(`El hábito "${habitName}" no existe. Primero agrega el hábito.`);
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const entry: HabitEntry = {
    date: today,
    habit: habitName,
    completed,
    notes,
  };

  data.entries.push(entry);
  saveData(data);
  const status = completed ? "completado" : "no completado";
  console.log(`✓ ${habitName} registrado como ${status} para ${today}`);
}

function getStatistics(data: HabitsData): string {
  if (data.habits.length === 0) {
    return "No hay hábitos registrados.";
  }

  let stats = "📊 ESTADÍSTICAS DE HÁBITOS:\n\n";

  for (const habit of data.habits) {
    const habitEntries = data.entries.filter((e) => e.habit === habit);
    const completed = habitEntries.filter((e) => e.completed).length;
    const total = habitEntries.length;
    const percentage = total > 0 ? ((completed / total) * 100).toFixed(1) : "0";

    const last7Days = habitEntries.filter((e) => {
      const entryDate = new Date(e.date);
      const today = new Date();
      const diffTime = today.getTime() - entryDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    });

    const last7Completed = last7Days.filter((e) => e.completed).length;

    stats += `${habit}:\n`;
    stats += `  Total: ${completed}/${total} (${percentage}%)\n`;
    stats += `  Últimos 7 días: ${last7Completed}/${last7Days.length}\n\n`;
  }

  return stats;
}

function getRecentHistory(data: HabitsData, days: number = 7): string {
  if (data.entries.length === 0) {
    return "No hay registros.";
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentEntries = data.entries.filter(
    (e) => new Date(e.date) >= cutoffDate
  );

  if (recentEntries.length === 0) {
    return `No hay registros en los últimos ${days} días.`;
  }

  let history = `📅 HISTORIAL ÚLTIMOS ${days} DÍAS:\n\n`;
  const grouped = new Map<string, HabitEntry[]>();

  for (const entry of recentEntries) {
    if (!grouped.has(entry.date)) {
      grouped.set(entry.date, []);
    }
    grouped.get(entry.date)!.push(entry);
  }

  const sortedDates = Array.from(grouped.keys()).sort().reverse();

  for (const date of sortedDates) {
    history += `${date}:\n`;
    for (const entry of grouped.get(date)!) {
      const status = entry.completed ? "✓" : "✗";
      history += `  ${status} ${entry.habit}`;
      if (entry.notes) {
        history += ` (${entry.notes})`;
      }
      history += "\n";
    }
    history += "\n";
  }

  return history;
}

// Multi-turn conversation with Claude
async function runHabitTracker(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  const data = loadData();
  const conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
  }> = [];

  console.log("🌟 TRACKER DE HÁBITOS SALUDABLES");
  console.log("================================");
  console.log(
    "Puedes agregar hábitos,