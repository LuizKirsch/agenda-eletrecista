export function formatarEndereco(e) {
  return [[e.logradouro, e.numero].filter(Boolean).join(', '), e.complemento, e.bairro, e.cidade]
    .filter(Boolean)
    .join(' - ');
}

// dd/mm/aaaa hh:mm
export function formatarDataHora(valor) {
  return new Date(valor)
    .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    .replace(',', '');
}

export const formatarReais = (valor) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarDuracao = (min) => (min % 60 === 0 ? `${min / 60} h` : min > 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

// (11) 91234-5678 ou (11) 1234-5678; parcial enquanto digita
export function formatarTelefone(valor) {
  const d = String(valor ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  const corte = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, corte)}${d.length > 6 ? '-' : ''}${d.slice(corte)}`;
}
