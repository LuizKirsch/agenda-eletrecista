import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import Modal from '../agenda/Modal';
import { formatarTelefone } from '../formato';

// sem `cliente`: cadastra e abre a ficha, ou devolve em onSalvo quando ele vem (cadastro rápido no orçamento/OS)
// com `cliente`: edita e devolve em onSalvo (RF 3.9)
export default function FormCliente({ cliente, onFechar, onSalvo }) {
  const navigate = useNavigate();
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget));
      if (cliente) {
        onSalvo(await api(`/clientes/${cliente.id}`, { method: 'PUT', body }));
      } else {
        const novo = await api('/clientes', { method: 'POST', body });
        if (onSalvo) onSalvo(novo);
        else navigate(`/clientes/${novo.id}`);
      }
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo={cliente ? 'Editar cliente' : 'Novo cliente'}
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
        <label className="c4">Nome<input name="nome" maxLength={120} defaultValue={cliente?.nome} required autoFocus /></label>
        <label className="c2">Telefone<input name="telefone" type="tel" inputMode="tel" maxLength={15} placeholder="(11) 91234-5678" defaultValue={formatarTelefone(cliente?.telefone)} onChange={(e) => { e.target.value = formatarTelefone(e.target.value); }} required /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
