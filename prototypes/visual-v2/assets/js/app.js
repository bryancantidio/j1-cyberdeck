(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function rnd(a, b) { return Math.round(a + Math.random() * (b - a)); }

  /* ---------- viewport ---------- */
  /* Chrome no J1 pode reportar alturas diferentes de 480 (barra de URL) e
     chegar a 320 px de largura CSS por causa do devicePixelRatio. Por isso o
     palco de 800x480 e SEMPRE escalado para caber: nunca e cortado. */
  var lastW = 0, lastH = 0;

  function vp() {
    var de = document.documentElement;
    var w = de.clientWidth || window.innerWidth || 800;
    var h = de.clientHeight || window.innerHeight || 480;
    return { w: w, h: h };
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
    if (rot) {
      if (h > w + 24) { rot.className = 'rotate on'; }
      else { rot.className = 'rotate'; }
    }

    var demo = document.getElementsByClassName('demo')[0];
    if (demo) { demo.innerHTML = 'DEMO ' + w + 'x' + h + ' @' + Math.round(s * 100) + '%'; }

    lastW = w;
    lastH = h;
  }

  /* Android antigo nao dispara resize quando a barra de URL some/aparece,
     e o teclado/rotacao chegam com atraso. Reajusta sempre que muda. */
  function refitSoon() {
    var v = vp();
    if (v.w !== lastW || v.h !== lastH) { fitStage(); }
  }

  function bootViewport() {
    injectFs();
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
  }

  /* ---------- tela cheia ---------- */
  var ICO_FS = '<svg class="ico" viewBox="0 -960 960 960"><path d="M120-120v-200h80v120h120v80H120Zm520 0v-80h120v-120h80v200H640ZM120-640v-200h200v80H200v120h-80Zm640 0v-120H640v-80h200v200h-80Z"/></svg>';

  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement || null;
  }

  function injectFs() {
    var strip = document.getElementsByClassName('strip')[0];
    if (!strip || $('fsbtn')) { return; }
    var b = document.createElement('button');
    b.id = 'fsbtn';
    b.className = 'fsbtn';
    b.type = 'button';
    b.setAttribute('aria-label', 'Tela cheia');
    b.innerHTML = ICO_FS;
    strip.appendChild(b);
    b.addEventListener('click', function () {
      var de = document.documentElement;
      try {
        if (fsElement()) {
          if (document.exitFullscreen) { document.exitFullscreen(); }
          else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
          else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
          else if (document.msExitFullscreen) { document.msExitFullscreen(); }
        } else {
          var req = de.requestFullscreen || de.webkitRequestFullscreen ||
            de.webkitRequestFullScreen || de.mozRequestFullScreen || de.msRequestFullscreen;
          if (req) { req.call(de); }
        }
      } catch (e) { }
      setTimeout(fitStage, 150);
      setTimeout(fitStage, 500);
    });
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    onFsChange();
  }

  function onFsChange() {
    var b = $('fsbtn');
    if (b) { b.className = 'fsbtn' + (fsElement() ? ' on' : ''); }
    setTimeout(fitStage, 120);
  }

  /* ---------- retrato ---------- */
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

  /* ---------- clock ---------- */
  var DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  var MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  function tickClock() {
    var d = new Date();
    if ($('clk-h')) { $('clk-h').innerHTML = pad2(d.getHours()); }
    if ($('clk-m')) { $('clk-m').innerHTML = pad2(d.getMinutes()); }
    if ($('clk-s')) { $('clk-s').innerHTML = '.' + pad2(d.getSeconds()); }
    if ($('clk-date')) {
      $('clk-date').innerHTML = DIAS[d.getDay()] + ', ' + pad2(d.getDate()) + ' ' + MESES[d.getMonth()];
    }
  }

  /* ---------- backend ---------- */
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
    } catch (e) {
      finish(null);
    }
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
      xhr.open('GET', '/seek?ms=' + ms, true);
      xhr.send();
    } catch (e) { }
  }

  function flash(el) {
    if (!el) { return; }
    el.className += ' hot';
    setTimeout(function () {
      el.className = el.className.replace(/\s*hot/g, '');
    }, 140);
  }

  /* ---------- link status (shared strip) ---------- */
  var link = { online: true, type: 'USB', rtt: 12 };

  function renderLink() {
    var led = $('link-led');
    var type = $('link-type');
    var ping = $('link-ping');
    if (led) { led.className = 'led' + (link.online ? '' : ' off'); }
    if (type) { type.innerHTML = link.online ? link.type : 'OFF'; }
    if (ping) { ping.innerHTML = link.online ? link.rtt + 'ms' : '--'; }
  }

  function tickLink() {
    if (!link.online) { return; }
    link.rtt = clamp(link.rtt + rnd(-3, 3), 6, 22);
    renderLink();
  }

  /* ---------- monitor ---------- */
  var demoMon = {
    cpu: 28, ram: 42, gpu: 19, temp: 48,
    down: '124.6 MB/s', up: '18.2 MB/s',
    cpu_ghz: '3.60', threads: '8',
    ram_used: '13.4', ram_total: '32',
    gpu_mhz: '580', gpu_name: 'RTX 3050',
    fan: '45', temp_state: 'NORMAL',
    host: 'NITRO-ACER', uptime: '03:12:44'
  };

  function setBar(id, pct) {
    var el = $(id);
    if (el) { el.style.width = clamp(Math.round(pct), 0, 100) + '%'; }
  }

  function paintMonitor(d) {
    var cpu = Math.round(d.cpu);
    var ram = Math.round(d.ram);
    var gpu = Math.round(d.gpu);
    var temp = Math.round(d.temp);

    if ($('m-cpu')) { $('m-cpu').innerHTML = cpu; }
    if ($('m-ram')) { $('m-ram').innerHTML = ram; }
    if ($('m-gpu')) { $('m-gpu').innerHTML = gpu; }
    if ($('m-temp')) { $('m-temp').innerHTML = temp; }
    setBar('m-cpu-bar', cpu);
    setBar('m-ram-bar', ram);
    setBar('m-gpu-bar', gpu);
    setBar('m-temp-bar', temp);

    if ($('m-cpu-ghz')) { $('m-cpu-ghz').innerHTML = d.cpu_ghz + ' GHz'; }
    if ($('m-cpu-thr')) { $('m-cpu-thr').innerHTML = d.threads + 'T'; }
    if ($('m-ram-use')) { $('m-ram-use').innerHTML = d.ram_used + ' GB'; }
    if ($('m-ram-total')) { $('m-ram-total').innerHTML = d.ram_total + ' GB'; }
    if ($('m-gpu-mhz')) { $('m-gpu-mhz').innerHTML = d.gpu_mhz + ' MHz'; }
    if ($('m-gpu-name')) { $('m-gpu-name').innerHTML = d.gpu_name; }
    if ($('m-fan')) { $('m-fan').innerHTML = 'FAN ' + d.fan + '%'; }
    if ($('m-temp-state')) {
      var st = $('m-temp-state');
      st.innerHTML = d.temp_state;
      st.style.color = d.temp_state === 'CRITICA' ? '#FF6B6B' : (d.temp_state === 'ALTA' ? '#FFD166' : '#8E8E93');
    }

    if ($('n-down')) { $('n-down').innerHTML = d.down; }
    if ($('n-up')) { $('n-up').innerHTML = d.up; }
    if ($('n-if')) { $('n-if').innerHTML = d.link_if || 'USB'; }
    if ($('n-if-speed')) { $('n-if-speed').innerHTML = d.if_speed || '866'; }

    if ($('m-host')) { $('m-host').innerHTML = d.host; }
    if ($('m-uptime')) { $('m-uptime').innerHTML = d.uptime; }
  }

  function tempState(t) {
    if (t >= 85) { return 'CRITICA'; }
    if (t >= 70) { return 'ALTA'; }
    return 'NORMAL';
  }

  function demoMonitorTick() {
    demoMon.cpu = clamp(demoMon.cpu + rnd(-5, 5), 5, 92);
    demoMon.ram = clamp(demoMon.ram + rnd(-2, 2), 24, 88);
    demoMon.gpu = clamp(demoMon.gpu + rnd(-7, 7), 0, 98);
    demoMon.temp = clamp(demoMon.temp + rnd(-1, 1), 41, 79);
    demoMon.fan = String(clamp(Math.round(demoMon.temp * 0.95), 30, 80));
    demoMon.temp_state = tempState(demoMon.temp);
    demoMon.down = (80 + Math.random() * 70).toFixed(1) + ' MB/s';
    demoMon.up = (9 + Math.random() * 14).toFixed(1) + ' MB/s';
    paintMonitor(demoMon);
  }

  function initMonitor() {
    tickClock();
    demoMonitorTick();
    setInterval(function () {
      fetchDados(function (d) {
        if (d && typeof d.cpu !== 'undefined' && d.online !== false) {
          paintMonitor({
            cpu: d.cpu, ram: d.ram, gpu: d.gpu, temp: d.temp,
            down: d.down, up: d.up,
            cpu_ghz: d.cpu_ghz || '--', threads: d.threads || '--',
            ram_used: d.ram_used || '--', ram_total: d.ram_total || '--',
            gpu_mhz: d.gpu_mhz || '--', gpu_name: d.gpu_name || 'GPU',
            fan: d.fan || '--', temp_state: d.temp_state || tempState(d.temp),
            host: d.host || 'NITRO', uptime: d.uptime || '--:--',
            link_if: d.link_if || 'USB', if_speed: d.if_speed || '866'
          });
          link.online = true;
          link.type = d.link || link.type;
          link.rtt = d.rtt || link.rtt;
          renderLink();
        } else {
          demoMonitorTick();
        }
      });
    }, 2000);
  }

  /* ---------- midia ---------- */
  function initMidia() {
    var pads = document.getElementsByClassName('pad');
    for (var i = 0; i < pads.length; i++) {
      pads[i].addEventListener('click', function () {
        var cmd = this.getAttribute('data-cmd');
        if (cmd === 'playpause') { this.className += (this.className.indexOf('playing') >= 0 ? '' : ' playing'); }
        flash(this);
        sendCmd(cmd);
      });
    }
  }

  /* ---------- now playing ---------- */
  var playlist = [
    { t: 'Solaris Dreams', a: 'Tycho', s: 'Spotify', d: 245 },
    { t: 'Midnight City', a: 'M83', s: 'Spotify', d: 243 },
    { t: 'Dayvan Cowboy', a: 'Boards of Canada', s: 'Spotify', d: 300 },
    { t: 'Resonance', a: 'HOME', s: 'Spotify', d: 212 }
  ];
  var npIndex = 0;
  var npPos = 134;
  var npPlaying = true;
  var npSeekAt = 0;

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
  }

  function paintNp() {
    var t = playlist[npIndex];
    var pct = clamp((npPos / t.d) * 100, 0, 100);
    if ($('np-title')) { $('np-title').innerHTML = t.t; }
    if ($('np-artist')) { $('np-artist').innerHTML = t.a; }
    if ($('np-src')) { $('np-src').innerHTML = t.s; }
    if ($('np-elapsed')) { $('np-elapsed').innerHTML = fmt(npPos); }
    if ($('np-remain')) { $('np-remain').innerHTML = '-' + fmt(t.d - npPos); }
    if ($('seek-fill')) { $('seek-fill').style.width = pct + '%'; }
    if ($('seek-head')) { $('seek-head').style.left = pct + '%'; }
    var btn = $('np-play');
    if (btn) { btn.className = 'ctlbtn big' + (npPlaying ? ' playing' : ''); }
    if ($('np-state')) { $('np-state').innerHTML = npPlaying ? 'REPRODUZINDO' : 'PAUSADO'; }
    if ($('np-led')) { $('np-led').className = 'led' + (npPlaying ? '' : ' off'); }
    if ($('np-vol')) { $('np-vol').innerHTML = '24'; }
  }

  function npNext() {
    npIndex = (npIndex + 1) % playlist.length;
    npPos = 0;
    paintNp();
    sendCmd('next');
  }

  function npPrev() {
    if (npPos > 3) {
      npPos = 0;
    } else {
      npIndex = (npIndex - 1 + playlist.length) % playlist.length;
      npPos = 0;
    }
    paintNp();
    sendCmd('prev');
  }

  function initNowplaying() {
    paintNp();
    setInterval(function () {
      if (!npPlaying) { return; }
      if (Date.now() - npSeekAt < 1600) { return; }
      npPos += 1;
      if (npPos >= playlist[npIndex].d) {
        npIndex = (npIndex + 1) % playlist.length;
        npPos = 0;
      }
      paintNp();
    }, 1000);

    if ($('np-play')) {
      $('np-play').addEventListener('click', function () {
        npPlaying = !npPlaying;
        paintNp();
        sendCmd('playpause');
      });
    }
    if ($('np-prev')) { $('np-prev').addEventListener('click', npPrev); }
    if ($('np-next')) { $('np-next').addEventListener('click', npNext); }
    if ($('np-vold')) { $('np-vold').addEventListener('click', function () { sendCmd('voldown'); }); }
    if ($('np-volu')) { $('np-volu').addEventListener('click', function () { sendCmd('volup'); }); }

    if ($('np-seek')) {
      $('np-seek').addEventListener('click', function (e) {
        var r = this.getBoundingClientRect();
        var x = (e.clientX !== undefined ? e.clientX : e.pageX) - r.left;
        var ratio = clamp(x / r.width, 0, 1);
        npPos = Math.floor(ratio * playlist[npIndex].d);
        npSeekAt = Date.now();
        paintNp();
        sendSeek(npPos * 1000);
      });
    }
  }

  /* ---------- deck ---------- */
  function setLast(name) {
    if ($('last')) { $('last').innerHTML = name; }
  }

  function initDeck() {
    if ($('seg1')) {
      $('seg1').addEventListener('click', function () { setBank(1); });
    }
    if ($('seg2')) {
      $('seg2').addEventListener('click', function () { setBank(2); });
    }

    var keys = document.getElementsByClassName('key');
    for (var i = 0; i < keys.length; i++) {
      keys[i].addEventListener('click', onKey);
    }
    setBank(1);
    renderLink();
  }

  function setBank(n) {
    if ($('bank1')) { $('bank1').style.display = (n === 1 ? 'block' : 'none'); }
    if ($('bank2')) { $('bank2').style.display = (n === 2 ? 'block' : 'none'); }
    if ($('seg1')) { $('seg1').className = 'seg' + (n === 1 ? ' on' : ''); }
    if ($('seg2')) { $('seg2').className = 'seg' + (n === 2 ? ' on' : ''); }
  }

  function onKey() {
    var cmd = this.getAttribute('data-cmd');
    var name = this.getAttribute('data-name') || cmd;

    if (cmd === 'mic_mute') {
      var muted = this.className.indexOf('muted') >= 0;
      this.className = muted ? this.className.replace(/\s*muted/g, '') : this.className + ' muted';
      if ($('mic-sub')) { $('mic-sub').innerHTML = muted ? 'MIC // ATIVO' : 'MIC // MUDO'; }
    }
    if (cmd === 'playpause') {
      var playing = this.className.indexOf('playing') >= 0;
      this.className = playing ? this.className.replace(/\s*playing/g, '') : this.className + ' playing';
    }
    if (cmd === 'mute') {
      var m = this.className.indexOf('muted') >= 0;
      this.className = m ? this.className.replace(/\s*muted/g, '') : this.className + ' muted';
    }

    flash(this);
    setLast(name);
    sendCmd(cmd);
  }

  /* ---------- boot ---------- */
  bootViewport();
  renderLink();
  setInterval(tickLink, 2500);

  var page = document.body.getAttribute('data-page');
  if (page === 'monitor') { initMonitor(); }
  if (page === 'midia') { initMidia(); }
  if (page === 'nowplaying') { initNowplaying(); }
  if (page === 'deck') { initDeck(); }
})();
