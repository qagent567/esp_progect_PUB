# Команды по задачам

[Основной справочник](../06_CLI_Reference.md) · [Готовые примеры](command-examples.md)

Здесь — ориентир по группам команд. Точные параметры основных команд приведены в справочнике; полный список установленного комплекта показывает `help`.

| Задача | Команды |
|---|---|
| Узнать состояние платы | `status`, `sysinfo`, `memory`, `uptime`, `fs_info` |
| Добавить или изменить устройство | `pin_wizard`, `pin_setup`, `pin_config` |
| Посмотреть устройства | `pin_list`, `pin_info`, `sensor_status` |
| Проверить выход | `pin_state`, `servo_set`, `servo_info` |
| Сохранить настройку пина | `pin_save`, `pin_save_all`, `pin_revert` |
| Создать и посмотреть правило | `rule_wizard`, `rule_add`, `rule_list`, `rule_info`, `rule_states` |
| Управлять существующим правилом | `rule_enable`, `rule_delete` |
| Настроить повторяющуюся задачу | `task_wizard`, `task_list`, `task_enable`, `task_disable` |
| Работать с алгоритмами | `algo_wizard`, `algo_list`, `algo_info` |
| Посмотреть соседние платы | `node_list`, `node_info`, `topics_tree` |
| Настроить получение удалённых данных | `topics_manage`, `topics_subscriptions` |
| Открыть доступ из браузера | `wifi_status`, `host_status`, `host_start`, `webserver` |
| Собрать диагностику | `system_diag`, `config_diag`, `memory_diag`, `messages`, `blackbox` |

Команды диагностики могут зависеть от включённых возможностей выпуска. Очистка хранилища и сброс настроек относятся к обслуживанию и не нужны для обычного чтения статуса.
