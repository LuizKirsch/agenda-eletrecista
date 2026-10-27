import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import Modal from '../agenda/Modal';
import { formatarDataHora } from '../formato';
import { IconeDireita, IconeInfo, IconeMais, iniciais } from '../icones';

// RF 3.16 / LGPD L4: aviso no campo de observação
const AVISO_LGPD = 'Anote só informações técnicas do imóvel (quadro, acesso, fiação). Não registre dados de saúde, idade ou outros dados pessoais dos moradores.';

export default function Endereco() {
  const { id } = useParams();
  const [endereco, setEndereco] = useState(null);
  const [observacoes, setObservacoes] = useState([]);
  const [erroCarregar, setErroCarregar] = useState('');
  const [registrando, setRegistrando] = useState(false);

  useEffect(() => {
    Promise.all([api(`/enderecos/${id}`), api(`/enderecos/${id}/observacoes`)])
      .then(([e, obs]) => {
        setEndereco(e);
        setObservacoes(obs);
      })
      .catch((err) => setErroCarregar(err.message));
  }, [id]);

  if (erroCarregar) return <p className="erro" role="alert">{erroCarregar}</p>;
  if (!endereco) return <p className="carregando">Carregando…</p>;

  const titulo = endereco.identificacao || endereco.logradouro;
  const { cliente } = endereco;
  const linha = [[endereco.logradouro, endereco.numero].filter(Boolean).join(', '), endereco.bairro, endereco.cidade].filter(Boolean).join(' · ');

  return (
    <>
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/clientes">Clientes</Link><IconeDireita tamanho={14} />
        {cliente.id ? <Link to={`/clientes/${cliente.id}`}>{cliente.nome}</Link> : <span>{cliente.nome}</span>}
        <IconeDireita tamanho={14} /><span aria-current="page">{titulo}</span>
      </nav>

      <div className="cabecalho">
        <div>
          <h1>{titulo}</h1>
          <p className="suave">{linha}</p>
        </div>
      </div>

      <div className="colunas">
        <section className="cartao lado" aria-label="Dados do endereço">
          <dl className="dados">
            <div className="inteiro"><dt>Logradouro</dt><dd>{[endereco.logradouro, endereco.numero].filter(Boolean).join(', ')}</dd></div>
            {endereco.complemento && <div className="inteiro"><dt>Complemento</dt><dd>{endereco.complemento}</dd></div>}
            <div><dt>Bairro</dt><dd>{endereco.bairro || '—'}</dd></div>
            <div><dt>Cidade</dt><dd>{endereco.cidade}</dd></div>
            <div className="inteiro"><dt>Ponto de referência</dt><dd className={endereco.ponto_referencia ? undefined : 'suave'}>{endereco.ponto_referencia || 'Não informado'}</dd></div>
          </dl>
          <div className="os-cliente" style={{ paddingTop: 16, borderTop: '1px solid var(--linha)' }}>
            <div className="quem">
              <span className="avatar">{iniciais(cliente.nome)}</span>
              <div>
                {cliente.id ? <Link to={`/clientes/${cliente.id}`} style={{ fontWeight: 600, textDecoration: 'none' }}>{cliente.nome}</Link> : <strong>{cliente.nome}</strong>}
                <span className="suave" style={{ fontSize: 13 }}>{cliente.telefone}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="principal">
          <div className="secao-cab" style={{ marginTop: 0 }}>
            <h2>Observações <span className="contador">· {observacoes.length}</span></h2>
            <button type="button" className="primario" onClick={() => setRegistrando(true)}><IconeMais />Nova observação</button>
          </div>
          {observacoes.length === 0 && <p className="vazio">Nenhuma observação registrada.</p>}
          <ul className="observacoes">
            {observacoes.map((o) => (
              <li key={o.id}>
                <p>{o.texto}</p>
                <time dateTime={o.criado_em}>{formatarDataHora(o.criado_em)}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {registrando && (
        <FormObservacao
          enderecoId={id}
          subtitulo={`${titulo} · ${cliente.nome}`}
          onFechar={() => setRegistrando(false)}
          onSalvo={(obs) => {
            setObservacoes((lista) => [obs, ...lista]);
            setRegistrando(false);
          }}
        />
      )}
    </>
  );
}

function FormObservacao({ enderecoId, subtitulo, onFechar, onSalvo }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      onSalvo(await api(`/enderecos/${enderecoId}/observacoes`, { method: 'POST', body: { texto: e.currentTarget.elements.texto.value } }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Nova observação"
      subtitulo={subtitulo}
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-observacao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar observação'}</button>
        </>
      )}
    >
      <form id="form-observacao" className="campos" onSubmit={salvar}>
        <label>Observação<textarea name="texto" rows={5} required autoFocus placeholder="Ex.: Quadro de luz na garagem, acesso pelo portão lateral." /></label>
        <p className="alerta"><IconeInfo tamanho={16} /><span>{AVISO_LGPD}</span></p>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
