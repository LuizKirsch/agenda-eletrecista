// RF 2.16: tema claro/escuro, salvo no aparelho; sem escolha salva, segue o aparelho
const CHAVE = 'tema';

export function temaSalvo() {
  try {
    const v = localStorage.getItem(CHAVE);
    if (v === 'claro' || v === 'escuro') return v;
  } catch { /* sem armazenamento: segue o aparelho */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;
  try { localStorage.setItem(CHAVE, tema); } catch { /* vale só nesta sessão */ }
}
