# ПОЛНАЯ СПЕЦИФИКАЦИЯ ИГРЫ «КВИДДИЧ» (пошаговая онлайн-квиддич)

> Документ предназначен для передачи в LLM-модель с целью написания приложения «с нуля».
> Содержит: концепцию, правила, все игровые механики, математику ходов, дуэли, ботов,
> полный API, схему БД, описание клиентского интерфейса, голосовой чат, администрирование,
> конфигурацию, тексты и настройки. Все значения параметров приведены точно, как в исходном коде.
>
> Дополнительно документ гарантирует три обязательных требования:
> 1. приложение собирается и запускается **тем же `Dockerfile` и теми же командами**, что и текущее (раздел 26);
> 2. приведён **полный самодостаточный свод правил игры** (раздел 28);
> 3. задано **обязательное разбиение кода на файлы не более 500 строк** (раздел 27).

---

## 1. ОБЩЕЕ ОПИСАНИЕ

**«Квиддич»** — браузерная многопользовательская **пошаговая** игра по мотивам квиддича из мира Гарри Поттера.
Игроки управляют персонажами (охотники, вратарь, загонщик, ловец) на клеточном поле 7×13.
Две команды (из 4 домов Хогвартса) соревнуются за очки: забрасывание **квоффла** в ворота (+10)
и поимка **снитча** (+30). Игра идёт **ходами (шагами)** — каждый шаг все активные игроки одновременно
отправляют «заявки» (перемещение + действие), затем сервер разрешает конфликты (дуэли) и применяет шаг.

Ключевые особенности:
- Синхронные пошаговые ходы: все игроки планируют ход одновременно, шаг применяется, когда все закончили.
- Таймаут хода 15 секунд; при просрочке заявка очищается и ход завершается автоматически.
- Конфликты (подбор квоффла, выхват, бросок-перехват, удар по бладжеру, поимка снитча) решаются **дуэлями**:
  игроки «на скорость» кликают по прогресс-бару (0–100%), побеждает больший результат; ничьи разрешаются по правилам типа дуэли.
- Есть **боты** трёх уровней сложности, заполняющие пустые роли.
- Встроенный **голосовой чат** (WebRTC peer-to-peer с TURN-релеем) и **текстовый чат** (общий/командный).
- Судья может управлять игрой: старт, пауза, кик игроков, добавление ботов, отключение голоса.

Целевая аудитория — русскоязычные игроки, интерфейс полностью на русском языке.

---

## 2. ТЕХНОЛОГИЧЕСКИЙ СТЕК И АРХИТЕКТУРА

### 2.1. Стек
| Слой | Технология |
|---|---|
| Сервер | Node.js (CommonJS), Express 4 |
| БД | PostgreSQL 16 (pg Pool) |
| Клиент | Чистый JavaScript (vanilla), HTML5, CSS3, SVG-поле, Canvas (экспорт) |
| Реальные времени | Polling: состояние игры каждые 2 c, голосовые сигналы каждые 1 c |
| Голос | WebRTC (RTCPeerConnection), STUN/TURN (coturn) |
| Развёртывание | Docker Compose (postgres, app, coturn, caddy) |
| ID | nanoid (комната 6 симв., сущности 21 символ) |

### 2.2. Структура файлов (для воспроизведения архитектуры)
```
server.js                     — входная точка, сборка Express-приложения
bot.names.js                  — имена ботов по ролям
src/
  constants.js                — все константы игры (команды, роли, сложности, тайминги)
  utils.js                    — вспомогательные функции (нормализация, рандом, боты)
  shared.rules.js (public/)   — ПРАВИЛА: координаты, движение, действия (общие сервер+клиент)
  game-logic.js               — чистая логика: легальные ходы, перемещения мячей, снапшоты
  game-steps.js               — главный движок шага: maybeAdvanceStep и фазы
  duels.js                    — дуэли: создание, разрешение, таймауты
  bot-logic.js                — планирование ходов ботами
  game-events.js              — запись событий игры
  api.js                      — сборка роутера
  api-core.js                 — публичные API (игры, состояние, чат, голос, админ)
  api-actions.js              — API действий (ходы, дуэли, судья)
  api-pages.js                — HTML-страницы (админ комнат, создание комнаты судьи)
  auth.js                     — сессии (session_token), middleware
  db.js                       — пул подключений, автосоздание БД
  db-init.js                  — идемпотентное создание схемы БД
public/
  index.html                  — SPA-разметка
  shared.rules.js             — те же правила для браузера (UMD, globalThis.KwidditchRules)
  app.state.js                — глобальное состояние клиента
  app.api.js                  — клиентский API-слой (fetch)
  app.dom.js                  — ссылки на DOM-элементы, темы, тосты, сессии
  app.ui.js                   — отрисовка поля, фишек, событий, чата, дуэлей, результатов
  app.main.js                 — инициализация, цикл опроса, голосовой движок, обработчики
  messages.js                 — пулы случайных сообщений для ленты событий
  app.css                     — стили
  src/board.svg               — художественное SVG-поле (раскладка клеток парсится)
  src/bg.jpeg, src/logo.svg, src/spectating.png — ассеты
test/
  quaffle-duels.test.js       — юнит-тесты дуэлей
  quaffle-duel-bot.e2e.test.js — e2e-тест дуэли против бота
```

### 2.3. Связи модулей (важно для воспроизведения)
- `shared.rules.js` — единый источник правил движения/действий, подключается и на сервере (`require`), и в браузере (`KwidditchRules`).
- `game-steps.js` и `duels.js` имеют циклическую зависимость (maybeAdvanceStep ↔ resolveDuelIfReady) — разрешается через сеттер `setMaybeAdvanceStep`.
- Сервер запускает: `ensureDatabaseExists()` → `initDb()` → `app.listen`.

### 2.4. Требования к совместимости сборки и структуре файлов
- Приложение обязано собираться **тем же `Dockerfile`** и запускаться **теми же командами** (подробно — раздел 26).
- Все серверные модули должны находиться **только внутри `src/`**, клиентские — **только внутри `public/`**: Dockerfile копирует эти каталоги целиком.
- Точка входа — `server.js` в корне; `bot.names.js` и `turnserver.conf` — в корне.
- **Каждый файл кода ≤ 500 строк**; обязательная карта разбиения — раздел 27.
- Новые внешние зависимости не добавлять: в Dockerfile фиксированный список (dotenv, express, nanoid, pg).
- Старые пути импорта (`./game-steps`, `./duels`, `./bot-logic`, `./api-core`, `./api-actions`, `./api-pages`) должны продолжать работать — через barrel-файлы (раздел 27.5).

---

## 3. ИГРОВАЯ ДОСКА И КООРДИНАТЫ

### 3.1. Геометрия
- **Строки:** `BOARD_ROWS = ["A","B","C","D","E","F","G"]` (7 строк).
- **Колонки:** `BOARD_COLS = 13` (номера 1..13).
- Итого **91 клетка**. Координата = буква строки + номер колонки: `"A1" … "G13"`.
- Правила координат: `normalizeCoord()` — верхний регистр, формат `^[A-G](?:[1-9]|1[0-3])$`.
- Расстояние между клетками — **Чебышёвское**: `max(|r1-r2|, |c1-c2|)`.

### 3.2. Ворота
- Ворота команды A (левая сторона): `GOALS_LEFT = ["C1","D1","E1"]`.
- Ворота команды B (правая сторона): `GOALS_RIGHT = ["C13","D13","E13"]`.
- На клетку ворот **нельзя вставать** охотникам, загонщикам и ловцам (запрещено движение в ворота).

### 3.3. Зона вратаря
- Для вратаря своя зона = каждая клетка ворот **±1 клетка** (квадрат 3×3 вокруг каждого кольца).
- Зона команды A строится от `GOALS_LEFT`, команды B — от `GOALS_RIGHT`.

### 3.4. Начальные позиции (спавн)
| Роль | Команда A | Команда B |
|---|---|---|
| keeper (вратарь) | D1 | D13 |
| seeker (ловец) | D5 | D9 |
| chaser1 (охотник 1) | C5 | C9 |
| chaser2 (охотник 2) | E5 | E9 |
| beater (загонщик) | D4 | D10 |

Если у участника не задана позиция (`pos = NULL`), используется спавн его роли и команды. Наблюдатели и судья позиции не имеют.

### 3.5. Стартовые позиции мячей
- Квоффл: свободен, `quaffle_pos = "D7"`, держателя нет.
- Бладжер 1: `bludger1_pos = "A7"`.
- Бладжер 2: `bludger2_pos = "G7"`.
- Снитч: случайная точка из `SNITCH_SPAWNS = ["A1","G1","A7","G7","A13","G13"]`, скрыт.

### 3.6. Художественное поле
- Клиент использует `public/src/board.svg` (viewBox ~937.75×583.09). Раскладка клеток **парсится из SVG**:
  группа `g459` имеет `transform="translate(ox,oy)"`, внутри — вложенные `transform="translate(x,y)"` для клеток;
  по найденным точкам вычисляются проценты позиций клеток. Если парсинг не удался — fallback-раскладка (сетка в процентах).

---

## 4. КОМАНДЫ И РОЛИ

### 4.1. Команды (`TEAMS`)
| key | label |
|---|---|
| gryffindor | Гриффиндор |
| hufflepuff | Пуффендуй |
| ravenclaw | Когтевран |
| slytherin | Слизерин |

Цвета команд (RGB, используются в UI):
- Гриффиндор: `211,58,58`; Когтевран: `52,156,255`; Пуффендуй: `241,196,15`; Слизерин: `46,204,113`.

### 4.2. Роли (`ROLES`)
| key | label | enabled |
|---|---|---|
| keeper | Вратарь | true |
| seeker | Ловец | true |
| chaser1 | Охотник 1 | true |
| chaser2 | Охотник 2 | true |
| beater | Загонщик | true |

- Команда состоит из 5 активных ролей (все включены). «Пустые» роли можно заполнять ботами.
- `isChaserRole(role)` — chaser1/chaser2; `isKeeperRole` — keeper; `isBeaterRole` — beater; `isSeekerRole` — seeker.
- Активные игроки (участвуют в ходе): `role IN ('keeper','chaser1','chaser2','beater','seeker')` и `is_observer = FALSE`.

### 4.3. Типы участников
- **Игрок** — реальный человек (nickname, team, role, pos, session_token).
- **Наблюдатель** — видит игру, не ходит, не пишет в командный чат (`is_observer = TRUE`, `role = NULL`).
- **Судья** — наблюдатель с правами управления (`is_judge = TRUE`), создаётся через `/api/judge/games`.
- **Бот** — автономный участник роли (`is_bot = TRUE`, `bot_difficulty` 1..3).

### 4.4. Ограничения
- Уникальность роли в команде: `participants_unique_role (game_id, team, role)` для не-наблюдателей.
- Уникальность клетки: `participants_unique_pos (game_id, pos)` для не-наблюдателей (на одной клетке не стоят два игрока).
- Никнейм: 1–24 символа.
- При входе в занятую роль — либо отказ (`role_taken`), либо принудительный захват (`force=true`) с удалением/заменой прежнего игрока (бота удаляют молча).

---

## 5. МЯЧИ И ОБЪЕКТЫ ПОЛЯ

### 5.1. Квоффл (`quaffle`)
- Состояния: **свободен** (`quaffle_pos` = координата) или **у держателя** (`quaffle_holder_id` = participant id, `quaffle_pos = NULL`).
- Старт: свободен на D7.
- Держателем может быть только **охотник** или **вратарь**.
- Свободный квоффл занимает клетку: игроки не могут ходить на клетку квоффла (клетка «занята мячом»).
- Поля защиты от мгновенного выхвата:
  - `quaffle_lock_holder_id` + `quaffle_lock_step_no` — «лок»: при смене владельца в шаге `S` записывается `S`; на шаге `S+1` нельзя красть у этого держателя (`step = lockStep + 1`), на `S+2` — можно.
  - `quaffle_steal_cooldown_step_no` — «кулдаун»: при смене владельца в шаге `S` записывается `S`; на шаге `S+1` выхват запрещён (`step = cooldown + 1`), на `S+2` — разрешён.
  - Серверный сборщик steal-кандидатов и клиентская `isStealQuaffleLocked` блокируют диапазон `S…S+1` (включая повторный проход шага `S`); API-валидация заявки проверяет только `S+1`.
- Автоматическая защита: если в конце шага свободный квоффл оказался на клетке вратаря — вратарь **автоматически** подбирает его (событие `quaffle_pickup`, фаза `post_auto_keeper`). Исключение: при наличии отложенного гола (`pendingGoalResolution`) авто-подбор не выполняется.

### 5.2. Бладжеры (`bludger1`, `bludger2`)
- Два бладжера, старт A7 и G7.
- Каждый шаг двигаются на **случайную соседнюю** клетку (Чебышёв = 1) со следующими запретами:
  - не на клетку другого бладжера (не могут стоять вместе);
  - не на клетку свободного квоффла;
  - не «возвращаться назад» на предыдущую свою клетку;
  - если бладжер «заблокирован» (ударён в этом шаге или «отдыхает» на оглушённом игроке) — не двигается.
- Удар по бладжеру возможен загонщиком или вратарём, стоящим **ровно на расстоянии 1** от бладжера.
- Направление удара: прямая/диагональная линия на расстояние 1–3 клетки от бладжера.
- Нельзя направить бладжер на клетку **свободного** квоффла.
- Траектория: бладжер летит по линии; первый игрок на пути **оглушается** (`stun_bludger`), бладжер останавливается на его клетке; если игроков на пути нет — останавливается в целевой клетке.
- Если конечная клетка совпадает с позицией второго бладжера — бладжер приземляется на ближайшую свободную соседнюю клетку (ближайшую к цели удара).
- Оглушённый игрок: его ход завершён (`ended=TRUE`, `stunned=TRUE`) — пропускает шаг; если держал квоффл — квоффл **выпадает** на ближайшую свободную клетку.

### 5.3. Снитч (`snitch`)
- Маленький золотой мяч; позиция `snitch_pos`; может быть **скрыт** (`snitch_revealed = FALSE`) или **видим**.
- Начало: скрыт в случайной spawn-точке.
- Каждый шаг двигается на 1–3 клетки в случайном направлении (8 направлений × дистанции 1..3), избегая занятых клеток и клеток, зарезервированных игроками для перемещения.
- **Видимость:**
  - становится видимым, если любой ловец в радиусе ≤ 2;
  - прячется, если **все** ловцы на расстоянии ≥ 3 (или ловцов нет).
- Счётчики событий: `snitch_reveal_count` (сколько раз показался), `snitch_hide_count` (сколько раз спрятался).
- **Прогресс поимки** (у каждого ловца `snitch_progress`, 0–100):
  - при видимом снитче: ловец на расстоянии 1 получает +10 за шаг, на расстоянии 2 — +5;
  - при достижении 100 ловец «дошёл» до поимки.
- **Поимка:** если до 100 дошёл один ловец — снитч пойман: команда получает **+30**, `snitch_caught_by_id`, `snitch_caught_step_no`, снитч скрывается. Прогресс ловцов при этом **не сбрасывается** (у поймавшего остаётся 100); сброс в 0 для всех ловцов происходит при респауне.
- **Респаун:** новый снитч появляется, когда `step_no >= snitch_caught_step_no + 3` — выбирается свободная клетка с максимальным `score = minD*100 + sumD` (`minD` — минимум расстояний до ловцов, `sumD` — их сумма; при равенстве — случайная из лучших). Оглушённые ловцы не учитываются. Fallback — свободные spawn-точки, затем любая свободная, затем A7.
- Если до 100 дошло **два ловца** одновременно — создаётся **снитч-дуэль**; победитель ловит (+30), при ничьей снитч остаётся свободным, прогресс 100 у обоих сохраняется (дуэль повторится на следующем шаге).
- Клиент показывает прогресс ловцов в статус-панели («Снитч: X% / Y%»).

---

## 6. ПРАВИЛА ПЕРЕМЕЩЕНИЯ

### 6.1. Охотник (chaser1/chaser2) и Загонщик (beater)
`isAllowedChaserMove(from, to)`:
- не равно текущей клетке;
- **прямо** на 1 или 2 клетки (вверх/вниз/влево/вправо) ИЛИ **по диагонали** ровно на 1 или 2;
- запрещено на клетки ворот.

### 6.2. Ловец (seeker)
`isAllowedSeekerMove(from, to)`:
- любое направление, Чебышёв расстояние 1 или 2;
- запрещено на клетки ворот.

### 6.3. Вратарь (keeper)
`isAllowedKeeperMove(from, to, ownGoalsSet)`:
- обе клетки (from и to) должны быть **в зоне вратаря** (3×3 вокруг своих колец);
- перемещение ровно на 1 клетку (Чебышёв = 1).

### 6.4. Общие ограничения перемещения
- Нельзя на занятую другим игроком клетку.
- Нельзя на клетку мяча (квоффл/бладжеры/снитч).
- Нельзя на клетку, уже зарезервированную другим игроком (`planned_to`; уникальный индекс `turn_states_unique_planned_to`).
- Нельзя в ворота (кроме вратаря, для которого ворота и есть зона).
- **Коллизии перемещений:** при одновременных перемещениях две клетки-цели не могут совпадать; первый получивший цель (в порядке `created_at`) сохраняет её; цель, на которой стоит не-перемещающийся игрок, недоступна.

---

## 7. ДЕЙСТВИЯ ИГРОКОВ (ЗАЯВКИ)

Каждый активный игрок в свой ход отправляет заявку: `{ to, actionFirst, actionType, actionTo, actionBludger }`.

- `to` — целевая клетка перемещения (может быть null — не двигаться).
- `actionFirst` — **true**: действие выполняется ДО перемещения (pre-move); **false**: ПОСЛЕ перемещения (post-move).
- `actionType` — одно из: `pickup`, `keeper_pickup`, `pass`, `throw`, `steal`, `hit_bludger`.
- `actionTo` — целевая клетка действия (для pass/throw/hit_bludger, опционально для steal вратаря).
- `actionBludger` — 1 или 2 (какой бладжер бьём) для `hit_bludger`.

### 7.1. Подбор квоффла (`pickup` / `keeper_pickup`)
- Роли: `pickup` — только охотники; `keeper_pickup` — только вратарь.
- Условие: квоффл свободен, игрок на расстоянии ≤ 1 (Чебышёв) от квоффла.
- Один кандидат — забирает без дуэли; несколько (≥ 2) — **pickup-дуэль**.
- При подборе: `stat_quaffle_pickups += 1`, событие `quaffle_pickup`. Одиночный подбор устанавливает lock **и** cooldown на текущий шаг; победа в pickup-дуэли устанавливает только lock (`quaffle_lock_*`), а `quaffle_steal_cooldown_step_no` не меняет.

### 7.2. Выхват квоффла (`steal`)
- Роли: охотник или вратарь.
- Условия: квоффл у держателя, который является охотником или вратарём (не наблюдателем) **противоположной команды**; атакующий на расстоянии ≤ 1 от держателя; нет активного lock/cooldown.
- Все атакующие, заявившие steal в одну фазу, участвуют в **steal-дуэли** против держателя.
- Вратарь может указать `actionTo` (расстояние 1–6). Этот бросок выполняется **только в сценарии `throw_steal`** (когда держатель в ту же фазу тоже бросает); в обычной `steal`-дуэли `actionTo` игнорируется (см. 7.4).
- При успехе: `stat_quaffle_steals += 1`.

### 7.3. Пас (`pass`) — только охотник
- Условия: квоффл у меня; цель — клетка **своего** охотника (chaser1/chaser2); расстояние 1–2 (Чебышёв, не 0).
- При пасе: `stat_quaffle_passes += 1`, событие `quaffle_pass`.

### 7.4. Бросок (`throw`)
- Роли: охотник или вратарь. Только если квоффл у меня.

**Бросок вратаря:**
- Цель — любая клетка на расстоянии 1–6 (Чебышёв).
- Если на целевой клетке стоит **охотник** — он становится новым держателем («пас» вратаря; если того же цвета — `stat_quaffle_passes += 1`).
- Если охотника нет — квоффл летит на целевую клетку (свободен).

**Бросок охотника:**
- Цель — **только кольцо противника** (C/E/D 1 для команды B, C/E/D 13 для команды A) на расстоянии ровно 2.
- Если на клетке кольца стоит вратарь противника → **сейв**: вратарь ловит (`stat_goals_saved += 1`), событие `goal`.
- Если вратаря нет:
  - **pre-move (actionFirst=true):** гол НЕ засчитывается сразу — создаётся `pendingGoalResolution`. После применения перемещений: если вратарь противника успел встать на клетку кольца → сейв, иначе → **гол** (+10 команде, `stat_goals_scored += 1`, событие `goal`).
  - **post-move (actionFirst=false):** гол засчитывается немедленно.
- После броска квоффл оказывается в кольце (свободен на клетке кольца) либо у поймавшего вратаря; lock/cooldown сбрасываются, если держателя нет.

**Throw_steal (бросок-перехват):**
- Если охотник планирует бросок, а противник планирует steal против него в ту же фазу — сначала разрешается дуэль **throw_steal**:
  - победил держатель → бросок выполняется (с учётом клетки назначения: вратарь-перехватчик тоже может бросить);
  - победил атакующий → квоффл переходит атакующему (`stat_quaffle_steals += 1`), бросок не выполняется.

### 7.5. Удар по бладжеру (`hit_bludger`)
- Роли: загонщик или вратарь.
- Условия: игрок на расстоянии 1 от бладжера (1 или 2); целевая клетка — прямая/диагональная линия на 1–3 от бладжера; нельзя бить на клетку свободного квоффла.
- Если несколько игроков бьют по одному бладжеру в одну фазу → **hit_bludger-дуэль** (победитель выполняет удар).
- Последствия: см. 5.2 (траектория, оглушение, статистика `stat_bludger_hits`, `stat_bludger_hits_to_players`, события `hit_bludger`/`stun_bludger`).

---

## 8. ИГРОВОЙ ЦИКЛ (ШАГИ И ХОДЫ)

### 8.1. Состояние хода игрока (`turn_states`)
Поля (PK: `game_id, participant_id`): `step_no, moved, action_reserved, action_done, ended, stunned, planned_to, planned_action_first, planned_action_type, planned_action_to, planned_action_bludger`.

- `ended=true` — игрок завершил заявку (или оглушён/таймаут).
- `stunned=true` — оглушён, ход пропущен.
- `moved` — использовано перемещение (legacy).
- `action_reserved/action_done` — использовано действие (legacy).
- `planned_to` — заявленная клетка перемещения (уникальна по `(game_id, step_no, planned_to)`).

### 8.2. Поток игрока
1. Игрок входит в комнату → получает роль/команду.
2. Игра должна быть `started=true` (судья или первый игрок нажимает «Начать»).
3. Игрок кликает клетку → `POST /plan/move` (заявка перемещения, проверка правил).
4. Игрок выбирает действие (кнопки или клики по подсвеченным клеткам).
5. Игрок нажимает «Завершить ход» → `POST /turn/end` (полная заявка; сервер валидирует всё; `ended=true`).
6. Когда **все активные** игроки завершили → сервер выполняет шаг (`maybeAdvanceStep`).
7. Клиент опрашивает `GET /api/games/:code/state` каждые 2 c и отображает новое состояние.

### 8.3. Таймаут хода
- `TURN_TIMEOUT_MS = 15000` мс.
- Фоновый проход (`expireOldTurns`) при запросе состояния: если шаг висит дольше таймаута — у всех незавершивших очищаются заявки (`ended=true`) и шаг продвигается.
- Если есть активные дуэли (steal/pickup/throw_steal/snitch) — заявки не очищаются, шаг ждёт дуэль.

### 8.4. Автозавершение без вариантов (клиент)
Если у игрока нет ни одного доступного хода и действия — клиент автоматически отправляет пустую заявку `{ to: null, actionType: null }`.

### 8.5. Легаси-режим (не используется по умолчанию)
`PLANNED_TURNS = true` — включаются заявки. При `false` были бы мгновенные действия (`/move`, `/quaffle/pickup`, `/quaffle/steal`, `/quaffle/throw`), они возвращают ошибку `use_plans`.

---

## 9. ВЫПОЛНЕНИЕ ШАГА (ПОРЯДОК ФАЗ) — СЕРДЦЕ ИГРЫ

Функция `maybeAdvanceStep(client, gameId, depth=0)` (глубина рекурсии ограничена 6):

1. **Проверка готовности:** игра не завершена; все активные имеют `turn_state`; количество `ended=true` = числу активных; нет активных дуэлей steal/pickup/throw_steal/snitch. Если нет — выход.
2. **Подготовка состояния** (`prepareStepState`): загрузка `games`, участников с `turn_states`, построение карт позиций (`fromById`, `occupantChaserByCoord`, `occupantKeeperByCoord`, `occupantAnyByCoord`), инициализация мячей.
3. **PRE-MOVE фаза — сбор кандидатов на дуэли:**
   - `processPickupAndStealPhase(actionFirst=true, phase="pre")`: pickup-кандидаты (из обеих фаз!), затем steal-кандидаты против (возможно нового) держателя. Если кандидатов ≥ 2 — создать pickup-дуэль; 1 кандидат — просто взять квоффл; steal — дуэль «все атакующие vs держатель».
   - `createThrowStealDuels(actionFirst=true)`: для каждого планирующего `throw` охотника/вратаря, если рядом стоит противник с заявкой steal в ту же фазу — дуэль `throw_steal`.
   - `createHitBludgerDuels(actionFirst=true)`: contenders ≥ 2 по одному бладжеру — дуэль `hit_bludger`.
   - Если созданы дуэли → **сохранить промежуточное состояние** (holder/lock/cooldown квоффла) и ВЫЙТИ (шаг продолжится после разрешения дуэлей).
4. **PRE-MOVE действия** (`processPlayerActions`, actionFirst=true): keeper_pickup, hit_bludger, pass, throw (с отложенным голом `pendingGoalResolution`).
5. **Перемещения** (`applyMovement`): разрешение коллизий (`resolveMoveCollisions`), запись новых позиций в БД.
6. **Разрешение отложенного гола** (`resolvePendingGoal`): проверка, стоит ли вратарь на клетке кольца; сейв или гол (+10, статистика, события).
7. **POST-MOVE фаза — дуэли** (аналогично pre-move, но actionFirst=false, позиции — после перемещений). Если созданы дуэли — сохранить состояние и выйти.
8. **Снитч-фаза** (`processSnitchPhase`): движение, видимость, прогресс ловцов, поимка/дуэль. Обновление счётчиков reveal/hide, +30 при поимке.
9. Если есть дуэли (любые, включая snitch) — сохранить состояние и выйти.
10. **Сохранение прогресса ловцов** в БД; сброс при респауне.
11. **Авто-подбор вратарём** (см. 5.1).
12. **POST-MOVE действия** (`processPlayerActions`, actionFirst=false).
13. **Бладжеры** (`processBludgersAndStun`): движение (с учётом блокировок), оглушения, выпадение квоффла у оглушённого держателя.
14. **Финализация** (`finalizeStep`):
    - проверка победы: `score_a >= 100` или `score_b >= 100` → `finished=true`, `winner_team` (при равенстве — null);
    - запись **снапшота** состояния шага в `game_state_snapshots` (для логов/экспорта);
    - обновление `games` (step_no+1, счёт, позиции мячей, снитч, lock/cooldown, счётчики);
    - сброс `turn_states` всех активных на новый шаг;
    - оглушённые → `ended=true, stunned=true`;
    - если все оглушены → рекурсивный `maybeAdvanceStep(depth+1)`;
    - если были дуэли → заполнить счета ботам и рекурсивно продвинуть шаг.

### 9.1. Коллизии перемещений (`resolveMoveCollisions`)
- Сначала «первым занял» присваиваются цели (порядок участников по `created_at`).
- Затем цикл: если цель занята неподвижным игроком — перемещение отменяется (повторять до стабилизации).

### 9.2. Квоффл у оглушённого
Если держатель квоффла оглушён бладжером — квоффл выпадает на ближайшую свободную клетку (`findNearestFreeCoord`, поиск по радиусам 1..20), иначе D7.

---

## 10. ДУЭЛИ

### 10.1. Виды дуэлей
| kind | Что решает | Участники | attacker / defender | target_pos | Ничья (topTie) |
|---|---|---|---|---|---|
| `pickup` | кто подбирает свободный квоффл | все кандидаты (≥2) | первый кандидат / второй кандидат | клетка квоффла | квоффл остаётся свободным |
| `steal` | кто выхватит квоффл | держатель + все атакующие | первый атакующий / держатель | `null` | держатель сохраняет квоффл |
| `throw_steal` | перехват броска | держатель-бросающий + атакующие | первый атакующий / держатель | `throw:{pre|post}:{holderId}` | (смотри разрешение; обычно держатель) |
| `hit_bludger` | кто бьёт по бладжеру | contenders (≥2) | первый contender / второй contender | `b{1|2}:{pre|post}` | первый contender |
| `snitch` | кто поймает снитч | 2 ловца, дошедших до 100 | первый reacher / второй reacher | клетка снитча | снитч остаётся свободным |

### 10.2. Механика
- Таблицы `duels` (attacker_id, defender_id, participant_ids[], kind, target_pos, created_step_no) и `duel_scores(duel_id, participant_id, score 0..100)`.
- Каждый участник дуэли отправляет «силу рывка» 0–100: `POST /quaffle/steal/submit { duelId, score }`.
- **UI дуэли:** прогресс-бар (период 2200 мс, «пила» 0→100%→сброс); игрок жмёт, максимально близко к 100%.
- Разрешение: собраны все счета → `pickDuelWinner`: максимум счёта; при равном максимуме у нескольких — правила ничьей из таблицы выше.
- После разрешения применяются последствия (передача квоффла, +30 снитч, статистика), записываются события `quaffle_duel_score`/`quaffle_duel_result`, затем `maybeAdvanceStep`.
- **Таймаут дуэли:** если дуэль не разрешена за `TURN_TIMEOUT_MS`, `expireOldDuels` заполняет счета:
  - для отсутствующих ботов — `botScoreForDuel(difficulty)`;
  - для отсутствующих людей — 0;
  - если отсутствуют ВСЕ: для `steal` — держатель побеждает (1:0); иначе победитель — по стабильному индексу от id дуэли.
  - за один вызов `expireOldDuels` обрабатывается только **последняя** незавершённая дуэль игры; счёт нормализуется в 0..100 (округление).

### 10.3. Случайность (детали)
- `stableIndexFromId(id, mod)`: сумма charCode-ов id по модулю.
- `botScoreForDuel(difficulty)`: лёгкий — среднее 45, разброс ±22; средний — 62 ±16; сложный — 78 ±12 (округление, диапазон 0..100).

---

## 11. БОТЫ

### 11.1. Создание
- `/api/games/:code/bots/fill` — заполняет ВСЕ пустые роли обеих команд ботами заданной сложности.
- Судья: `/api/judge/:judgeId/bot` (добавить бота в роль), `/api/judge/:judgeId/kick` (кик с заменой на бота), `/api/judge/:judgeId/bot/difficulty` (сменить сложность).
- Вход игрока в роль бота — бот молча удаляется.
- Имена ботов по ролям из `bot.names.js` (40 имён: 10 на роль), выбираются уникально с суффиксом-цифрой при повторе.

### 11.2. Сложности (`BOT_DIFFICULTIES`)
| level | key | label | actionRate | mistakeRate | chaseHiddenSnitchRate |
|---|---|---|---|---|---|
| 1 | easy | Лёгкий | 0.55 | 0.38 | 0.05 |
| 2 | medium | Средний | 0.80 | 0.18 | 0.40 |
| 3 | hard | Сложный | 0.95 | 0.06 | 0.95 |

### 11.3. Логика планирования (`planBotTurn`)
- **Охотник:** с квоффлом → бросок в кольцо на расстоянии 2 (с вероятностью `actionRate`; по возможности выбирает кольцо, где нет вратаря); после броска с вероятностью 0.65/0.35/0.12 (сложный/средний/лёгкий) дополнительно перемещается; иначе двигается к кольцу; без квоффла → к квоффлу (подбор до/после хода); квоффл у противника → к держателю и steal.
- **Вратарь:** стоит в зоне; подбирает квоффл рядом; с квоффлом → пас ближайшему охотнику (1–6) или движение к нему; против держателя → steal; бьёт бладжеры, если рядом; иначе возвращается к центру своих ворот (D1/D13).
- **Ловец:** движется к снитчу, если он видим; если скрыт — с вероятностью `chaseHiddenSnitchRate` движется к реальной позиции снитча, иначе к случайной spawn-точке снитча; если снитч пойман — на свою стартовую клетку (D5/D9).
- **Загонщик:** бьёт ближайший бладжер по врагу на линии (1–3), иначе подходит к бладжеру: приоритет — клетка на расстоянии 1 от любого бладжера (score 100), затем 2 (score 10), клетка самого бладжера запрещена (score −100).
- **Ошибки (`decideMove`):** с вероятностью `mistakeRate` бот либо пропускает перемещение (шанс 0.35), либо выбирает случайный легальный ход; без ошибки — лучший ход к цели, причём остаться на месте можно только с небольшим штрафом (−0.2).
- План проходит через `sanitizeBotPlan` — та же валидация, что у человека (роль, дистанции, цель, недопустимые поля); нелегальная часть заявки обнуляется.
- Боты ходят автоматически: после каждого хода человека (`runBotsInGameClient`), при заполнении и при запросе состояния (`maybeRunBots`). В дуэлях боты ставят счёт автоматически.

---

## 12. ЗАВЕРШЕНИЕ ИГРЫ, РЕЗУЛЬТАТЫ, СТАТИСТИКА

### 12.1. Конец игры
- Игра завершается, когда любая команда набирает **100+ очков** (голы по +10, снитч +30).
- `winner_team`: команда с большим счётом; при равенстве — null (ничья).

### 12.2. Статистика игрока (таблица `participants`)
`snitch_progress, stat_quaffle_pickups, stat_quaffle_steals, stat_quaffle_passes, stat_goals_scored, stat_goals_saved, stat_snitch_catches, stat_bludger_hits, stat_bludger_hits_to_players`.

### 12.3. Итоговая таблица результатов (`buildGameResults`)
- Игроки сортируются внутри команды: points (голы×10 + снитчи×30) > снитчи > голы > сейвы > steals > pickups > passes > никнейм (ru locale).
- Ответ содержит `results: { finished, finishedAt, winnerTeam, scoreA, scoreB, teamA:{team, players[]}, teamB:{team, players[]} }`.
- UI: модальное окно с таблицей (Имя, Роль, Взято квоффлов, Украдено, Пасы, Удары по бладжеру, Попаданий, Поймано голов, Поймано снитчей, Очки) и кнопкой **«сохранить как изображение»** (PNG через SVG-рендер, с логотипом).

---

## 13. СОБЫТИЯ И ЛЕНТА (game_events)

Таблица `game_events`: `id, game_id, step_no, kind, actor_id, bludger_idx, target_pos, meta(JSONB), created_at`.

Виды событий:
`quaffle_pickup`, `quaffle_pass`, `quaffle_throw`, `quaffle_throw_result`, `quaffle_duel_score`, `quaffle_duel_result`, `hit_bludger`, `stun_bludger`, `goal`,
и legacy: `pickup`, `steal`, `pass`, `throw`, `save`, `keeper_throw`, `keeper_pickup`.

**Точные поля событий (для логов и ленты):**
| kind | actor_id | bludger_idx | target_pos | meta |
|---|---|---|---|---|
| `quaffle_pickup` | подобравший | — | клетка квоффла | `phase`, `finalHolderId`, `finalPos` |
| `quaffle_pass` | пасующий | — | клетка приёма | `phase`, `receiverId`, `fromPos`, `toPos` |
| `quaffle_throw` | бросающий | — | цель броска | `phase`, `fromPos`, `toPos`, `receiverId`, `finalHolderId`, `finalPos`, `outcome` |
| `quaffle_throw_result` | бросающий | — | цель | `outcome`, `keeperId`, `finalHolderId`, `finalPos` |
| `quaffle_duel_score` | участник дуэли | — | клетка квоффла (только pickup) | `duelId`, `duelKind`, `score`, `bestScore`, `isTopScore`, `tiedTopIds`, `currentHolderId` |
| `quaffle_duel_result` | победитель | — | цель/клетка | `duelId`, `duelKind`, `winnerId`, `topTie`, `tiedTopIds`, `tiePolicy`, `scores`, `finalHolderId`, `finalPos`; для `steal`/`throw_steal` также `outcome`; для `throw_steal` ещё `throwContinued` |
| `hit_bludger` | ударивший | 1/2 | конечная клетка бладжера | — |
| `stun_bludger` | оглушённый | 1/2 | клетка оглушения | — |
| `goal` | вратарь пропустившей команды | — | клетка кольца | `shooterId`, `keeperId` |

`quaffle_duel_score` пишется по одному на каждого участника только для дуэлей `pickup`, `steal`, `throw_steal`.
`quaffle_duel_result` пишется для `pickup`, `steal`, `throw_steal`; для `snitch` и `hit_bludger` отдельного события результата нет (эффекты применяются напрямую).

**Глоссарий значений `outcome` (поле `meta`):**

| `outcome` | Где встречается | Значение |
|---|---|---|
| `pending_goal_resolution` | `quaffle_throw` (pre-move) | Бросок охотника в кольцо «до перемещения»: гол отложен до проверки позиции вратаря после перемещений |
| `caught_by_player` | `quaffle_throw`, `quaffle_throw_result`, `quaffle_duel_result` | Мяч пойман игроком: пас, перехват вратарём-соперником, сейв |
| `landed` | `quaffle_throw`, `quaffle_throw_result`, `quaffle_duel_result` | Мяч приземлился на клетку и никем не пойман |
| `goal` | `quaffle_throw` (post-move), `quaffle_throw_result`, `quaffle_duel_result` | Гол засчитан (+10) |
| `saved_by_keeper` | `quaffle_throw_result`, `quaffle_duel_result` | Вратарь поймал бросок в кольце (сейв) |
| `released` | `quaffle_throw` | Резервная ветка: мяч не пойман и позиция не зафиксирована (при валидных заявках не возникает) |
| `stolen` | `quaffle_duel_result` (`steal`) | Выхват состоялся, мяч перешёл победителю |
| `stolen_before_throw` | `quaffle_duel_result` (`throw_steal`, бросок отменён) | Атакующий выиграл дуэль и забрал мяч до броска |
| `holder_kept_control` | `quaffle_duel_result` (`steal`/`throw_steal`) | Держатель выиграл дуэль (в т.ч. при ничьей) и сохранил мяч |

Не путать с полем `outcome` объекта, возвращаемого `pickDuelWinner` (`winnerId`, `bestScore`, `bestIds`, `topTie`, `tiePolicy`) — это не строка.

Клиент строит **ленту событий** из:
1. серверных событий (сравнение id, счётчики сообщений);
2. диффов состояния (смена holder → подбор/пас/выхват; reveal/hide снитча).

Счётчики (`messageCounters` в state): `free_quaffle_pickup, quaffle_pass, quaffle_steal, bludger_hit, bludger_stun, goal_scored, snitch_reveal, snitch_hide`.

Сообщения подбираются детерминированно по пулу (FNV-1a + mulberry32, перемешивание порядка по комнате/циклу), чтобы в одной комнате фразы не повторялись до исчерпания пула. Пулы в `messages.js` (по 30 фраз на тип: подбор квоффла, пас, выхват, удар бладжера, оглушение, явка снитча, уход снитча, гол).

---

## 14. ПОЛНЫЙ СПИСОК API

Все API под `apiSessionMiddleware`: маршруты `/api/participants/:id/...` и `/api/judge/:judgeId/...` требуют заголовок `x-session-token` (иначе 401). Исключения: health, meta, создание игры/судьи, state (viewerId+токен через заголовок), админ-страницы.

| Метод | Путь | Описание |
|---|---|---|
| GET | /api/health | Проверка БД: `{ok}` |
| GET | /api/meta | `{teams, roles, botDifficulties, voiceIceServers}` |
| POST | /api/games | Создать игру `{teamA, teamB}` → `{code, gameId, teamA, teamB}` |
| POST | /api/judge/games | Создать игру с судьёй `{teamA, teamB, nickname}` → `{code, gameId, participantId, sessionToken}` |
| GET | /api/games/:code/state | Полное состояние комнаты (см. 14.1). Триггерит expireOldDuels, expireOldTurns, maybeRunBots |
| POST | /api/games/:code/participants | Вход: `{mode:"player"|"observer", nickname, team, role?, force?}` → `{participantId, sessionToken}` |
| POST | /api/games/:code/bots/fill | Заполнить ботов `{difficulty}` |
| GET | /api/games/:code/logs | Логи: snapshots + events + participantsById |
| POST | /api/participants/:id/plan/move | Заявка перемещения `{to}` (или null — снять) |
| POST | /api/participants/:id/turn/end | Полная заявка `{to, actionFirst, actionType, actionTo, actionBludger}` → завершение хода |
| POST | /api/participants/:id/game/start | Старт игры (судья или первый игрок) |
| POST | /api/participants/:id/quaffle/steal/submit | Отправка счёта дуэли `{duelId, score}` |
| POST | /api/participants/:id/chat | Сообщение `{scope:"all"|"team", text}` |
| GET | /api/participants/:id/voice/poll | Получить voice-сигналы `?since=seq` |
| POST | /api/participants/:id/voice/send | Отправить voice-сигнал `{toId, kind, payload}` |
| DELETE | /api/participants/:id | Покинуть игру (квоффл выпадает, дуэли резолвятся) |
| POST | /api/judge/:judgeId/pause | Пауза/продолжение |
| POST | /api/judge/:judgeId/kick | Кик `{targetId, replace:"empty"|"bot", botDifficulty?}` |
| POST | /api/judge/:judgeId/bot | Добавить бота `{team, role, botDifficulty}` |
| POST | /api/judge/:judgeId/bot/difficulty | `{botId, botDifficulty}` |
| POST | /api/judge/:judgeId/voice | Вкл/выкл голос для всех `{enabled}` |
| GET | /api/admin/rooms | Список комнат (admin) |
| DELETE | /api/admin/rooms/by-id/:id, /api/admin/rooms/:code, /api/admin/rooms/batch | Удаление комнат |
| PATCH | /api/participants/:id | Отключено (`role_change_disabled`) |
| POST | /api/participants/:id/move, /quaffle/pickup, /quaffle/steal, /quaffle/throw | Легаси (отключены при PLANNED_TURNS) |

### 14.1. Формат `/api/games/:code/state` (важно для клиента)
```jsonc
{
  "serverNow": 1690000000000,
  "turnMs": 15000,
  "messageCounters": { "free_quaffle_pickup": 0, "quaffle_pass": 0, "quaffle_steal": 0,
                       "bludger_hit": 0, "bludger_stun": 0, "goal_scored": 0,
                       "snitch_reveal": 0, "snitch_hide": 0 },
  "game": {
    "code", "teamA", "teamB", "started", "finished", "finishedAt", "winnerTeam",
    "scoreA", "scoreB", "paused", "voiceEnabled",
    "quaffleLockHolderId", "quaffleLockStepNo", "quaffleStealCooldownStepNo",
    "stepNo", "stepStartedAt", "createdAt"
  },
  "results": null | {...},
  "participants": [ /* id, nickname, team, role, pos, snitch_progress, stat_*, is_bot, bot_difficulty, is_observer, is_judge, created_at */ ],
  "takenRoles": { "team:role": { participantId, nickname, isBot, botDifficulty } },
  "turnStates": { "participantId": { moved, actionReserved, actionDone, ended, stunned,
                                     plannedTo?, plannedActionType?, plannedActionTo?, plannedActionBludger? } },
  "reservedMoves": ["A1", ...],
  "bludgers": ["A7", "G7"],
  "snitch": { "pos": "..." | null, "revealed": bool, "caughtById": "..." | null },
  "quaffle": { "holderId": "..." | null, "pos": "..." | null },
  "events": [ { id, kind, actorId, stepNo, bludgerIdx, targetPos, createdAt } ],
  "chat": { "messages": [ { id, fromId, fromNick, fromTeam, scope, toTeam, text, createdAt } ] },
  "duel": { id, attackerId, defenderId, participantIds, kind, targetPos, createdStepNo,
            startedAt, attackerScore, defenderScore, resolvedAt, winnerId, scores, attackerNickname, defenderNickname } | null
}
```
- `turnStates` раскрывает свои `plannedTo/plannedAction*` **только владельцу** (не наблюдателям).
- `snitch.pos` скрывается, если снитч не виден.
- `events` — последние 20; `chat` — до 80 сообщений (отфильтровано по скоупу зрителя).
- Дуэль видна всем, если не разрешена или разрешена < 10 секунд назад.

---

## 15. СХЕМА БАЗЫ ДАННЫХ (PostgreSQL)

Все таблицы создаются идемпотентно в `initDb()`.

### 15.1. `games`
| колонка | тип |
|---|---|
| id | TEXT PK |
| code | TEXT UNIQUE NOT NULL (6 симв.: ABCDEFGHJKLMNPQRSTUVWXYZ23456789) |
| team_a, team_b | TEXT NOT NULL |
| started | BOOL DEFAULT TRUE |
| started_at | TIMESTAMPTZ NULL |
| finished | BOOL DEFAULT FALSE |
| finished_at | TIMESTAMPTZ NULL |
| winner_team | TEXT NULL |
| score_a, score_b | INT DEFAULT 0 |
| paused | BOOL DEFAULT FALSE |
| voice_enabled | BOOL DEFAULT TRUE |
| snitch_pos | TEXT NULL |
| snitch_revealed | BOOL DEFAULT FALSE |
| snitch_caught_by_id | TEXT NULL |
| snitch_caught_step_no | INT NULL |
| snitch_reveal_count, snitch_hide_count | INT DEFAULT 0 |
| quaffle_pos | TEXT DEFAULT 'D7' |
| quaffle_holder_id | TEXT NULL |
| quaffle_lock_holder_id | TEXT NULL |
| quaffle_lock_step_no | INT NULL |
| quaffle_steal_cooldown_step_no | INT NULL |
| bludger1_pos, bludger2_pos | TEXT DEFAULT 'A7'/'G7' |
| step_no | INT DEFAULT 1 |
| step_started_at | TIMESTAMPTZ DEFAULT NOW() |
| created_at | TIMESTAMPTZ DEFAULT NOW() |

### 15.2. `participants`
id TEXT PK, game_id FK→games, nickname, team, role NULL, session_token UNIQUE, is_judge BOOL, snitch_progress INT,
stat_quaffle_pickups/steals/passes INT, stat_goals_scored/saved INT, stat_snitch_catches INT, stat_bludger_hits/hits_to_players INT,
pos TEXT NULL, is_bot BOOL, bot_difficulty SMALLINT, is_observer BOOL, created_at.
Индексы: `participants_unique_role (game_id,team,role) WHERE role IS NOT NULL AND NOT is_observer`,
`participants_unique_pos (game_id,pos) WHERE pos IS NOT NULL AND NOT is_observer`, `participants_session_token_idx`.

### 15.3. `turn_states`
PK(game_id, participant_id); step_no, moved, action_reserved, action_done, ended, stunned BOOL;
planned_to TEXT, planned_action_first BOOL, planned_action_type TEXT, planned_action_to TEXT, planned_action_bludger SMALLINT, updated_at.
Индекс: `turn_states_unique_planned_to (game_id, step_no, planned_to) WHERE planned_to IS NOT NULL`.

### 15.4. `duels`
id PK, game_id FK, attacker_id, defender_id, participant_ids TEXT[], kind TEXT, target_pos TEXT, created_step_no INT,
started_at, attacker_score INT, defender_score INT, resolved_at NULL, winner_id NULL.
Индексы: `duels_one_active_per_game_per_kind (game_id, kind) WHERE resolved_at IS NULL`,
`duels_one_per_conflict (game_id, created_step_no, COALESCE(kind,''), COALESCE(target_pos,''))`.

### 15.5. `duel_scores`
PK(duel_id, participant_id); score INT NULL.

### 15.6. `game_events`
id PK, game_id FK, step_no, kind, actor_id NULL, bludger_idx SMALLINT, target_pos NULL, meta JSONB, created_at.
Индекс: (game_id, created_at DESC).

### 15.7. `game_state_snapshots`
id PK, game_id FK, step_no, state JSONB (полный снимок: счёт, позиции мячей, участники с позициями/оглушением/прогрессом), created_at.
Индекс: (game_id, step_no).

### 15.8. `voice_signals`
seq BIGSERIAL PK, game_id FK, from_id, to_id, kind, payload JSONB DEFAULT {}, created_at.
Индекс: (to_id, seq). Старые (>2 ч) удаляются при poll.

### 15.9. `chat_messages`
id PK, game_id FK, from_id, from_nickname, from_team, scope ('all'|'team'), to_team NULL, text, created_at.
Индекс: (game_id, created_at DESC). Хранятся последние 200 на игру.

---

## 16. КЛИЕНТСКОЕ ПРИЛОЖЕНИЕ (SPA)

### 16.1. Экраны
1. **Главная (home):** вкладки «Создать» / «Присоединиться» / «Наблюдать».
   - Создать: выбор команд A/B, своей команды, роли, имени, заполнения ботами и их сложности.
   - Присоединиться: код комнаты → «Загрузить команды» → выбор команды/роли/имени → вход; подтверждение при захвате занятой роли.
   - Наблюдать: код + имя.
2. **Комната:** шапка (логотип, название матча, код комнаты + копирование, выход), панель статуса (ход, таймер, экспорт логов, голосовые кнопки, «Я»), поле, боковая панель (счёт, снитч, кнопки действий, лента событий), чат внизу, модалки (участники, наблюдатели, результаты, дуэль, подтверждение).
3. **Дуэль:** оверлей с прогресс-баром (клик = сдача счёта).
4. **Результаты:** итоговая таблица + сохранение PNG.

### 16.2. Рендер поля
- SVG-фон (`board.svg`), поверх — HTML-сетка `.cell` (данные `data-coord`), классы: `a/b` (шахматка), `gate gateA/gateB` (ворота), `target` (доступный ход), `throwTarget`, `passTarget`, `hitTarget`, `planned` (моя заявка), `blocked` (занято другими).
- Фишки `.piece` (буква роли: О1/О2/З/Л/В, классы `teamA/teamB`, `me`, `controllable`, `stunned`), бейдж `quaffleBadge` у держателя.
- Мячи: `.quaffle` (красный), `.bludger` (тёмный), `.snitch` (фиолетовый на канвас-экспорте / золотой в UI).
- **Инкрементальный рендер:** фишки и мячи переиспользуются между кадрами (переносятся между клетками), сетка строится один раз — минимум DOM-мутаций.

### 16.3. Взаимодействие игрока
- Клик по подсвеченной клетке = выбор перемещения (`/plan/move`).
- Кнопки действий: «Взять Квоффл»/«Поднять Квоффл», «Выхватить Квоффл» (+ предупреждение о lock), «Дать пас», «Ударить бладжер», «Завершить ход».
- После выбора действия с целью — клик по подсвеченной клетке цели; порядок (до/после хода) определяется временем выбора: что выбрано раньше — то и `actionFirst=true`.
- Автопроверка: если действие возможно только до или только после перемещения — фаза выбирается автоматически.
- «Завершить ход» отправляет полную заявку; при ошибках — понятные тосты.
- Если ходов/действий не осталось — автозавершение хода.
- Повторный клик по **своей запланированной клетке** отменяет перемещение; повторный клик по **выбранной кнопке действия** отменяет действие.
- Если выхват заблокирован (lock/cooldown), а игрок рядом с держателем, вместо кнопки показывается сообщение «Нельзя выхватить квоффл сразу после смены владельца».
- Доступность кнопок:
  - «Взять/Поднять Квоффл» — охотник/вратарь, квоффл свободен, расстояние ≤ 1;
  - «Выхватить Квоффл» — охотник/вратарь, держатель-соперник рядом, нет lock/cooldown;
  - «Дать пас» — охотник с квоффлом, есть свой охотник на расстоянии 1–2;
  - «Ударить бладжер» — загонщик/вратарь на расстоянии 1 от бладжера;
  - «Завершить ход» — доступна, пока ход не завершён и игрок не оглушён.
- Подсветка целей: пас — клетки своих охотников (1–2); бросок охотника — кольца соперника на расстоянии 2; бросок вратаря — все клетки в радиусе 6; удар — прямая/диагональ 1–3 от выбранного бладжера; выхват вратаря с бросанием — клетки в радиусе 6.
- Если для действия нужна цель, а она не выбрана, «Завершить ход» показывает тост и не отправляет заявку.
- Оверлей дуэли и отправка счёта доступны **только участникам дуэли**; остальные видят состояние игры.
- При `401 invalid_session`, `403 kicked` или `404 not_found` клиент очищает сессию и возвращается на главный экран.

### 16.4. Прочее
- Тема тёмная/светлая; по умолчанию **тёмная**; выбор сохраняется в `localStorage`; кнопка в шапке (на mobile переносится в голосовые кнопки).
- Таймер хода (оставшиеся секунды, красный при ≤ 3 c), синхронизация с сервером через `serverNow`.
- Лента событий (до 60 строк).
- Экспорт логов: генерация HTML-файла с канвас-изображениями поля на каждом шаге, событиями и сообщениями (открывается в Word → DOCX).
- Результаты → PNG (SVG foreignObject, fallback — ручной SVG с логотипом).
- Сессия участника хранится в `sessionStorage`; при её отсутствии восстанавливается из `localStorage`; при выходе/ошибке сессии очищается.
- Голос: микрофон по умолчанию **выключен**, динамик **включён**; воспроизведение разблокируется по первому `pointerdown`/`keydown` (требование браузеров).

---

## 17. ЧАТ

- Общий (`scope=all`) и командный (`scope=team`, только для игроков своей команды).
- Наблюдатели пишут только в общий; судья тоже.
- Лимит текста 280 символов; история 200 сообщений; кнопка «Выключить» (скрывает историю до момента включения).
- Новые сообщения определяются по id; чат отключён, если игра завершена.

---

## 18. ГОЛОСОВОЙ ЧАТ (WebRTC)

- Требования: secure context (HTTPS), `getUserMedia`, `RTCPeerConnection`.
- **Perfect negotiation:** инициатор = меньший participantId, polite = больший; офферы/ответы/ICE передаются через БД (`voice_signals`) с поллингом 1 c.
- Сигналы: `offer`, `answer`, `ice`, `hangup`, `renegotiate`; payload ≤ 200 КБ.
- ICE-серверы: из env (`VOICE_ICE_SERVERS` JSON или VOICE_STUN_URLS/VOICE_TURN_URLS), fallback — парсинг `turnserver.conf`; STUN Google всегда дефолтный.
- Кнопки: микрофон (вкл/выкл), динамик (mute), судья — глобальное отключение голоса (`hangup` всем).
- Закрытие peer при disconnect (12 c), failed/closed.
- При 401/404 голосового API — «Сессия устарела» и возврат домой.

---

## 19. АДМИНИСТРИРОВАНИЕ И СТРАНИЦЫ

- `/admin/rooms/` — админ-панель: список комнат (код, матч, счёт, ход, участники), поиск, копирование, удаление (одиночное/массовое). Без авторизации (внутренний инструмент).
- `/judge-room-creation` — создание комнаты судьи: команды, имя, авто-заполнение ботами, сложность.
- Судья в комнате: «Начать игру», «Пауза/Продолжить», панель участников (кик, кик+бот, сложность бота, +бот в пустую роль), глобальный голос.
- Служебные маршруты `__dbg/*` собирают отладочные события клиента в файл; на игровую логику не влияют и могут отсутствовать в воспроизведении.

---

## 20. КОНФИГУРАЦИЯ И ДЕПЛОЙ

### 20.1. Переменные окружения
| var | значение |
|---|---|
| PORT | 3000 (по умолчанию) |
| DATABASE_URL | postgresql://... (обязательна) |
| NODE_ENV | production скрывает детали ошибок |
| PUBLIC_HOST | домен (Caddy) |
| VOICE_STUN_URLS | stun:stun.l.google.com:19302,... |
| VOICE_TURN_URLS | turn:...?transport=udp,tcp / turns:... |
| VOICE_TURN_USERNAME / VOICE_TURN_CREDENTIAL | учётка TURN |
| VOICE_ICE_SERVERS | JSON-массив (приоритет) |

### 20.2. Docker Compose
- `db`: postgres:16-alpine, volume `postgres_data`, healthcheck pg_isready.
- `app`: node:24-alpine, `npm i dotenv express nanoid pg`, копирует server.js, bot.names.js, turnserver.conf, public, src; PORT=3000.
- `coturn`: coturn/coturn:4.6.3, порты 3478(tcp/udp), 5349, relay 49160-49200, конфиг `turnserver.conf`.
- `caddy`: caddy:2.10-alpine, 80/443, `Caddyfile` (localhost → app:3000; `$PUBLIC_HOST` → app:3000 с zstd/gzip).
- `ensureDatabaseExists` автоматически создаёт БД, если она отсутствует (подключение к `postgres`).
- **Точные команды сборки и запуска для всех режимов — в разделе 26.**

### 20.3. Основные runtime-константы (сводка)
| константа | значение | где |
|---|---|---|
| BOARD_ROWS / BOARD_COLS | 7 / 13 | shared.rules |
| GOALS_LEFT / GOALS_RIGHT | C1,D1,E1 / C13,D13,E13 | shared.rules |
| SNITCH_SPAWNS | A1,G1,A7,G7,A13,G13 | constants |
| TURN_TIMEOUT_MS | 15000 | constants |
| PLANNED_TURNS | true | constants |
| ENFORCE_QUAFFLE_STEAL_LOCKS | true | constants |
| Duel bar period | 2200 мс | app.ui.js |
| Polling игры | 2000 мс | app.main.js |
| Polling голоса | 1000 мс | app.main.js |
| Гол | +10 | везде |
| Снитч | +30 | везде |
| Победа | ≥ 100 | finalizeStep |
| Чат | ≤ 280 симв., 200 сообщений | api-core |
| События в ленте | последние 20 | api-core |

### 20.4. Прочие серверные лимиты и размеры
| Параметр | Значение |
|---|---|
| JSON body limit | 64 КБ (`express.json`) |
| Voice payload | ≤ 200 000 байт |
| Voice poll | до 50 сигналов за запрос |
| Хранение voice-сигналов | 2 часа (старые удаляются при poll) |
| Текст чата | ≤ 280 символов |
| Хранение чата | последние 200 сообщений на игру |
| Чат в состоянии | последние 80 сообщений |
| События в состоянии | последние 20 |
| Список комнат в админке | до 200 |
| Никнейм | 1–24 символа |
| Код комнаты | 6 символов |
| Поле | 7 × 13 = 91 клетка |
| Видимость разрешённой дуэли в state | 10 секунд после разрешения |
| Таймаут хода и дуэли | 15 000 мс |
| Период дуэльного прогресс-бара | 2 200 мс |
| Polling состояния игры | 2 000 мс |
| Polling голосовых сигналов | 1 000 мс |

---

## 21. ТЕКСТЫ И ЛОКАЛИЗАЦИЯ

Все пользовательские строки на русском. Названия ролей: Вратарь, Ловец, Охотник 1/2, Загонщик.
Буквы на фишках: В, Л, О1, О2, З.
Тосты и ошибки API — человекочитаемые сообщения (например, `too_far` → «Слишком далеко», `steal_locked` → «Нельзя выхватить квоффл сразу после смены владельца»).
Полный список кодов ошибок API (важно для клиента):
`invalid_teams, nickname_required, invalid_team, invalid_role, invalid_code, not_found, invalid_session, kicked, game_finished, game_paused, game_not_started, role_taken, cell_taken, cell_reserved, cell_occupied_by_ball, role_change_disabled, observer_cannot_plan/end/move/pickup/steal/throw/start, role_cannot_plan/end/move/pickup/steal/throw/pass/hit, illegal_move, cannot_enter_goal, no_position, invalid_position, invalid_target, invalid_action, invalid_bludger, too_far, not_opponent_goal, no_quaffle, already_holding, quaffle_already_taken, quaffle_not_held, not_opponent, steal_cooldown, steal_locked, turn_ended, already_moved, action_already_used, opponent_turn_ended, opponent_action_unavailable, turn_timed_out, use_plans, request_in_flight, duel_active, duel_already_created, not_participant, invalid_duel, invalid_score, alreadySubmitted, not_judge, not_bot, invalid_enabled, voice_disabled, not_allowed, not_same_game, payload_too_large, invalid_kind, invalid_to, empty_text, invalid_scope, observer_cannot_team_chat, team_not_in_game, slot_taken, invalid_slot, invalid_id, invalid_ids, no_ids, code_generation_failed, db_error, conflict, db_unreachable`.

---

## 22. ТЕСТЫ

- `test/quaffle-duels.test.js` (юнит): сбор кандидатов на steal/pickup, фазы, stunned-фильтры, ничьи дуэлей (steal → держатель, pickup → квоффл свободен).
- `test/quaffle-duel-bot.e2e.test.js` (e2e): создание комнаты судьи, вход игрока, fill ботами, старт, детерминированный фикс-позиции, turn/end со steal, создание дуэли, submit счёта 90 → дуэль разрешена, winner записан, state отражает результат.
- Требование при воспроизведении: тесты проходят `node --test`.

---

## 23. ПЕРЕЧЕНЬ АССЕТОВ (изображения)

| файл | назначение |
|---|---|
| public/src/board.svg | художественное поле (viewBox ~937.75×583.09; группа g459; клетки вложенными translate) |
| public/src/logo.svg | логотип (шапка, экспорт PNG) |
| public/src/bg.jpeg | фоновое изображение (используется в стилях/превью) |
| public/src/spectating.png | изображение «наблюдение» (используется в UI главного экрана) |

При воссоздании игры без этих ассетов допустимо сгенерировать аналогичные: SVG-поле 7×13 с разметкой, SVG-логотип «Квиддич», фоновое изображение стадиона.

---

## 24. КЛЮЧЕВЫЕ ИГРОВЫЕ ПРАВИЛА — ШПАРГАЛКА ДЛЯ РЕАЛИЗАЦИИ

1. Шаг выполняется, когда ВСЕ активные игроки отправили заявку или истёк таймаут 15 с.
2. Действие до/после хода определяется `actionFirst` (по времени выбора в UI).
3. Любой спор за объект — дуэль (0–100); ничьи: держатель/статус-кво сохраняется, квоффл/снитч остаются свободными.
4. Гол охотника возможен только с расстояния 2 в кольцо соперника; вратарь может «прочитать» бросок, встав в кольцо (сейв), даже если бросок был до его хода.
5. Выхват заблокирован только на следующем шаге после смены владельца (S+1); на шаге S+2 уже разрешён (lock + cooldown).
6. Бладжер летит по прямой/диагонали 1–3, оглушает первого на пути; оглушённый пропускает шаг; держатель роняет квоффл.
7. Снитч невидим, пока ловцы далеко (≥3); виден при ≤2; прогресс: +10 на дистанции 1, +5 на дистанции 2 за шаг; поимка = 100 (дуэль при двух одновременных); респаун через 3 шага по максимуму `min(dA,dB)×100+(dA+dB)`, прогресс сбрасывается при респауне, а не при поимке.
8. Победа при 100+ очках; снитч = 30, гол = 10.
9. Одна клетка = один игрок = одна заявка на перемещение.
10. Все состояния мячей и lock-поля сохраняются в таблице `games`; снапшоты каждого шага — в `game_state_snapshots`.

---

## 25. РЕКОМЕНДАЦИИ ДЛЯ LLM ПРИ ВОСПРОИЗВЕДЕНИИ

1. Сначала реализовать `shared.rules.js` (чистые функции правил) — на них строятся сервер и клиент.
2. Реализовать движок шага строго по разделу 9 (фазы pre/post, дуэли, снитч, бладжеры, финализация).
3. Реализовать дуэли как отдельный модуль с таймаутом и автозаполнением счетов ботов.
4. Реализовать API полностью по разделу 14 (это контракт клиента и сервера).
5. Клиент — polling-архитектура (2 c), инкрементальный рендер фишек, дуэльный оверлей, чат, голос (WebRTC perfect negotiation).
6. Хранить снапшоты шагов — это основа логов и экспорта.
7. Покрыть тестами дуэли и e2e-сценарий «игрок vs бот».

---

## 26. СБОРКА, ЗАПУСК И ДЕПЛОЙ (БЕЗ ИЗМЕНЕНИЯ КОМАНД)

### 26.1. Главный принцип
LLM должна воспроизвести приложение так, чтобы **не пришлось менять ни `Dockerfile`, ни команды запуска**.
Для этого достаточно сохранить:

1. `server.js` — единственная точка входа в корне.
2. Весь серверный код — внутри `src/` (любая вложенность).
3. Весь клиентский код — внутри `public/`.
4. `bot.names.js` и `turnserver.conf` — в корне.
5. Отсутствие `package.json`/`node_modules` в репозитории: зависимости ставит Dockerfile.
6. Никаких новых корневых каталогов, которые нужно было бы добавлять в `COPY`.

### 26.2. Эталонный `Dockerfile` (не менять)
```dockerfile
FROM node:24-alpine

WORKDIR /app

RUN npm init -y >/dev/null \
  && npm pkg set type=commonjs >/dev/null \
  && npm i --omit=dev dotenv@16.6.1 express@4.21.2 nanoid@5.1.5 pg@8.16.3 >/dev/null

COPY server.js ./server.js
COPY bot.names.js ./bot.names.js
COPY turnserver.conf ./turnserver.conf
COPY public ./public
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
```
Следствия:
- `src/` и `public/` копируются рекурсивно — любые новые подпапки внутри них попадут в образ автоматически.
- Код должен быть CommonJS (`require`/`module.exports`), т.к. задано `type=commonjs`.
- Нельзя использовать ESM-синтаксис `import` на сервере и нельзя требовать новые npm-пакеты.

### 26.3. Вариант A — полный стек через Docker Compose (основной)
Файлы: `docker-compose.yml`, `Caddyfile`, `turnserver.conf`, `.env.voice-stack`.

```bash
cp .env.voice-stack.example .env.voice-stack
# отредактировать .env.voice-stack (см. 26.7)
docker compose up -d --build
```

Что поднимается:
- `db` — PostgreSQL 16, volume `postgres_data`, healthcheck `pg_isready`;
- `app` — сборка из `Dockerfile`, зависит от здоровой БД, читает `.env.voice-stack`;
- `coturn` — TURN-релей (3478/tcp+udp, 5349/tcp, 49160–49200/tcp+udp), конфиг `turnserver.conf`;
- `caddy` — 80/443, проксирует на `app:3000`, автоматический HTTPS для `PUBLIC_HOST`.

Проверка:
```bash
curl -fsS http://localhost/api/health        # {"ok":true}
docker compose ps
```
Открыть `https://<PUBLIC_HOST>/`.

Остановка:
```bash
docker compose down        # данные сохраняются
docker compose down -v     # удалить данные (volume)
```

Windows PowerShell (тот же результат, другой скрипт):
```powershell
.\scripts\start-voice-stack.ps1
```
Скрипт сам копирует `.env.voice-stack.example` → `.env.voice-stack` при первом запуске и выполняет:
```bash
docker compose --env-file .env.voice-stack -f docker-compose.voice-stack.yml up -d --build
```

### 26.4. Вариант B — host-network (`docker build` + `docker run`)
Файлы: `.env.voice-host`, `turnserver.tls.conf.example`, `scripts/restart-host-voice.sh`.

```bash
cp .env.voice-host.example .env.voice-host
# заполнить .env.voice-host (см. 26.7)
chmod +x scripts/restart-host-voice.sh
./scripts/restart-host-voice.sh .env.voice-host
```
Скрипт выполняет ровно следующее (менять не нужно):
```bash
docker build -t "$APP_IMAGE" .
docker rm -f "$APP_CONTAINER" || true
docker rm -f "$TURN_CONTAINER" || true
docker run -d --restart=always --name "$APP_CONTAINER" --network host \
  -e DATABASE_URL="$DATABASE_URL" -e PORT="$PORT" \
  -e VOICE_STUN_URLS="${VOICE_STUN_URLS:-}" \
  -e VOICE_TURN_URLS="$VOICE_TURN_URLS" \
  -e VOICE_TURN_USERNAME="$VOICE_TURN_USERNAME" \
  -e VOICE_TURN_CREDENTIAL="$VOICE_TURN_CREDENTIAL" \
  "$APP_IMAGE"
docker run -d --restart=always --name "$TURN_CONTAINER" --network host \
  -v "$TURN_CONFIG_PATH:/etc/coturn/turnserver.conf:ro" \
  -v "$TURN_CERTS_DIR:/etc/coturn/certs:ro" \
  coturn/coturn:4.6.3 -c /etc/coturn/turnserver.conf
```
Требования: PostgreSQL доступен по `DATABASE_URL` (обычно `localhost:5432`); в `TURN_CERTS_DIR` лежат `fullchain.pem` и `privkey.pem`; приложение слушает `PORT` (например, 8082); внешний reverse-proxy (Caddy/nginx) не входит в этот скрипт.

### 26.5. Вариант C — только TURN
```bash
export TURN_REALM=voice.example.com
export TURN_USERNAME=kwidditch
export TURN_PASSWORD=change-me-now
export TURN_EXTERNAL_IP=203.0.113.10
docker compose -f docker-compose.turn.yml up -d
```
Открыть порты: `3478/tcp`, `3478/udp`, `5349/tcp`, `49160–49200/tcp`, `49160–49200/udp`.

### 26.6. Совместимость при разбиении кода (важно!)
- Новые серверные файлы класть в `src/...` — Dockerfile скопирует их автоматически.
- Новые клиентские файлы класть в `public/...`; подключать их в `public/index.html` тегами `<script defer>` в правильном порядке (раздел 27.6).
- Старые пути `require("./game-steps")`, `require("./duels")`, `require("./bot-logic")`, `require("./api-core")`, `require("./api-actions")`, `require("./api-pages")` **обязаны работать** — для этого оставить тонкие barrel-файлы (раздел 27.5).
- `server.js` не менять по смыслу: `dotenv` → `express` → `setMaybeAdvanceStep` → `app.use(express.json)` → `express.static(public)` → `app.use(apiRouter)` → `ensureDatabaseExists()` → `initDb()` → `listen(PORT)`.

### 26.7. Переменные окружения по режимам
| Переменная | Compose (вариант A) | Host-network (вариант B) |
|---|---|---|
| `POSTGRES_DB` | имя БД (например `quidditch`) | не используется приложением |
| `POSTGRES_USER` | пользователь БД | не используется приложением |
| `POSTGRES_PASSWORD` | пароль БД | не используется приложением |
| `DATABASE_URL` | `postgresql://USER:PASSWORD@db:5432/DB` | `postgresql://USER:PASSWORD@localhost:5432/DB` |
| `PORT` | не нужен (внутри 3000) | порт приложения, например `8082` |
| `PUBLIC_HOST` | домен для Caddy | — |
| `VOICE_STUN_URLS` | `stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302` | то же |
| `VOICE_TURN_URLS` | `turn:DOMAIN:3478?transport=udp,turn:DOMAIN:3478?transport=tcp,turns:DOMAIN:5349?transport=tcp` | то же |
| `VOICE_TURN_USERNAME` | логин TURN | логин TURN |
| `VOICE_TURN_CREDENTIAL` | пароль TURN | пароль TURN |
| `APP_IMAGE`, `APP_CONTAINER`, `TURN_CONTAINER` | — | имена образа/контейнеров |
| `TURN_CONFIG_PATH`, `TURN_CERTS_DIR` | — | пути к конфигу и сертификатам |

**Критично:** в Compose хост БД — `db`, а не `localhost`. `POSTGRES_PASSWORD` и пароль в `DATABASE_URL` должны совпадать. Логин/пароль в `turnserver.conf` должны совпадать с `VOICE_TURN_USERNAME`/`VOICE_TURN_CREDENTIAL`.

Пример `.env.voice-stack`:
```env
POSTGRES_DB=quidditch
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong-password
DATABASE_URL=postgresql://postgres:strong-password@db:5432/quidditch
PUBLIC_HOST=quidditch.example.com
VOICE_STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
VOICE_TURN_URLS=turn:quidditch.example.com:3478?transport=udp,turn:quidditch.example.com:3478?transport=tcp,turns:quidditch.example.com:5349?transport=tcp
VOICE_TURN_USERNAME=kwidditch
VOICE_TURN_CREDENTIAL=change-me-now
```

### 26.8. Чек-лист после запуска
1. `GET /api/health` → `{"ok":true}`.
2. `GET /api/meta` → есть `teams` (4), `roles` (5), `botDifficulties` (3), `voiceIceServers`.
3. Создать комнату, войти, заполнить ботами, нажать «Начать игру», сделать ход — счёт/позиции меняются.
4. Голос: страница открыта по HTTPS, микрофон разрешён, TURN доступен.
5. Логи: `GET /api/games/:code/logs` возвращает снапшоты и события.

---

## 27. ОБЯЗАТЕЛЬНОЕ РАЗБИЕНИЕ НА ФАЙЛЫ ≤ 500 СТРОК

### 27.1. Правило
**Ни один файл кода не должен превышать 500 физических строк.** Это относится к `.js`, `.css`, `.html`.
Если модуль разрастается — выносить по ответственности (правила, фазы шага, дуэли, API-роуты, UI-блоки).
Дробление не должно менять поведение и публичные пути импорта.

### 27.2. Файлы текущего проекта, которые НАРУШАЮТ лимит
| Файл | Строк | Требуется |
|---|---:|---|
| `public/app.ui.js` | 2643 | разбить |
| `src/game-steps.js` | 2205 | разбить |
| `public/app.main.js` | 2030 | разбить |
| `public/app.css` | 1789 | разбить |
| `src/api-actions.js` | 1705 | разбить |
| `src/api-core.js` | 935 | разбить |
| `src/bot-logic.js` | 840 | разбить |
| `src/duels.js` | 738 | разбить |

Остальные файлы уже ≤ 500 строк (`src/game-logic.js` 377, `src/db-init.js` 357, `src/api-pages.js` 338, `public/index.html` 375, `public/app.dom.js` 363, `public/shared.rules.js` 321, `public/messages.js` 279, `src/utils.js` 256, `public/app.state.js` 203, `public/app.api.js` 145, `src/constants.js` 120, `src/auth.js` 76, `src/db.js` 48, `src/game-events.js` 15, `src/api.js` 14, тесты 241/271).

### 27.3. Обязательная карта серверных файлов
Все пути — внутри `src/` (Dockerfile копирует каталог целиком).

| Файл | Ответственность | Ориентир, строк |
|---|---|---:|
| `server.js` | точка входа, Express, static, start | ≤ 60 |
| `src/constants.js` | константы (без изменений) | 120 |
| `src/utils.js` | утилиты (без изменений) | 256 |
| `src/db.js` | пул, `ensureDatabaseExists` | 48 |
| `src/db-init.js` | схема БД (при необходимости разбить на `db-schema-core.js` + `db-schema-extras.js`) | 357 |
| `src/auth.js` | сессии и middleware | 76 |
| `src/game-events.js` | `insertGameEvent` | 15 |
| `src/game-logic.js` | легальные ходы, мячи, снапшоты | 377 |
| `src/steps/turn-state.js` | `ensureTurnState`, `ensureGameStartedEffective` | ≤ 150 |
| `src/steps/prepare.js` | `prepareStepState` | ≤ 200 |
| `src/steps/movement.js` | `resolveMoveCollisions`, `applyMovement` | ≤ 160 |
| `src/steps/pickup-steal.js` | `processPickupAndStealPhase` + сборщики кандидатов | ≤ 300 |
| `src/steps/actions.js` | `processPlayerActions` | ≤ 400 |
| `src/steps/goal.js` | `resolvePendingGoal` | ≤ 130 |
| `src/steps/duel-collectors.js` | `collectThrowStealCandidates`, `collectHitBludgerContenders`, `createThrowStealDuels`, `createHitBludgerDuels` | ≤ 280 |
| `src/steps/snitch.js` | `processSnitchPhase` | ≤ 180 |
| `src/steps/bludgers.js` | `processBludgersAndStun` | ≤ 140 |
| `src/steps/finalize.js` | `finalizeStep` | ≤ 190 |
| `src/steps/advance.js` | `maybeAdvanceStep` (оркестрация фаз) | ≤ 300 |
| `src/steps/timeouts.js` | `expireOldTurns`, `forceExpireTurnsIfTimedOutClient`, `autoEndTurnsInGame` | ≤ 220 |
| `src/steps/index.js` | реэкспорт всех шагов | ≤ 40 |
| `src/duels/winner.js` | `pickDuelWinner`, `stableIndexFromId` | ≤ 140 |
| `src/duels/store.js` | `insertDuelWithParticipants`, `expireOldDuels` | ≤ 220 |
| `src/duels/throw-resolution.js` | `resolveQuaffleThrow` | ≤ 150 |
| `src/duels/resolve-quaffle.js` | ветки pickup/steal/throw_steal | ≤ 320 |
| `src/duels/resolve-snitch.js` | ветка snitch | ≤ 160 |
| `src/duels/resolve.js` | диспетчер `resolveDuelIfReady` | ≤ 180 |
| `src/duels/index.js` | реэкспорт | ≤ 40 |
| `src/bots/plan.js` | `planBotTurn` | ≤ 350 |
| `src/bots/sanitize.js` | `sanitizeBotPlan`, проверки линии | ≤ 170 |
| `src/bots/run.js` | `runBotsForGame`, `runBotsInGameClient`, `maybeRunBots` | ≤ 300 |
| `src/bots/index.js` | реэкспорт | ≤ 40 |
| `src/api.js` | сборка роутера (без изменений) | 14 |
| `src/api/meta-health.js` | `/api/health`, `/api/meta` | ≤ 80 |
| `src/api/games-create.js` | `POST /api/games`, `POST /api/judge/games` | ≤ 160 |
| `src/api/state.js` | `GET /api/games/:code/state` (роут) | ≤ 200 |
| `src/api/state-builder.js` | сборка payload состояния, `takenRoles`, `turnStates`, `duel` | ≤ 300 |
| `src/api/join.js` | `POST /api/games/:code/participants`, `bots/fill` | ≤ 240 |
| `src/api/chat.js` | `POST /api/participants/:id/chat` | ≤ 110 |
| `src/api/voice.js` | voice poll/send, judge voice | ≤ 220 |
| `src/api/logs.js` | `GET /api/games/:code/logs` | ≤ 100 |
| `src/api/admin.js` | админ-комнаты | ≤ 120 |
| `src/api/core.js` | агрегатор core-роутов | ≤ 50 |
| `src/actions/validators.js` | валидация действий для turn/end | ≤ 400 |
| `src/actions/plan-move.js` | `POST /plan/move` | ≤ 200 |
| `src/actions/turn-end.js` | `POST /turn/end` | ≤ 260 |
| `src/actions/start.js` | `POST /game/start` | ≤ 90 |
| `src/actions/duel-submit.js` | `POST /quaffle/steal/submit` | ≤ 220 |
| `src/actions/remove-participant.js` | `removeParticipantTx`, `DELETE /participants/:id` | ≤ 200 |
| `src/actions/legacy.js` | `/move`, `/quaffle/pickup|steal|throw` (легаси) | ≤ 380 |
| `src/actions/judge.js` | pause/kick/bot/difficulty | ≤ 420 |
| `src/actions/index.js` | агрегатор action-роутов | ≤ 50 |
| `src/pages/admin-page.js` | HTML админ-комнат | ≤ 220 |
| `src/pages/judge-page.js` | HTML создания комнаты судьи | ≤ 150 |
| `src/pages/debug.js` | `__dbg`-роуты | ≤ 90 |
| `src/pages/index.js` | агрегатор страниц | ≤ 40 |

### 27.4. Обязательная карта клиентских файлов
Все пути — внутри `public/`.

| Файл | Ответственность | Ориентир, строк |
|---|---|---:|
| `public/index.html` | разметка + список `<script>`/`<link>` | 375 |
| `public/shared.rules.js` | правила (UMD, без изменений) | 321 |
| `public/messages.js` | пулы сообщений (без изменений) | 279 |
| `public/app.state.js` | глобальный `state`, TEAMS/ROLES, помощники | 203 |
| `public/app.api.js` | fetch-обёртки | 145 |
| `public/app.dom.js` | `els`, темы, тосты, сессии, view | 363 |
| `public/app.board.layout.js` | парсинг `board.svg`, fallback-раскладка | ≤ 200 |
| `public/app.board.build.js` | построение сетки, `renderBoardSnapshotToCanvas` | ≤ 180 |
| `public/app.board.render.js` | реконсиляция фишек/мячей, подсветки, `renderPieces` | ≤ 450 |
| `public/app.board.click.js` | обработчик клика по полю (перемещение/цели) | ≤ 450 |
| `public/app.actions.ui.js` | `updateQuaffleUi`, видимость кнопок | ≤ 300 |
| `public/app.duel.ui.js` | оверлей дуэли, анимация, результаты дуэли | ≤ 300 |
| `public/app.results.ui.js` | таблица результатов + экспорт PNG | ≤ 380 |
| `public/app.participants.ui.js` | участники/наблюдатели/«Я», судейские кнопки | ≤ 300 |
| `public/app.chat.ui.js` | рендер чата, вкладки, история | ≤ 180 |
| `public/app.messages.ui.js` | выбор фраз, `captureServerEvents`, `captureGameEvents` | ≤ 200 |
| `public/app.room.ui.js` | `renderRoom`, таймер, статус, старт-лок | ≤ 300 |
| `public/app.ui.js` | тонкий агрегатор/инициализация UI (или удалить из index.html) | ≤ 60 |
| `public/app.home.js` | `setupHome`, формы создать/войти/наблюдать | ≤ 240 |
| `public/app.loop.js` | `refreshRoomOnce`, polling, `goRoom`/`goHome`, hashchange | ≤ 220 |
| `public/app.voice.core.js` | peer, perfect negotiation, ICE, сигналы | ≤ 380 |
| `public/app.voice.ui.js` | кнопки микрофона/динамика, poll, глобальный голос | ≤ 300 |
| `public/app.handlers.js` | обработчики действий, завершение хода, старт, пауза | ≤ 450 |
| `public/app.chat.handlers.js` | отправка сообщений, вкладки, вкл/выкл | ≤ 150 |
| `public/app.export.js` | экспорт логов в HTML (канвас-снапшоты) | ≤ 380 |
| `public/app.main.js` | только вызов `bootstrap()` | ≤ 20 |

### 27.5. Barrel-файлы совместимости (обязательно)
Чтобы старые импорты не сломались, оставить в корне `src/` тонкие файлы-агрегаторы:

```js
// src/game-steps.js
module.exports = require("./steps");
```
```js
// src/duels.js
module.exports = require("./duels/index");
```
```js
// src/bot-logic.js
module.exports = require("./bots");
```
```js
// src/api-core.js
module.exports = require("./api/core");
```
```js
// src/api-actions.js
module.exports = require("./api/actions");
```
```js
// src/api-pages.js
module.exports = require("./pages");
```
Каждый такой файл ≤ 15 строк. Внутренние модули экспортируют те же имена функций, что и раньше.
`src/steps/index.js`, `src/duels/index.js`, `src/bots/index.js`, `src/api/core.js`, `src/api/actions.js`, `src/pages/index.js` собирают соответствующие функции.

### 27.6. Порядок подключения скриптов в `public/index.html`
Порядок обязателен (обычные `<script defer>`, не ES-модули):
```
messages.js
shared.rules.js
app.api.js
app.state.js
app.dom.js
app.board.layout.js
app.board.build.js
app.board.render.js
app.board.click.js
app.messages.ui.js
app.chat.ui.js
app.participants.ui.js
app.actions.ui.js
app.duel.ui.js
app.results.ui.js
app.room.ui.js
app.ui.js
app.voice.core.js
app.voice.ui.js
app.home.js
app.chat.handlers.js
app.export.js
app.handlers.js
app.loop.js
app.main.js
```
`app.main.js` содержит только `bootstrap();` и загружается последним.

### 27.7. CSS ≤ 500 строк
`public/app.css` (1789 строк) разбить на модули и подключить отдельными `<link rel="stylesheet">` в `index.html` в порядке:
`app.base.css` (токены, темы, layout), `app.home.css`, `app.board.css`, `app.sidebar.css`, `app.chat.css`, `app.modals.css`, `app.results.css`, `app.responsive.css`.
Каждый файл ≤ 500 строк. Допустимая альтернатива — `app.css` ≤ 30 строк с `@import` остальных (не рекомендуется из-за производительности).

### 27.8. Как проверить лимит
PowerShell:
```powershell
Get-ChildItem -Recurse -File -Path src,public -Include *.js,*.css,*.html |
  ForEach-Object { [pscustomobject]@{ Lines = (Get-Content $_.FullName).Count; File = $_.FullName } } |
  Sort-Object Lines -Descending | Select-Object -First 20
```
Bash:
```bash
find src public -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -print0 \
  | xargs -0 wc -l | sort -n | tail -20
```
Ни один файл не должен превышать 500.

---

## 28. ПРАВИЛА ИГРЫ — ЕДИНЫЙ САМОДОСТАТОЧНЫЙ СВОД

Ниже — все правила в одном месте, без ссылок на код. Этого раздела достаточно, чтобы реализовать геймплей.

**R1. Поле.** 7 строк (A–G) × 13 колонок (1–13). Координата: `A1`…`G13`. Расстояние — Чебышёв.
**R2. Ворота.** Команда A защищает `C1,D1,E1`; команда B — `C13,D13,E13`. На клетки ворот нельзя вставать (кроме вратаря в своей зоне).
**R3. Команды.** 4 дома: Гриффиндор, Пуффендуй, Когтевран, Слизерин. В матче ровно 2 разные команды.
**R4. Роли.** Вратарь, Ловец, Охотник 1, Охотник 2, Загонщик. В каждой команде по одной роли каждого типа.
**R5. Спавн.** Вратарь D1/D13, ловец D5/D9, охотник1 C5/C9, охотник2 E5/E9, загонщик D4/D10 (A/B).
**R6. Стартовые мячи.** Квоффл свободен на D7. Бладжеры на A7 и G7. Снитч скрыт в случайной из A1,G1,A7,G7,A13,G13.
**R7. Ход.** Все активные игроки одновременно отправляют заявку (перемещение + действие до или после перемещения). Шаг выполняется, когда завершили все. Таймаут — 15 с; по истечении заявки очищаются, ход завершается.
**R8. Движение охотника/загонщика.** Прямо на 1–2 клетки или по диагонали ровно на 1–2. Не в ворота.
**R9. Движение ловца.** Любое направление на 1–2 клетки (Чебышёв). Не в ворота.
**R10. Движение вратаря.** Только внутри зоны своих ворот (3×3 вокруг каждого кольца), ровно на 1 клетку.
**R11. Занятость.** Нельзя встать на клетку другого игрока, на клетку мяча (свободный квоффл, бладжер, снитч) и на клетку, зарезервированную другим игроком. Две заявки на одну клетку недопустимы (кто раньше — тот и занял).
**R12. Подбор квоффла.** Свободный квоффл подбирает охотник (или вратарь — `keeper_pickup`) на расстоянии ≤ 1. Один кандидат забирает сразу; двое и более — дуэль `pickup`.
**R13. Авто-подбор вратарём.** Если после шага свободный квоффл оказался на клетке вратаря — вратарь забирает его автоматически.
**R14. Пас.** Только охотник с квоффлом; цель — клетка своего охотника на расстоянии 1–2.
**R15. Бросок вратаря.** На любую клетку в радиусе 1–6. Если там стоит охотник — он ловит (для своего — засчитывается пас).
**R16. Бросок охотника.** Только в кольцо соперника с расстояния ровно 2. Если в кольце стоит вратарь соперника — сейв (вратарь ловит). Если вратаря нет — гол (+10).
**R17. Отложенный гол.** Если охотник бросал «до перемещения», а вратарь в этот же шаг может переместиться в кольцо — гол проверяется после перемещений: вратарь успел встать → сейв; не успел → гол.
**R18. Выхват.** Охотник или вратарь может выхватить квоффл у держателя-соперника (охотника/вратаря) на расстоянии ≤ 1. Все заявившие выхват в одну фазу участвуют в дуэли `steal` против держателя.
**R19. Защита от мгновенного выхвата.** При смене владельца в шаге `S` записываются lock и cooldown = `S`. На шаге `S+1` выхват у нового держателя запрещён (проверка `step = cooldown + 1` / `step = lockStep + 1`); на шаге `S+2` — разрешён.
**R20. Бросок-перехват.** Если держатель бросает, а противник в ту же фазу выхватывает — сначала дуэль `throw_steal`; пока она не разрешена, бросок не применяется. Победил держатель — выполняется его бросок; победил вратарь-атакующий с указанной целью — бросок выполняет вратарь; победил прочий атакующий — квоффл у него, бросок отменён.
**R21. Удар по бладжеру.** Загонщик или вратарь на расстоянии 1 от бладжера бьёт по прямой/диагонали на 1–3 клетки. Нельзя целиться в клетку свободного квоффла. Несколько бьющих по одному бладжеру — дуэль `hit_bludger`. **По каждому бладжеру за шаг применяется не более одного удара.**
**R22. Полёт бладжера.** Первый игрок на линии получает оглушение, бладжер останавливается на его клетке; иначе — в целевой клетке. Бладжеры не могут стоять на одной клетке (при совпадении — ближайшая свободная соседняя).
**R23. Оглушение.** Оглушённый пропускает шаг (его ход завершён). Если он держал квоффл — квоффл выпадает на ближайшую свободную клетку.
**R24. Движение бладжеров.** Каждый шаг — на случайную соседнюю клетку (Чебышёв 1). Запрещено: клетка другого бладжера, клетка свободного квоффла, возврат на свою предыдущую клетку. Второй бладжер дополнительно не может занять прежнюю клетку первого (которая уже освободилась); если после движения позиции совпали — второй остаётся на месте. Ударённый в этом шаге бладжер не двигается; бладжер, стоящий на оглушённом игроке, тоже не двигается и повторно не оглушает.
**R25. Снитч: движение.** Каждый шаг — 1–3 клетки в случайном направлении, не на занятые и не на зарезервированные клетки.
**R26. Снитч: видимость.** Видим, если любой ловец в радиусе ≤ 2. Скрыт, если все ловцы на расстоянии ≥ 3 (или ловцов нет).
**R27. Снитч: прогресс.** При видимом снитче ловец на расстоянии 1 получает +10 за шаг, на расстоянии 2 — +5. Прогресс 0–100.
**R28. Снитч: поимка.** Один ловец достиг 100 — снитч пойман, команда +30, `snitch_caught_by_id`/`snitch_caught_step_no`, снитч скрывается. Прогресс при поимке не сбрасывается (сброс — при респауне). Двое достигли 100 одновременно — дуэль `snitch`; победитель ловит, при ничьей снитч остаётся свободным (прогресс 100 сохраняется, дуэль повторится на следующем шаге).
**R29. Снитч: респаун.** Новый снитч появляется через 3 шага после поимки (`step >= caughtStep + 3`). Клетка выбирается среди свободных (не занятых игроками и не зарезервированных) по максимуму `min(dA,dB) × 100 + (dA + dB)`, где `dA/dB` — расстояния до ловцов; при равенстве — случайная из лучших. Оглушённые ловцы не учитываются. Fallback: свободная точка из `SNITCH_SPAWNS`, затем `A7`.
**R30. Очки.** Гол +10, поимка снитча +30. Победа — при 100+ очках; при равенстве счёта — ничья (`winner_team = null`).
**R31. Дуэли.** Каждый участник отправляет силу 0–100. Побеждает максимум. Ничьи: `steal`/`throw_steal` — держатель сохраняет квоффл; `pickup` — квоффл остаётся свободным; `snitch` — снитч остаётся свободным; `hit_bludger` — побеждает первый претендент.
**R32. Таймаут дуэли.** Если дуэль не разрешена за 15 с: отсутствующие боты получают авто-счёт по сложности, отсутствующие люди — 0. Если отсутствуют все: `steal` — побеждает держатель; иначе победитель выбирается детерминированно по id дуэли.
**R33. Боты.** Три сложности. Параметры: лёгкий — actionRate 0.55, mistakeRate 0.38, погоня за скрытым снитчем 0.05; средний — 0.80/0.18/0.40; сложный — 0.95/0.06/0.95. Сила в дуэли: лёгкий 45±22, средний 62±16, сложный 78±12.
**R34. Наблюдатели.** Не ходят, не пишут в командный чат, видят состояние (кроме скрытых заявок).
**R35. Судья.** Может начать игру, ставить паузу, кикать, заменять ботов, менять сложность, отключать голос. При наличии судьи старт — только по его кнопке.
**R36. Чат.** Общий (все) и командный (только своя команда). До 280 символов; хранится 200 сообщений.
**R37. Голос.** WebRTC, требуется HTTPS и разрешение микрофона; TURN для NAT. Судья может отключить голос всем.
**R38. Статистика.** Ведётся по каждому игроку: подборы, выхваты, пасы, голы, сейвы, снитчи, удары по бладжеру, попадания по игрокам.
**R39. Итоги.** Таблица по командам; очки игрока = голы×10 + снитчи×30; сортировка по очкам и дополнительным показателям.
**R40. Логи.** На каждом шаге сохраняется снапшот поля; события пишутся в `game_events`; экспорт — HTML с изображениями поля по шагам.

### 28.1. Полная серверная валидация заявок
**Общие проверки (plan/move и turn/end):**
- участник существует; не наблюдатель; роль активна; игра не завершена и не на паузе; игра начата; таймаут не истёк; ход не завершён; игрок не оглушён;
- `to` — либо `null`, либо валидная координата; перемещение легально для роли (`illegal_move`);
- целевая клетка не занята мячом (свободный квоффл, оба бладжера, снитч — позиция снитча проверяется независимо от видимости);
- заявка не конфликтует с чужой заявкой на ту же клетку (уникальный индекс `turn_states_unique_planned_to` → 409 `cell_reserved`).

**Отличие `turn/end` от `plan/move`:** только `plan/move` проверяет, что клетка не занята другим игроком (409 `cell_taken`). В `turn/end` такая проверка не выполняется: заявка сохраняется, а коллизия разрешается при выполнении шага (`resolveMoveCollisions`), поэтому перемещение может быть отменено.

**Проверки действий в `turn/end`:**

| actionType | Роль | Обязательные условия | Недопустимые поля |
|---|---|---|---|
| `pickup` | охотник | квоффл свободен; `dist(actionFrom, quaffle) ≤ 1` | `actionTo`, `actionBludger` |
| `keeper_pickup` | вратарь | квоффл свободен; `dist(actionFrom, quaffle) ≤ 1` | `actionTo`, `actionBludger` |
| `steal` | охотник/вратарь | держатель есть и это не я; держатель — охотник/вратарь, не наблюдатель, другой команды; `dist(actionFrom, holderPos) ≤ 1`; нет кулдауна (`step ≠ cooldown+1`); нет лока (`step ≠ lockStep+1` или держатель ≠ lockHolder) | `actionBludger`; `actionTo` только вратарю и только на расстояние 1–6 |
| `throw` | охотник/вратарь | квоффл у меня; `actionTo` задан; вратарь: `1 ≤ dist ≤ 6`; охотник: `actionTo` — кольцо соперника, `dist = 2` | `actionBludger` |
| `pass` | охотник | квоффл у меня; `actionTo` задан; `1 ≤ dist ≤ 2`; в целевой клетке стоит охотник моей команды | `actionBludger` |
| `hit_bludger` | загонщик/вратарь | `actionTo` задан; `actionBludger` = 1 или 2; `dist(actionFrom, bludger) = 1`; цель — прямая/диагональ 1–3 от бладжера; цель ≠ клетка свободного квоффла | — |

**Общие запреты комбинаций:**
- неизвестный `actionType` → `invalid_action`;
- `pass`/`throw`/`hit_bludger` без `actionTo` → `invalid_target`;
- `pickup`/`keeper_pickup` с `actionTo` → `invalid_target`;
- `pass` с `actionBludger` → `invalid_target`;
- `steal` с `actionBludger`, а также `steal` с `actionTo` у не-вратаря → `invalid_target`;
- `hit_bludger` с индексом бладжера не 1/2 → `invalid_bludger`.

**Коды ошибок API (поле `error` в JSON):**

| HTTP | Коды |
|---|---|
| 400 | `invalid_target`, `invalid_action`, `invalid_bludger`, `invalid_to`, `invalid_position`, `no_position`, `illegal_move`, `too_far`, `already_moved`, `no_quaffle`, `already_holding`, `steal_cooldown`, `steal_locked`, `not_opponent_goal`, `not_opponent`, `stunned`, `role_cannot_*`, `observer_cannot_*` (кроме `observer_cannot_team_chat` — тоже 400), `turn_ended`, `use_plans`, `invalid_duel`, `invalid_score`, `invalid_scope`, `empty_text`, `payload_too_large`, `invalid_kind`, `invalid_payload`, `invalid_code`, `invalid_role`, `invalid_team`, `invalid_teams`, `nickname_required`, `role_change_disabled`, `invalid_slot`, `invalid_bot`, `invalid_ids`, `no_ids`, `invalid_participant`, `invalid_judge`, `invalid_enabled`, `invalid_id`, `not_bot`, `cannot_enter_goal`, `action_already_used`, `opponent_turn_ended`, `opponent_action_unavailable` |
| 401 | `invalid_session` |
| 403 | `not_judge`, `not_allowed`, `voice_disabled`, `not_same_game`, `not_participant`, `game_finished`, `game_paused`, `game_not_started`, `kicked` (viewer-сессия не найдена), `observer_cannot_start` |
| 404 | `not_found`, `to_not_found` |
| 409 | `turn_timed_out`, `cell_taken`, `cell_occupied_by_ball`, `cell_reserved`, `quaffle_already_taken`, `quaffle_not_held`, `duel_active`, `duel_already_created`, `slot_taken`, `role_taken`, `game_finished`, `conflict`, `request_in_flight` (клиентский синтетический, до отправки) |
| 500 | `db_error`, `db_unreachable`, `code_generation_failed` |

`role_cannot_*` = `role_cannot_plan`, `role_cannot_move`, `role_cannot_pickup`, `role_cannot_steal`, `role_cannot_throw`, `role_cannot_pass`, `role_cannot_hit`, `role_cannot_end`.
`observer_cannot_*` = `observer_cannot_plan`, `observer_cannot_move`, `observer_cannot_pickup`, `observer_cannot_steal`, `observer_cannot_throw`, `observer_cannot_end`, `observer_cannot_team_chat`.
`cell_reserved` возвращается при нарушении уникального индекса `turn_states_unique_planned_to`; `cell_taken` — при нарушении `participants_unique_pos` или занятости клетки.

**Дуэль (`/quaffle/steal/submit`):**
- дуэль существует; участник входит в `participant_ids`; игра начата и не завершена; `score` — целое 0–100;
- повторная отправка не ошибка: возвращается `alreadySubmitted` без изменения счёта;
- боты получают счёт автоматически; когда счета есть у всех — дуэль разрешается.

**Старт игры:**
- если в комнате есть судья — стартовать может только судья; если судьи нет — любой не-наблюдатель; завершённую игру стартовать нельзя.

**Чат:** `scope` = `all` или `team`; наблюдателю `team` запрещён; текст 1–280 символов; в завершённой игре чат запрещён.
**Голос:** `kind` ∈ {`offer`,`answer`,`ice`,`hangup`,`renegotiate`}; payload ≤ 200 000 байт; оба участника в одной игре; оба не боты; у отправителя голос включён.
**Судья:** только судья; игра не завершена; цель кика — игрок с ролью (не наблюдатель); слот для бота свободен; сложность 1–3.

### 28.2. Статистика — точные правила начисления
| Показатель | Когда увеличивается |
|---|---|
| `stat_quaffle_pickups` | любой успешный подбор: `pickup`, `keeper_pickup`, авто-подбор вратарём, победа в `pickup`-дуэли |
| `stat_quaffle_passes` | пас охотника; бросок вратаря на клетку своего охотника |
| `stat_quaffle_steals` | победа в `steal`/`throw_steal`, если победитель не является прежним держателем |
| `stat_goals_scored` | гол засчитан бросавшему (немедленный post-move, отложенный pre-move, продолжение `throw_steal`) |
| `stat_goals_saved` | вратарь поймал бросок в кольце (немедленно, при отложенном голе, в `throw_steal`) |
| `stat_snitch_catches` | поимка снитча одним ловцом или победа в `snitch`-дуэли |
| `stat_bludger_hits` | каждый успешный удар по бладжеру |
| `stat_bludger_hits_to_players` | удар, который оглушил игрока |
| `snitch_progress` | при видимом снитче: +10 на дистанции 1, +5 на дистанции 2; 0–100; при поимке сохраняется, сброс в 0 при респауне |
| `points` (в итогах) | `голы × 10 + снитчи × 30` |

### 28.3. Крайние случаи и порядок разрешения
1. Если **все активные игроки оглушены** — шаг автоматически продвигается без действий.
2. Если у игрока **нет ни одного легального перемещения и действия** — **клиент** автоматически отправляет пустую заявку и завершает ход. Серверная функция `autoEndTurnsInGame` применяется только в легаси-эндпоинтах, которые при `PLANNED_TURNS=true` отключены.
3. Если в фазе создана **pickup-дуэль**, **steal-дуэль в этой же фазе не создаётся**.
4. В **pre-move** фазе pickup/steal рассматривают кандидатов **из обеих фаз**; для `actionFirst=false` используется позиция **после** перемещения. Это не даёт «спрятать» подбор за перемещением.
5. В **post-move** фазе steal проверяется по позиции держателя **до** перемещения (чтобы перехватить улетающего держателя); если post-кандидатов нет — используется fallback на pre-кандидатов.
6. Победитель **pickup**-дуэли получает квоффл только если он всё ещё свободен в ожидаемой клетке; иначе передача не происходит.
7. Победитель **steal/throw_steal** получает квоффл только если держатель не сменился; иначе передача не происходит. В `throw_steal` при победе держателя выполняется его бросок; при победе вратаря-атакующего с указанной целью — бросок выполняет вратарь; при победе прочих атакующих бросок отменяется.
8. Победитель **snitch**-дуэли ловит снитч только если он ещё не пойман; при ничьей снитч остаётся свободным (прогресс 100 сохраняется, дуэль повторится).
9. Ничьи дуэлей: `steal`/`throw_steal` — держатель сохраняет квоффл; `pickup` — квоффл свободен; `snitch` — снитч свободен; `hit_bludger` — побеждает первый претендент.
10. Таймаут дуэли — 15 с; отсутствующие боты получают авто-счёт, люди — 0; если отсутствуют все: `steal` — побеждает держатель, иначе победитель по стабильному индексу от id дуэли.
11. В проверке готовности шага учитываются только активные дуэли `steal`, `pickup`, `throw_steal`, `snitch`. Дуэль `hit_bludger` в этот список не входит, но её создание в фазе тоже приводит к early return: шаг продолжится после разрешения этой дуэли (удар применит победитель).
12. В игре не может быть двух активных дуэлей одного `kind`; на один конфликт (`step`, `kind`, `target`) — одна дуэль.
13. Отложенный гол: если после перемещений вратарь встал в кольцо — сейв; если нет — гол. Если до разрешения квоффл сменил позицию/владельца — отложенный гол отменяется.
14. Бладжер, **случайно прилетевший на клетку игрока**, оглушает его. Бладжер, **стоящий на оглушённом игроке**, не двигается.
15. Удар бладжера останавливается на **первом игроке на линии** (союзник или противник). Если конечная клетка совпала с другим бладжером — выбирается ближайшая свободная соседняя; если такой нет — бладжер остаётся на месте.
16. Оглушённые ловцы **не учитываются** при определении видимости снитча и не получают прогресс. Если ловцов нет — снитч скрыт.
17. При поимке снитча: `revealed=false`, прогресс ловцов сохраняется (у поймавшего 100); респаун через 3 шага, и уже при респауне прогресс всех ловцов сбрасывается в 0. Клетка — максимум `min(dA,dB) × 100 + (dA + dB)` среди свободных; оглушённые ловцы не учитываются; fallback — `SNITCH_SPAWNS`, затем `A7`.
18. Если обе команды достигли 100+ — побеждает команда с большим счётом; при равенстве — ничья (`winner_team = null`).
19. При выходе/кике участника: активная дуэль с его участием разрешается в пользу соперника; в `pickup`-дуэли победитель получает квоффл (если он свободен в ожидаемой клетке), в `steal`/`throw_steal` — если держатель не сменился. Если уходящий держал квоффл — мяч падает на ближайшую свободную клетку (учитываются игроки и оба бладжера). При этом сбрасывается **lock**, а `quaffle_steal_cooldown_step_no` **не** меняется; шаг может продвинуться.
20. Принудительный захват роли (`force`) удаляет прежнего участника (бота — молча) с теми же последствиями для квоффла/дуэлей.
21. Таймаут хода: если есть активная дуэль (`steal`/`pickup`/`throw_steal`/`snitch`), таймаут **ничего не делает** — заявки сохраняются, ход не завершается, шаг ждёт разрешения дуэли. Без активных дуэлей всем незавершившим ставится `ended=true`, очищаются `planned_*`, `moved=false`, `action_reserved=false`, и вызывается `maybeAdvanceStep`.
22. Пауза блокирует ходы, таймауты и ботов; снятие паузы сбрасывает таймер шага.
23. Боты действуют автоматически: после хода человека, при заполнении комнаты и при запросе состояния; в дуэлях ставят счёт сами.
24. Наблюдатели не ходят, не занимают роли и не пишут в командный чат. Судья — наблюдатель с правами и не может играть за роль.
25. Счётчики `snitch_reveal_count`/`snitch_hide_count` увеличиваются только при смене видимости (появление/скрытие), а не каждый шаг. При поимке снитча `snitch_hide_count` **не** увеличивается (скрытие из-за поимки не считается «уходом»).
26. Проверка победы выполняется при финализации шага; если дуэль довела счёт до 100, повторный проход шага финализирует игру.
27. **Особенность текущей реализации `hit_bludger`:** после разрешения дуэли удар применяет **победитель** (`duel.winner_id`); остальные претенденты пропускаются. При ничьей `winnerId = bestIds.sort()[0]`, то есть лексикографически первый id из лучших, а не первый по `created_at`. Удар не применяется, если победитель к моменту повторного прохода выбыл/оглушён.
28. Оглушение от **удара** действует немедленно (игрок не выполняет оставшиеся действия текущего шага) и сохраняется на следующий шаг; оглушение от **случайного наезда** бладжера применяется в конце шага и пропускает следующий шаг.
29. Повторный проход шага после разрешения дуэли **идемпотентен**: перемещения и pre-действия уже применены, а проверки держателя/позиции не дают применить их повторно.
30. Если на **снитч-фазе** создана дуэль, post-действия и движение бладжеров в этом проходе **не выполняются**; они выполнятся после разрешения дуэли.
31. В идущую игру можно войти, если она не завершена: новый участник получает спавн и `turn_state`; боты пересчитываются. В завершённую игру вход запрещён.
32. Код комнаты приводится к верхнему регистру; поиск и вход регистронезависимы.
33. Судья создаётся в команде A как наблюдатель (`is_observer=true`, `is_judge=true`, `role=null`) и не занимает игровую роль.
34. При создании комната имеет `started=false`; до старта ходы недоступны. Старт выставляет `started_at` и `step_started_at`.
35. Удаление комнаты каскадно удаляет участников, ходы, дуэли, события, снапшоты, чат и voice-сигналы (`ON DELETE CASCADE`).
36. Снапшот шага сохраняется один на шаг (`ON CONFLICT DO NOTHING`) и содержит счёт, позиции мячей, участников с позициями, оглушением и прогрессом снитча.
37. Клетки ворот запрещены только **игрокам**; мячи (квоффл после броска, бладжеры, снитч) могут на них находиться.
38. При движении бладжеры избегают клетку **свободного квоффла**, а снитч — нет (он избегает только игроков и зарезервированные клетки). Бладжер и снитч могут оказаться на одной клетке; игроки не могут делить клетку с мячом (кроме удержания квоффла).
39. По каждому бладжеру за шаг применяется **не более одного удара**; повторные заявки на этот бладжер игнорируются.
40. Пока дуэль `throw_steal` не разрешена, **бросок не применяется**; после разрешения применяется результат дуэли (бросок держателя, бросок вратаря-перехватчика или чистовой выхват).
41. Одиночный подбор квоффла **не защищает от выхвата в той же фазе**: steal проверяется уже против нового держателя с учётом lock/cooldown.
42. `actionTo` при выхвате вратаря используется **только в `throw_steal`**; в обычной `steal`-дуэли он игнорируется (мяч просто переходит вратарю).
43. Респаун снитча: критерий — максимум `min(dA,dB) × 100 + (dA + dB)`; оглушённые ловцы не учитываются; при равенстве выбирается случайная из лучших клеток; fallback — свободная `SNITCH_SPAWNS`, затем `A7`.
44. Движение бладжеров: второй бладжер не может встать на **прежнюю** клетку первого; при совпадении позиций после движения второй остаётся на месте; бладжер на клетке оглушённого игрока заблокирован и не оглушает повторно.
45. `snitch_hide_count` не увеличивается при поимке снитча; `snitch_reveal_count` увеличивается только при переходе «скрыт → видим».
46. Сборщик steal-кандидатов блокирует выхват при `S ≤ step ≤ S+1`, где `S` — шаг записи lock/cooldown (то есть повторный проход того же шага `S` тоже не даёт выхватить). API-валидация заявки проверяет только `step = S+1`; на шаге `S` новые заявки уже не принимаются.
47. **Известный дефект текущей реализации:** `src/game-steps.js` импортирует `addParticipantsToDuel` и `fillAllDuelScores` из `./duels`, но [`src/duels.js`](src/duels.js:732) их не экспортирует. Воспроизводить эти вызовы нужно с корректной реализацией: `addParticipantsToDuel(client,{gameId,kind,newIds})` добавляет участников к существующей незавершённой дуэли того же `kind` и возвращает `true`, если обновление удалось; `fillAllDuelScores(client,duelRow)` проставляет автосчёт отсутствующим ботам через `botScoreForDuel` и разрешает дуэль при готовности.

### 28.4. Контрольный перечень покрытия правил
Проверено и описано: поле и координаты; ворота и зоны; команды и роли; спавн; стартовые мячи; модель хода и таймаут (включая поведение при активной дуэли); все виды перемещения; занятость клеток и резервирование (в т.ч. разница `plan/move` и `turn/end`); состояния квоффла; подбор, авто-подбор и lock/cooldown при pickup-дуэли; пас; броски вратаря и охотника; голы, сейвы и отложенный гол; выхват и блокировки; бросок-перехват; бладжеры, удары, траектория, оглушение и выпадение квоффла (включая запрет второго бладжера на прежнюю клетку первого); снитч (движение, видимость, прогресс, поимка, дуэль, респаун с точной формулой и сохранением прогресса до респауна); дуэли (5 видов, ничьи, таймаут, автосчёт ботов, победитель `hit_bludger`); точные `meta` событий и глоссарий `outcome`; коды ошибок API и HTTP-статусы; очки и условие победы; боты (3 сложности, поведение, автоходы, `sanitizeBotPlan`); наблюдатели и судья; чат и голос; статистика; итоги; логи и экспорт; выход/кик/захват роли; пауза/старт/таймаут; крайние случаи и известные особенности (включая дефект с неэкспортируемыми `addParticipantsToDuel`/`fillAllDuelScores`).

---

## 29. ПРИЁМОЧНЫЕ КРИТЕРИИ ДЛЯ LLM

Приложение считается воспроизведённым, если выполнены все пункты:

1. **Сборка без изменений:** `docker build -t quid-test .` завершается успешно с текущим `Dockerfile`.
2. **Запуск без изменений команд:** `docker compose up -d --build` (вариант A) или `./scripts/restart-host-voice.sh` (вариант B) поднимают рабочее приложение.
3. **Структура:** `server.js` в корне; весь сервер в `src/`; весь клиент в `public/`; `bot.names.js` и `turnserver.conf` в корне; `package.json` отсутствует.
4. **Лимит строк:** ни один `.js`/`.css`/`.html` файл не превышает 500 строк (проверка — 27.8).
5. **Barrel-совместимость:** старые `require("./game-steps")`, `./duels`, `./bot-logic`, `./api-core`, `./api-actions`, `./api-pages` работают.
6. **Правила:** реализованы все R1–R40 (раздел 28), включая отложенный гол, lock/cooldown, дуэли всех 5 видов, оглушение, снитч-прогресс и респаун.
7. **API:** контракт раздела 14 соблюдён (пути, тела, коды ошибок, формат state).
8. **БД:** схема раздела 15 создаётся идемпотентно, все индексы на месте.
9. **Клиент:** экраны, инкрементальный рендер, дуэльный оверлей, чат, голос, результаты и экспорт работают.
10. **Тесты:** `node --test` проходит (`test/quaffle-duels.test.js`; e2e пропускается без БД или проходит с ней).
11. **Дымовой сценарий:** создать комнату → войти → заполнить ботами → начать → сделать ход → увидеть изменение счёта/позиций/ленты событий.
12. **Никаких новых зависимостей** сверх `dotenv`, `express`, `nanoid`, `pg`.
13. **Коды ошибок:** строковые коды и HTTP-статусы соответствуют 28.1 (включая 409 `cell_reserved`/`cell_taken`/`quaffle_already_taken`, 403 `game_finished`/`game_paused`/`game_not_started`, 401 `invalid_session`).
14. **Известный дефект не воспроизведён:** `addParticipantsToDuel` и `fillAllDuelScores` реализованы и экспортируются из `src/duels.js` (см. 28.3 п.47), а не приводят к `TypeError`.

---

## ПРИЛОЖЕНИЕ A. МАТРИЦА ТРАССИРОВКИ «КОД → СПЕЦИФИКАЦИЯ»

Матрица подтверждает, что каждая функция, влияющая на правила, имеет явное описание в документе.

### A.1. `public/shared.rules.js`
| Функция | Что задаёт | Раздел спецификации |
|---|---|---|
| `BOARD_ROWS`, `BOARD_COLS`, `GOALS_*` | геометрия и ворота | 3.1–3.2 |
| `normalizeCoord`, `coordToRC`, `rcToCoord` | координаты | 3.1 |
| `isChaserRole`, `isKeeperRole`, `isBeaterRole`, `isSeekerRole`, `isMovableRole` | роли | 4.2 |
| `chebyshevDistance` | расстояние | 3.1 |
| `defaultSpawnCoord` | спавн | 3.4 |
| `isAllowedSeekerMove` | движение ловца | 6.2, R9 |
| `isAllowedChaserMove` | движение охотника/загонщика | 6.1, R8 |
| `isAllowedKeeperMove` | движение вратаря | 6.3, R10 |
| `possibleMoves*` | множество ходов | 6, 16.3 |
| `canPickupFreeQuaffle` | подбор | 7.1, R12 |
| `isStealQuaffleLocked` | lock/cooldown | 5.1, R19 |
| `canStealQuaffle` | выхват | 7.2, R18 |
| `canThrowQuaffle` | бросок | 7.4, R15–R16 |
| `canHitBludger` | удар | 7.5, R21 |

### A.2. `src/game-logic.js`
| Функция | Что задаёт | Раздел |
|---|---|---|
| `iterAllCoords`, `ALL_COORDS` | все клетки | 3.1 |
| `findNearestFreeCoord` | выпадение квоффла | 9.2 |
| `canPlannedMove` | легальность заявки | 6, 28.1 |
| `normalizePlannedActionType` | типы действий | 7 |
| `getPositionForParticipant` | позиция/спавн | 3.4 |
| `pickSnitchRespawnCoord` | респаун снитча | R29 |
| `buildGameResults` | итоги и сортировка | 12.3 |
| `hasAnyLegalMove` | автозавершение (легаси) | 28.3 п.2 |
| `canChaserPickup`, `canChaserThrow`, `canKeeperThrow` | проверки действий | 7.1, 7.4 |
| `moveBludgerOnce`, `moveBludgers` | движение бладжеров | R24 |
| `moveSnitchOnce` | движение снитча | R25 |
| `listLegalMoves` | ходы ботов | 11.3 |

### A.3. `src/game-steps.js`
| Функция | Что задаёт | Раздел |
|---|---|---|
| `ensureTurnState`, `ensureGameStartedEffective` | состояние хода | 8.1–8.2 |
| `collectPickupDefenders` | сбор защитников подбора; экспортируется для тестов, в боевом потоке не используется | 7.1 |
| `collectStealCandidatesAgainstHolder` | кандидаты выхвата | 7.2, 28.1 |
| `collectPickupCandidatesAtCoord` | кандидаты подбора | 7.1, 28.1 |
| `isParticipantStunnedThisStep` | оглушение в шаге | R23, 28.3 п.28 |
| `resolveMoveCollisions` | коллизии | 9.1 |
| `processPickupAndStealPhase` | pickup+steal фазы | 9, 28.3 п.3–5, 39–42 |
| `collectThrowStealCandidates` | кандидаты throw_steal | 7.4, R20 |
| `collectHitBludgerContenders` | кандидаты удара | 7.5, R21 |
| `processPlayerActions` | все действия | 7, 9 |
| `createHitBludgerDuels` | дуэли удара | 10, R21 |
| `createThrowStealDuels` | дуэли перехвата | 10, R20 |
| `expireOldTurns`, `forceExpireTurnsIfTimedOutClient` | таймаут хода | 8.3 |
| `prepareStepState` | подготовка шага | 9 |
| `applyMovement` | применение ходов | 9, 9.1 |
| `resolvePendingGoal` | отложенный гол | 7.4, R17 |
| `processBludgersAndStun` | бладжеры и оглушение | R22–R24, 28.3 п.14–15 |
| `processSnitchPhase` | снитч | R25–R29, 28.3 п.16–17, 38 |
| `finalizeStep` | финализация | 9, 12, 28.3 п.26 |
| `maybeAdvanceStep` | оркестрация шага | 9 |
| `canChaserSteal`, `canKeeperSteal`, `autoEndTurnsInGame` | легаси-автозавершение | 28.3 п.2 |

### A.4. `src/duels.js`
| Функция | Что задаёт | Раздел |
|---|---|---|
| `stableIndexFromId` | детерминированный выбор | 10.3 |
| `pickDuelWinner` | победитель и ничьи | 10.1–10.2, R31 |
| `expireOldDuels` | таймаут дуэли | 10.2, R32 |
| `insertDuelWithParticipants` | создание дуэли | 10.2 |
| `resolveQuaffleThrow` | бросок в throw_steal | 7.4, R20 |
| `resolveDuelIfReady` | последствия дуэлей | 10.2, 28.3 п.6–10, 39–42 |
| `addParticipantsToDuel`, `fillAllDuelScores` | должны экспортироваться; в текущем коде отсутствуют (см. 28.3 п.47) | 10.2, 28.3 п.47 |

### A.5. `src/bot-logic.js`
| Функция | Что задаёт | Раздел |
|---|---|---|
| `planBotTurn` | поведение ботов | 11.3, R33 |
| `isStraightOrDiagonalTarget` | линия удара | 7.5 |
| `sanitizeBotPlan` | валидация плана | 11.3, 28.1 |
| `runBotsForGame`, `runBotsInGameClient`, `maybeRunBots` | автоходы ботов | 11.3, R33 |

### A.6. `src/api-actions.js`
| Маршрут/функция | Что задаёт | Раздел |
|---|---|---|
| `removeParticipantTx`, `DELETE /participants/:id` | выход/кик | 14, 28.3 п.19–20 |
| `POST /plan/move` | заявка перемещения | 8.2, 14, 28.1 |
| `POST /turn/end` | полная заявка | 7, 8.2, 14, 28.1 |
| `POST /game/start` | старт | 8.2, R35, 28.1 |
| `POST /quaffle/steal/submit` | счёт дуэли | 10.2, 14, 28.1 |
| `POST /judge/:id/pause` | пауза | 19, R35, 28.3 п.22 |
| `POST /judge/:id/kick` | кик/замена ботом | 19, R35, 28.3 п.19–20 |
| `POST /judge/:id/bot`, `/bot/difficulty` | добавление/сложность ботов | 11.1, 19, R35 |
| Легаси `/move`, `/quaffle/*` | отключены при `PLANNED_TURNS` | 8.5, 14 |

### A.7. `src/api-core.js` и `src/api-pages.js`
| Маршрут | Что задаёт | Раздел |
|---|---|---|
| `/api/health`, `/api/meta` | метаданные | 14 |
| `POST /api/games`, `POST /api/judge/games` | создание комнат | 14, 28.3 п.33–34 |
| `GET /api/games/:code/state` | состояние | 14.1 |
| `POST /api/games/:code/participants` | вход | 4.4, 14, 28.3 п.20, 31 |
| `POST /api/games/:code/bots/fill` | заполнение ботов | 11.1, 14 |
| `POST /api/participants/:id/chat` | чат | 17, 28.1 |
| `/voice/poll`, `/voice/send`, `/judge/:id/voice` | голос | 18, 28.1 |
| `GET /api/games/:code/logs` | логи | 13, 14 |
| `/api/admin/rooms*` | админ | 19, 14 |
| `__dbg/*`, `/admin/rooms/`, `/judge-room-creation` | страницы | 19 |

### A.8. `src/db-init.js`
| Объект | Что задаёт | Раздел |
|---|---|---|
| `games`, `participants`, `turn_states`, `duels`, `duel_scores` | состояние игры | 15.1–15.5 |
| `game_events`, `game_state_snapshots` | события и логи | 15.6–15.7 |
| `voice_signals`, `chat_messages` | голос и чат | 15.8–15.9 |
| уникальные индексы | роли, клетки, резервы, дуэли | 4.4, 9, 10, 15 |

### A.9. Клиент (`public/*.js`)
| Файл/блок | Что задаёт | Раздел |
|---|---|---|
| `app.state.js`, `app.dom.js`, `app.api.js` | состояние, DOM, API | 16 |
| `app.ui.js` (после разбиения — `app.board.*`, `app.actions.ui`, `app.room.ui`) | поле, фишки, подсветки, кнопки | 16.2–16.3 |
| `app.duel.ui.js` | дуэльный оверлей | 10.2, 16.3 |
| `app.results.ui.js` | итоги и PNG | 12.3, 16.4 |
| `app.participants.ui.js` | участники/наблюдатели/судья | 16.1, 19 |
| `app.chat.ui.js`, `app.chat.handlers.js` | чат | 17 |
| `app.voice.core.js`, `app.voice.ui.js` | WebRTC-голос | 18 |
| `app.main.js`, `app.loop.js`, `app.home.js` | цикл опроса и экраны | 16 |
| `app.export.js` | экспорт логов | 13, 16.4 |
| `messages.js` | пулы сообщений | 13 |

> Если при повторной сверке обнаружится новая ветка поведения, её следует добавить в раздел 28 и в эту матрицу; на текущий момент все функции, влияющие на правила, сопоставлены.