module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cliente', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nome: { type: Sequelize.STRING(120), allowNull: false },
      telefone: { type: Sequelize.STRING(20), allowNull: false },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cliente');
  },
};
