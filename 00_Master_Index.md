# 📚 AgriSwarm: Глобальная Техническая Документация (Master Index)

## 🌟 1. Обзор системы (System Overview)
AgriSwarm — это децентрализованная mesh-сеть на базе микроконтроллеров ESP32, спроектированная с упором на отказоустойчивость, offline-first работу и жесткие ограничения по памяти и ресурсам. Ядро системы использует самоорганизующуюся Wi-Fi mesh-сеть (painlessMesh) и встроенный механизм правил (RuleEngine).

**Ключевые принципы:**
*   **Offline-First & Децентрализация:** Отсутствие единой точки отказа. Узлы автономны.
*   **Defensive Programming:** Защита от переполнений, фрагментации памяти и некорректных данных с сенсоров.
*   **O(1) Операции:** Использование хеш-маршрутизации для избежания динамических аллокаций памяти (Zero-Alloc-Hotpath).
*   **Самодиагностика:** Механизмы RTC-Snapshot, watchdog, BlackBoxManager.

## 📂 2. Структура Документации

Документация разбита на следующие логические блоки и располагается в корне репозитория:

### 🏗️ Базовая Архитектура
*   [`01_Architecture_and_Design.md`](./01_Architecture_and_Design.md) — Глобальная архитектура, диаграммы компонентов, паттерны проектирования, потоки данных.
*   [`02_Working_Principles.md`](./02_Working_Principles.md) — Принципы работы и бизнес-логика.
*   [`03_Hardware_Interaction_and_Node_Lifecycle.md`](./03_Hardware_Interaction_and_Node_Lifecycle.md) — Взаимодействие с железом, пины и жизненный цикл узла.
*   [`04_Mesh_Network_and_Data_Routing.md`](./04_Mesh_Network_and_Data_Routing.md) — Топология роя, маршрутизация и самовосстановление.
*   [`05_Agro_Board_Instructions.md`](./05_Agro_Board_Instructions.md) — Сборка и инструкции по агро-плате.
*   [`06_CLI_Reference.md`](./06_CLI_Reference.md) — Справочник по интерфейсу командной строки.
*   [`07_Gateway_Integration.md`](./07_Gateway_Integration.md) — Интеграция со шлюзом, аналитика и решение проблем.
*   [`docs/network-packets.md`](./docs/network-packets.md) — Спецификация JSON-пакетов данных и команд в Mesh-сети.
*   [`08_Troubleshooting.md`](./08_Troubleshooting.md) — Диагностика и исправление ошибок.
*   [`09_Security_and_Constraints.md`](./09_Security_and_Constraints.md) — Анализ безопасности, векторы атак, управление памятью и узкие места.
*   [`10_Web_Interface_Guide.md`](./10_Web_Interface_Guide.md) — Визуальная инструкция по использованию Web-интерфейса (Для Пользователей).

### 🌐 Сетевой Стек и Mesh (Network & Mesh Layer)
Подсистема управления децентрализованной сетью, маршрутизацией и доставкой сообщений.
*   [`modules/NetworkManager.md`](./modules/NetworkManager.md) — Базовый сетевой интерфейс.
*   [`modules/AgriNetworkManager.md`](./modules/AgriNetworkManager.md) — Специфичная для AgriSwarm реализация сети.
*   [`modules/SmartMeshManager.md`](./modules/SmartMeshManager.md) — Управление топологией умной mesh-сети.
*   [`modules/MeshOptimizer.md`](./modules/MeshOptimizer.md) — Оптимизация путей и энергопотребления в сети.
*   [`modules/MeshReliabilityManager.md`](./modules/MeshReliabilityManager.md) — Контроль надежности доставки (QoS).
*   [`modules/MeshPerformanceMonitor.md`](./modules/MeshPerformanceMonitor.md) — Мониторинг задержек и качества линков.
*   [`modules/MeshDeliveryTracker.md`](./modules/MeshDeliveryTracker.md) — Отслеживание подтверждений (ACK) и повторных передач.
*   [`modules/MeshStatisticsManager.md`](./modules/MeshStatisticsManager.md) — Сбор сетевых метрик.
*   [`modules/AutoConnectionManager.md`](./modules/AutoConnectionManager.md) — Автоматическое восстановление связи и fallback.
*   [`modules/MeshNetworkConfig.md`](./modules/MeshNetworkConfig.md) — Пресеты (ECO, FAST) и профили конфигурации Mesh-сети.
*   [`modules/PingManager.md`](./modules/PingManager.md) — Подсистема keep-alive и проверки доступности узлов.
*   [`modules/MqttManager.md`](./modules/MqttManager.md) — Интеграция с внешними MQTT-брокерами (Cloud IoT).

### 🔀 Маршрутизация и Очереди (Routing & Queues)
Ядро обмена сообщениями между узлами и внутренними компонентами.
*   [`modules/MessageRouter.md`](./modules/MessageRouter.md) — Маршрутизатор пакетов на основе FNV-1a.
*   [`modules/MessageQueueManager.md`](./modules/MessageQueueManager.md) — Управление буферами отправки/приема.
*   [`modules/PriorityMessageQueue.md`](./modules/PriorityMessageQueue.md) — Очереди с приоритетами для критических команд.
*   [`modules/MessageCRC.md`](./modules/MessageCRC.md) — Валидация целостности пакетов.
*   [`modules/MessageBuffer.md`](./modules/MessageBuffer.md) — Низкоуровневые кольцевые буферы (Ring Buffers).
*   [`modules/EventBuffer.md`](./modules/EventBuffer.md) — Буферизация событий Pub/Sub.

### ⚙️ Ядро и Системные сервисы (Core & System Services)
Оркестрация работы всего устройства.
*   [`modules/SystemOrchestrator.md`](./modules/SystemOrchestrator.md) — Главный контроллер жизненного цикла, маршрутизация исходящих очередей и механизм Active Discovery.
*   [`modules/SystemMonitor.md`](./modules/SystemMonitor.md) — Мониторинг RAM, CPU, Uptime.
*   [`modules/SystemDiagnostics.md`](./modules/SystemDiagnostics.md) — Самодиагностика оборудования.
*   [`modules/CoreStabilityManager.md`](./modules/CoreStabilityManager.md) — Предотвращение падений, Watchdog, Brownout.
*   [`modules/ConfigManager.md`](./modules/ConfigManager.md) — Работа с NVS/SPIFFS, хранение настроек.
*   [`modules/Scheduler.md`](./modules/Scheduler.md) & [`modules/AlgorithmScheduler.md`](./modules/AlgorithmScheduler.md) — Диспетчеризация задач (Task Scheduling).
*   [`modules/Logger.md`](./modules/Logger.md) & [`modules/CriticalLogManager.md`](./modules/CriticalLogManager.md) — Система логирования.
*   [`modules/BlackBoxManager.md`](./modules/BlackBoxManager.md) — Бортовой самописец, умные триггеры и запись состояния перед крешем (RTC-Snapshot).
*   [`modules/HostManager.md`](./modules/HostManager.md) — Идентификация и параметры текущего узла.

### 🧠 Логика и Правила (Logic & Rules Engine)
Подсистема принятия автономных решений.
*   [`modules/RuleEngine.md`](./modules/RuleEngine.md) — Исполнение JSON-правил, триггеров и механизм Fail-Safe Heartbeat.
*   [`modules/EventManager.md`](./modules/EventManager.md) — Шина событий (Pub/Sub).
*   [`modules/NotificationSystem.md`](./modules/NotificationSystem.md) — Генерация алертов.
*   [`modules/SelfReflectionSystem.md`](./modules/SelfReflectionSystem.md) — Анализ собственного состояния и адаптация.
*   [`modules/ConnectionLossDetector.md`](./modules/ConnectionLossDetector.md) — Реакция на потерю связи (изоляцию).

### 🎛️ Оборудование и Периферия (Hardware & Peripherals)
Взаимодействие с физическим миром.
*   [`modules/PinManager.md`](./modules/PinManager.md) — Абстракция над GPIO, арбитраж приоритетов команд (PinCommandPriority) и FailSafe Watchdog.
*   [`modules/SensorMonitor.md`](./modules/SensorMonitor.md) & [`modules/SensorPublisher.md`](./modules/SensorPublisher.md) — Опрос сенсоров и публикация метрик.
*   [`modules/ActuatorPublisher.md`](./modules/ActuatorPublisher.md) — Управление исполнительными механизмами.
*   [`modules/SensorConnectionMonitor.md`](./modules/SensorConnectionMonitor.md) — Контроль физического подключения датчиков (I2C/SPI).
*   [`modules/HardwareDrivers.md`](./modules/HardwareDrivers.md) — Слой абстракции драйверов (DHT, Аналоговые, Цифровые, Реле).

### 🛡️ Утилиты, Безопасность и CLI (Utils, Safe Wrappers & CLI)
Вспомогательные и защитные механизмы.
*   [`modules/CommandExecutor.md`](./modules/CommandExecutor.md) & [`modules/SafeCommandParser.md`](./modules/SafeCommandParser.md) — Парсинг и выполнение CLI/Mesh команд.
*   [`modules/CommandHandlers.md`](./modules/CommandHandlers.md) — Роутинг команд по категориям (System, Network, Hardware).
*   [`modules/InteractiveCLI.md`](./modules/InteractiveCLI.md) — Интерактивные помощники настройки (Wizards) и валидация пинов.
*   [`modules/PinCommandHelper.md`](./modules/PinCommandHelper.md) — Строгая валидация GPIO и парсинг параметров датчиков.
*   [`modules/LogPauseManager.md`](./modules/LogPauseManager.md) — Интеллектуальное скрытие логов при вводе текста в терминале.
*   [`modules/CommandBackupSystem.md`](./modules/CommandBackupSystem.md) — Резервирование критических команд.
*   [`firmware/README.md`](./firmware/README.md) — Графический GUI-прошивальщик готовой прошивки (Flasher) для начинающих.
*   [`modules/NodeManager.md`](./modules/NodeManager.md) & [`modules/TrustedNodeManager.md`](./modules/TrustedNodeManager.md) — Управление списком известных и доверенных узлов.
*   [`modules/SafeMemory.md`](./modules/SafeMemory.md) — Безопасное выделение и очистка памяти.
*   [`modules/SafeMath.md`](./modules/SafeMath.md) — Защита от переполнений при вычислениях.
*   [`modules/HashUtils.md`](./modules/HashUtils.md) — Реализация FNV-1a и других хешей.
*   [`modules/Constants.md`](./modules/Constants.md) & [`modules/Structures.md`](./modules/Structures.md) — Глобальные константы и структуры данных.
*   [`modules/WebServerManager.md`](./modules/WebServerManager.md) — Веб-интерфейс, GZIP-оптимизация и Standby-режим.

### 📖 Практические Руководства (Guides & References)
*   [`docs/hardware-wiring.md`](./docs/hardware-wiring.md) — Физические схемы подключения датчиков, реле и питания с иллюстрацией.
*   [`docs/led-diagnostics.md`](./docs/led-diagnostics.md) — Светодиодная диагностика состояния платы и устранение неполадок.
*   [`docs/littlefs-structure.md`](./docs/littlefs-structure.md) — Архитектура и структура конфигурационных файлов в LittleFS.

## 🚀 3. Таблица Маршрутизации Компонентов (Component Routing Table)

| Слой / Домен | Ответственные модули | Основная задача |
| :--- | :--- | :--- |
| **Transport** | `AgriNetworkManager`, `SmartMeshManager` | Физическая и логическая передача байт. |
| **Routing** | `MessageRouter`, `MessageCRC` | Проверка целостности, определение получателя. |
| **Buffering** | `PriorityMessageQueue`, `MessageBuffer` | Накопление и приоритизация отправки/приема. |
| **Execution** | `CommandExecutor`, `RuleEngine` | Интерпретация полезной нагрузки (Payload). |
| **Hardware** | `PinManager`, `SensorMonitor` | Сбор данных и физическое воздействие. |
| **Supervision**| `SystemOrchestrator`, `CoreStabilityManager`| Контроль за всеми слоями, перезапуск при сбоях. |
