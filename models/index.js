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
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'tipo_atividade', timestamps: false, underscored: true });

Cliente.hasMany(Endereco, { foreignKey: 'cliente_id', as: 'enderecos' });
Endereco.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Endereco.hasMany(EnderecoObservacao, { foreignKey: 'endereco_id', as: 'observacoes' });
EnderecoObservacao.belongsTo(Endereco, { foreignKey: 'endereco_id', as: 'endereco' });

module.exports = { sequelize, Usuario, Cliente, Endereco, EnderecoObservacao, TipoAtividade };
