<p align="center">
  <a href="./README.md">&#9664; Назад к списку модулей</a> | 
  <a href="../README.md">&#127968; Главная</a>
</p>

---

# &#127979; Модуль SystemOrchestrator (src/SystemOrchestrator.cpp)

## 1. Обзор модуля и его роль в системе
`SystemOrchestrator` — это Фасад (Facade) и Главный Контроллер жизненного цикла прошивки AgriSwarm. Он инкапсулирует в себе вызовы методов `setup()` и `loop()` стандартной среды Arduino, предоставляя строго упорядоченный, детерминированный процесс старта и работы устройства.

**Основная роль:**
*   Оркестрация загрузки: строгое определение порядка инициализации 20+ независимых менеджеров (кто запускается первым, кто от кого зависит).
*   Связывание (Dependency Injection): передача ссылок между менеджерами (например, выдача `NetworkManager` модулю `PinManager`).
*   Оркестрация главного цикла (`update()`): определение того, в каком порядке кванты времени (ticks) выделяются сети, логике и железу.
*   Регистрация глобальных коллбэков, связывающих сетевые пакеты с физическими действиями.

## 2. Зависимости (Include Graph)
Оркестратор зависит практически от **всех** компонентов системы, выступая корневым узлом:
*   `CoreStabilityManager`, `BlackBoxManager`, `SystemMonitor` (Ядро и стабильность).
*   `ConfigManager` (Память настроек).
*   `AgriNetworkManager`, `SmartMeshManager` (Сеть) — `SmartMeshManager` подключается в `.cpp`, а не в `.h`, через `#include "SmartMeshManager.h"`.
*   `RuleEngine`, `AlgorithmScheduler` (Логика автоматизации).
*   `PinManager`, `SensorPublisher`, `ActuatorPublisher` (Оборудование).
*   `WebServerManager`, `EventBuffer`, `MeshDeliveryTracker`, `PingManager` и многие другие (сервисы).

## 3. Анализ логики загрузки (`begin()`)

Порядок загрузки критически важен для выживаемости встраиваемой системы:
1.  **Аппаратный WDT:** Инициализируется первым с таймаутом 30 секунд (`esp_task_wdt_init(30, true)`).
2.  **Аппаратная диагностика (Pre-boot):** Опрашивается `esp_reset_reason()`. Если это был `PANIC` или `WDT`, это выводится в консоль до любой другой инициализации.
3.  **Глушение шума ESP-IDF:** Отключаются нативные логи `WiFi`, `BT` и других ESP32-драйверов через `esp_log_level_set`.
4.  **`_setupCore()`:** Первыми стартуют `BlackBoxManager` (перехват логов прошлого краша), `CoreStabilityManager`, `ConfigManager`, `SystemMonitor`.
5.  **`_linkManagers()`:** Внедрение зависимостей. Менеджеры обмениваются указателями.
6.  **`_setupConnectivity()`:** Старт WiFi, Mesh, `SmartMeshManager`, `PingManager`, `MeshOptimizer`.
7.  **`_setupAutomation()`:** Загрузка правил `RuleEngine`, инициализация пинов `PinManager`, конфигурация `MeshDeliveryTracker`, `EventBuffer`.
8.  **`_setupCallbacks()`:** Регистрация всех обработчиков сетевых сообщений и действий.
9.  **`WebServerManager`:** Запускается последним после полной инициализации сети.

## 4. Главный рабочий цикл (`update()`)

Цикл `update()` — это классическая кооперативная многозадачность (Super-Loop Architecture). Порядок вызовов строго определен:

1. `CoreStabilityManager::update()` — Watchdog + здоровье системы
2. `_networkManager.handleClient()` — Обработка входящих пакетов
3. `_processOutgoingQueues()` — Отправка исходящей очереди
4. `SmartMeshManager::update()` — Топология mesh
5. `SystemMonitor::update()` — Мониторинг RAM/CPU
6. `_pinManager.updateSensors()` — Опрос физических датчиков
7. Active Discovery Response (см. ниже)
8. `BlackBoxManager::update()` — Умные триггеры
9. `_ruleEngine.update()` — Выполнение правил автоматизации
10. `_algorithmScheduler.update()` — Алгоритмы
11. Служебные сервисы: `WebServerManager`, `EventBuffer`, `MeshDeliveryTracker`, `PingManager`, `SelfReflectionSystem`, `MeshOptimizer` (раз в 5 минут).

После каждого крупного блока — `yield()` для передачи управления планировщику FreeRTOS.
Периодические задачи используют паттерн `if (millis() - lastTime > INTERVAL)`.

## 5. Обработка исходящих очередей (`_processOutgoingQueues()`)

Вызывается каждую итерацию цикла. Обрабатывает **два уровня** очередей:
1.  **`MessageQueueManager`** — обычная телеметрия и логи (`_messageQueueManager.processQueue()`).
2.  **`PriorityMessageQueue`** — приоритетные команды от `RuleEngine` с флагом `requiresAck=true`. За одну итерацию обрабатывается **максимум 3 сообщения**, чтобы не блокировать loop. Если отправка не удалась (переполнен буфер Mesh), сообщение помечается для повторной попытки (`markForRetry`) и цикл немедленно прерывается. Для сообщений с `requiresAck` успешная отправка регистрируется в `MeshDeliveryTracker` для контроля подтверждения.

## 6. Регистрация событий и маршрутов

В `_setupCallbacks()` регистрируются все сетевые обработчики. Полная таблица:

| Тип сообщения | Обработчик |
| :--- | :--- |
| `sensor_data` | `SensorPublisher` + `SensorMonitor` |
| `sensor_confirmation` | `SensorPublisher` |
| `sensor_status` | Логирование статуса |
| `actuator_command` | `PinManager::handleRemoteActuatorCommand` |
| `actuator_command_confirmation` | `ActuatorPublisher::handleCommandAck` |
| `actuator_info` | `ActuatorPublisher::handleActuatorInfo` |
| `discovery_request` | Active Discovery (см. ниже) |
| `ACK` | `MeshDeliveryTracker::confirmDelivery` (с проверкой CRC) |

Также связывает `RuleEngine` с железом через `setActionCallback`: `ACTION_SET_PIN_STATE` -> `PinManager::setPinState(PRIO_RULE)`, `ACTION_SEND_MESSAGE` -> `MessageQueueManager`, `ACTION_TRIGGER_TASK` -> `CommandExecutor`.

## 7. Механизм Active Discovery

Когда новый узел подключается к Mesh (`onNodeConnectedCallback`), оркестратор немедленно отправляет широковещательный запрос `discovery_request`. Соседи, получившие этот запрос, отвечают со **случайной задержкой** (Jitter: `random(100, 1500)` мс), устанавливая флаг `_forceResourcePublish = true`. Это предотвращает «шторм анонсов» (Beacon Storm), когда десятки узлов одновременно начинают публиковать свои ресурсы.

```
Новый узел подключился
      |
      v
broadcast "discovery_request"
      |
      v (у каждого соседа)
_forceResourcePublish = true
_resourcePublishDelay = millis() + random(100, 1500)
      |
      v (в следующих итерациях loop)
publishAllLocalSensors() + publishAllLocalActuators()
```

## 8. Выводы
`SystemOrchestrator` — это процедурный «клей», который объединяет независимые объекты в работающую экосистему. Строгий порядок инициализации, двухуровневая очередь исходящих сообщений, механизм Active Discovery с защитой от шторма и детерминированный цикл `update()` с `yield()` после каждого блока делают его надежной основой всей прошивки AgriSwarm.

---

<p align="center">
  <a href="./README.md">&#9664; Назад к списку модулей</a> | 
  <a href="../README.md">&#127968; Главная</a>
</p>
