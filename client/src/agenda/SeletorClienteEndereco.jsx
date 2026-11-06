import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatarEndereco, formatarTelefone } from '../formato';

// RF 6.2 / RF 4.17: busca cliente por parte do nome ou telefone (GET /clientes?busca=) e cadastra
// cliente e endereço sem sair do formulário. Fica dentro de um <form>, então não usa <form> aninhado.
const CAMPOS_ENDERECO = [
  ['logradouro', 'Logradouro', 'c4'], ['numero', 'Número', 'c2'], ['bairro', 'Bairro', 'c3'],
  ['cidade', 'Cidade', 'c3'], ['identificacao', 'Identificação (ex.: Casa)', ''],
];

// Enter dentro dos campos de cadastro roda a ação em vez de enviar o formulário pai
const aoEnter = (acao) => (e) => {
  if (e.key === 'Enter') { e.preventDefault(); acao(); }
};

export default function SeletorClienteEndereco({ clienteId, enderecoId, onCliente, onEndereco, bloqueado, enderecoOpcional }) {
  const [cliente, setCliente] = useState(null); // detalhe: { id, nome, telefone, enderecos }
  const [busca, setBusca] = useState('');
  const [achados, setAchados] = useState(null);
  const [novo, setNovo] = useState(null); // cadastro rápido de cliente
  const [novoEnd, setNovoEnd] = useState(null); // cadastro rápido de endereço
  const [erro, setErro] = useState('');

  useEffect(() => {
    setCliente(null);
    if (!clienteId) return undefined;
    let cancelado = false;
    api(`/clientes/${clienteId}`).then((c) => { if (!cancelado) setCliente(c); }).catch((err) => setErro(err.message));
    return () => { cancelado = true; };
  }, [clienteId]);

  useEffect(() => {
    if (!busca.trim()) { setAchados(null); return undefined; }
    let cancelado = false;
    const t = setTimeout(() => {
      api(`/clientes?busca=${encodeURIComponent(busca.trim())}`).then((l) => { if (!cancelado) setAchados(l); }).catch((err) => setErro(err.message));
    }, 250);
    return () => { cancelado = true; clearTimeout(t); };
  }, [busca]);

  function escolher(id) {
    setBusca(''); setAchados(null); setNovo(null); setErro('');
    onCliente(String(id));
    onEndereco('');
  }

  async function cadastrarCliente() {
    setErro('');
    try {
      escolher((await api('/clientes', { method: 'POST', body: novo })).id);
    } catch (err) { setErro(err.message); }
  }

  async function cadastrarEndereco() {
    setErro('');
    try {
      const en = await api(`/clientes/${clienteId}/enderecos`, { method: 'POST', body: novoEnd });
      setCliente({ ...cliente, enderecos: [...cliente.enderecos, en] });
      setNovoEnd(null);
      onEndereco(String(en.id));
    } catch (err) { setErro(err.message); }
  }

  return (
    <>
      <div>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--texto-2)' }}>Cliente</span>
        {clienteId ? (
          <p style={{ margin: '6px 0 0' }}>
            <strong>{cliente ? `${cliente.nome} · ${formatarTelefone(cliente.telefone)}` : 'Carregando…'}</strong>{' '}
            {!bloqueado && <button type="button" onClick={() => { onCliente(''); onEndereco(''); }}>Trocar</button>}
          </p>
        ) : (
          <>
            <input
              type="search" value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              placeholder="Buscar por nome ou telefone" aria-label="Buscar cliente" autoComplete="off"
            />
            {achados && (
              <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: 4 }}>
                {achados.map((c) => (
                  <li key={c.id}><button type="button" style={{ width: '100%', textAlign: 'left' }} onClick={() => escolher(c.id)}>{c.nome} · {formatarTelefone(c.telefone)}</button></li>
                ))}
                {!achados.length && <li className="suave">Nenhum cliente encontrado.</li>}
              </ul>
            )}
            {!novo && <button type="button" className="tracejado" style={{ marginTop: 6 }} onClick={() => setNovo({ nome: '', telefone: '' })}>Cadastrar novo cliente</button>}
            {novo && (
              <div className="campos" style={{ marginTop: 8 }}>
                <label className="c4">Nome<input value={novo.nome} maxLength={120} onKeyDown={aoEnter(cadastrarCliente)} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
                <label className="c2">Telefone<input type="tel" value={novo.telefone} maxLength={20} onKeyDown={aoEnter(cadastrarCliente)} onChange={(e) => setNovo({ ...novo, telefone: formatarTelefone(e.target.value) })} /></label>
                <div>
                  <button type="button" onClick={() => setNovo(null)}>Cancelar</button>{' '}
                  <button type="button" className="primario" onClick={cadastrarCliente}>Cadastrar cliente</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {clienteId && (
        <div className="campos">
          <label>
            <span>Endereço{enderecoOpcional && <span className="opcional"> (opcional)</span>}</span>
            <select value={enderecoId} onChange={(e) => onEndereco(e.target.value)} disabled={!cliente} required={!enderecoOpcional}>
              <option value="" disabled={!enderecoOpcional}>{cliente && !cliente.enderecos.length ? 'Cliente sem endereço cadastrado' : 'Selecione'}</option>
              {cliente?.enderecos.map((en) => (
                <option key={en.id} value={en.id}>{en.identificacao ? `${en.identificacao} · ` : ''}{formatarEndereco(en)}</option>
              ))}
            </select>
          </label>
          {!novoEnd && cliente && <button type="button" className="tracejado" onClick={() => setNovoEnd({})}>Cadastrar novo endereço</button>}
          {novoEnd && (
            <div className="campos">
              {CAMPOS_ENDERECO.map(([k, rotulo, cls]) => (
                <label key={k} className={cls}>{rotulo}<input value={novoEnd[k] ?? ''} onKeyDown={aoEnter(cadastrarEndereco)} onChange={(e) => setNovoEnd({ ...novoEnd, [k]: e.target.value })} /></label>
              ))}
              <div>
                <button type="button" onClick={() => setNovoEnd(null)}>Cancelar</button>{' '}
                <button type="button" className="primario" onClick={cadastrarEndereco}>Cadastrar endereço</button>
              </div>
            </div>
          )}
        </div>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </>
  );
}
