import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';

export default function ClienteNovo() {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const cliente = await api('/clientes', { method: 'POST', body: Object.fromEntries(new FormData(e.currentTarget)) });
      navigate(`/clientes/${cliente.id}`);
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <>
      <h1>Novo cliente</h1>
      <form className="cartao" onSubmit={salvar}>
        <label>Nome *<input name="nome" maxLength={120} required /></label>
        <label>Telefone *<input name="telefone" type="tel" maxLength={20} required /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
      </form>
    </>
  );
}
