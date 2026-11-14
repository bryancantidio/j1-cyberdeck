from flask import Flask, request, jsonify, render_template
import time

app = Flask(__name__)

estado = {
    "cpu": 0, "ram": 0, "down": "0 KB/s", "up": "0 KB/s",
    "fila_cmd": [], "ultimo_ping": 0
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/page2')
def page2():
    return render_template('page2.html')

@app.route('/update', methods=['POST'])
def update():
    data = request.get_json(force=True)
    estado["cpu"] = data.get("cpu", 0)
    estado["ram"] = data.get("ram", 0)
    estado["down"] = data.get("down", "0 KB/s")
    estado["up"] = data.get("up", "0 KB/s")
    estado["ultimo_ping"] = time.time()
    cmds = list(estado["fila_cmd"])
    estado["fila_cmd"].clear()
    return jsonify({"cmds": cmds})

@app.route('/dados')
def dados():
    online = (time.time() - estado["ultimo_ping"]) < 6
    return jsonify({
        "online": online, "cpu": estado["cpu"], "ram": estado["ram"],
        "down": estado["down"], "up": estado["up"]
    })

@app.route('/add_cmd/<action>')
def add_cmd(action):
    estado["fila_cmd"].append(action)
    return ('', 204)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
