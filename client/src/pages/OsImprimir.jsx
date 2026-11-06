import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { NOME_STATUS, statusDaOs } from '../agenda/DetalheAtividade';
import { dataBr } from '../datas';
import { formatarEndereco, formatarTelefone } from '../formato';
import { IconeImprimir } from '../icones';

// RF 6.23: documento da OS para imprimir ou salvar como PDF, em qualquer status
export default function OsImprimir() {
  const { id } = useParams();
  const [os, setOs] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api(`/os/${id}`).then(setOs).catch((err) => setErro(err.message));
  }, [id]);

  if (erro) return <p className="erro" role="alert">{erro}</p>;
  if (!os) return <p className="carregando">Carregando…</p>;

  const status = statusDaOs(os.atividades);
  return (
    <>
      <div className="cabecalho">
        <div>
          <h1>Ordem de Serviço nº {os.id} <span className={`pilula ${status}`}>{NOME_STATUS[status]}</span></h1>
        </div>
        <div className="acoes-cab nao-imprime">
          <Link to="/agenda"><button type="button">Voltar</button></Link>
          <button type="button" onClick={() => window.print()}><IconeImprimir />Exportar PDF</button>
        </div>
      </div>

      <section className="os-cliente" style={{ marginBottom: 20 }}>
        <p><strong>Cliente:</strong> {os.cliente.nome}</p>
        <p><strong>Telefone:</strong> {formatarTelefone(os.cliente.telefone)}</p>
        {os.endereco && <p><strong>Endereço:</strong> {os.endereco.identificacao ? `${os.endereco.identificacao} · ` : ''}{formatarEndereco(os.endereco)}</p>}
        {os.eletricista && <p><strong>Eletricista responsável:</strong> {os.eletricista.nome}</p>}
        {os.observacao && <p><strong>Observação:</strong> {os.observacao}</p>}
      </section>

      <h3>Atividades</h3>
      <div className="tabela">
        <table>
          <thead>
            <tr><th>Atividade</th><th>Eletricista</th><th>Data</th><th>Início</th><th>Fim</th><th>Status</th></tr>
          </thead>
          <tbody>
            {os.atividades.map((x) => (
              <tr key={x.id}>
                <td>{x.tipo?.nome ?? x.descricao}</td>
                <td>{x.eletricista?.nome ?? '—'}</td>
                <td>{dataBr(x.data)}</td>
                <td>{x.hora_inicio}</td>
                <td>{x.hora_fim}</td>
                <td>{NOME_STATUS[x.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
