<p align="center">
  <a href="./README.md">◀ Назад к списку модулей</a> | 
  <a href="../README.md">🏠 Главная</a>
</p>

---

# ⏸️ Модуль LogPauseManager (include/LogPauseManager.h)

## 1. Обзор и роль в системе

`LogPauseManager` решает одну из самых практичных задач при работе с IoT-устройствами через UART/Serial-терминал: **предотвращение перекрытия логов и пользовательского ввода**.

Представьте: плата каждую секунду выводит в терминал строки телеметрии (Heartbeats, статусы датчиков, события Mesh-сети). Вы начинаете набирать команду, например `wifi_setup MyFarm 12345678`, — и вместо нормального ввода видите в терминале хаотичное перемешивание логов с буквами своей команды. Именно эту проблему решает `LogPauseManager`.

Как только система обнаруживает первый символ в буфере `Serial`, менеджер **автоматически подает сигнал** `Logger`-у прекратить вывод на заданное время. По истечении таймаута (или сразу после выполнения команды) вывод логов возобновляется.

## 2. Зависимости

| Зависимость | Роль |
| :--- | :--- |
| `ConfigManager` | Персистентное хранение настройки таймаута в LittleFS |
| `Logger` | Принимает сигнал от `shouldPauseLogs()` и прекращает вывод |
| `InteractiveHelper` | Вызывает `pauseLogs(0)` перед запуском мастеров настройки (pin_wizard, rule_wizard) |
| `AutomationCommandHandler` | Вызывает `pauseLogs(0)` при входе в интерактивный wizard автоматизации |

## 3. Принцип работы (внутренняя архитектура)

Модуль является **Singleton** и реализован без очереди и без аллокаций в горячем пути.

```
loop() ---> LogPauseManager::handleKeyboardInput()
                |
                +-- Serial.available() == true?
                        |
                        YES --> _isPaused = true; _pauseStartTime = millis();
                                (Таймер сброса при каждом новом символе — нет, 
                                 таймер идет от первого нажатия)
                        NO  --> ничего

loop() ---> LogPauseManager::update()
                |
                +-- _isPaused && (millis() - _pauseStartTime >= _pauseDuration)?
                        |
                        YES --> _isPaused = false; _inputBuffer = "";

Logger::log() ---> LogPauseManager::shouldPauseLogs()
                        |
                        returns _isPaused  --> если true, сообщение не выводится
```

### Ключевые детали реализации

*   **Non-destructive read:** `handleKeyboardInput()` вызывает `Serial.available()` без чтения (`Serial.read()`) — байты остаются в буфере для последующего парсинга `CommandExecutor`-ом.
*   **Infinite pause mode:** Вызов `pauseLogs(0)` устанавливает `_pauseDuration = 0xFFFFFFFF` (~49 суток). Этот режим используется wizards: пока мастер активен, лог заморожен. Разморозка — только явным вызовом `resumeLogs()`.
*   **Персистентность:** Таймаут хранится в `/config/log_pause.json` (LittleFS). При перезагрузке `loadSettings()` вызывается из конструктора — настройка восстанавливается автоматически.
*   **Ограничение диапазона:** `setPauseDuration()` принимает только значения в диапазоне **1000–60000 мс** (1–60 секунд). Значения вне диапазона отвергаются и возвращают `false`.
*   **CRITICAL-логи всегда проходят:** Решение об игнорировании паузы для критических сообщений принимается в `Logger`, который при уровне `CRITICAL` игнорирует флаг `shouldPauseLogs()`. Это значит, что информация о падении ядра или сбое WDT будет видна пользователю в любом случае.

## 4. Public API

| Метод | Описание |
| :--- | :--- |
| `static LogPauseManager& getInstance()` | Singleton-доступ |
| `bool shouldPauseLogs() const` | Возвращает `true`, если вывод логов должен быть подавлен |
| `void handleKeyboardInput()` | Вызывается в главном цикле; обнаруживает ввод и активирует паузу |
| `void update()` | Вызывается в главном цикле; проверяет истечение таймера |
| `void pauseLogs(unsigned long durationMs = 0)` | Принудительная пауза. `0` = бесконечно (до `resumeLogs()`) |
| `void resumeLogs()` | Принудительное возобновление; сбрасывает буфер и таймер |
| `unsigned long getRemainingPauseTime() const` | Оставшееся время паузы в мс (0, если не активна) |
| `bool setPauseDuration(unsigned long durationMs, bool saveToFlash = true)` | Установить таймаут в мс (диапазон: 1000–60000). `false` = ошибка диапазона |
| `bool setPauseDurationSeconds(float seconds, bool saveToFlash = true)` | То же самое, но в секундах (диапазон: 0.1–60.0) |
| `unsigned long getPauseDuration() const` | Текущий таймаут в мс |
| `float getPauseDurationSeconds() const` | Текущий таймаут в секундах |
| `void loadSettings()` | Загрузить таймаут из `/config/log_pause.json` |
| `bool saveSettings()` | Сохранить таймаут в `/config/log_pause.json` |

## 5. CLI-интерфейс (команда `log_pause`)

Управление модулем из терминала осуществляется командой `log_pause`, обрабатываемой в `SystemCommandHandler::_handleLogPause()`:

| Синтаксис | Описание | Пример |
| :--- | :--- | :--- |
| `log_pause` | Вывести текущий статус паузы и оставшееся время | `log_pause` |
| `log_pause resume` | Принудительно возобновить вывод логов немедленно | `log_pause resume` |
| `log_pause timeout <сек>` | Установить таймаут паузы (0.1–60.0 сек) и сохранить в Flash | `log_pause timeout 10` |

**Пример вывода `log_pause`:**
```
🔒 Пауза логов: НЕТ, Осталось: 0.0 сек
```

## 6. Интеграция с Wizards

Все диалоговые мастера (`pin_wizard`, `rule_wizard`, `task_wizard`, `network_wizard`) автоматически вызывают `LogPauseManager::getInstance().pauseLogs(0)` в самом начале работы. Это замораживает вывод логов на всё время интерактивного меню. По завершению wizard явно вызывается `resumeLogs()`, восстанавливая нормальный режим работы терминала.

```
rule_wizard
  └─> AutomationCommandHandler::_handleRuleWizard()
        └─> LogPauseManager::getInstance().pauseLogs(0)  // Заморозка
        ...  [wizard работает без помех]
        └─> LogPauseManager::getInstance().resumeLogs()  // Разморозка
```

## 7. Вывод

`LogPauseManager` — это небольшой, но критически важный компонент для UX. Без него работа с CLI на активно логирующем IoT-устройстве была бы крайне затруднена. Благодаря персистентному таймауту, режиму бесконечной паузы для wizards и тому, что CRITICAL-логи всегда проходят через заслонку, модуль обеспечивает комфортный и безопасный интерфейс оператора.

---

<p align="center">
  <a href="./README.md">◀ Назад к списку модулей</a> | 
  <a href="../README.md">🏠 Главная</a>
</p>
