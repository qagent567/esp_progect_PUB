# [PART 1/3] ТЕХНИЧЕСКИЙ АУДИТ ПРОЕКТА AGRISWARM ДЛЯ NOTEBOOKLM

# 1. Обзор проекта
- **Название**: AgriSwarm (`include/Constants.h:6`)
- **Версия**: v4.0.4 (`include/Constants.h:5`)
- **Статус версии**: "RELEASE: Core Stability, Zero-Alloc & CLI Restoration" (`include/Constants.h:5`)
- **Решаемая проблема**: Децентрализованная автоматизация сельского хозяйства в условиях отсутствия инфраструктуры. Архитектура ориентирована на автономность (Offline-first) и отказоустойчивость.
- **Целевое железо**: ESP32 (`platformio.ini:13`).
- **Фреймворк**: Arduino/ESP-IDF (`platformio.ini:14`).
- **Реальный функционал**:
    - Построение самоорганизующейся Mesh-сети на базе `painlessMesh` (`src/AgriNetworkManager.cpp`).
    - Абстракция аппаратных ресурсов через систему драйверов (`include/drivers/`).
    - Реактивная автоматизация на основе правил (`src/RuleEngine.cpp`).
    - Аппаратная диагностика с сохранением состояния в RTC-памяти (`src/BlackBoxManager.cpp`).
    - CLI-интерфейс для настройки и мониторинга в реальном времени (`src/CommandExecutor.cpp`).

# 2. Полная карта структуры кода

## Список файлов (include/)
- `ActuatorPublisher.h`: Интерфейс публикации команд для исполнительных устройств.
- `AgriNetworkManager.h`: Управление Mesh-сетью и Wi-Fi.
- `AlgorithmScheduler.h`: Планировщик последовательных сценариев.
- `AutoConnectionManager.h`: Автоматическое подключение к сетям.
- `BlackBoxManager.h`: Регистрация критических событий в RTC.
- `ConfigManager.h`: Асинхронное управление конфигурацией в LittleFS.
- `Constants.h`: Глобальные параметры и версии.
- `CoreStabilityManager.h`: Софтверный Watchdog менеджеров.
- `EventManager.h`: Глобальная шина событий (Pub/Sub).
- `HashUtils.h`: Реализация FNV-1a хэширования.
- `Logger.h`: Система логирования.
- `MeshNetworkConfig.h`: Пресеты таймингов сети.
- `PinManager.h`: Фабрика драйверов пинов.
- `RuleEngine.h`: Движок правил автоматизации.
- `Structures.h`: Общие структуры данных проекта.
- `SystemMonitor.h`: Мониторинг ресурсов (Heap, Loop Time).
- `SystemOrchestrator.h`: Центральный узел управления жизненным циклом.

## Список файлов (src/)
- `main.cpp`: Точка входа. Вызов `orchestrator.begin()` (`line 21`).
- `SystemOrchestrator.cpp`: Инициализация и связывание менеджеров (`_linkManagers`).
- `AgriNetworkManager.cpp`: Обработка сетевых событий и Heartbeat.
- `PinManager.cpp`: Управление пулом драйверов.
- `ConfigManager.cpp`: Реализация асинхронной записи кэша (`_flashWriterTask`).
- `BlackBoxManager.cpp`: Реализация кольцевого буфера RTC и Panic Handler.
- `RuleEngine.cpp`: Логика сопоставления хэшированных топиков с правилами.
- `SystemMonitor.cpp`: Логика экстренной перезагрузки при деградации ресурсов.

## Точки входа и цикл
- **setup**: `src/main.cpp:18-22`.
- **loop**: `src/main.cpp:24-30`. Вызов `orchestrator.update()` и `yield()`.

## Зависимости (из `platformio.ini`)
- `painlessMesh @ ^1.5.0`: Сетевой протокол.
- `ArduinoJson @ ^6.19.0`: Сериализация данных.
- `TaskScheduler @ ^3.6.0`: Планировщик задач.
- `ESP32Servo @ ^0.11.0`: Управление сервоприводами.
- `DHT sensor library @ ^1.4.3`: Драйвер датчиков DHT.
- `CRC @ ^0.2.0`: Контроль целостности.

# 3. Функционал и настройки (ФАЙЛ-ЗА-ФАЙЛОМ)

## `ConfigManager.cpp`
- **Реализовано**: 
    - Асинхронная запись кэша во Flash (`line 103`).
    - Метод `syncSave()` для критической записи при перезагрузке (`line 71`).
    - Сканирование эфира для выбора канала (`line 484`).
- **Настройки**: `AUTO_SAVE_INTERVAL = 15 * 60 * 1000` (`include/ConfigManager.h:118`).
- **Статус**: `STABLE`.

## `PinManager.cpp`
- **Реализовано**:
    - Пул драйверов `_drivers`.
    - Поддержка `powerPin` для датчиков (`include/Structures.h:113`).
    - Автоматическая публикация данных через `SensorPublisher`.
- **Статус**: `STABLE`.

## `RuleEngine.cpp`
- **Реализовано**:
    - Очередь событий `processEvent` (`line 145`).
    - Хэширование `sourceHash` через FNV-1a (`line 160`).
    - Поддержка TTL для результатов правил.
- **Условия**: `CONDITION_GREATER_THAN`, `CONDITION_LESS_THAN` и др. (`include/Structures.h:134-142`).
- **Статус**: `STABLE`.

## `BlackBoxManager.cpp`
- **Реализовано**:
    - `RTC_NOINIT_ATTR` переменные для выживания при reset (`line 18-40`).
    - `captureLastGasp` для дампа состояния перед смертью (`line 580`).
    - `rtcTotalCrashes` счетчик фатальных ошибок (`line 24`).
- **Статус**: `STABLE`.

## `SystemMonitor.cpp`
- **Реализовано**:
    - `isMemoryCritical()` при < 8KB (`line 90`).
    - `emergencyRestart()` с вызовом `captureLastGasp` (`line 134`).
    - `getHeapFragmentationPercent()` через `multi_heap_info_t` (`line 247`).
- **Статус**: `STABLE`.

# 4. Сетевой стек и протоколы

## Связь (AgriNetworkManager)
- **Библиотека**: `painlessMesh`.
- **Протокол**: JSON поверх ESP-NOW/Wi-Fi.
- **Размер JSON буфера**: 1024 байта (`include/Constants.h:47`).
- **Порт**: 5555 (`include/Constants.h:39`).
- **Таймауты**:
    - `SINGLE_NODE_TIMEOUT = 30000` (переход в Host-режим при одиночестве) (`include/AgriNetworkManager.h:98`).
    - `SCAN_TIMEOUT = 5000` (`include/AgriNetworkManager.h:91`).
- **Функционал**:
    - Адаптивный Heartbeat (`src/AgriNetworkManager.cpp:420`).
    - Проверка CRC32 для каждого сообщения (`src/AgriNetworkManager.cpp:350`).
    - Механизм `TrustedNodeManager` для фильтрации узлов.

# 5. Автоматизация и бизнес-логика

## RuleEngine Архитектура
- **Событийная модель**: Реагирует на `SystemEventType` (`include/Structures.h`).
- **Операторы**: `>`, `<`, `==`, `!=`, `BETWEEN`, `CHANGED`.
- **Действия**: `ACTION_SET_PIN_STATE`, `ACTION_SET_SERVO`, `ACTION_SEND_MESSAGE`, `ACTION_LOG_MESSAGE`, `ACTION_TRIGGER_TASK`.
- **Пример логики**: Если хэш датчика `X` > порога `Y`, выполнить `ACTION` на узле `Z`.
- **Ограничение**: Сложные условия (AND/OR) в коде `RuleEngine.cpp` ОТСУТСТВУЮТ (поддерживаются только атомарные правила).

## AlgorithmScheduler
- **Статус**: `BETA`.
- **Реализовано**: Цепочки действий с задержками (`DELAY`).
- **TODO**: Метод `algo_create` помечен как планируемый (`include/Constants.h:5`).

# 6. Диагностика и отказоустойчивость

## Механизмы выживания
- **Watchdog**: 
    - Аппаратный (ESP32).
    - Софтверный в `CoreStabilityManager.cpp`: проверка Heartbeat менеджеров (`line 96`).
- **Форензика**: `BlackBoxManager` хранит `rtcResetReason` (`line 320`).
- **Защита памяти**: `SystemMonitor` принудительно вызывает `forceGarbageCollection()` и `WiFi.scanDelete()` при нехватке памяти (`src/SystemMonitor.cpp:177`).
- **Fallbacks**:
    - Если конфиг в LittleFS битый, `CoreStabilityManager` пробует `restoreFromBackup()` (`src/CoreStabilityManager.cpp:215`).

# 7. Честная техническая оценка

## Сильные стороны
- **Асинхронный I/O**: `ConfigManager` не блокирует основной цикл при записи на Flash.
- **Глубокая видимость**: RTC BlackBox дает данные о состоянии памяти и задачах в момент сбоя.
- **Типизация оборудования**: Четкое разделение на драйверы (`Analog`, `Digital`, `DHT`).

## Критические ограничения
- **Heap Fragmentation**: Использование `ArduinoJson` и `String` в `RuleEngine.cpp` и `NotificationSystem.cpp` создает риск фрагментации при высокой интенсивности событий.
- **Большие модули**: `AutomationCommandHandler.cpp` (80КБ) и `NetworkCommandHandler.cpp` (74КБ) нарушают принцип единственной ответственности.
- **Безопасность**: Шифрование пакетов в `AgriNetworkManager.cpp` ОТСУТСТВУЮТ (используется открытый JSON).

# 8. Подготовка к публикации

## Шаги сборки
1. Установка платформы `espressif32 v6.5.0`.
2. Прошивка через `pio run -t upload`.
3. **КРИТИЧНО**: Загрузка образа ФС через `pio run -t uploadfs`.

## Доработки перед релизом (TODO в коде)
1. Реализовать `algo_create` (`include/Constants.h:5`).
2. Очистить `TODO` в `NotificationSystem.cpp` по загрузке настроек из файла (`line 440`).
3. Рефакторинг `CommandExecutor.cpp` (вынос логики из `executeCommand`).

# 9. Опоры для маркетинга

- **"Mesh с черным ящиком"**: Уникальная система диагностики сбоев.
- **"Умная Flash"**: Технология отложенной записи сохраняет ресурс памяти устройства.
- **"Нулевая настройка"**: Автовыбор канала и автоподключение узлов.

# 10. Приложения

## Критические константы
- `LOG_LEVEL_INFO` (1)
- `BLACKBOX_MAGIC = 0xDEADBEEF`
- `MAX_NOTIFICATIONS = 20`
- `CRITICAL_MEMORY_THRESHOLD = 8192`

## Ссылки
- `src/main.cpp`: Логика входа.
- `src/RuleEngine.cpp`: Центр автоматизации.
- `src/BlackBoxManager.cpp`: Центр надежности.
