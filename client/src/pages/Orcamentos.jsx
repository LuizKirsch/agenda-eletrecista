import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api';
import { formatarDataHora, formatarReais } from '../formato';
import { IconeMais } from '../icones';
import OrcamentoForm from './OrcamentoForm';

export const STATUS_ORCAMENTO = { pendente: 'Pendente', aceito: 'Aceito', recusado: 'Recusado' };

// RF 4.14: cliente, data de criação, status e total, do mais recente para o mais antigo
export default function Orcamentos() {
  const navigate = useNavigate();
  const [orcamentos, setOrcamentos] = useState(null);
  const [erro, setErro] = useState('');
  const [novo, setNovo] = useState(false);

  useEffect(() => {
    api('/orcamentos').then(setOrcamentos).catch((err) => setErro(err.message));
  }, []);

  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Orçamentos</h1>
          <p className="suave">Ao aceitar um orçamento, ele vira uma OS na agenda.</p>
        </div>
        <button type="button" className="primario" onClick={() => setNovo(true)}><IconeMais />Novo orçamento</button>
      </div>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {orcamentos === null && !erro && <p className="carregando">Carregando…</p>}
      {orcamentos?.length === 0 && <p className="vazio">Nenhum orçamento cadastrado.</p>}

      {orcamentos?.length > 0 && (
        <div className="tabela">
          <table>
            <thead>
              <tr>
                <th>Orçamento</th>
                <th>Criado em</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orcamentos.map((o) => (
                <tr key={o.id}>
                  <td><Link to={`/orcamentos/${o.id}`} className="nome">Nº {o.id} · {o.cliente.nome}</Link></td>
                  <td className="suave">{formatarDataHora(o.criado_em)}</td>
                  <td><span className={`badge ${o.status}`}>{STATUS_ORCAMENTO[o.status]}</span></td>
                  <td data-rotulo="Total">{formatarReais(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {novo && <OrcamentoForm onFechar={() => setNovo(false)} onSalvo={(o) => navigate(`/orcamentos/${o.id}`)} />}
    </>
  );
}
