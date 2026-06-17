# Relatório técnico — Integração com a API do Lichess (recurso "Base de dados")

**Projeto:** Xadrez do Michuri (PWA de xadrez)
**Versão do app no momento do relatório:** 0.2.1
**Data:** 2026-06-17
**Status:** ❌ Não funcional — consulta retorna **HTTP 401** no navegador do usuário, mesmo online.

Este documento descreve, para análise por outro desenvolvedor, **como** a chamada
ao Lichess é feita, **qual erro** ocorre, **o ambiente**, e **todas as tentativas
de correção** já realizadas. O objetivo é que o desenvolvedor consiga reproduzir,
pesquisar e encontrar a solução definitiva.

---

## 1. Contexto do recurso

Na aba **Análise** do app existe um painel colapsável **"Base de dados Lichess
(online)"**. Quando aberto, ele consulta a posição atual do tabuleiro na base de
partidas de mestres do Lichess (Opening Explorer) e exibe:

- quantas partidas de mestres passaram por aquela posição;
- os lances mais jogados, com barra de vitórias/empates/derrotas;
- algumas partidas célebres (jogadores, ano, resultado).

É um recurso **online-only**; o resto do app funciona 100% offline.

---

## 2. Stack e ambiente de execução

| Item | Detalhe |
|---|---|
| Front-end | Vite 5 + React 18 + TypeScript (strict) |
| Empacotamento/PWA | `vite-plugin-pwa` (Workbox), `registerType: 'autoUpdate'`, precache |
| Hospedagem | **GitHub Pages** em subpasta: `https://<usuario>.github.io/michuri_xadrez/` (Vite `base: '/michuri_xadrez/'`) |
| Origem (Origin) das requisições | `https://<usuario>.github.io` (esquema HTTPS) |
| Cliente observado | Celular Android, navegador móvel, **rede 5G (dados móveis)** e também Wi-Fi |
| A chamada parte de | **navegador do usuário** (client-side `fetch`), não de servidor |

> Observação importante: como é uma **PWA com service worker e precache**, versões
> antigas do app podem ficar **em cache** no aparelho. Isso é relevante para o
> diagnóstico (ver §6, hipótese A).

---

## 3. Como a chamada é feita (código real)

### 3.1. Endpoint e montagem da URL

Arquivo: `src/core/lichess.ts`

```ts
// Host ATUAL usado pelo app (após a última correção):
const EXPLORER = 'https://explorer.lichess.org/masters';

export async function buscarExplorer(fen: string, signal?: AbortSignal): Promise<ExplorerResultado> {
  const url = `${EXPLORER}?fen=${encodeURIComponent(fen)}&moves=10&topGames=4`;
  const j = await buscarJson(url, signal);
  // ... parse de j.white/draws/black, j.moves[], j.topGames[] ...
}
```

**Exemplo de URL real** (posição após 1.e4, pretas a jogar):

```
https://explorer.lichess.org/masters?fen=rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20-%200%201&moves=10&topGames=4
```

> Note que `encodeURIComponent` codifica as barras do FEN como `%2F` e os espaços
> como `%20`. (Possível ponto de investigação — ver §6, hipótese D.)

### 3.2. O `fetch` em si (com timeout e classificação de erro)

```ts
async function buscarJson(url: string, signal?: AbortSignal, timeoutMs = 9000): Promise<unknown> {
  const ctrl = new AbortController();
  const aoAbortar = () => ctrl.abort();
  signal?.addEventListener('abort', aoAbortar, { once: true });
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let r: Response;
  try {
    r = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    // fetch só "throw"a (TypeError) quando a requisição nem completa:
    // offline, DNS, CORS bloqueado pelo navegador, etc.
    if (signal?.aborted) throw e;
    if (ctrl.signal.aborted) throw new LichessErro('timeout', '...');
    if (navigator.onLine === false) throw new LichessErro('offline', '...');
    throw new LichessErro('bloqueio', 'Não foi possível acessar o Lichess (bloqueio/serviço fora).');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', aoAbortar);
  }
  if (r.status === 401 || r.status === 403)
    throw new LichessErro('recusado', `O Lichess recusou o acesso (${r.status}). ...`, r.status);
  if (r.status === 429) throw new LichessErro('limite', '...', 429);
  if (!r.ok) throw new LichessErro('status', `O Lichess respondeu ${r.status}.`, r.status);
  return r.json();
}
```

- **Método:** `GET`
- **Headers enviados:** apenas `Accept: application/json` (header CORS-safelisted; não dispara preflight)
- **Sem credenciais:** `fetch` padrão (não envia cookies cross-origin); **sem `Authorization`**
- **Sem token** de API

### 3.3. Onde/quando é disparado

Arquivo: `src/features/analysis/Analise.tsx` — efeito React que roda quando o
painel está aberto, com **debounce de 400 ms** e cancelamento por `AbortController`
ao trocar de posição:

```ts
useEffect(() => {
  if (!nuvemAberta || !ativo) return;
  const fen = posicao.fen;
  const ctrl = new AbortController();
  setNuvemErro(undefined);
  setNuvemCarregando(true);
  const t = setTimeout(async () => {
    try {
      const exp = await buscarExplorer(fen, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setNuvem(exp);
    } catch (e) {
      if (ctrl.signal.aborted || e?.name === 'AbortError') return;
      setNuvem(null);
      setNuvemErro(e instanceof LichessErro ? e.message : 'Não foi possível consultar o Lichess agora.');
    } finally {
      if (!ctrl.signal.aborted) setNuvemCarregando(false);
    }
  }, 400);
  return () => { clearTimeout(t); ctrl.abort(); };
}, [nuvemAberta, ativo, posicao.fen, nuvemTentativa]);
```

---

## 4. Sintoma / erro observado

- A UI exibe: **"O Lichess recusou o acesso (401). ..."**
- Ou seja, no código acima, `r.status === 401` foi verdadeiro → a resposta HTTP
  **chegou** com status **401 Unauthorized**.
- Ocorre com o aparelho **comprovadamente online** (5G e Wi-Fi), em telas
  diferentes/posições diferentes.

### Diagnóstico-chave (importante para o analista)

O `fetch` **leu** `r.status === 401`. Para o navegador permitir ler o status de uma
resposta cross-origin, a resposta **precisa ter passado pela checagem de CORS**
(isto é, conter `Access-Control-Allow-Origin`). Portanto:

> **Não é um bloqueio de CORS** (esse daria `TypeError: Failed to fetch`, e cairia
> no ramo `'bloqueio'`, não no `'recusado'/401`).
>
> **É uma resposta deliberada 401 vinda do servidor** (ou de um proxy no caminho)
> — algo está exigindo autenticação/credencial que não estamos enviando.

---

## 5. Tentativas de correção já realizadas (cronológico)

| # | Commit | O que foi feito | Resultado |
|---|---|---|---|
| 1 | `6e01d46` | Implementação inicial: Explorer (`explorer.lichess.ovh/masters`) + Cloud Eval (`lichess.org/api/cloud-eval`), módulo carregado por `import()` **dinâmico** (chunk separado). | Falhava com mensagem genérica "Sem conexão". |
| 2 | `6ae38bf` | (a) Removido o `import()` dinâmico → **import estático** (elimina falha de carregamento de chunk na PWA). (b) `Promise.allSettled` para fontes independentes. (c) Timeout de 9 s. (d) Mensagens de erro específicas por causa (offline/limite/timeout/bloqueio/status). | Passou a aparecer o status real → revelou **401**. |
| 3 | `f6619ac` | Removido o **Cloud Eval** (redundante com o motor local e suspeito de 401). Mantido só o Explorer. Mensagem dedicada para 401/403. | Continuou **401** (agora vindo só do Explorer). |
| 4 | `5208022` | **Trocado o host** do Explorer de `explorer.lichess.ovh` → **`explorer.lichess.org`** (a spec OpenAPI oficial do Lichess indica este como host atual; o `.ovh` estaria descontinuado). | **Usuário relata que CONTINUA falhando (401).** |

### Base da decisão da tentativa #4

Na spec oficial (`lichess-org/api`, `doc/specs/lichess-api.yaml`), a descrição da
tag **Opening Explorer** afirma que o host dos endpoints é **`explorer.lichess.org`**
(e não `lichess.org`), e os paths `/masters`, `/lichess`, `/player` aparecem **sem
`security`** (ou seja, públicos). Há, porém, um tópico no fórum do Lichess intitulado
*"Using the opening explorer now requires being logged in"*, que levanta dúvida se
o acesso via API sem token foi restringido.

---

## 6. Hipóteses ainda em aberto (para o analista investigar)

### Hipótese A — Cache do PWA (o usuário ainda roda a versão antiga) ⚠️ ALTA PROBABILIDADE
A PWA usa service worker com precache e `autoUpdate`. É possível que o aparelho
ainda esteja executando o build **anterior** (que chamava `explorer.lichess.ovh`,
o host que retorna 401). A correção #4 só tem efeito após o SW atualizar.
- **Como descartar:** a splash mostra `v{versão} · build {data UTC}`. Confirmar que
  está em **v0.2.1** (ou posterior). Em DevTools → Network, conferir **qual URL**
  a requisição realmente usa (`.org` vs `.ovh`). Forçar atualização: fechar o app,
  "Limpar dados do site"/desinstalar a PWA, ou DevTools → Application → Service
  Workers → *Unregister* + *Update on reload*.

### Hipótese B — O Opening Explorer passou a exigir autenticação
Apesar de a spec listar os endpoints como públicos, o fórum sugere que o acesso
sem login pode ter sido restringido (anti-abuso). Se for o caso, **mesmo o host
correto retorna 401 sem `Authorization: Bearer <token>`**.
- **Como confirmar:** `curl -i` ao endpoint **sem** token e **com** um Personal
  Access Token (criado em `lichess.org/account/oauth/token/create`). Comparar.
- **Implicação:** se exigir token, é preciso decidir produto/UX (pedir que o
  usuário forneça o próprio token nas configurações — **nunca** embutir token no
  código client-side, pois fica exposto).

### Hipótese C — Proxy/operadora/filtro de conteúdo retornando 401
Como ocorre em 5G, um proxy transparente da operadora ou um filtro
(parental/segurança) pode interceptar `explorer.lichess.*` (TLD `.ovh`/.org) e
devolver 401.
- **Como confirmar:** testar em outra rede (Wi-Fi residencial), outro aparelho,
  aba anônima sem extensões; inspecionar headers da resposta (`WWW-Authenticate`,
  `Server`, `Via`) — um 401 do Lichess difere do de um proxy.

### Hipótese D — Barras codificadas (`%2F`) no FEN da query string
`encodeURIComponent` transforma `/` em `%2F`. Alguns servidores/edges rejeitam
slashes codificadas. É improvável que gere 401 (normalmente 400/404), mas vale
testar a URL exata via `curl` e, se necessário, comparar com a forma usada pelo
próprio site do Lichess.

### Hipótese E — Necessidade de header/identificação
Verificar se o serviço passou a exigir algum header (ex.: `User-Agent` específico,
ou rejeita `Accept: application/json` por algum motivo). Testar removendo o header
`Accept` e/ou variando-o.

---

## 7. Checklist acionável para o desenvolvedor

1. **Reproduzir fora do app**, direto no terminal, para isolar do PWA/cache:
   ```bash
   # Sem token:
   curl -i 'https://explorer.lichess.org/masters?fen=rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR%20b%20KQkq%20-%200%201&moves=10&topGames=4'

   # Host antigo (esperado 401/deprecado):
   curl -i 'https://explorer.lichess.ovh/masters?fen=rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR%20b%20KQkq%20-%200%201'

   # Com token pessoal (testar se 401 some):
   curl -i -H 'Authorization: Bearer <SEU_TOKEN>' 'https://explorer.lichess.org/masters?fen=...'
   ```
   Anotar **status**, e os headers `access-control-allow-origin`, `www-authenticate`,
   `server`, `via`, `cf-*`.

2. **Reproduzir no navegador** (DevTools → Network): abrir o painel "Base de dados
   Lichess", localizar a requisição, e registrar: **URL exata**, **status**,
   **Request Headers**, **Response Headers**. Confirmar se a URL usa `.org` ou `.ovh`
   (descarta a Hipótese A).

3. **Confirmar a versão** rodando (splash deve dizer `v0.2.1`+). Se estiver velha,
   limpar SW/cache e repetir.

4. Com base nos achados:
   - Se **público funciona via curl mas falha no app** → é cache/SW (Hipótese A) ou
     CORS específico → checar `access-control-allow-origin` na resposta.
   - Se **401 também no curl sem token, e 200 com token** → o explorer agora exige
     auth (Hipótese B) → implementar fluxo de token do próprio usuário.
   - Se **401 só na rede móvel** → Hipótese C (operadora/filtro).

---

## 8. Referências

- Spec OpenAPI oficial do Lichess (host e segurança do Opening Explorer):
  `https://raw.githubusercontent.com/lichess-org/api/master/doc/specs/lichess-api.yaml`
- Repositório do Opening Explorer: `https://github.com/lichess-org/lila-openingexplorer`
- Criação de Personal Access Token: `https://lichess.org/account/oauth/token/create`
- Fórum (acesso ao explorer/login): pesquisar em
  `lichess.org/forum` por *"opening explorer requires being logged in"*.

---

## 9. Arquivos relevantes no repositório

- `src/core/lichess.ts` — cliente HTTP da chamada (todo o código de §3).
- `src/features/analysis/Analise.tsx` — efeito que dispara a consulta e renderiza o
  painel (`NuvemPanel`), com debounce/abort/estado de erro.
- `vite.config.ts` — `base: '/michuri_xadrez/'`, `define` da versão/data de build,
  e config do `vite-plugin-pwa` (precache/autoUpdate) — relevante para o cache da PWA.

---

### Observação metodológica

O ambiente de desenvolvimento onde estas correções foram feitas tem **egress de
rede bloqueado** para `lichess.org`/`explorer.lichess.*`, então **não foi possível
testar as chamadas reais a partir dele** — as correções foram guiadas por análise
de código e pela spec oficial. A reprodução do passo §7.1 (curl em uma máquina com
rede aberta) é o caminho mais rápido para a causa-raiz.
