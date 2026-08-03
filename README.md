# Leitor — anotação por voz para PDFs científicos

Leia PDFs em voz alta, pause para gravar anotações faladas (transcritas em tempo
real) e compile tudo ancorado ao texto original — direto no navegador, offline,
sem nuvem.

## Recursos

- **Leitura em voz alta (TTS)** — Web Speech API lê parágrafo a parágrafo, com o
  parágrafo atual destacado. Controles de play/pause, velocidade (0.8×–1.5×),
  volume e navegação por parágrafo. `Espaço` alterna play/pause.
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
