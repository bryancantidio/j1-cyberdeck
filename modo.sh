#!/data/data/com.termux/files/usr/bin/bash
# modo.sh - alterna o J1 entre PAINEL e CELULAR normal.
#
#   modo.sh celular   -> desliga o servidor e volta para a tela inicial
#   modo.sh painel    -> liga o servidor de novo
#
# Atalhos no ~/.bashrc:
#   alias celular='bash ~/modo.sh celular'
#   alias painel='bash ~/modo.sh painel'
#
# A barra de notificacoes nao e mexida aqui: ela fica escondida so dentro
# do Chrome (settings global policy_control immersive.status=com.android.chrome),
# entao no resto do celular aparece normal.

case "$1" in
  celular)
    # marcador: enquanto nao existir, abrir um Termux novo nao religa o servidor
    rm -f ~/.painel_on
    if tmux has-session -t servidor 2>/dev/null; then
      tmux kill-session -t servidor
      echo "Servidor DESLIGADO."
    else
      echo "Servidor ja estava desligado."
    fi
    if am start -a android.intent.action.MAIN -c android.intent.category.HOME >/dev/null 2>&1; then
      echo "Tela inicial."
    else
      echo "Nao consegui voltar para a tela inicial - aperte Home."
    fi
    echo "Modo CELULAR."
    ;;
  painel)
    touch ~/.painel_on
    if tmux has-session -t servidor 2>/dev/null; then
      echo "Servidor ja estava ligado."
    else
      tmux new-session -d -s servidor "python ~/app.py"
      sleep 2
      echo "Servidor LIGADO na porta 5000."
    fi
    echo "Toque no atalho J1 Cyberdeck."
    echo "Modo PAINEL."
    ;;
  *)
    echo "Uso: modo.sh celular | painel"
    ;;
esac
