/* J1 Cyberdeck — JS legado (Android 5.1.1 / WebView antigo)
   Regras: var, function, XMLHttpRequest. Sem fetch, const/let, arrow, crase. */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function txt(id, v) { var el = $(id); if (el) { el.innerHTML = v; } }
  function show(el, on) { if (el) { el.style.display = on ? '' : 'none'; } }
  function n(v, suf) {
    return (v === null || v === undefined || v === '') ? '--' : v + (suf || '');
  }

  /* ================= viewport =================
     O layout e desenhado em 800x480 fixos. O Chrome do J1 entrega outra
     medida (barra de URL, devicePixelRatio 1.5), entao o palco e sempre
     escalado para caber: nunca corta e nunca estoura. */
  var lastW = 0, lastH = 0;

  function vp() {
    var de = document.documentElement;
    return {
      w: de.clientWidth || window.innerWidth || 800,
      h: de.clientHeight || window.innerHeight || 480
    };
  }

  function fitStage() {
    var stage = $('stage');
    if (!stage) { return; }
    var v = vp();
    var w = v.w, h = v.h;
    var s = Math.min(w / 800, h / 480);
    if (!(s > 0)) { s = 1; }
    if (s > 1.6) { s = 1.6; }
    var left = Math.round((w - 800 * s) / 2);
    var top = Math.round((h - 480 * s) / 2);
    if (left < 0) { left = 0; }
    if (top < 0) { top = 0; }
    stage.style.left = left + 'px';
    stage.style.top = top + 'px';
    stage.style.webkitTransformOrigin = '0 0';
    stage.style.transformOrigin = '0 0';
    stage.style.webkitTransform = 'scale(' + s + ')';
    stage.style.transform = 'scale(' + s + ')';

    var rot = $('rotate');
    if (rot) { rot.className = (h > w + 24) ? 'rotate on' : 'rotate'; }

    if (DEBUG) {
      var chip = $('dbg');
      if (!chip) {
        var strip = document.getElementsByClassName('nav-center')[0];
        if (strip) {
          chip = document.createElement('span');
          chip.id = 'dbg';
          chip.className = 'demo';
          strip.appendChild(chip);
        }
      }
      if (chip) { chip.innerHTML = w + 'x' + h + ' @' + Math.round(s * 100) + '%'; }
    }

    lastW = w;
    lastH = h;
  }

  function refitSoon() {
    var v = vp();
    if (v.w !== lastW || v.h !== lastH) { fitStage(); }
  }

  function injectRotate() {
    if ($('rotate')) { return; }
    var d = document.createElement('div');
    d.id = 'rotate';
    d.className = 'rotate';
    d.innerHTML = '<div class="rbox">' +
      '<svg class="ico" viewBox="0 -960 960 960"><path d="M496-182 182-496q-23-23-23-54t23-54l174-174q23-23 54-23t54 23l314 314q23 23 23 54t-23 54L604-182q-23 23-54 23Zm54-58 170-170-310-310-170 170 310 310ZM480 0q-99 0-186.5-37.5t-153-103Q75-206 37.5-293.5T0-480h80q0 71 24 136t66.5 117Q213-175 272-138.5T401-87L296-192l56-56L588-12q-26 6-53.5 9T480 0Zm400-480q0-71-24-136t-66.5-117Q747-785 688-821.5T559-873l105 105-56 56-236-236q26-6 53.5-9t54.5-3q99 0 186.5 37.5t153 103q65.5 65.5 103 153T960-480h-80Zm-400 0Z"/></svg>' +
      '<div class="t">Gire o dispositivo</div>' +
      '<div class="s">Painel 800 &times; 480 // paisagem</div>' +
      '</div>';
    document.body.appendChild(d);
  }

  /* ================= relogio ================= */
  var DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  var MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  function tickClock() {
    var d = new Date();
    txt('clk-h', pad2(d.getHours()));
    txt('clk-m', pad2(d.getMinutes()));
    txt('clk-s', '.' + pad2(d.getSeconds()));
    txt('clk-date', DIAS[d.getDay()] + ', ' + pad2(d.getDate()) + ' ' + MESES[d.getMonth()]);
  }

  /* ================= rede ================= */
  function fetchDados(cb) {
    var done = false;
    function finish(v) { if (!done) { done = true; cb(v); } }
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/dados', true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try { finish(JSON.parse(xhr.responseText)); } catch (e) { finish(null); }
          } else {
            finish(null);
          }
        }
      };
      xhr.send();
    } catch (e) { finish(null); }
  }

  function sendCmd(cmd) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/add_cmd/' + cmd, true);
      xhr.send();
    } catch (e) { }
  }

  function sendSeek(ms) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/seek?ms=' + Math.round(ms), true);
      xhr.send();
    } catch (e) { }
  }

  function flash(el) {
    if (!el) { return; }
    el.className += ' hot';
    setTimeout(function () { el.className = el.className.replace(/\s*hot/g, ''); }, 140);
  }

  /* ================= estado ================= */
  var S = {
    online: false,
    link: '--',
    rtt: 0,
    musica: '—',
    artista: '—',
    fonte: '—',
    tocando: false,
    pos_ms: 0,
    dur_ms: 0,
    volume: 0,
    mic_muted: false,
    gpu_name: '—',
    host: '—',
    uptime: '--:--:--'
  };
  var SEEK_HOLD = 0;      /* ignora posicao do servidor logo apos pedir seek */
  var DEBUG = (window.location.search || '').indexOf('debug') >= 0;

  /* ================= faixa / link ================= */
  function renderLink() {
    var led = $('link-led');
    var type = $('link-type');
    var ping = $('link-ping');
    if (led) { led.className = 'led' + (S.online ? '' : ' off'); }
    if (type) { type.innerHTML = S.online ? S.link : 'OFF'; }
    if (ping) { ping.innerHTML = S.online ? (S.rtt > 0 ? S.rtt + 'ms' : '--') : '--'; }
  }

  /* ================= monitor ================= */
  function setBar(id, pct) {
    var el = $(id);
    if (el) { el.style.width = clamp(Math.round(pct), 0, 100) + '%'; }
  }

  function paintMonitor(d) {
    var cpu = d.cpu, ram = d.ram, gpu = d.gpu, temp = d.temp;
    txt('m-cpu', n(cpu)); txt('m-ram', n(ram)); txt('m-gpu', n(gpu)); txt('m-temp', n(temp));
    setBar('m-cpu-bar', cpu || 0); setBar('m-ram-bar', ram || 0);
    setBar('m-gpu-bar', gpu || 0); setBar('m-temp-bar', temp || 0);

    txt('m-cpu-ghz', n(d.cpu_ghz, ' GHz'));
    txt('m-cpu-thr', d.threads ? d.threads + 'T' : '--');
    txt('m-ram-use', n(d.ram_used, ' GB'));
    txt('m-ram-total', n(d.ram_total, ' GB'));
    txt('m-gpu-mhz', n(d.gpu_mhz, ' MHz'));
    txt('m-gpu-name', d.gpu_name || 'GPU');
    txt('m-fan', 'FAN ' + n(d.fan, '%'));

    var st = $('m-temp-state');
    if (st) {
      st.innerHTML = d.temp_state || '--';
      st.style.color = d.temp_state === 'CRITICA' ? '#FF6B6B'
        : (d.temp_state === 'ALTA' ? '#FFD166' : '#8E8E93');
    }

    txt('n-down', d.down || '0 KB/s');
    txt('n-up', d.up || '0 KB/s');
    txt('n-if', d.link || '--');

    txt('m-host', d.host || '—');
    txt('m-uptime', d.uptime || '--:--:--');
  }

  function initMonitor() {
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(function () {
      fetchDados(function (d) {
        if (!d) { S.online = false; renderLink(); return; }
        S.online = d.online === true;
        S.link = d.link || '--';
        S.rtt = d.rtt || 0;
        renderLink();
        paintMonitor(d);
      });
    }, 2000);
  }

  /* ================= midia ================= */
  function initMidia() {
    var pads = document.getElementsByClassName('pad');
    for (var i = 0; i < pads.length; i++) {
      pads[i].addEventListener('click', function () {
        flash(this);
        sendCmd(this.getAttribute('data-cmd'));
      });
    }
    /* play/pause do pad master segue o estado real do PC */
    setInterval(function () {
      fetchDados(function (d) {
        if (!d) { S.online = false; renderLink(); return; }
        S.online = d.online === true;
        S.link = d.link || '--';
        S.rtt = d.rtt || 0;
        renderLink();
        var pad = $('pad-play');
        if (pad) { pad.className = 'pad play' + (d.tocando ? ' playing' : ''); }
      });
    }, 2000);
  }

  /* ================= tocando ================= */
  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
  }

  function paintNp() {
    var dur = S.dur_ms / 1000;
    var pos = S.pos_ms / 1000;
    var pct = dur > 0 ? clamp((pos / dur) * 100, 0, 100) : 0;

    txt('np-title', S.musica || '—');
    txt('np-artist', S.artista || '—');
    txt('np-src', S.fonte || '—');
    txt('np-elapsed', dur > 0 ? fmt(pos) : '--:--');
    txt('np-remain', dur > 0 ? '-' + fmt(Math.max(0, dur - pos)) : '--:--');
    txt('np-vol', n(S.volume));
    txt('np-state', S.tocando ? 'REPRODUZINDO' : 'PAUSADO');

    var led = $('np-led');
    if (led) { led.className = 'led' + (S.tocando ? '' : ' off'); }

    var fill = $('seek-fill');
    var head = $('seek-head');
    if (fill) { fill.style.width = pct + '%'; }
    if (head) { head.style.left = pct + '%'; }

    var btn = $('np-play');
    if (btn) { btn.className = 'ctlbtn big' + (S.tocando ? ' playing' : ''); }

    var seek = $('np-seek');
    if (seek) { seek.style.opacity = dur > 0 ? '1' : '.45'; }
  }

  function npPoll() {
    fetchDados(function (d) {
      if (!d) { S.online = false; renderLink(); return; }
      S.online = d.online === true;
      S.link = d.link || '--';
      S.rtt = d.rtt || 0;
      S.musica = d.musica || '—';
      S.artista = d.artista || '—';
      S.fonte = d.fonte || '—';
      S.tocando = d.tocando === true;
      S.dur_ms = d.dur_ms || 0;
      S.volume = (d.volume === null || d.volume === undefined) ? null : d.volume;
      if (Date.now() > SEEK_HOLD) { S.pos_ms = d.pos_ms || 0; }
      renderLink();
      paintNp();
    });
  }

  function initNowplaying() {
    paintNp();
    npPoll();
    setInterval(npPoll, 2000);

    /* avanca a barra entre polls, sem inventar posicao se estiver pausado */
    setInterval(function () {
      if (!S.tocando || Date.now() < SEEK_HOLD) { return; }
      if (S.dur_ms > 0 && S.pos_ms < S.dur_ms) { S.pos_ms += 1000; paintNp(); }
    }, 1000);

    if ($('np-play')) {
      $('np-play').addEventListener('click', function () {
        S.tocando = !S.tocando;
        paintNp();
        sendCmd('playpause');
      });
    }
    if ($('np-prev')) { $('np-prev').addEventListener('click', function () { sendCmd('prev'); }); }
    if ($('np-next')) { $('np-next').addEventListener('click', function () { sendCmd('next'); }); }
    if ($('np-vold')) { $('np-vold').addEventListener('click', function () { sendCmd('voldown'); }); }
    if ($('np-volu')) { $('np-volu').addEventListener('click', function () { sendCmd('volup'); }); }

    if ($('np-seek')) {
      $('np-seek').addEventListener('click', function (e) {
        if (!(S.dur_ms > 0)) { return; }
        var r = this.getBoundingClientRect();
        var x = (e.clientX !== undefined ? e.clientX : e.pageX) - r.left;
        var ratio = clamp(x / r.width, 0, 1);
        S.pos_ms = Math.floor(ratio * S.dur_ms);
        SEEK_HOLD = Date.now() + 2500;
        paintNp();
        sendSeek(S.pos_ms);
      });
    }
  }

  /* ================= deck ================= */
  function setLast(name) { txt('last', name); }

  function setBank(n) {
    show($('bank1'), n === 1);
    show($('bank2'), n === 2);
    if ($('seg1')) { $('seg1').className = 'seg' + (n === 1 ? ' on' : ''); }
    if ($('seg2')) { $('seg2').className = 'seg' + (n === 2 ? ' on' : ''); }
  }

  function paintMic() {
    var k = $('key-mic');
    if (!k) { return; }
    k.className = 'key k1' + (S.mic_muted ? ' muted' : '');
    txt('mic-sub', S.mic_muted ? 'MIC // MUDO' : 'MIC // ATIVO');
  }

  function paintPp() {
    var k = $('key-pp');
    if (!k) { return; }
    k.className = 'key k7' + (S.tocando ? ' playing' : '');
  }

  function onKey() {
    var cmd = this.getAttribute('data-cmd');
    var name = this.getAttribute('data-name') || cmd;
    flash(this);
    setLast(name);
    sendCmd(cmd);
    /* estado real volta no proximo /dados; aqui so antecipa o visual */
    if (cmd === 'mic_mute') { S.mic_muted = !S.mic_muted; paintMic(); }
    if (cmd === 'playpause') { S.tocando = !S.tocando; paintPp(); }
  }

  function initDeck() {
    if ($('seg1')) { $('seg1').addEventListener('click', function () { setBank(1); }); }
    if ($('seg2')) { $('seg2').addEventListener('click', function () { setBank(2); }); }

    var keys = document.getElementsByClassName('key');
    for (var i = 0; i < keys.length; i++) { keys[i].addEventListener('click', onKey); }
    setBank(1);

    setInterval(function () {
      fetchDados(function (d) {
        if (!d) { S.online = false; renderLink(); return; }
        S.online = d.online === true;
        S.link = d.link || '--';
        S.rtt = d.rtt || 0;
        S.mic_muted = d.mic_muted === true;
        S.tocando = d.tocando === true;
        renderLink();
        paintMic();
        paintPp();
      });
    }, 2000);
  }

  /* ================= boot ================= */
  injectRotate();
  fitStage();
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', function () {
    setTimeout(fitStage, 120);
    setTimeout(fitStage, 400);
    setTimeout(fitStage, 900);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitStage);
  }
  setInterval(refitSoon, 400);
  renderLink();

  var page = document.body.getAttribute('data-page');
  if (page === 'monitor') { initMonitor(); }
  if (page === 'midia') { initMidia(); }
  if (page === 'nowplaying') { initNowplaying(); }
  if (page === 'deck') { initDeck(); }
})();
