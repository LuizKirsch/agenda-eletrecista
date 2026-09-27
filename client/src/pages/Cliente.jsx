import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api } from '../api';
import { formatarEndereco } from '../formato';

const CAMPOS_ENDERECO = [
  { nome: 'identificacao', rotulo: 'Identificação (ex.: casa, escritório)', max: 60 },
  { nome: 'logradouro', rotulo: 'Logradouro', max: 150, obrigatorio: true },
  { nome: 'numero', rotulo: 'Número', max: 10 },
  { nome: 'complemento', rotulo: 'Complemento', max: 60 },
  { nome: 'bairro', rotulo: 'Bairro', max: 80 },
  { nome: 'cidade', rotulo: 'Cidade', max: 80, obrigatorio: true },
  { nome: 'ponto_referencia', rotulo: 'Ponto de referência', max: 150 },
];

export default function Cliente() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [erroCarregar, setErroCarregar] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api(`/clientes/${id}`).then(setCliente).catch((err) => setErroCarregar(err.message));
  }, [id]);

  async function salvarEndereco(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setErro('');
    setEnviando(true);
    try {
      const endereco = await api(`/clientes/${id}/enderecos`, { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      setCliente((c) => ({ ...c, enderecos: [...c.enderecos, endereco] }));
      form.reset();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (erroCarregar) return <p className="erro" role="alert">{erroCarregar}</p>;
  if (!cliente) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>{cliente.nome}</h1>
      <p>Telefone: {cliente.telefone}</p>

      <h2>Endereços</h2>
      {cliente.enderecos.length === 0 && <p className="vazio">Nenhum endereço cadastrado.</p>}
      <ul className="lista">
        {cliente.enderecos.map((e) => (
          <li key={e.id} className="link">
            <Link to={`/enderecos/${e.id}`}>
              <strong>{e.identificacao || e.logradouro}</strong>
              <span>{formatarEndereco(e)}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h2>Adicionar endereço</h2>
      <form className="cartao" onSubmit={salvarEndereco}>
        {CAMPOS_ENDERECO.map((c) => (
          <label key={c.nome}>
            {c.rotulo}{c.obrigatorio && ' *'}
            <input name={c.nome} maxLength={c.max} required={c.obrigatorio} />
          </label>
        ))}
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar endereço'}</button>
      </form>
    </>
  );
}
