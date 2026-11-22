'use strict';
/* Вкладка «Лаунчер»: текущая версия и публикация новой ссылки на установщик в Google Диске. */
(function () {
  const q = (s) => document.querySelector(s);
  let loaded = false;

  function setTab(tab) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    q('#users-tab').hidden = tab !== 'users';
    q('#release-tab').hidden = tab !== 'release';
    q('#refresh').hidden = tab !== 'users';
    if (tab === 'release' && !loaded && !q('#dash').hidden) loadRelease();
    try { sessionStorage.setItem('mon.tab', tab); } catch {}
  }
  document.querySelectorAll('.tab').forEach((b) => { b.onclick = () => setTab(b.dataset.tab); });

  const when = (s) => { try { return new Date(s).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return s; } };
  const node = (tag, text, cls) => { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; };

  function renderNow(r) {
    const box = q('#rel-now');
    box.textContent = '';
    box.append(node('div', 'Версия ' + r.version, 'v'));
    const dl = node('dl');
    const row = (k, v, cls) => { dl.append(node('dt', k)); const d = node('dd', null, cls); if (v instanceof Node) d.append(v); else d.textContent = v; dl.append(d); };
    row('Файл', r.fileName || '—');
    row('Размер', r.sizeLabel || '—');
    row('Опубликована', r.publishedAt ? when(r.publishedAt) : '—');
    const a = node('a', 'открыть в Google Диске'); a.href = r.mirrorUrl; a.target = '_blank'; a.rel = 'noopener';
    row('Ссылка', a);
    row('SHA-256', r.sha256 || '—', 'mono sha');
    box.append(dl);
    if (Array.isArray(r.changelog) && r.changelog.length) {
      const ul = node('ul');
      r.changelog.forEach((line) => ul.append(node('li', line)));
      box.append(ul);
    }
  }

  async function loadRelease() {
    const { status, data } = await api('mon/release');
    if (status === 401) { show('login'); q('#pw').focus(); return; }
    if (status !== 200 || !data || !data.version) { q('#rel-now').textContent = (data && data.error) || 'Не удалось загрузить текущую версию.'; return; }
    loaded = true;
    renderNow(data);
    if (!q('#r-log').value.trim()) q('#r-log').value = (data.changelog || []).join('\n');
  }

  const btn = q('#r-btn');
  let armTimer = null;
  const disarm = () => { clearTimeout(armTimer); btn.classList.remove('armed'); btn.textContent = 'Опубликовать'; };

  q('#relform').onsubmit = async (e) => {
    e.preventDefault();
    const err = q('#r-err');
    err.textContent = '';
    const link = q('#r-link').value.trim();
    const version = q('#r-ver').value.trim();
    if (!/drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com/.test(link) && !/^[A-Za-z0-9_-]{20,100}$/.test(link)) {
      err.textContent = 'Вставьте ссылку на файл в Google Диске: drive.google.com/file/d/…';
      return;
    }
    if (version && !/^\d+\.\d+\.\d+$/.test(version)) { err.textContent = 'Версия пишется так: 1.5.3'; return; }
    // Публикация меняет лаунчер у всех, поэтому её нужно подтвердить вторым нажатием.
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = 'Точно опубликовать для всех?';
      armTimer = setTimeout(disarm, 5000);
      return;
    }
    disarm();
    btn.disabled = true;
    q('#r-busy').hidden = false;
    const { status, data } = await api('mon/release', { method: 'POST', body: { link, version, changelog: q('#r-log').value }, timeout: 90000 });
    btn.disabled = false;
    q('#r-busy').hidden = true;
    if (status === 401) { show('login'); q('#pw').focus(); return; }
    if (status !== 200 || !data || !data.version) { err.textContent = (data && data.error) || 'Не удалось опубликовать. Попробуйте ещё раз.'; return; }
    loaded = true;
    renderNow(data);
    q('#r-link').value = '';
    q('#r-ver').value = '';
    q('#r-log').value = (data.changelog || []).join('\n');
    toast('Версия ' + data.version + ' опубликована: сайты уже показывают её, лаунчеры обновятся сами');
  };

  // После входа (start из app.js) подгружаем вкладку, если открыта она.
  const baseStart = window.start;
  window.start = async function () {
    await baseStart();
    if (!q('#release-tab').hidden && !loaded) loadRelease();
  };

  let saved = 'users';
  try { saved = sessionStorage.getItem('mon.tab') || 'users'; } catch {}
  if (saved === 'release') setTab('release');
})();
