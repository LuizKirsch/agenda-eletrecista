import { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

// RF 6.9 / RN 8: muda só data e horário desta atividade
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
      subtitulo={`${atividade.tipo.nome} · OS ${atividade.os_id}`}
      variante="dialogo"
      onFechar={onFechar}
      rodape={(fechar) => (
        <>
          <button type="button" onClick={fechar}>Cancelar</button>
          <button className="primario" form="form-remarcar" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar'}</button>
        </>
      )}
    >
      <form id="form-remarcar" className="campos" onSubmit={salvar}>
        <label className="c2">Data<input name="data" type="date" defaultValue={atividade.data} required /></label>
        <label className="c2 meia">Início<input name="inicio" type="time" defaultValue={atividade.hora_inicio} required /></label>
        <label className="c2 meia">Fim<input name="fim" type="time" defaultValue={atividade.hora_fim} required /></label>
        <p className="suave" style={{ fontSize: 13 }}>Só esta atividade muda. Cliente, endereço e as demais atividades da OS continuam iguais. Para trocar o tipo, use "Editar OS".</p>
        {erro && <p className="erro" role="alert">{erro}</p>}
      </form>
    </Modal>
  );
}
