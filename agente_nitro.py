"""Agente do Acer Nitro para o J1 Cyberdeck.

Roda oculto (pythonw.exe). Coleta telemetria real, envia para o Flask no J1
e executa os comandos/macros que o painel enfileira.

Nada aqui inventa numero: se uma leitura falhar, o campo vai como None e a
tela mostra "--".
"""
import os
import shutil
import socket
import subprocess
import time
import asyncio
import datetime

import psutil
import pyautogui
import requests

# Prioridade: 1o Cabo USB (Ancoragem), 2o Rede Wi-Fi
URLS_J1 = [
    "http://192.168.42.129:5000/update",
    "http://192.168.1.226:5000/update"
]

# Permite testar contra um servidor local sem mexer no J1
if os.environ.get("J1_URL"):
    URLS_J1 = [os.environ["J1_URL"]]

# ---------------------------------------------------------------- audio (pycaw)
try:
    from pycaw.pycaw import AudioUtilities
    from pycaw.api.endpointvolume import IAudioEndpointVolume
    from comtypes import CLSCTX_ALL, cast, POINTER
    AUDIO_OK = True
except Exception:
    AUDIO_OK = False

_vol_out = None
_vol_in = None


def _iface(saida=True):
    """Interface de volume do dispositivo padrao (saida ou microfone)."""
    global _vol_out, _vol_in
    if not AUDIO_OK:
        return None
    cache = _vol_out if saida else _vol_in
    if cache is not None:
        return cache
    try:
        if saida:
            cache = AudioUtilities.GetSpeakers().EndpointVolume
        else:
            dev = AudioUtilities.GetMicrophone()
            cache = None
            if dev is not None:
                ativado = dev.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
                cache = cast(ativado, POINTER(IAudioEndpointVolume))
    except Exception:
        cache = None
    if saida:
        _vol_out = cache
    else:
        _vol_in = cache
    return cache


def ler_volume():
    """Volume master em % (int) ou None."""
    ev = _iface(True)
    if ev is None:
        return None
    try:
        return int(round(ev.GetMasterVolumeLevelScalar() * 100))
    except Exception:
        global _vol_out
        _vol_out = None
        return None


def ler_mic_mudo():
    """True/False se o microfone padrao esta mudo, ou None."""
    ev = _iface(False)
    if ev is None:
        return None
    try:
        return bool(ev.GetMute())
    except Exception:
        global _vol_in
        _vol_in = None
        return None


def volume_passo(cima=True):
    ev = _iface(True)
    if ev is not None:
        try:
            if cima:
                ev.VolumeStepUp(None)
            else:
                ev.VolumeStepDown(None)
            return
        except Exception:
            global _vol_out
            _vol_out = None
    pyautogui.press('volumeup' if cima else 'volumedown')


def alternar_mudo_saida():
    ev = _iface(True)
    if ev is not None:
        try:
            ev.SetMute(0 if ev.GetMute() else 1, None)
            return
        except Exception:
            global _vol_out
            _vol_out = None
    pyautogui.press('volumemute')


def alternar_mic():
    ev = _iface(False)
    if ev is not None:
        try:
            ev.SetMute(0 if ev.GetMute() else 1, None)
            return
        except Exception:
            global _vol_in
            _vol_in = None
    pyautogui.hotkey('win', 'alt', 'k')


# ---------------------------------------------------------------- GPU (nvidia-smi)
def _num(txt):
    """'45' -> 45 ; '[N/A]' -> None"""
    try:
        return int(float(txt.strip()))
    except Exception:
        return None


def ler_gpu():
    """(uso %, temp C, clock MHz, fan %, nome)"""
    vazio = (None, None, None, None, "GPU")
    try:
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        out = subprocess.check_output(
            ["nvidia-smi",
             "--query-gpu=utilization.gpu,temperature.gpu,clocks.current.graphics,fan.speed,name",
             "--format=csv,noheader,nounits"],
            startupinfo=si, timeout=2
        ).decode("utf-8", "replace").strip().splitlines()
        if not out:
            return vazio
        partes = out[0].split(",", 4)
        if len(partes) < 5:
            return vazio
        return (
            _num(partes[0]), _num(partes[1]), _num(partes[2]), _num(partes[3]),
            partes[4].strip().replace("NVIDIA ", "").replace("GeForce ", "")
        )
    except Exception:
        return vazio


def estado_termico(temp):
    if temp is None:
        return None
    if temp >= 85:
        return "CRITICA"
    if temp >= 70:
        return "ALTA"
    return "NORMAL"


# ---------------------------------------------------------------- midia (winrt)
FONTES = {
    "spotify": "Spotify", "chrome": "Chrome", "msedge": "Edge",
    "firefox": "Firefox", "opera": "Opera", "brave": "Brave",
    "vlc": "VLC", "wmplayer": "WMP", "zunemusic": "Groove",
    "discord": "Discord", "mpc-hc64": "MPC", "mpc-hc": "MPC",
    "musicbee": "MusicBee", "foobar2000": "foobar"
}


def _fonte(app_id):
    if not app_id:
        return None
    nome = app_id.split("!")[-1]
    if nome.lower().endswith(".exe"):
        nome = nome[:-4]
    return FONTES.get(nome.lower(), nome)


async def _midia_async():
    from winrt.windows.media.control import (
        GlobalSystemMediaTransportControlsSessionManager as MediaManager
    )
    sessoes = await MediaManager.request_async()
    atual = sessoes.get_current_session()
    if atual is None:
        return None

    info = await atual.try_get_media_properties_async()
    play = atual.get_playback_info()
    tocando = int(play.playback_status) == 4  # 4 = PLAYING

    pos_ms, dur_ms = 0, 0
    try:
        tl = atual.get_timeline_properties()
        dur_ms = int(tl.end_time.total_seconds() * 1000)
        pos_ms = int(tl.position.total_seconds() * 1000)
        if tocando and tl.last_updated_time is not None:
            # entre um update e outro a posicao real anda sozinha
            atualizado = tl.last_updated_time
            agora = datetime.datetime.now(datetime.timezone.utc)
            if atualizado.tzinfo is None:
                atualizado = atualizado.replace(tzinfo=datetime.timezone.utc)
            delta = (agora - atualizado).total_seconds()
            if 0 < delta < 30:
                pos_ms += int(delta * 1000)
        if dur_ms > 0:
            pos_ms = max(0, min(pos_ms, dur_ms))
    except Exception:
        pass

    return {
        "musica": (info.title or "Sem titulo") if info else None,
        "artista": (info.artist or "") if info else None,
        "fonte": _fonte(atual.source_app_user_model_id),
        "tocando": tocando,
        "pos_ms": pos_ms,
        "dur_ms": dur_ms,
    }


def ler_midia():
    try:
        return asyncio.run(_midia_async())
    except Exception:
        return None


async def _seek_async(ms):
    from winrt.windows.media.control import (
        GlobalSystemMediaTransportControlsSessionManager as MediaManager
    )
    sessoes = await MediaManager.request_async()
    atual = sessoes.get_current_session()
    if atual is None:
        return False
    try:
        ok = await atual.try_change_playback_position_async(
            datetime.timedelta(milliseconds=int(ms))
        )
        return bool(ok)
    except Exception:
        return False


# ---------------------------------------------------------------- lancadores
def _abrir(candidatos):
    """Tenta abrir o primeiro candidato que existir de verdade."""
    for tipo, alvo, args in candidatos:
        try:
            if tipo == "url":
                os.startfile(alvo)
                return True
            caminho = os.path.expandvars(alvo)
            if tipo == "exe" and os.path.isfile(caminho):
                subprocess.Popen([caminho] + args, cwd=os.path.dirname(caminho),
                                 close_fds=True)
                return True
            if tipo == "cmd":
                exe = shutil.which(caminho)
                if exe:
                    subprocess.Popen([exe] + args, close_fds=True)
                    return True
        except Exception:
            continue
    return False


VSCODE = [
    ("exe", r"%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe", []),
    ("cmd", "code", []),
]
TERMINAL = [
    ("exe", r"%LOCALAPPDATA%\Microsoft\WindowsApps\wt.exe", []),
    ("cmd", "wt", []),
    ("cmd", "cmd", []),
]
CHROME = [
    ("exe", r"%ProgramFiles%\Google\Chrome\Application\chrome.exe", []),
    ("exe", r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe", []),
    ("cmd", "chrome", []),
]
SPOTIFY = [
    ("url", "spotify:", None),
    ("exe", r"%APPDATA%\Spotify\Spotify.exe", []),
]
DISCORD = [
    ("url", "discord:", None),
    ("exe", r"%LOCALAPPDATA%\Discord\Update.exe", ["--processStart", "Discord.exe"]),
]
STEAM = [
    ("url", "steam://open/main", None),
    ("exe", r"%ProgramFiles(x86)%\steam\steam.exe", []),
]
OBS = [
    ("exe", r"%ProgramFiles%\obs-studio\bin\64bit\obs64.exe", []),
    ("exe", r"%ProgramFiles(x86)%\obs-studio\bin\64bit\obs64.exe", []),
]
GITHUB = [
    ("exe", r"%LOCALAPPDATA%\GitHubDesktop\GitHubDesktop.exe", []),
    ("url", "github-desktop:", None),
]

APPS = {
    "vscode": VSCODE,
    "terminal": TERMINAL,
    "browser": CHROME,
    "spotify": SPOTIFY,
    "discord": DISCORD,
    "steam": STEAM,
    "obs": OBS,
    "github": GITHUB,
}

TECLAS = {
    "playpause": "playpause",
    "next": "nexttrack",
    "prev": "prevtrack",
    "screenshot": "printscreen",
}


def executar_comando(cmd):
    if cmd in APPS:
        _abrir(APPS[cmd])
    elif cmd in TECLAS:
        pyautogui.press(TECLAS[cmd])
    elif cmd == "volup":
        volume_passo(True)
    elif cmd == "voldown":
        volume_passo(False)
    elif cmd == "mute":
        alternar_mudo_saida()
    elif cmd == "mic_mute":
        alternar_mic()
    elif cmd == "taskmgr":
        pyautogui.hotkey("ctrl", "shift", "esc")
    elif cmd == "desktop":
        pyautogui.hotkey("win", "d")
    elif cmd == "alt_tab":
        pyautogui.hotkey("alt", "tab")
    elif cmd == "lock":
        subprocess.Popen("rundll32.exe user32.dll,LockWorkStation", shell=True)


# ---------------------------------------------------------------- loop
def uptime_str():
    try:
        seg = int(time.time() - psutil.boot_time())
    except Exception:
        return None
    d, seg = divmod(seg, 86400)
    h, seg = divmod(seg, 3600)
    m, s = divmod(seg, 60)
    return "%02d:%02d:%02d" % (d * 24 + h, m, s)


def nome_host():
    try:
        return socket.gethostname().upper()[:14]
    except Exception:
        return None


def cpu_ghz():
    try:
        mhz = psutil.cpu_freq()
        if mhz and mhz.current:
            return round(mhz.current / 1000.0, 2)
    except Exception:
        pass
    return None


def main():
    link_atual, rtt_atual = None, None
    last_net, last_time = psutil.net_io_counters(), time.time()
    pyautogui.FAILSAFE = False

    while True:
        agora = time.time()
        net = psutil.net_io_counters()
        dt = agora - last_time if (agora - last_time) > 0 else 1

        down_kbps = (net.bytes_recv - last_net.bytes_recv) / 1024.0 / dt
        up_kbps = (net.bytes_sent - last_net.bytes_sent) / 1024.0 / dt
        last_net, last_time = net, agora

        gpu_uso, gpu_temp, gpu_clock, gpu_fan, gpu_nome = ler_gpu()
        vm = psutil.virtual_memory()

        payload = {
            "cpu": round(psutil.cpu_percent(interval=None)),
            "ram": round(vm.percent),
            "gpu": gpu_uso,
            "temp": gpu_temp,
            "down": "%.1f MB/s" % (down_kbps / 1024) if down_kbps > 1024 else "%.0f KB/s" % down_kbps,
            "up": "%.1f MB/s" % (up_kbps / 1024) if up_kbps > 1024 else "%.0f KB/s" % up_kbps,
            "cpu_ghz": cpu_ghz(),
            "threads": psutil.cpu_count(),
            "ram_used": round((vm.total - vm.available) / (1024 ** 3), 1),
            "ram_total": round(vm.total / (1024 ** 3), 1),
            "gpu_mhz": gpu_clock,
            "gpu_name": gpu_nome,
            "fan": gpu_fan,
            "temp_state": estado_termico(gpu_temp),
            "host": nome_host(),
            "uptime": uptime_str(),
            "link": link_atual,
            "rtt": rtt_atual,
            "volume": ler_volume(),
            "mic_muted": ler_mic_mudo(),
        }

        midia = ler_midia()
        if midia:
            payload.update(midia)
        else:
            payload.update({
                "musica": None, "artista": None, "fonte": None,
                "tocando": False, "pos_ms": 0, "dur_ms": 0
            })

        for indice, url in enumerate(URLS_J1):
            try:
                inicio = time.time()
                resp = requests.post(url, json=payload, timeout=0.6)
                if resp.status_code != 200:
                    continue

                link_atual = "USB" if indice == 0 else "WLAN"
                rtt_atual = int((time.time() - inicio) * 1000)

                dados = resp.json()
                for cmd in dados.get("cmds", []):
                    try:
                        executar_comando(cmd)
                    except Exception:
                        pass

                pedido = dados.get("seek")
                if pedido is not None:
                    try:
                        asyncio.run(_seek_async(pedido))
                    except Exception:
                        pass
                break
            except Exception:
                continue

        time.sleep(1.5)


if __name__ == "__main__":
    main()
