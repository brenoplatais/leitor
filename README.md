# Leitor — anotação por voz para PDFs científicos

Leia PDFs em voz alta, pause para gravar anotações faladas (transcritas em tempo
real) e compile tudo ancorado ao texto original — direto no navegador, offline,
sem nuvem.

## 🔗 Acesso

**App online:** https://SEU_USUARIO.github.io/leitor/

> Troque `SEU_USUARIO` pelo seu usuário do GitHub (e o nome do repositório, se
> for diferente de `leitor`).

Para a **transcrição por voz (STT)** use **Chrome ou Edge** — a leitura em voz
alta (TTS) funciona na maioria dos navegadores. Cada pessoa tem seus próprios
PDFs e anotações no navegador (armazenamento local); para compartilhar
anotações, use **Exportar JSON/Markdown**.

## Publicar (GitHub Pages)

O deploy é automático via GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

1. Crie um repositório no GitHub (público) e envie este projeto:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/leitor.git
   git push -u origin main
   ```
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada push para `main` builda e publica sozinho. A URL aparece em **Actions → deploy**.

## Recursos

- **Leitura em voz alta (TTS)** — Web Speech API lê parágrafo a parágrafo, com o
  parágrafo atual destacado e a **palavra sendo lida em evidência** (rolagem
  automática/teleprompter). Controles de play/pause, velocidade (0.5×–2.5× com
  leitura em palavras por minuto), contagem regressiva até o fim, volume,
  seleção de voz, tamanho de fonte e navegação por parágrafo. `Espaço` alterna
  play/pause.
- **Anotações por voz (STT)** — "Pausar e anotar" pausa a leitura e abre a
  gravação; a fala é transcrita ao vivo e pode ser editada antes de salvar.
- **Ancoragem** — cada anotação vira um marcador inline `[A#]` no parágrafo e
  entra no índice "Minhas anotações". Clicar em uma anotação leva ao parágrafo.
- **PDF lado a lado** — visualização do PDF (esquerda) sincronizada com o texto
  extraído (direita); a página acompanha a leitura.
- **Persistência local** — tudo é salvo em IndexedDB. "Anteriores" reabre PDFs
  já lidos, com anotações.
- **Exportação** — JSON estruturado e Markdown compilado (Obsidian/Notion).

## Stack

React 18 + Vite · react-pdf / pdfjs-dist · Web Speech API (TTS + STT nativos) ·
IndexedDB (via `idb`) · Tailwind CSS.

## Rodando

```bash
cd leitor
npm install
npm run dev
```

Abra o endereço mostrado (ex. `http://localhost:5173`).

> **Navegador:** o reconhecimento de voz (STT) da Web Speech API funciona em
> Chrome e Edge. A síntese de voz (TTS) funciona também no Safari. Em navegadores
> sem STT você ainda pode digitar as anotações manualmente.

## Como funciona a extração de parágrafos

`src/lib/pdf.js` usa a mesma instância do pdf.js que o react-pdf carrega. Ele
reconstrói linhas pela posição vertical dos fragmentos de texto e as agrupa em
parágrafos quando o espaçamento vertical indica uma quebra — heurística que
funciona bem para artigos de uma ou duas colunas.

## Fora do escopo do MVP

Sem nuvem/sincronização, sem OCR (PDFs só de imagem não têm texto extraível),
sem comentários nativos de PDF, sem temas.
