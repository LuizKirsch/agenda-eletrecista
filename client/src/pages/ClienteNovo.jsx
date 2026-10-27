import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import Modal from '../agenda/Modal';

export default function ClienteNovo({ onFechar }) {
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
    <Modal
      titulo="Novo cliente"
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-cliente" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar cliente'}</button>
        </>
      )}
    >
      <form id="form-cliente" className="campos" onSubmit={salvar}>
        <label className="c4">Nome<input name="nome" maxLength={120} required autoFocus /></label>
        <label className="c2">Telefone<input name="telefone" type="tel" maxLength={20} required /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
