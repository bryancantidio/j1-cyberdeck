from flask import Flask, jsonify, render_template_string
import psutil
import pyautogui
import socket
import time

app = Flask(__name__)

# Guarda leitura anterior de rede para calcular velocidade
last_net = psutil.net_io_counters()
last_time = time.time()

HTML_PAGE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Nitro Cyberdeck</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, sans-serif; }
  body { background-color: #000000; color: #e0e0e0; padding: 10px; overflow: hidden; }
  
  .header { display: table; width: 100%; border-bottom: 1px solid #222; padding-bottom: 6px; margin-bottom: 10px; }
  .title { display: table-cell; font-size: 16px; font-weight: bold; color: #00e676; }
  .clock { display: table-cell; text-align: right; font-size: 16px; color: #888; }

  .grid { width: 100%; margin-bottom: 12px; }
  .card { background: #111; border: 1px solid #222; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
  .label { font-size: 11px; color: #888; text-transform: uppercase; }
  .val { font-size: 20px; font-weight: bold; color: #fff; margin-top: 2px; }
  .bar-bg { width: 100%; height: 6px; background: #222; border-radius: 3px; margin-top: 5px; }
  .bar-fill { height: 6px; border-radius: 3px; background: #00e676; width: 0%; }

  .two-col { display: table; width: 100%; table-layout: fixed; }
  .col { display: table-cell; padding-right: 4px; }
  .col:last-child { padding-right: 0; padding-left: 4px; }

  .media-title { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 6px; }
  .btn-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 8px; }
  .btn-cell { display: table-cell; padding: 0 3px; }
  button {
    width: 100%; height: 48px; background: #1a1a1a; color: #fff;
    border: 1px solid #333; border-radius: 8px; font-size: 16px; font-weight: bold;
  }
  button:active { background: #00e676; color: #000; }
  .btn-accent { border-color: #00e676; color: #00e676; }
  .btn-mute { border-color: #ff5252; color: #ff5252; }
</style>
</head>
<body>

  <div class="header">
    <div class="title">NITRO // STATUS</div>
    <div class="clock" id="clock">--:--</div>
  </div>

  <!-- TELEMETRIA -->
  <div class="two-col">
    <div class="col">
      <div class="card">
        <div class="label">CPU</div>
        <div class="val" id="cpu">--%</div>
        <div class="bar-bg"><div class="bar-fill" id="cpu-bar"></div></div>
      </div>
    </div>
    <div class="col">
      <div class="card">
        <div class="label">RAM</div>
        <div class="val" id="ram">--%</div>
        <div class="bar-bg"><div class="bar-fill" id="ram-bar"></div></div>
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="col">
      <div class="card">
        <div class="label">Download</div>
        <div class="val" id="net-down" style="font-size:15px;">0 KB/s</div>
      </div>
    </div>
    <div class="col">
      <div class="card">
        <div class="label">Upload</div>
        <div class="val" id="net-up" style="font-size:15px;">0 KB/s</div>
      </div>
    </div>
  </div>

  <!-- CONTROLE DE MÍDIA -->
  <div class="media-title">Controle de Mídia & Áudio</div>
  
  <div class="btn-row">
    <div class="btn-cell"><button onclick="cmd('prev')">|&lt;&lt;</button></div>
    <div class="btn-cell"><button class="btn-accent" onclick="cmd('playpause')">PLAY / PAUSE</button></div>
    <div class="btn-cell"><button onclick="cmd('next')">&gt;&gt;|</button></div>
  </div>

  <div class="btn-row">
    <div class="btn-cell"><button onclick="cmd('voldown')">VOL -</button></div>
    <div class="btn-cell"><button class="btn-mute" onclick="cmd('mute')">MUTE</button></div>
    <div class="btn-cell"><button onclick="cmd('volup')">VOL +</button></div>
  </div>

<script>
  function updateClock() {
    var d = new Date();
    var h = ('0' + d.getHours()).slice(-2);
    var m = ('0' + d.getMinutes()).slice(-2);
    document.getElementById('clock').innerHTML = h + ':' + m;
  }

  function updateStats() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/stats', true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        document.getElementById('cpu').innerHTML = data.cpu + '%';
        document.getElementById('cpu-bar').style.width = data.cpu + '%';
        
        document.getElementById('ram').innerHTML = data.ram + '%';
        document.getElementById('ram-bar').style.width = data.ram + '%';
        
        document.getElementById('net-down').innerHTML = data.down;
        document.getElementById('net-up').innerHTML = data.up;
      }
    };
    xhr.send();
  }

  function cmd(action) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/cmd/' + action, true);
    xhr.send();
  }

  setInterval(updateClock, 1000);
  setInterval(updateStats, 2000);
  updateClock();
  updateStats();
</script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_PAGE)

@app.route('/stats')
def stats():
    global last_net, last_time
    now = time.time()
    net = psutil.net_io_counters()
    dt = now - last_time if (now - last_time) > 0 else 1

    down_kbps = (net.bytes_recv - last_net.bytes_recv) / 1024.0 / dt
    up_kbps = (net.bytes_sent - last_net.bytes_sent) / 1024.0 / dt

    last_net = net
    last_time = now

    down_str = f"{down_kbps/1024:.1f} MB/s" if down_kbps > 1024 else f"{down_kbps:.0f} KB/s"
    up_str = f"{up_kbps/1024:.1f} MB/s" if up_kbps > 1024 else f"{up_kbps:.0f} KB/s"

    return jsonify({
        'cpu': round(psutil.cpu_percent(interval=None)),
        'ram': round(psutil.virtual_memory().percent),
        'down': down_str,
        'up': up_str
    })

@app.route('/cmd/<action>')
def command(action):
    mapa = {
        'playpause': 'playpause',
        'next': 'nexttrack',
        'prev': 'prevtrack',
        'volup': 'volumeup',
        'voldown': 'volumedown',
        'mute': 'volumemute'
    }
    if action in mapa:
        pyautogui.press(mapa[action])
    return ('', 204)

if __name__ == '__main__':
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print(f"\n>>> CYBERDECK ONLINE! Abra no J120H: http://{local_ip}:5000\n")
    app.run(host='0.0.0.0', port=5000)