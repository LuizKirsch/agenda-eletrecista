// RF 4.20: histórico de versões do orçamento. Cada edição guarda o estado anterior como snapshot JSON.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('orcamento_versao', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      orcamento_id: {
        type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orcamento', key: 'id' }, onDelete: 'CASCADE',
      },
      numero: { type: Sequelize.INTEGER, allowNull: false },
      usuario_id: {
        type: Sequelize.BIGINT.UNSIGNED, references: { model: 'usuario', key: 'id' }, onDelete: 'SET NULL',
      },
      snapshot: { type: Sequelize.TEXT, allowNull: false },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('orcamento_versao', ['orcamento_id', 'numero'], { unique: true, name: 'uq_orcamento_versao_numero' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('orcamento_versao');
  },
};
