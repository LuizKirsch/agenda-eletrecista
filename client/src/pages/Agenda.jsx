import { useOutletContext } from 'react-router';

export default function Agenda() {
  const { abrirTipos } = useOutletContext();
  return (
    <div className="cabecalho">
      <h1>Agenda</h1>
      <button type="button" onClick={abrirTipos}>Tipos de atividade</button>
    </div>
  );
}
