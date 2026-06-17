// Login no Lichess via OAuth 2.0 com PKCE (Proof Key for Code Exchange).
//
// Por quê: o Opening Explorer do Lichess passou a exigir autenticação (responde
// 401 sem token). Como esta é uma PWA 100% client-side, NÃO podemos embutir um
// segredo de cliente — por isso usamos PKCE, o fluxo OAuth próprio para apps
// públicos (SPA/PWA/mobile), que dispensa client secret.
//
// Fluxo:
//   1. iniciarLogin(): gera code_verifier + code_challenge (S256), guarda o
//      verifier, e redireciona para a tela de autorização do Lichess.
//   2. O Lichess volta para o redirect_uri com ?code=...&state=...
//   3. tratarRedirect(): valida o state, troca o code pelo access_token em
//      /api/token (POST, sem segredo, enviando o code_verifier) e guarda o token.
//   4. getToken() devolve o token para as chamadas à API (Authorization: Bearer).

const CLIENT_ID = 'https://github.com/alessandrociapina-cpu/michuri_xadrez';
const AUTH_URL = 'https://lichess.org/oauth';
const TOKEN_URL = 'https://lichess.org/api/token';
// O explorer só exige "estar autenticado"; um token SEM escopos já basta.
const SCOPES = '';

const LS_TOKEN = 'michuri_lichess_token';
const SS_VERIFIER = 'michuri_pkce_verifier';
const SS_STATE = 'michuri_oauth_state';

/** URL de retorno = a própria URL do app (origin + base do Vite). */
function redirectUri(): string {
  return window.location.origin + import.meta.env.BASE_URL;
}

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function stringAleatoria(bytes = 64): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer);
}

async function desafio(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64url(digest);
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(LS_TOKEN);
  } catch {
    return null;
  }
}

export function estaLogado(): boolean {
  return !!getToken();
}

export function logout(): void {
  try {
    localStorage.removeItem(LS_TOKEN);
  } catch {
    /* storage indisponível */
  }
}

/** True se a URL atual é um retorno do OAuth (tem ?code= ou ?error=). */
export function ehRetornoOAuth(): boolean {
  return /[?&](code|error)=/.test(window.location.search);
}

/** Inicia o login: redireciona o usuário para o Lichess. */
export async function iniciarLogin(): Promise<void> {
  const verifier = stringAleatoria(64);
  const state = stringAleatoria(16);
  const challenge = await desafio(verifier);
  try {
    sessionStorage.setItem(SS_VERIFIER, verifier);
    sessionStorage.setItem(SS_STATE, state);
  } catch {
    /* se não houver sessionStorage, o login não tem como prosseguir com segurança */
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });
  if (SCOPES) params.set('scope', SCOPES);
  window.location.href = `${AUTH_URL}?${params.toString()}`;
}

type ResultadoRedirect = { ok: boolean; erro?: string };

/** Remove os parâmetros do OAuth da barra de endereços. */
function limparUrl(): void {
  const u = new URL(window.location.href);
  for (const p of ['code', 'state', 'error', 'error_description']) u.searchParams.delete(p);
  window.history.replaceState({}, '', u.pathname + u.search + u.hash);
}

// O code de autorização é de uso único; memoizamos a troca para que chamadas
// concorrentes (ex.: StrictMode invocando o efeito 2x) não tentem usá-lo duas vezes.
let trocaEmAndamento: Promise<ResultadoRedirect | null> | null = null;

export function tratarRedirect(): Promise<ResultadoRedirect | null> {
  if (!trocaEmAndamento) trocaEmAndamento = executarTroca();
  return trocaEmAndamento;
}

/**
 * Se a URL for um retorno do OAuth, troca o code pelo token. Devolve o resultado,
 * ou null se não houver nada a tratar (boot normal do app).
 */
async function executarTroca(): Promise<ResultadoRedirect | null> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const erro = url.searchParams.get('error');
  if (!code && !erro) return null;

  if (erro) {
    limparUrl();
    return { ok: false, erro: 'Login no Lichess cancelado ou negado.' };
  }

  let savedState: string | null = null;
  let verifier: string | null = null;
  try {
    savedState = sessionStorage.getItem(SS_STATE);
    verifier = sessionStorage.getItem(SS_VERIFIER);
  } catch {
    /* ignore */
  }
  if (!verifier || !savedState || state !== savedState) {
    limparUrl();
    return { ok: false, erro: 'Falha de segurança no login (state inválido). Tente novamente.' };
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code as string,
      code_verifier: verifier,
      redirect_uri: redirectUri(),
      client_id: CLIENT_ID,
    });
    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!r.ok) {
      limparUrl();
      return { ok: false, erro: `Falha ao obter o token do Lichess (${r.status}).` };
    }
    const j = (await r.json()) as { access_token?: string };
    try {
      sessionStorage.removeItem(SS_VERIFIER);
      sessionStorage.removeItem(SS_STATE);
    } catch {
      /* ignore */
    }
    limparUrl();
    if (!j.access_token) return { ok: false, erro: 'Resposta de token inválida do Lichess.' };
    try {
      localStorage.setItem(LS_TOKEN, j.access_token);
    } catch {
      return { ok: false, erro: 'Não foi possível salvar o login neste dispositivo.' };
    }
    return { ok: true };
  } catch {
    limparUrl();
    return { ok: false, erro: 'Erro de rede ao concluir o login no Lichess.' };
  }
}
