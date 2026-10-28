// Módulo Orçamento (Proposta - Modelo do Orçamento): valor padrão no tipo, atividade avulsa na OS,
// orcamento e orcamento_item.
module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    // no SQLite, alterar coluna/constraint recria a tabela; com FKs ligadas o DROP falha
    const sqlite = queryInterface.sequelize.getDialect() === 'sqlite';
    if (sqlite) await queryInterface.sequelize.query('PRAGMA foreign_keys = OFF');

    await queryInterface.addColumn('tipo_atividade', 'valor_padrao', { type: Sequelize.DECIMAL(10, 2) });
    await queryInterface.addConstraint('tipo_atividade', {
      type: 'check',
      name: 'chk_tipo_atividade_valor',
      fields: ['valor_padrao'],
      where: { [Op.or]: [{ valor_padrao: null }, { valor_padrao: { [Op.gte]: 0 } }] },
    });

    // Item avulso do orçamento vira atividade avulsa: sem tipo, com descrição (RF 6.3)
    await queryInterface.changeColumn('atividade_os', 'tipo_atividade_id', { type: Sequelize.BIGINT.UNSIGNED, allowNull: true });
    await queryInterface.addColumn('atividade_os', 'descricao', { type: Sequelize.STRING(100) });
    // cada alteração no SQLite recria a tabela sem o CHECK e o índice originais
    if (sqlite) {
      await queryInterface.addConstraint('atividade_os', {
        type: 'check',
        name: 'chk_atividade_os_horario',
        fields: ['hora_fim'],
        where: { hora_fim: { [Op.gt]: Sequelize.col('hora_inicio') } },
      });
    }
    await queryInterface.addConstraint('atividade_os', {
      type: 'check',
      name: 'chk_atividade_os_tipo_ou_descricao',
      fields: ['tipo_atividade_id'],
      where: { [Op.or]: [{ tipo_atividade_id: { [Op.ne]: null } }, { descricao: { [Op.ne]: null } }] },
    });
    if (sqlite) await queryInterface.addIndex('atividade_os', ['data'], { name: 'idx_atividade_os_data' });

    await queryInterface.createTable('orcamento', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      cliente_id: {
        type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'cliente', key: 'id' }, onDelete: 'RESTRICT',
      },
      endereco_id: {
        type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'endereco', key: 'id' }, onDelete: 'RESTRICT',
      },
      // excluir a OS gerada desfaz só o vínculo; o orçamento aceito continua como histórico
      ordem_servico_id: {
        type: Sequelize.BIGINT.UNSIGNED, unique: true, references: { model: 'ordem_servico', key: 'id' }, onDelete: 'SET NULL',
      },
      status: { type: Sequelize.ENUM('pendente', 'aceito', 'recusado'), allowNull: false, defaultValue: 'pendente' },
      observacao: { type: Sequelize.TEXT },
      criado_em: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('orcamento_item', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      orcamento_id: {
        type: Sequelize.BIGINT.UNSIGNED, allowNull: false, references: { model: 'orcamento', key: 'id' }, onDelete: 'CASCADE',
      },
      tipo_atividade_id: {
        type: Sequelize.BIGINT.UNSIGNED, references: { model: 'tipo_atividade', key: 'id' }, onDelete: 'RESTRICT',
      },
      descricao: { type: Sequelize.STRING(100), allowNull: false },
      quantidade: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      valor_unitario: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      duracao_min: { type: Sequelize.INTEGER, allowNull: false },
      sequencia: { type: Sequelize.INTEGER, allowNull: false },
    });
    await queryInterface.addConstraint('orcamento_item', {
      type: 'check', name: 'chk_orcamento_item_quantidade', fields: ['quantidade'], where: { quantidade: { [Op.gt]: 0 } },
    });
    await queryInterface.addConstraint('orcamento_item', {
      type: 'check', name: 'chk_orcamento_item_valor', fields: ['valor_unitario'], where: { valor_unitario: { [Op.gte]: 0 } },
    });
    await queryInterface.addConstraint('orcamento_item', {
      type: 'check', name: 'chk_orcamento_item_duracao', fields: ['duracao_min'], where: { duracao_min: { [Op.between]: [5, 720] } },
    });
    if (sqlite) await queryInterface.sequelize.query('PRAGMA foreign_keys = ON');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('orcamento_item');
    await queryInterface.dropTable('orcamento');
    await queryInterface.removeConstraint('atividade_os', 'chk_atividade_os_tipo_ou_descricao');
    await queryInterface.removeColumn('atividade_os', 'descricao');
    await queryInterface.changeColumn('atividade_os', 'tipo_atividade_id', { type: Sequelize.BIGINT.UNSIGNED, allowNull: false });
    await queryInterface.removeConstraint('tipo_atividade', 'chk_tipo_atividade_valor');
    await queryInterface.removeColumn('tipo_atividade', 'valor_padrao');
  },
};
