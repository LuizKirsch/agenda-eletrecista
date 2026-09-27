module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('endereco_observacao', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      endereco_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'endereco', key: 'id' } },
      texto: { type: Sequelize.TEXT, allowNull: false },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('endereco_observacao');
  },
};
