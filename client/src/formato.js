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
