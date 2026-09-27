import { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

export default function RemarcarAtividade({ atividade, onFechar, onSalvo }) {
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    const { data, inicio, fim } = e.currentTarget.elements;
    setErro('');
    setEnviando(true);
    try {
      onSalvo(await api(`/atividades-os/${atividade.id}/horario`, {
        method: 'PATCH',
        body: { data: data.value, hora_inicio: inicio.value, hora_fim: fim.value },
      }));
    } catch (err) {
      setErro(err.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      titulo="Remarcar atividade"
      subtitulo={`${atividade.tipo.nome} — OS ${atividade.os_id}. Muda só esta atividade; cliente, endereço e as demais atividades da OS não são afetados.`}
      onFechar={onFechar}
    >
      <form className="cartao" onSubmit={salvar}>
        <label>Data *<input name="data" type="date" defaultValue={atividade.data} required /></label>
        <div className="lado-a-lado">
          <label>Início *<input name="inicio" type="time" defaultValue={atividade.hora_inicio} required /></label>
          <label>Fim *<input name="fim" type="time" defaultValue={atividade.hora_fim} required /></label>
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <button className="primario" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar novo horário'}</button>
      </form>
    </Modal>
  );
}
