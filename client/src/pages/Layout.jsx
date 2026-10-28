import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth';
import {
  IconeAgenda, IconeClientes, IconeOrcamento, IconeRaio, IconeSair, IconeTipos, IconeUsuario, iniciais,
} from '../icones';

export const PERFIS = { eletricista: 'Eletricista', secretaria: 'Secretária' };

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <>
      <aside className="lateral">
        <div className="marca"><span className="marca-icone"><IconeRaio /></span>Agenda</div>
        <nav aria-label="Menu principal">
          <NavLink to="/agenda"><IconeAgenda />Agenda</NavLink>
          <NavLink to="/clientes"><IconeClientes />Clientes</NavLink>
          <NavLink to="/orcamentos"><IconeOrcamento />Orçamentos</NavLink>
          <NavLink to="/tipos-atividade"><IconeTipos /><span className="rotulo-menu">Tipos<span className="so-computador"> de atividade</span></span></NavLink>
          <NavLink to="/usuarios"><IconeUsuario />Usuários</NavLink>
        </nav>
        <div className="quem">
          <span className="avatar destaque">{iniciais(usuario.nome)}</span>
          <div>
            <strong>{usuario.nome}</strong>
            <span>{PERFIS[usuario.perfil]}</span>
          </div>
          <button type="button" className="icone-botao discreto" aria-label="Sair" onClick={logout}><IconeSair /></button>
        </div>
      </aside>

      {/* celular: marca e conta no topo; o menu fica na barra inferior */}
      <header className="topo-celular">
        <div className="marca"><span className="marca-icone"><IconeRaio /></span>Agenda</div>
        <details>
          <summary aria-label={`Conta de ${usuario.nome}`}><span className="avatar destaque">{iniciais(usuario.nome)}</span></summary>
          <div className="menu-conta">
            <div><strong>{usuario.nome}</strong><div className="suave">{PERFIS[usuario.perfil]}</div></div>
            <button type="button" onClick={logout}><IconeSair />Sair</button>
          </div>
        </details>
      </header>

      <main className={pathname.startsWith('/agenda') ? 'conteudo largo' : 'conteudo'}>
        <Outlet />
      </main>
    </>
  );
}
