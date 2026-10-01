// Учебный пример работает только в браузере и не отправляет команды плате.
const temperatureInput = document.getElementById('temperature');
const thresholdInput = document.getElementById('threshold');
if (temperatureInput && thresholdInput) {
    function updateRuleExample() {
        const temperature = Number(temperatureInput.value);
        const threshold = Number(thresholdInput.value);
        const enabled = temperature > threshold;
        document.getElementById('temperature-value').value = temperature;
        document.getElementById('threshold-value').value = threshold;
        document.getElementById('rule-output').dataset.on = String(enabled);
        document.getElementById('output-label').textContent = enabled ? 'Вентиляция включена' : 'Вентиляция выключена';
        document.getElementById('lab-feedback').textContent = `${temperature} °C ${enabled ? 'выше' : 'не выше'} ${threshold} °C. Условие ${enabled ? 'выполнено' : 'не выполнено'}.`;
    }
    temperatureInput.addEventListener('input', updateRuleExample);
    thresholdInput.addEventListener('input', updateRuleExample);
    updateRuleExample();
}

const partCopy = {
    cover: 'Съёмная крышка даёт доступ к растениям и позволяет наблюдать за ними. Материал, вентиляция и механизм открытия ещё проектируются.',
    tray: 'Лоток отделяет растения и грунт от основного корпуса. В окончательной конструкции нужно продумать влагозащиту, очистку и размещение датчиков.',
    service: 'Боковой отсек открывает доступ к ESP32 и подключениям. Расположение платы, проводка, защита от влаги и питание ещё требуют инженерной проработки.'
};
document.querySelectorAll('[data-part]').forEach(button => {
    button.addEventListener('click', () => {
        const key = button.dataset.part;
        document.querySelectorAll('[data-part]').forEach(item => {
            item.setAttribute('aria-pressed', String(item.dataset.part === key));
        });
        document.getElementById('part-description').textContent = partCopy[key];
    });
});
