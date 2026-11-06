import { api } from './api';

export const carregarEletricistas = () => api('/usuarios').then((l) => l.filter((u) => u.perfil === 'eletricista'));

// RN 63: só ativos são oferecidos, mais os que já estão gravados no registro (mesmo inativos)
export const oferecer = (lista, ...jaGravados) => lista.filter((u) => u.ativo || jaGravados.some((id) => String(id) === String(u.id)));
