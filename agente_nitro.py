import time
import psutil
import pyautogui
import requests

# Ordem de prioridade: 1º Cabo USB (Ancoragem), 2º Rede Wi-Fi
URLS_J1 = [
    "http://192.168.42.129:5000/update",  # IP padrão da interface USB (rndis0)
    "http://192.168.1.226:5000/update"    # IP do Wi-Fi
]

mapa_teclas = {
    'playpause': 'playpause',
    'next': 'nexttrack',
    'prev': 'prevtrack',
    'volup': 'volumeup',
    'voldown': 'volumedown',
    'mute': 'volumemute'
}

last_net = psutil.net_io_counters()
last_time = time.time()
url_ativa = URLS_J1[1]

while True:
    now = time.time()
    net = psutil.net_io_counters()
    dt = now - last_time if (now - last_time) > 0 else 1

    down_kbps = (net.bytes_recv - last_net.bytes_recv) / 1024.0 / dt
    up_kbps = (net.bytes_sent - last_net.bytes_sent) / 1024.0 / dt
    last_net, last_time = net, now

    payload = {
        "cpu": round(psutil.cpu_percent(interval=None)),
        "ram": round(psutil.virtual_memory().percent),
        "down": f"{down_kbps/1024:.1f} MB/s" if down_kbps > 1024 else f"{down_kbps:.0f} KB/s",
        "up": f"{up_kbps/1024:.1f} MB/s" if up_kbps > 1024 else f"{up_kbps:.0f} KB/s"
    }

    # Tenta sempre a URL de maior prioridade (USB primeiro, depois Wi-Fi)
    for url in URLS_J1:
        try:
            resp = requests.post(url, json=payload, timeout=0.6)
            if resp.status_code == 200:
                url_ativa = url
                for cmd in resp.json().get("cmds", []):
                    if cmd in mapa_teclas:
                        pyautogui.press(mapa_teclas[cmd])
                break  # Enviou com sucesso, não precisa tentar o próximo IP
        except Exception:
            continue

    time.sleep(1.5)