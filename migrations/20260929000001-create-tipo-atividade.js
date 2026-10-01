module.exports = {
  async up(queryInterface, Sequelize) {
    // _as_ci: UNIQUE ignora maiúsculas/minúsculas, mas diferencia acentos (RF 5.4)
    // NOCASE do SQLite só ignora maiúsculas em ASCII ("É" ≠ "é")
    const nomeTipo = queryInterface.sequelize.getDialect() === 'sqlite'
      ? 'VARCHAR(100) COLLATE NOCASE'
      : 'VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci';
    await queryInterface.createTable('tipo_atividade', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nome: { type: nomeTipo, allowNull: false, unique: true },
      duracao_padrao_min: { type: Sequelize.INTEGER, allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });
    await queryInterface.addConstraint('tipo_atividade', {
      type: 'check',
      name: 'chk_tipo_atividade_duracao',
      fields: ['duracao_padrao_min'],
      where: { duracao_padrao_min: { [Sequelize.Op.between]: [5, 720] } },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tipo_atividade');
  },
};
