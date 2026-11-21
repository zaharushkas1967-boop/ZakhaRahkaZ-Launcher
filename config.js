// Настройки сайта: последняя версия лаунчера. Новую ссылку публикуют во вкладке «Лаунчер» в мониторе —
// страница сама подтянет её с сервера; значения ниже показываются, только пока сервер не ответил.
window.ZRZ = {
  version: '1.5.2',
  size: '119 МБ',
  released: 'ноябрь 2026',
  fileName: 'ZakhaRahkaZ-Launcher-1.5.2.exe',
  downloadUrl: 'https://drive.usercontent.google.com/download?id=1qAPcGYVJWCiWsPNa7F4_F74D0lQtjnE1&export=download&confirm=t',
  mirrorUrl: 'https://drive.google.com/file/d/1qAPcGYVJWCiWsPNa7F4_F74D0lQtjnE1/view',
  sha256: '79c1a5aa2f9668b8a5ddbeecfbfe59b6268513c76ee4f75402a3ae6eadb275a2',
  changelog: [
    '«Забыли пароль?» в лаунчере и на сайте: код для сброса приходит на почту или в Telegram',
    'Привязка почты и Telegram в кабинете на сайте',
    'Лаунчер сам переходит на запасной адрес сервера аккаунтов, если основной не отвечает',
    'Кнопка «Кабинет» открывает кабинет на работающем адресе',
    'Аккаунты ZakhaRahkaZ: регистрация по нику и паролю, скин и плащ видят другие игроки',
    'Bedrock Edition из Microsoft Store прямо из лаунчера'
  ]
};

/* Актуальная версия с сервера: сначала этот сайт, затем зеркала (на GitHub Pages — только зеркала). */
(function () {
  var MIRRORS = ['https://zakharahkaz-76-76-21-21.my.local-ip.co', 'https://zakharahkaz-216-198-79-195.my.local-ip.co', 'https://zakharahkaz-launcher.vercel.app'];
  var onPages = /\.github\.io$/.test(location.hostname);
  var bases = onPages ? MIRRORS : [''].concat(MIRRORS.filter(function (m) { return m !== location.origin; }));
  var safeUrl = function (u) { return /^https:\/\/(drive\.usercontent\.google\.com|drive\.google\.com)\//.test(String(u || '')); };

  function patch() {
    var Z = window.ZRZ, q = function (s) { return document.querySelector(s); };
    if (q('#meta')) q('#meta').textContent = 'Версия ' + Z.version + ' · Windows 10/11 · ' + Z.size;
    if (q('#ver')) q('#ver').textContent = 'Версия ' + Z.version;
    if (q('#meta2')) q('#meta2').textContent = Z.released + ' · ' + Z.size + ' · Windows 10/11 x64';
    if (q('#sha')) q('#sha').textContent = Z.sha256;
    var log = q('#log');
    if (log) {
      log.textContent = '';
      Z.changelog.forEach(function (line) { var li = document.createElement('li'); li.textContent = line; log.appendChild(li); });
    }
    document.querySelectorAll('[data-dl]').forEach(function (a) { a.href = Z.downloadUrl; a.rel = 'noopener'; });
    var m = q('#mirror');
    if (m) { m.href = Z.mirrorUrl; m.hidden = false; }
  }

  async function load() {
    for (var i = 0; i < bases.length; i += 1) {
      try {
        var r = await fetch(bases[i] + '/api/release', { cache: 'no-store', signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined });
        if (r.ok) return await r.json();
      } catch (e) { /* следующий адрес */ }
    }
    return null;
  }

  load().then(function (r) {
    if (!r || !r.version || !safeUrl(r.downloadUrl) || !safeUrl(r.mirrorUrl)) return;
    Object.assign(window.ZRZ, {
      version: String(r.version),
      size: String(r.sizeLabel || window.ZRZ.size),
      released: String(r.released || window.ZRZ.released),
      fileName: String(r.fileName || window.ZRZ.fileName),
      downloadUrl: r.downloadUrl,
      mirrorUrl: r.mirrorUrl,
      sha256: String(r.sha256 || ''),
      changelog: Array.isArray(r.changelog) ? r.changelog.map(String) : window.ZRZ.changelog
    });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', patch);
    else patch();
  });
})();
