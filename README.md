# Leitor — anotação por voz para PDFs científicos

Leia PDFs em voz alta, pause para gravar anotações faladas (transcritas em tempo
real), refine-as em críticas argumentadas e compile tudo ancorado ao texto
original — direto no navegador, offline, sem nuvem.

## 🔗 Acesso

**App online:** https://brenoplatais.github.io/leitor/

> Fica disponível após o primeiro deploy do GitHub Actions concluir (aba
> **Actions** do repositório).

Para a **transcrição por voz (STT)** use **Chrome ou Edge** — a leitura em voz
alta (TTS) funciona na maioria dos navegadores. Cada pessoa tem seus próprios
PDFs e anotações no navegador (armazenamento local); para compartilhar
anotações, use **Exportar JSON/Markdown**.

## Publicar (GitHub Pages)

O deploy é automático via GitHub Actions ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)):

1. Crie um repositório no GitHub (público) e envie este projeto:
   ```bash
   git remote add origin https://github.com/brenoplatais/leitor.git
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
- **Refinamento de anotações** — botão **📋 Refinar** transforma uma reação em
  crítica argumentada por meio de três abas (classificar o tipo de crítica,
  protocolo de 6 movimentos, 8 perguntas de controle). Ver
  [seção abaixo](#refinamento-de-anotações).
- **Ancoragem** — cada anotação vira um marcador inline `[A#]` no parágrafo e
  entra no índice "Minhas anotações". Clicar em uma anotação leva ao parágrafo.
- **PDF lado a lado** — visualização do PDF (esquerda) sincronizada com o texto
  extraído (direita); a página acompanha a leitura.
- **Persistência local** — tudo é salvo em IndexedDB. "Anteriores" reabre PDFs
  já lidos, com anotações.
- **Exportação** — JSON estruturado (inclui o refinamento de cada anotação) e
  Markdown compilado (Obsidian/Notion).

## Refinamento de anotações

Além de registrar uma anotação, é possível **refiná-la** em uma crítica
argumentada. No modal de anotação (nova ou em edição), o botão **📋 Refinar**
abre um fluxo de três abas:

- **Classificar** — escolha entre 7 tipos de crítica (interna, empírica, de
  escopo, conceitual, política/genealógica, paradigmática e extensão produtiva),
  cada um com a pergunta que o orienta.
- **Protocolo** — um accordion com os 6 movimentos da crítica (reconstruir a
  afirmação, reconhecer a função da passagem, nomear o problema, apresentar o
  fundamento, delimitar o alcance e oferecer formulação melhor), com validação e
  dicas por etapa.
- **Controle** — 8 perguntas respondidas com **Sim/Não/Incerto** que dão
  feedback em tempo real e produzem um **score** (nº de "Sim"), sinalizando a
  solidez da crítica.

Anotações refinadas exibem um selo com o tipo de crítica e o score no painel
lateral. O refinamento é salvo no campo `refinement` da anotação (IndexedDB) e
incluído na exportação JSON.

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

Testes da lógica de refinamento (runner nativo do Node, sem dependências extras):

```bash
npm test
```

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
