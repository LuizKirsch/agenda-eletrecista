// RF 2.15: tamanho da letra (pequena/média/grande/extra grande), salvo no aparelho; média é o padrão
const ESCALAS = { pequena: 0.9, media: 1, grande: 1.2, extra: 1.5 };
const CHAVE = 'tamanhoFonte';

export function tamanhoSalvo() {
  try {
    const v = localStorage.getItem(CHAVE);
    return v in ESCALAS ? v : 'media';
  } catch { return 'media'; }
}

export function aplicarTamanho(tamanho) {
  document.documentElement.style.setProperty('--fonte', ESCALAS[tamanho] ?? 1);
  try { localStorage.setItem(CHAVE, tamanho); } catch { /* sem armazenamento: vale só nesta sessão */ }
}
