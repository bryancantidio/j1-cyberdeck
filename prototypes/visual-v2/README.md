# J1 Cyberdeck — Protótipo Visual v2

Protótipo **isolado** das novas 4 telas. Nada aqui está ligado ao `app.py`, ao
`agente_nitro.py` ou aos templates de produção. Todos os números são **DEMO**.

Base visual: export do Stitch (`stitch_minimalist_landscape_deck_dashboard`) +
`DESIGN.md` ("Precision Instrument Interface").

## Como abrir

No PC (já está rodando em background):

```
python -m http.server 8080 --directory C:\Cyberdeck\prototypes\visual-v2
```

- No PC: <http://localhost:8080/>
- No J1: <http://192.168.1.210:8080/> (mesma rede Wi-Fi)

Se o J1 não abrir, o Windows Firewall provavelmente bloqueou o Python na porta
8080. Alternativa: copiar esta pasta para o J1 e rodar
`python -m http.server 8080` dentro dela no Termux.

Telas: `index.html` (monitor), `midia.html`, `nowplaying.html`, `deck.html`.
A faixa inferior navega em ciclo: Monitor → Mídia → Tocando → Deck → Monitor.

## Viewport no J1 (correção do "resolução bugada")

O layout é desenhado em 800x480 fixos, mas o Chrome do J1 raramente entrega
exatamente 800x480 CSS: a barra de URL come a altura e o `devicePixelRatio 1.5`
deixa a largura em ~533 px (paisagem). Antes o palco era cortado embaixo.

Agora:

- O palco **sempre** é escalado por `min(largura/800, altura/480)` e
  centralizado — nunca é cortado, nem estoura.
- `-webkit-text-size-adjust:none` desliga o "font boosting" do Chrome antigo.
- Reajuste a cada 400 ms (o Chrome antigo não dispara `resize` quando a barra de
  URL aparece/some) e com atraso após `orientationchange`.
- Botão de **tela cheia** na faixa (ícone ao lado da seta esquerda): esconde a
  barra de URL e libera a altura toda.
- Em retrato aparece um overlay "GIRE O DISPOSITIVO".
- O selo da faixa mostra `DEMO 800x432 @90%` — é o viewport real e a escala
  aplicada, para diagnosticar na tela do J1.

## O que é diferente do export do Stitch

O HTML do Stitch não roda no Android 5.1.1 (Tailwind CDN, CSS Grid,
`const/let`, arrow functions, Google Fonts e Material Symbols remotos). Aqui ele
foi **reescrito como referência visual**, dentro das regras do `AGENTS.md`:

- JavaScript legado (`var`, `function`, `XMLHttpRequest`), sem `fetch`.
- Layout em posicionamento absoluto com medidas fixas de 800x480; sem CSS Grid.
- **Zero requisições externas**: fontes woff2 e ícones SVG são locais.
  (Verificado por grep: nenhuma URL `http` no HTML/CSS/JS.)
- Fontes estáticas por peso (não variáveis), seguras para WebView antigo.
- Ícones inline (Material Symbols, Apache-2.0); os SVGs originais ficam em
  `assets/icons/` apenas como fonte.

## Decisões aplicadas nesta versão

- **Navegação** por faixa de 36 px no rodapé (reaproveita a área do rodapé
  decorativo): setas 56x36, nome da página, 4 dots e status do link
  (LED + USB/Wi-Fi + latência).
- **Rodapé decorativo removido**; **avatar removido**; marca "SYS_800" removida.
- **Deck com 2 bancos**: 01 = apps, 02 = ações. Chip `1/2` discreto no canto
  superior direito. "Tarefas" com subtítulo `CTRL+SHIFT+ESC`.
- **Deploy removido** da interface.
- **Scrubber** com seek por toque (fallback silencioso), área de toque de 29 px.
- **Shuffle/repeat removidos**; no lugar entraram volume - e + (funções reais).
- **Dados inventados removidos** (FAN RPM, D3D12, FLAC 96kHz, DSP, perfil,
  latency fixa, "V2.4.1"). No lugar: host, uptime, clock da GPU, nome da GPU,
  fan em %, estado térmico por limiar e link real.
- Paleta do `AGENTS.md` (`#0A0A0C`, `#141417`, `#242429`, `#F5F5F7`, `#64D2FF`)
  + tipografia do Stitch (JetBrains Mono / Space Grotesk).

## O que falta para o port (depende de aprovação)

1. `templates/`: mover os 4 HTMLs e trocar links relativos por rotas Flask
   (`/`, `/midia`, `/nowplaying`, `/deck`), removendo o selo `DEMO`.
2. `app.py`: expor os campos extras no `/dados` e criar `/seek`.
3. `agente_nitro.py`: coletar os campos extras, `pycaw` (volume + mic),
   timeline do `winrt`, seek com verificação e os lançadores dos 8 apps.
4. Validar cada lançador no PC (`spotify:`, `discord://`, `steam://`,
   `obs64.exe`, `github-desktop://`) e trocar o que não abrir.
5. Testar no J1 real (WebView antigo, touch, fullscreen, offline).

### Contrato de dados previsto para a produção

```json
{
  "online": true,
  "cpu": 28, "ram": 42, "gpu": 19, "temp": 48,
  "cpu_ghz": 3.6, "threads": 8,
  "ram_used": 13.4, "ram_total": 32,
  "gpu_mhz": 580, "gpu_name": "RTX 3050",
  "fan": 45, "temp_state": "NORMAL",
  "down": "124.6 MB/s", "up": "18.2 MB/s",
  "host": "NITRO-ACER", "uptime": "03:12:44",
  "link": "USB", "rtt": 12,
  "musica": "Solaris Dreams", "artista": "Tycho", "tocando": true,
  "fonte": "Spotify", "pos_ms": 134000, "dur_ms": 245000, "volume": 24
}
```

`/seek?ms=134000` grava **a última posição pedida** (não entra na fila de
comandos), e o agente aplica com `try_change_playback_position_async`,
revalidando a posição antes de reportar sucesso.

## QA feito até agora

- Renderização headless em 800x480 (1x) e 1600x960 (2x), nas 4 telas.
- Renderização headless em **800x432** (simula barra de URL), **533x320**
  (simula J1 com DPR 1.5) e **480x800** (retrato → overlay). Nada cortado.
- `node --check` no `app.js`.
- Troca de banco e estado de mic mutado validados por clique simulado.
- Nenhuma dependência externa (grep por `http`).
- **Ainda não testado** no WebView real do J1.

`_shots/` são capturas de QA (apagar antes de qualquer commit).
