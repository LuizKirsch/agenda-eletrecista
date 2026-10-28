import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { IconeBusca, IconeDireita, IconeMais, iniciais } from '../icones';
import FormCliente from './FormCliente';

export default function Clientes() {
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState(null);
  const [erro, setErro] = useState('');
  const [novo, setNovo] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const espera = setTimeout(() => {
      api(`/clientes?busca=${encodeURIComponent(busca.trim())}`)
        .then((lista) => {
          if (cancelado) return;
          setClientes(lista);
          setErro('');
        })
        .catch((err) => {
          if (!cancelado) setErro(err.message);
        });
    }, busca ? 300 : 0);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [busca]);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Clientes</h1>
          <p className="suave">Busque pelo nome ou telefone.</p>
        </div>
        <button type="button" className="primario" onClick={() => setNovo(true)}><IconeMais />Novo cliente</button>
      </div>

      <div className="busca">
        <IconeBusca />
        <input
          type="search"
          placeholder="Buscar por nome ou telefone"
          aria-label="Buscar cliente"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {clientes === null && !erro && <p className="carregando">Carregando…</p>}
      {clientes?.length === 0 && <p className="vazio">{busca.trim() ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</p>}
      <ul className="lista">
        {clientes?.map((c) => (
          <li key={c.id} className="link">
            <Link to={`/clientes/${c.id}`}>
              <span className="avatar">{iniciais(c.nome)}</span>
              <span className="corpo">
                <strong>{c.nome}</strong>
                <span className="suave">{c.telefone}</span>
              </span>
              <IconeDireita />
            </Link>
          </li>
        ))}
      </ul>

      {novo && <FormCliente onFechar={() => setNovo(false)} />}
    </>
  );
}
