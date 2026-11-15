import type { RoleKey } from "@/lib/quidditch/types";

/** Mirrors root bot.names.js. chaser1 and chaser2 share the chaser pool. */
export const BOT_NAMES = {
  chaser: [
    "Витя Квоффлохват",
    "Игорёк Мячеслав",
    "Арсений Подквоффл",
    "Стасик Точнопопадкин",
    "Кирюша Мячемёткин",
    "Богдан Воротобьющий",
    "Лёнька Подстрахов",
    "Димон Мячеруб",
    "Ромка Забиванцев",
    "Серёга Големёткин",
  ],
  beater: [
    "Битя Бладжер",
    "Коля Колотун",
    "Макс Череполом",
    "Паша Молотилов",
    "Кирюша Колотуша",
    "Егор Отшибаев",
    "Ванька Мозготряс",
    "Женька Отлетанцев",
    "Денис Черепобив",
    "Игорёк Битапорылов",
  ],
  seeker: [
    "Златан Снитч",
    "Витя Золотарь",
    "Дима Ловкач",
    "Паша Снитчехват",
    "Фёдор Снитчеглот",
    "Ваня Снитчеглав",
    "Игорёк Снитчман",
    "Тёма БыстрыйГлаз",
    "Саня Снитчер",
    "Славик Ловцов",
  ],
  keeper: [
    "Колька Отбиватор",
    "Тёма Стенка",
    "Денис Голоблокер",
    "Стас Непробивной",
    "Вован Непробивайло",
    "Никитос Мячестоп",
    "Жека Голобарьер",
    "Лёха Танк",
    "Витёк Квоффлостоп",
    "Егор Мощь",
  ],
} as const;

export function botNamePoolForRole(role: RoleKey | null): string[] {
  if (role === "chaser1" || role === "chaser2") return [...BOT_NAMES.chaser];
  if (role === "beater" || role === "seeker" || role === "keeper") return [...BOT_NAMES[role]];
  return [];
}

export function pickUniqueBotNickname(role: RoleKey, used: Set<string>, rng: () => number = Math.random): string {
  const pool = botNamePoolForRole(role).map((name) => name.trim()).filter(Boolean);
  const available = pool.filter((name) => !used.has(name));
  if (available.length > 0) {
    const name = available[Math.floor(rng() * available.length)] ?? pool[0] ?? "Бот";
    used.add(name);
    return name;
  }
  const base = pool[0] || "Бот";
  let i = 2;
  while (used.has(`${base} ${i}`)) i += 1;
  const name = `${base} ${i}`;
  used.add(name);
  return name;
}
