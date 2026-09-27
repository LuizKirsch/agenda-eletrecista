module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('endereco', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      cliente_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'cliente', key: 'id' } },
      identificacao: { type: Sequelize.STRING(60) },
      logradouro: { type: Sequelize.STRING(150), allowNull: false },
      numero: { type: Sequelize.STRING(10) },
      complemento: { type: Sequelize.STRING(60) },
      bairro: { type: Sequelize.STRING(80) },
      cidade: { type: Sequelize.STRING(80), allowNull: false },
      ponto_referencia: { type: Sequelize.STRING(150) },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('endereco');
  },
};
