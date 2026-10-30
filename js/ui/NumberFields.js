/**
 * Convierte el número de cada slider (lbl-*) en un campo editable con flechas ▲▼.
 * El slider sigue siendo la fuente de verdad: el campo escribe en él y lanza su evento "input",
 * y un observador refleja en el campo cualquier cambio que el código haga en la etiqueta.
 */
export function initNumberFields(root = document) {
  root.querySelectorAll('input[type="range"]').forEach(slider => {
    if (slider.dataset.numberField) return;
    const label = slider.parentElement && slider.parentElement.querySelector('span[id^="lbl-"]');
    if (!label) return;
    slider.dataset.numberField = '1';

    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const step = parseFloat(slider.step) || 1;
    // Paso fino: los deslizadores de paso grande se afinan a 1 para poder ajustar con precisión
    const fine = step >= 5 ? 1 : step;
    slider.step = String(fine);
    const decimals = (String(fine).split('.')[1] || '').length;
    const open = slider.hasAttribute('data-open-max');
    const clamp = (v) => Math.min(open ? Infinity : max, Math.max(min, v));
    const fmt = (v) => v.toFixed(decimals);

    const wrap = document.createElement('span');
    wrap.className = 'num-field';

    const down = document.createElement('button');
    down.type = 'button';
    down.className = 'num-field-btn';
    down.textContent = '▼';
    down.setAttribute('aria-label', 'Disminuir');

    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'num-field-input';
    input.min = String(min);
    if (!open) input.max = String(max);
    input.step = String(fine);
    input.inputMode = 'decimal';

    const up = document.createElement('button');
    up.type = 'button';
    up.className = 'num-field-btn';
    up.textContent = '▲';
    up.setAttribute('aria-label', 'Aumentar');

    const unit = document.createElement('span');
    unit.className = 'num-field-unit';

    wrap.append(down, input, up, unit);
    label.style.display = 'none';
    label.after(wrap);

    const readLabel = () => {
      const text = label.textContent || '';
      const m = text.match(/-?\d+(?:\.\d+)?/);
      if (!m) return;
      if (document.activeElement !== input) input.value = fmt(parseFloat(m[0]));
      unit.textContent = text.replace(m[0], '').trim();
    };

    const commit = (raw) => {
      let v = parseFloat(raw);
      if (Number.isNaN(v)) { readLabel(); return; }
      v = clamp(Math.round(v / fine) * fine);
      if (open && v > parseFloat(slider.max)) slider.max = String(v);
      slider.value = String(v);
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      input.value = fmt(v);
    };

    const nudge = (dir) => commit((parseFloat(slider.value) || 0) + dir * fine);

    // Mantener pulsado repite el paso
    const hold = (btn, dir) => {
      let timer = null;
      let interval = null;
      const stop = () => { clearTimeout(timer); clearInterval(interval); };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        nudge(dir);
        timer = setTimeout(() => { interval = setInterval(() => nudge(dir), 60); }, 400);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
    };
    hold(down, -1);
    hold(up, 1);

    input.addEventListener('change', () => commit(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { commit(input.value); input.blur(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); nudge(1); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); nudge(-1); }
      e.stopPropagation();
    });
    input.addEventListener('focus', () => input.select());
    input.addEventListener('blur', readLabel);

    new MutationObserver(readLabel).observe(label, { childList: true, characterData: true, subtree: true });
    readLabel();
  });
}
