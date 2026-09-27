export const MENSAGEM_GENERICA = 'Não foi possível concluir a operação. Tente novamente.';

let aoReceber401 = () => {};
export function definirAoReceber401(fn) {
  aoReceber401 = fn;
}

export async function api(caminho, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${caminho}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(MENSAGEM_GENERICA);
  }

  if (res.status === 401 && caminho !== '/auth/login') aoReceber401();
  if (res.status === 204) return null;

  const dados = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(dados.erro || MENSAGEM_GENERICA);
  return dados;
}
