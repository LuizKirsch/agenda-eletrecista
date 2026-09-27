import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth';

export default function Layout() {
  const { usuario, logout } = useAuth();
  return (
    <>
      <header className="topo">
        <strong className="marca">Agenda do Eletricista</strong>
        <nav>
          <NavLink to="/agenda">Agenda</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/usuarios">Usuários</NavLink>
        </nav>
        <span className="quem">{usuario.nome}</span>
        <button onClick={logout}>Sair</button>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </>
  );
}
