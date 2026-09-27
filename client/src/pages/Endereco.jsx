import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../api';
import { formatarDataHora, formatarEndereco } from '../formato';

export default function Endereco() {
  const { id } = useParams();
  const [endereco, setEndereco] = useState(null);
  const [observacoes, setObservacoes] = useState([]);
  const [erroCarregar, setErroCarregar] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([api(`/enderecos/${id}`), api(`/enderecos/${id}/observacoes`)])
      .then(([e, obs]) => {
        setEndereco(e);
        setObservacoes(obs);
      })
      .catch((err) => setErroCarregar(err.message));
  }, [id]);

  async function salvarObservacao(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setErro('');
    setEnviando(true);
    try {
      const obs = await api(`/enderecos/${id}/observacoes`, { method: 'POST', body: { texto: form.elements.texto.value } });
      setObservacoes((lista) => [obs, ...lista]);
      form.reset();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (erroCarregar) return <p className="erro" role="alert">{erroCarregar}</p>;
  if (!endereco) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>{endereco.identificacao || endereco.logradouro}</h1>
      <p>{formatarEndereco(endereco)}</p>
      {endereco.ponto_referencia && <p>Referência: {endereco.ponto_referencia}</p>}
      <p>Cliente: {endereco.cliente.nome} · {endereco.cliente.telefone}</p>

      <h2>Registrar observação</h2>
      <form className="cartao" onSubmit={salvarObservacao}>
        <label>Observação *<textarea name="texto" rows={3} required /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar observação'}</button>
      </form>

      <h2>Observações</h2>
      {observacoes.length === 0 && <p className="vazio">Nenhuma observação registrada.</p>}
      <ul className="lista">
        {observacoes.map((o) => (
          <li key={o.id}>
            <span>{formatarDataHora(o.criado_em)}</span>
            <p className="texto">{o.texto}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
