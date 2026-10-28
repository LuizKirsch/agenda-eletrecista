const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(config.database, config.username, config.password, config);

const Usuario = sequelize.define('Usuario', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(100), allowNull: false },
  login: { type: DataTypes.STRING(60), allowNull: false, unique: true },
  senha_hash: { type: DataTypes.STRING(255), allowNull: false },
  perfil: { type: DataTypes.ENUM('eletricista', 'secretaria'), allowNull: false },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'usuario', timestamps: false, underscored: true });

// criado_em vem do DEFAULT do banco; sem allowNull/default aqui o Sequelize omite a coluna no INSERT
const Cliente = sequelize.define('Cliente', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(120), allowNull: false },
  telefone: { type: DataTypes.STRING(20), allowNull: false },
  criado_em: { type: DataTypes.DATE },
}, { tableName: 'cliente', timestamps: false, underscored: true });

const Endereco = sequelize.define('Endereco', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  cliente_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  identificacao: { type: DataTypes.STRING(60) },
  logradouro: { type: DataTypes.STRING(150), allowNull: false },
  numero: { type: DataTypes.STRING(10) },
  complemento: { type: DataTypes.STRING(60) },
  bairro: { type: DataTypes.STRING(80) },
  cidade: { type: DataTypes.STRING(80), allowNull: false },
  ponto_referencia: { type: DataTypes.STRING(150) },
}, { tableName: 'endereco', timestamps: false, underscored: true });

const EnderecoObservacao = sequelize.define('EnderecoObservacao', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  endereco_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  texto: { type: DataTypes.TEXT, allowNull: false },
  criado_em: { type: DataTypes.DATE },
}, { tableName: 'endereco_observacao', timestamps: false, underscored: true });

const TipoAtividade = sequelize.define('TipoAtividade', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  nome: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  duracao_padrao_min: { type: DataTypes.INTEGER, allowNull: false },
  valor_padrao: { type: DataTypes.DECIMAL(10, 2) },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'tipo_atividade', timestamps: false, underscored: true });

const OrdemServico = sequelize.define('OrdemServico', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  cliente_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  endereco_id: { type: DataTypes.BIGINT.UNSIGNED },
  observacao: { type: DataTypes.TEXT },
}, { tableName: 'ordem_servico', timestamps: false, underscored: true });

// data (DATEONLY) e horas (TIME) trafegam como texto; nunca viram Date
const AtividadeOs = sequelize.define('AtividadeOs', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  ordem_servico_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  tipo_atividade_id: { type: DataTypes.BIGINT.UNSIGNED },
  descricao: { type: DataTypes.STRING(100) },
  sequencia: { type: DataTypes.INTEGER, allowNull: false },
  data: { type: DataTypes.DATEONLY, allowNull: false },
  hora_inicio: { type: DataTypes.TIME, allowNull: false },
  hora_fim: { type: DataTypes.TIME, allowNull: false },
  status: { type: DataTypes.ENUM('agendada', 'concluida', 'cancelada'), defaultValue: 'agendada' },
}, { tableName: 'atividade_os', timestamps: false, underscored: true });

const Orcamento = sequelize.define('Orcamento', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  cliente_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  endereco_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  ordem_servico_id: { type: DataTypes.BIGINT.UNSIGNED },
  status: { type: DataTypes.ENUM('pendente', 'aceito', 'recusado'), allowNull: false, defaultValue: 'pendente' },
  observacao: { type: DataTypes.TEXT },
  criado_em: { type: DataTypes.DATE },
}, { tableName: 'orcamento', timestamps: false, underscored: true });

const OrcamentoItem = sequelize.define('OrcamentoItem', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  orcamento_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  tipo_atividade_id: { type: DataTypes.BIGINT.UNSIGNED },
  descricao: { type: DataTypes.STRING(100), allowNull: false },
  quantidade: { type: DataTypes.INTEGER, allowNull: false },
  valor_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  duracao_min: { type: DataTypes.INTEGER, allowNull: false },
  sequencia: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'orcamento_item', timestamps: false, underscored: true });

Cliente.hasMany(Endereco, { foreignKey: 'cliente_id', as: 'enderecos' });
Endereco.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Endereco.hasMany(EnderecoObservacao, { foreignKey: 'endereco_id', as: 'observacoes' });
EnderecoObservacao.belongsTo(Endereco, { foreignKey: 'endereco_id', as: 'endereco' });

OrdemServico.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
OrdemServico.belongsTo(Endereco, { foreignKey: 'endereco_id', as: 'endereco' });
OrdemServico.hasMany(AtividadeOs, { foreignKey: 'ordem_servico_id', as: 'atividades' });
AtividadeOs.belongsTo(OrdemServico, { foreignKey: 'ordem_servico_id', as: 'os' });
AtividadeOs.belongsTo(TipoAtividade, { foreignKey: 'tipo_atividade_id', as: 'tipo' });

Orcamento.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Orcamento.belongsTo(Endereco, { foreignKey: 'endereco_id', as: 'endereco' });
Orcamento.hasMany(OrcamentoItem, { foreignKey: 'orcamento_id', as: 'itens' });
OrcamentoItem.belongsTo(TipoAtividade, { foreignKey: 'tipo_atividade_id', as: 'tipo' });

module.exports = {
  sequelize, Usuario, Cliente, Endereco, EnderecoObservacao, TipoAtividade, OrdemServico, AtividadeOs, Orcamento, OrcamentoItem,
};
