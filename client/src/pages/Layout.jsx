import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth';
import TiposAtividade from './TiposAtividade';

export default function Layout() {
  const { usuario, logout } = useAuth();
  const [tiposAberto, setTiposAberto] = useState(false);
  const abrirTipos = () => setTiposAberto(true);

  return (
    <>
      <header className="topo">
        <strong className="marca">Agenda do Eletricista</strong>
        <nav>
          <NavLink to="/agenda">Agenda</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/usuarios">Usuários</NavLink>
          <button type="button" className="nav-botao" onClick={abrirTipos}>Tipos de atividade</button>
        </nav>
        <span className="quem">{usuario.nome}</span>
        <button onClick={logout}>Sair</button>
      </header>
      <main className="conteudo">
        <Outlet context={{ abrirTipos }} />
      </main>
      {tiposAberto && <TiposAtividade onFechar={() => setTiposAberto(false)} />}
    </>
  );
}
