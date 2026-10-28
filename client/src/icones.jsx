// Ícones em traço (SVG inline), herdam a cor do texto via currentColor.
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const Icone = ({ tamanho, children }) => <svg {...base} width={tamanho ?? 18} height={tamanho ?? 18}>{children}</svg>;

export const IconeRaio = (p) => <Icone {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" /></Icone>;
export const IconeAgenda = (p) => <Icone {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icone>;
export const IconeClientes = (p) => <Icone {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></Icone>;
export const IconeTipos = (p) => <Icone {...p}><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z" /><circle cx="7" cy="7" r="1.5" /></Icone>;
export const IconeUsuario = (p) => <Icone {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></Icone>;
export const IconeSair = (p) => <Icone {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Icone>;
export const IconeMais = (p) => <Icone {...p}><path d="M12 5v14M5 12h14" /></Icone>;
export const IconeFechar = (p) => <Icone {...p}><path d="M6 6l12 12M18 6 6 18" /></Icone>;
export const IconeEditar = (p) => <Icone {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Icone>;
export const IconeLixo = (p) => <Icone {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></Icone>;
export const IconeEsquerda = (p) => <Icone {...p}><path d="m15 6-6 6 6 6" /></Icone>;
export const IconeDireita = (p) => <Icone {...p}><path d="m9 6 6 6-6 6" /></Icone>;
export const IconeAlerta = (p) => <Icone {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01" /></Icone>;
export const IconeInfo = (p) => <Icone {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></Icone>;
export const IconeLocal = (p) => <Icone {...p}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></Icone>;
export const IconeCasa = (p) => <Icone {...p}><path d="M3 10.5 12 3l9 7.5V21H3z" /><path d="M9 21v-6h6v6" /></Icone>;
export const IconeBalao = (p) => <Icone {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icone>;
export const IconeCheck = (p) => <Icone {...p}><path d="M20 6 9 17l-5-5" /></Icone>;
export const IconeOrcamento = (p) => <Icone {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></Icone>;
export const IconeBusca = (p) => <Icone {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icone>;

// Iniciais para o avatar ("Roberto Lima" -> "RL")
export const iniciais = (nome = '') => nome.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
