module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ordem_servico', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      cliente_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'cliente', key: 'id' } },
      endereco_id: { type: Sequelize.BIGINT.UNSIGNED, references: { model: 'endereco', key: 'id' } },
      observacao: { type: Sequelize.TEXT },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ordem_servico');
  },
};
