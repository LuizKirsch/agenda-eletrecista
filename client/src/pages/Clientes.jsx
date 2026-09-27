import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';

export default function Clientes() {
  const [busca, setBusca] = useState('');
  const [clientes, setClientes] = useState(null);
  const [erro, setErro] = useState('');

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
      <h1>Clientes</h1>
      <Link to="/clientes/novo" className="botao primario">Novo cliente</Link>
      <input
        type="search"
        className="busca"
        placeholder="Buscar por nome ou telefone"
        aria-label="Buscar cliente"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      {erro && <p className="erro" role="alert">{erro}</p>}
      {clientes === null && !erro && <p className="carregando">Carregando…</p>}
      {clientes?.length === 0 && <p className="vazio">{busca.trim() ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</p>}
      <ul className="lista">
        {clientes?.map((c) => (
          <li key={c.id} className="link">
            <Link to={`/clientes/${c.id}`}>
              <strong>{c.nome}</strong>
              <span>{c.telefone}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
