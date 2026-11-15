# Projeto: J1 Cyberdeck (Samsung Galaxy J120H + Acer Nitro)

## 1. Visão Geral e Arquitetura
Este projeto transforma um **Samsung Galaxy J1 (SM-J120H / Android 5.1.1)** em um painel de telemetria e Stream Deck físico dedicado para um notebook **Acer Nitro (Windows)**.

### Componentes:
1. **Servidor Backend & UI (`app.py` + `templates/` + `static/`):** Roda no **Termux** dentro do Galaxy J120H usando Python + Flask (porta `5000`). Serve as 4 páginas HTML, os assets locais (CSS/JS/fontes/ícones) e mantém a telemetria, a fila de comandos e o pedido de seek em memória.
2. **Agente Windows (`agente_nitro.py`):** Roda em segundo plano no Acer Nitro (`pythonw.exe`). Coleta CPU/RAM (`psutil`), GPU/temperatura/clock/fan (`nvidia-smi`), rede (`psutil`), volume e mic (`pycaw`), mídia + posição da faixa (`winrt`), envia um POST JSON a cada `1.5s` e executa os comandos recebidos via `pycaw` / `pyautogui` / `subprocess`.
3. **Interruptor de Inicialização (`Cyberdeck_Toggle.vbs`):** Script VBScript fixado na barra de tarefas do Windows. Verifica via WMI se `agente_nitro.py` está rodando: se estiver, encerra o processo ("DESCONECTADO"); se não estiver, inicia oculto com `pythonw.exe` ("CONECTADO").

### Dependências do PC:
`flask` (só no J1), `psutil`, `requests`, `pyautogui`, `pycaw`, `winrt-*` (Windows SDK projections).

---

## 2. Como Ligar e Operar o Sistema
- **No Galaxy J120H (Servidor):**
  - O servidor Flask roda no Termux (`python ~/app.py` na porta `5000`).
  - Alias no `~/.bashrc` do J1: `reiniciar` (mata o `app.py` anterior e sobe de novo) e `deploy` (`cd ~ && git pull origin main && reiniciar`). **Aliases não existem em SSH não-interativo** — ver seção 5.
  - O navegador roda como **PWA instalada** (`static/manifest.json`: `display: standalone`, `orientation: landscape`). Abrir pelo atalho da tela inicial é o que garante a tela cheia; a barra de status é oculta via ADB (`immersive.status=*`).
  - Diagnóstico de layout: abrir qualquer página com `?debug=1` mostra no rodapé o viewport real e a escala aplicada (ex. `533x320 @66%`).
- **No Acer Nitro (PC):**
  - Clique no atalho **Cyberdeck J1** na barra de tarefas (`Cyberdeck_Toggle.vbs`) para ligar ou desligar o envio de dados em background.
- **Conexão Inteligente (Failover USB / Wi-Fi):**
  - O `agente_nitro.py` tenta enviar o POST primeiro para o IP da Ancoragem USB (`http://192.168.42.129:5000/update`). Se o cabo não estiver conectado/ancorado, faz fallback automático para o Wi-Fi (`http://192.168.1.226:5000/update`).
  - O campo `link` reportado é o caminho que funcionou (`USB` ou `WLAN`) e `rtt` é o tempo do POST que deu certo.
  - `J1_URL` no ambiente sobrescreve a lista (usado para testar contra um Flask local).

---

## 3. Estrutura de Arquivos e Rotas
- `C:\Cyberdeck\` (sincronizado com `~/` no J120H via GitHub `bryancantidio/j1-cyberdeck`)
  - `app.py`: Servidor Flask (J120H)
  - `agente_nitro.py`: Agente de telemetria e macros (Windows)
  - `Cyberdeck_Toggle.vbs`: Liga/desliga o agente no Windows sem janela de terminal
  - `AGENTS.md`: Documentação de contexto para agentes de IA
  - `templates/`: Interfaces HTML (alvo 800x480 px landscape, escaladas para o viewport real)
    - `index.html` (Rota `/`): Monitor (relógio, CPU, RAM, GPU, térmica, rede, host, uptime)
    - `midia.html` (Rota `/midia`): 6 pads grandes (prev, play/pause, next, vol-, mute, vol+)
    - `nowplaying.html` (Rota `/nowplaying`): faixa tocando, fonte, scrubber com seek, volume
    - `deck.html` (Rota `/deck`): Stream Deck 4x2 com 2 bancos (`1/2` no cabeçalho)
      - Banco 01 (apps): VS Code, Terminal, Navegador, Spotify, Discord, Steam, OBS, GitHub Desktop
      - Banco 02 (ações): Mic, Alt+Tab, Print, Bloquear, Desktop, Tarefas, Play/Pause, Mudo
  - `static/`: `css/app.css`, `js/app.js`, `fonts/*.woff2` (Space Grotesk + JetBrains Mono), `icons/` (SVGs fonte + `icon-192/512.png`), `manifest.json`
  - `prototypes/visual-v2/`: protótipo isolado com dados DEMO (referência visual, não é servido pelo Flask)

### Endpoints da API Flask (`app.py`):
- `POST /update`: Recebe o JSON do agente e retorna `{"cmds": [...], "seek": ms|null}`, esvaziando a fila. Campos: `cpu`, `ram`, `gpu`, `temp`, `down`, `up`, `cpu_ghz`, `threads`, `ram_used`, `ram_total`, `gpu_mhz`, `gpu_name`, `fan`, `temp_state`, `host`, `uptime`, `link`, `rtt`, `musica`, `artista`, `fonte`, `tocando`, `pos_ms`, `dur_ms`, `volume`, `mic_muted`.
- `GET /dados`: Mesmos campos + `online` (`True` se o último ping foi há menos de 6s). O frontend consulta a cada 2s. Campo desconhecido vai como `null` e a tela mostra `--`.
- `GET /add_cmd/<action>`: Enfileira um comando (`playpause`, `next`, `prev`, `volup`, `voldown`, `mute`, `mic_mute`, `vscode`, `terminal`, `browser`, `spotify`, `discord`, `steam`, `obs`, `github`, `taskmgr`, `desktop`, `alt_tab`, `screenshot`, `lock`). Fila limitada a 20.
- `GET /seek?ms=<int>`: Guarda a posição pedida. **Não entra na fila de comandos**: vai no campo `seek` da resposta do `/update` e expira em 10s (pedido antigo não é aplicado quando o agente volta).

---

## 4. Regras Obrigatórias para Edição de Código
1. **Compatibilidade Estrita com Android 5.1.1 (WebView antigo):**
   - Nos arquivos dentro de `templates/` e `static/js/`, **NUNCA** use `fetch()`, `async/await`, `const`, `let`, arrow functions (`=>`), template literals (crases) ou CSS Grid complexo sem fallback.
   - Use **apenas** `var`, `function()`, `XMLHttpRequest` e CSS simples (`display: table`/`table-cell` ou `flex` básico com prefixos) para garantir execução sem erros no navegador do J120H.
   - **Zero requisições externas**: fontes e ícones são locais. Não reintroduzir CDN (Tailwind, Google Fonts, Material Symbols remoto).
2. **Dimensões e Estilo Visual:**
   - Layout desenhado em **800x480 px** (`overflow: hidden`, sem rolagem), mas o palco é sempre escalado por `min(largura/800, altura/480)` — o Chrome do J1 entrega ~533x320 (DPR 1.5) e/ou perde altura com a barra de URL. Nunca cortar.
   - Estética minimalista monocromática escura (fundo `#0A0A0C`, cards `#141417`, bordas `#242429`, texto `#F5F5F7`, destaque discreto `#64D2FF`; alerta `#FF6B6B`, aviso `#FFD166`).
   - Fonte de dados: `Space Grotesk` (texto) + `JetBrains Mono` (números), servidas de `static/fonts`.
3. **Telemetria honesta:** nada de valor inventado. Se o PC não mede (ex. fan em notebook sem sensor), o campo vai `null` e a tela mostra `--`.

---

## 5. Comandos de Deploy e Manutenção
- **Deploy completo (PC -> GitHub -> J120H + Reinício):**
  `git add . && git commit -m "update" && git push origin main && ssh j1 "cd ~ && git pull origin main && bash -ic reiniciar"`
- **Como o servidor roda no J1:** dentro do **tmux**, sessão `servidor` (`tmux new-session -d -s servidor "python ~/app.py"`). Aliases do `~/.bashrc`: `ligar`, `desligar`, `reiniciar`, `tela`, `status`. Alias só existe em shell interativo — em SSH use `bash -ic 'reiniciar'`.
- **Se o alias falhar:** `ssh j1 "tmux kill-session -t servidor 2>/dev/null; tmux new-session -d -s servidor 'python ~/app.py'"`
- **Acesso SSH direto ao J120H:** `ssh j1` (Host `192.168.1.226`, Porta `8022`, Usuário `u0_a120`).
- **Ver o servidor no J1:** `ssh j1 "tmux attach -t servidor"` (sair com `Ctrl+B` e `D`).
- **Conferir a API:** `ssh j1 "curl -s http://127.0.0.1:5000/dados"`.
- **Depois de mudar o agente no PC:** reiniciar o `agente_nitro.py` (toggle do `Cyberdeck_Toggle.vbs` ou encerrar o `pythonw` e subir de novo) — o processo antigo continua com o código velho em memória.
- **Depois de mudar qualquer coisa em `templates/`:** reiniciar o Flask no J1 **também**. Com `debug=False` o Jinja guarda o template em cache, então um `git pull` sozinho não muda o HTML servido. CSS/JS em `static/` não têm esse problema (mas o cache do navegador sim — por isso o `?v=N` nos links).

---

## 6. Fluxo de Trabalho Visual (protótipo -> produção)
1. Mudança de layout nasce em `prototypes/visual-v2/` com dados DEMO, servida por `python -m http.server 8080 --directory prototypes/visual-v2`.
2. Testar no J1 (HTTP, não `file://`) e validar toque/legibilidade; `?debug=1` mostra viewport e escala.
3. **Só depois da aprovação explícita** copiar para `templates/` + `static/`, trocando links relativos por rotas Flask e removendo o selo DEMO.
4. Validar cada macro no PC antes de commitar. `_shots/` (capturas de QA) nunca entra em commit.
