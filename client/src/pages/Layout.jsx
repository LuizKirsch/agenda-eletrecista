import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth';
import TiposAtividade from './TiposAtividade';

const PERFIS = { eletricista: 'Eletricista', secretaria: 'Secretária' };

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { pathname } = useLocation();
  const [tipos, setTipos] = useState(null);
  const [versaoTipos, setVersaoTipos] = useState(0);
  const abrirTipos = (mensagem = '') => setTipos({ mensagem });

  function fecharTipos() {
    setTipos(null);
    setVersaoTipos((v) => v + 1);
  }

  return (
    <>
      <aside className="lateral">
        <div className="marca">
          <strong>⚡ Agenda</strong>
        </div>
        <nav>
          <NavLink to="/agenda"><i>01</i>Agenda</NavLink>
          <NavLink to="/clientes"><i>02</i>Clientes</NavLink>
          <button type="button" className={tipos ? 'active' : undefined} onClick={() => abrirTipos()}><i>03</i>Tipos de Atividade</button>
          <NavLink to="/usuarios"><i>04</i>Usuários</NavLink>
          <button type="button" className="sair-celular" onClick={logout}><i>—</i>Sair</button>
        </nav>
        <div className="quem">
          <strong>{usuario.nome}</strong>
          <span>{PERFIS[usuario.perfil]}</span>
          <button type="button" onClick={logout}>Sair</button>
        </div>
      </aside>
      <main className={pathname.startsWith('/agenda') ? 'conteudo largo' : 'conteudo'}>
        <Outlet context={{ abrirTipos, versaoTipos }} />
      </main>
      {tipos && <TiposAtividade mensagem={tipos.mensagem} onFechar={fecharTipos} />}
    </>
  );
}
