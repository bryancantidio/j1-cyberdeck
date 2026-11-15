from flask import Flask, request, jsonify, render_template
import time

app = Flask(__name__)

# Estado em memoria. None = "ainda nao recebi esse dado" (a tela mostra --).
estado = {
    "cpu": None,
    "ram": None,
    "gpu": None,
    "temp": None,
    "down": "0 KB/s",
    "up": "0 KB/s",
    "cpu_ghz": None,
    "threads": None,
    "ram_used": None,
    "ram_total": None,
    "gpu_mhz": None,
    "gpu_name": "GPU",
    "fan": None,
    "temp_state": None,
    "host": None,
    "uptime": None,
    "link": None,
    "rtt": None,
    "musica": None,
    "artista": None,
    "fonte": None,
    "tocando": False,
    "pos_ms": 0,
    "dur_ms": 0,
    "volume": None,
    "mic_muted": False,
    "fila_cmd": [],
    "seek_ms": None,
    "seek_ts": 0,
    "ultimo_ping": 0
}

CAMPOS = (
    "cpu", "ram", "gpu", "temp", "down", "up",
    "cpu_ghz", "threads", "ram_used", "ram_total",
    "gpu_mhz", "gpu_name", "fan", "temp_state",
    "host", "uptime", "link", "rtt",
    "musica", "artista", "fonte", "tocando", "pos_ms", "dur_ms",
    "volume", "mic_muted"
)

# --- ROTAS DAS 4 PAGINAS ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/midia')
def midia():
    return render_template('midia.html')

@app.route('/nowplaying')
def nowplaying():
    return render_template('nowplaying.html')

@app.route('/deck')
def deck():
    return render_template('deck.html')

# --- RECEBE TELEMETRIA DO PC E DEVOLVE COMANDOS ---
@app.route('/update', methods=['POST'])
def update():
    data = request.get_json(force=True, silent=True) or {}
    for campo in CAMPOS:
        if campo in data:
            estado[campo] = data[campo]
    estado["ultimo_ping"] = time.time()

    cmds = list(estado["fila_cmd"])
    estado["fila_cmd"].clear()

    # seek e separado da fila: so vale por 10s, senao um pedido antigo
    # seria aplicado quando o agente voltasse a ficar online
    seek = None
    if estado["seek_ms"] is not None and (time.time() - estado["seek_ts"]) < 10:
        seek = estado["seek_ms"]
    estado["seek_ms"] = None

    return jsonify({"cmds": cmds, "seek": seek})

# --- ENVIA DADOS PARA O HTML DO J1 ---
@app.route('/dados')
def dados():
    payload = {
        "online": (time.time() - estado["ultimo_ping"]) < 6,
        "seek_pending": estado["seek_ms"] is not None
    }
    for campo in CAMPOS:
        payload[campo] = estado[campo]
    return jsonify(payload)

# --- RECEBE CLIQUES DOS BOTOES DO J1 ---
@app.route('/add_cmd/<action>')
def add_cmd(action):
    if len(estado["fila_cmd"]) < 20:
        estado["fila_cmd"].append(action)
    return ('', 204)

# --- PEDIDO DE SEEK (posicao em ms) ---
@app.route('/seek')
def seek():
    try:
        ms = int(float(request.args.get('ms', 0)))
    except (TypeError, ValueError):
        return ('', 400)
    if ms < 0:
        ms = 0
    estado["seek_ms"] = ms
    estado["seek_ts"] = time.time()
    return ('', 204)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
