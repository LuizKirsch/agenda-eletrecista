import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api';
import Modal, { Confirmar } from '../agenda/Modal';
import { formatarDataHora } from '../formato';
import {
  IconeDireita, IconeEditar, IconeInfo, IconeLixo, IconeMais, iniciais,
} from '../icones';
import { FormEndereco } from './Cliente';

// RF 3.13 / LGPD L4: aviso no campo de observação
const AVISO_LGPD = 'Anote só informações técnicas do imóvel (quadro, acesso, fiação). Não registre dados de saúde, idade ou outros dados pessoais dos moradores.';

export default function Endereco() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [endereco, setEndereco] = useState(null);
  const [observacoes, setObservacoes] = useState([]);
  const [erroCarregar, setErroCarregar] = useState('');
  // { tela: 'observacao', observacao? } | { tela: 'excluirObservacao', observacao } | { tela: 'editar' } | { tela: 'excluir' }
  const [modal, setModal] = useState(null);
  const fecharModal = () => setModal(null);

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
          <div className="cartao-cab">
            <h2>Dados do endereço</h2>
            <span className="acoes-icone">
              <button type="button" className="icone-botao discreto" aria-label="Editar endereço" onClick={() => setModal({ tela: 'editar' })}><IconeEditar /></button>
              <button type="button" className="icone-botao discreto perigo" aria-label="Excluir endereço" onClick={() => setModal({ tela: 'excluir' })}><IconeLixo /></button>
            </span>
          </div>
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
            <button type="button" className="primario" onClick={() => setModal({ tela: 'observacao' })}><IconeMais />Nova observação</button>
          </div>
          {observacoes.length === 0 && <p className="vazio">Nenhuma observação registrada.</p>}
          <ul className="observacoes">
            {observacoes.map((o) => (
              <li key={o.id}>
                <div>
                  <p>{o.texto}</p>
                  <time dateTime={o.criado_em}>{formatarDataHora(o.criado_em)}</time>
                </div>
                <span className="acoes-icone">
                  <button type="button" className="icone-botao discreto" aria-label="Editar observação" onClick={() => setModal({ tela: 'observacao', observacao: o })}><IconeEditar /></button>
                  <button type="button" className="icone-botao discreto perigo" aria-label="Excluir observação" onClick={() => setModal({ tela: 'excluirObservacao', observacao: o })}><IconeLixo /></button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {modal?.tela === 'observacao' && (
        <FormObservacao
          enderecoId={id}
          observacao={modal.observacao}
          subtitulo={`${titulo} · ${cliente.nome}`}
          onFechar={fecharModal}
          onSalvo={(obs) => {
            setObservacoes((lista) => (modal.observacao ? lista.map((x) => (x.id === obs.id ? obs : x)) : [obs, ...lista]));
            fecharModal();
          }}
        />
      )}
      {modal?.tela === 'excluirObservacao' && (
        <Confirmar
          titulo="Excluir observação"
          subtitulo={`${titulo} · ${formatarDataHora(modal.observacao.criado_em)}`}
          rotulo="Excluir observação"
          rotuloEnviando="Excluindo…"
          onFechar={fecharModal}
          onConfirmar={async () => {
            await api(`/enderecos/${id}/observacoes/${modal.observacao.id}`, { method: 'DELETE' });
            setObservacoes((lista) => lista.filter((x) => x.id !== modal.observacao.id));
            fecharModal();
          }}
        >
          A observação será excluída. Essa ação não pode ser desfeita.
        </Confirmar>
      )}
      {modal?.tela === 'editar' && (
        <FormEndereco
          endereco={endereco}
          clienteNome={cliente.nome}
          onFechar={fecharModal}
          onSalvo={(salvo) => { setEndereco(salvo); fecharModal(); }}
        />
      )}
      {/* RF 3.11 / RN 42: a API recusa se houver OS ou orçamento */}
      {modal?.tela === 'excluir' && (
        <Confirmar
          titulo="Excluir endereço"
          subtitulo={`${titulo} · ${cliente.nome}`}
          rotulo="Excluir endereço"
          rotuloEnviando="Excluindo…"
          onFechar={fecharModal}
          onConfirmar={async () => {
            await api(`/enderecos/${id}`, { method: 'DELETE' });
            navigate(`/clientes/${cliente.id}`);
          }}
        >
          {observacoes.length ? `O endereço e ${observacoes.length === 1 ? 'a observação dele' : `as ${observacoes.length} observações dele`} serão excluídos.` : 'O endereço será excluído.'}
          {' '}Os orçamentos deste endereço também serão excluídos. Endereços com OS não podem ser excluídos. Essa ação não pode ser desfeita.
        </Confirmar>
      )}
    </>
  );
}

// com `observacao`: edita o texto e mantém a data de registro (RF 3.10)
function FormObservacao({ enderecoId, observacao, subtitulo, onFechar, onSalvo }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const body = { texto: e.currentTarget.elements.texto.value };
      onSalvo(await (observacao
        ? api(`/enderecos/${enderecoId}/observacoes/${observacao.id}`, { method: 'PUT', body })
        : api(`/enderecos/${enderecoId}/observacoes`, { method: 'POST', body })));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={observacao ? 'Editar observação' : 'Nova observação'}
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
        <label>Observação<textarea name="texto" rows={5} defaultValue={observacao?.texto} required autoFocus placeholder="Ex.: Quadro de luz na garagem, acesso pelo portão lateral." /></label>
        <p className="alerta"><IconeInfo tamanho={16} /><span>{AVISO_LGPD}</span></p>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
