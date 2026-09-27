module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('atividade_os', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      ordem_servico_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'ordem_servico', key: 'id' } },
      tipo_atividade_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: { model: 'tipo_atividade', key: 'id' },
        onDelete: 'RESTRICT',
      },
      sequencia: { type: Sequelize.INTEGER, allowNull: false },
      data: { type: Sequelize.DATEONLY, allowNull: false },
      hora_inicio: { type: Sequelize.TIME, allowNull: false },
      hora_fim: { type: Sequelize.TIME, allowNull: false },
      status: { type: Sequelize.ENUM('agendada', 'concluida', 'cancelada'), defaultValue: 'agendada' },
    });
    await queryInterface.addConstraint('atividade_os', {
      type: 'check',
      name: 'chk_atividade_os_horario',
      fields: ['hora_fim'],
      where: { hora_fim: { [Sequelize.Op.gt]: Sequelize.col('hora_inicio') } },
    });
    await queryInterface.addIndex('atividade_os', ['data'], { name: 'idx_atividade_os_data' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('atividade_os');
  },
};
