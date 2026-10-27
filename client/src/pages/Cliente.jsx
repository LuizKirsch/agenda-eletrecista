import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import Modal from '../agenda/Modal';
import { IconeCasa, IconeDireita, IconeMais, iniciais } from '../icones';

// Linhas do grid de 6 colunas: Logradouro largo + Número estreito, etc.
const CAMPOS_ENDERECO = [
  { nome: 'identificacao', rotulo: 'Identificação', max: 60, placeholder: 'Ex.: Casa, Escritório, Loja', classe: '' },
  { nome: 'logradouro', rotulo: 'Logradouro', max: 150, obrigatorio: true, placeholder: 'Rua, avenida', classe: 'c4' },
  { nome: 'numero', rotulo: 'Número', max: 10, classe: 'c2' },
  { nome: 'complemento', rotulo: 'Complemento', max: 60, placeholder: 'Apto, sala', classe: 'c2' },
  { nome: 'bairro', rotulo: 'Bairro', max: 80, classe: 'c2' },
  { nome: 'cidade', rotulo: 'Cidade', max: 80, obrigatorio: true, classe: 'c2' },
  { nome: 'ponto_referencia', rotulo: 'Ponto de referência', max: 150, placeholder: 'Como chegar ao local', classe: '' },
];

const linhaEndereco = (e) => [[e.logradouro, e.numero].filter(Boolean).join(', '), e.complemento, e.bairro].filter(Boolean).join(' · ');

export default function Cliente() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [erroCarregar, setErroCarregar] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    api(`/clientes/${id}`).then(setCliente).catch((err) => setErroCarregar(err.message));
  }, [id]);

  if (erroCarregar) return <p className="erro" role="alert">{erroCarregar}</p>;
  if (!cliente) return <p className="carregando">Carregando…</p>;

  const total = cliente.enderecos.length;

  return (
    <>
      <nav className="migalhas" aria-label="Caminho">
        <Link to="/clientes">Clientes</Link><IconeDireita tamanho={14} /><span aria-current="page">{cliente.nome}</span>
      </nav>

      <div className="perfil-cab">
        <span className="avatar grande">{iniciais(cliente.nome)}</span>
        <div>
          <h1>{cliente.nome}</h1>
          <div className="meta">
            <span>{cliente.telefone}</span>
            <span aria-hidden="true">·</span>
            <span>{total === 1 ? '1 endereço' : `${total} endereços`}</span>
          </div>
        </div>
      </div>

      <div className="secao-cab">
        <h2>Endereços</h2>
        <button type="button" className="primario" onClick={() => setAdicionando(true)}><IconeMais />Adicionar endereço</button>
      </div>

      {total === 0 && <p className="vazio">Nenhum endereço cadastrado.</p>}
      <div className="grade-cartoes">
        {cliente.enderecos.map((e) => (
          <Link key={e.id} to={`/enderecos/${e.id}`} className="cartao-link">
            <div className="topo">
              <span className="icone-caixa"><IconeCasa /></span>
              <div>
                <strong>{e.identificacao || e.logradouro}</strong>
                <span className="suave">{linhaEndereco(e)}<br />{e.cidade}</span>
              </div>
            </div>
            <div className="rodape">
              <span>Ver endereço e observações</span>
              <IconeDireita />
            </div>
          </Link>
        ))}
      </div>

      {adicionando && (
        <FormEndereco
          clienteId={id}
          clienteNome={cliente.nome}
          onFechar={() => setAdicionando(false)}
          onSalvo={(endereco) => {
            setCliente((c) => ({ ...c, enderecos: [...c.enderecos, endereco] }));
            setAdicionando(false);
          }}
        />
      )}
    </>
  );
}

function FormEndereco({ clienteId, clienteNome, onFechar, onSalvo }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      onSalvo(await api(`/clientes/${clienteId}/enderecos`, { method: 'POST', body: Object.fromEntries(new FormData(e.currentTarget)) }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Adicionar endereço"
      subtitulo={`Cliente: ${clienteNome}`}
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-endereco" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar endereço'}</button>
        </>
      )}
    >
      <form id="form-endereco" className="campos" onSubmit={salvar}>
        {CAMPOS_ENDERECO.map((c) => (
          <label key={c.nome} className={c.classe || undefined}>
            <span>{c.rotulo}{!c.obrigatorio && <span className="opcional"> (opcional)</span>}</span>
            <input name={c.nome} maxLength={c.max} required={c.obrigatorio} placeholder={c.placeholder} />
          </label>
        ))}
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
