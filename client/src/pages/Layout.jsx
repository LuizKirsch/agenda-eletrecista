import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth';
import TiposAtividade from './TiposAtividade';

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
      <header className="topo">
        <strong className="marca">Agenda do Eletricista</strong>
        <nav>
          <NavLink to="/agenda">Agenda</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/usuarios">Usuários</NavLink>
          <button type="button" className="nav-botao" onClick={() => abrirTipos()}>Tipos de atividade</button>
        </nav>
        <span className="quem">{usuario.nome}</span>
        <button onClick={logout}>Sair</button>
      </header>
      <main className={pathname.startsWith('/agenda') ? 'conteudo largo' : 'conteudo'}>
        <Outlet context={{ abrirTipos, versaoTipos }} />
      </main>
      {tipos && <TiposAtividade mensagem={tipos.mensagem} onFechar={fecharTipos} />}
    </>
  );
}
