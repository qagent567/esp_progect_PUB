// Плавное движение объёмного концепта. Цикл останавливается вне экрана.
document.querySelectorAll('.luxury-stage').forEach(stage => {
    const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
    const precisePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const pauseButton = stage.querySelector('.motion-toggle');
    let paused = false;
    let visible = true;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let lastTime = 0;
    let phase = 0;

    function draw(time) {
        const delta = Math.min((time - lastTime) / 1000 || 0, .05);
        lastTime = time;
        phase += delta;
        currentX += (targetX - currentX) * .055;
        currentY += (targetY - currentY) * .055;
        stage.style.setProperty('--model-yaw', `${-24 + Math.sin(phase * .4) * 7 + currentX * 13}deg`);
        stage.style.setProperty('--model-pitch', `${-13 + currentY * 7}deg`);
        stage.style.setProperty('--model-lift', `${Math.sin(phase * .75) * 7}px`);
        frame = requestAnimationFrame(draw);
    }
    function updateMotion() {
        const running = visible && !paused && !motionPreference.matches && !document.hidden;
        stage.dataset.paused = String(!running);
        if (running && !frame) { lastTime = 0; frame = requestAnimationFrame(draw); }
        if (!running && frame) { cancelAnimationFrame(frame); frame = 0; }
        if (motionPreference.matches) {
            stage.style.setProperty('--model-yaw', '-24deg');
            stage.style.setProperty('--model-pitch', '-13deg');
            stage.style.setProperty('--model-lift', '0px');
        }
        pauseButton.disabled = motionPreference.matches;
        pauseButton.textContent = motionPreference.matches ? 'Статичный вид' : paused ? 'Продолжить ↗' : 'Пауза ↙';
        pauseButton.setAttribute('aria-pressed', String(paused));
        pauseButton.setAttribute('aria-label', paused ? 'Продолжить движение 3D-концепта' : 'Приостановить движение 3D-концепта');
    }
    stage.addEventListener('pointermove', event => {
        if (!precisePointer.matches || paused || motionPreference.matches) return;
        const bounds = stage.getBoundingClientRect();
        targetX = (event.clientX - bounds.left) / bounds.width - .5;
        targetY = (event.clientY - bounds.top) / bounds.height - .5;
    });
    stage.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
    pauseButton.addEventListener('click', () => { paused = !paused; updateMotion(); });
    motionPreference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateMotion);
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => { visible = entries[0].isIntersecting; updateMotion(); }, {threshold:.05}).observe(stage);
    }
    updateMotion();
});
