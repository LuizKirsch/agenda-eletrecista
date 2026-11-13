// RF 6.1/RN 34, RF 6.21, RF 6.22, RN 10: colunas obrigatórias na documentação passam a NOT NULL no banco.
// status NULL vira 'agendada'. FKs NULL não são inventadas: a migration aborta e lista o que corrigir.
const COLUNAS_FK = [['ordem_servico', 'endereco_id'], ['ordem_servico', 'eletricista_id'],
  ['atividade_os', 'eletricista_id']];

async function aplicar(queryInterface, Sequelize, permitirNulo) {
  const { Op } = Sequelize;
  const sqlite = queryInterface.sequelize.getDialect() === 'sqlite';
  const allowNull = permitirNulo;
  const fk = (model, onDelete) => ({
    type: Sequelize.BIGINT.UNSIGNED, allowNull, references: { model, key: 'id' }, ...(onDelete && { onDelete }),
  });
  const status = { type: Sequelize.ENUM('agendada', 'concluida', 'cancelada'), allowNull, defaultValue: 'agendada' };

  await queryInterface.changeColumn('ordem_servico', 'endereco_id', fk('endereco'));
  await queryInterface.changeColumn('ordem_servico', 'eletricista_id', fk('usuario', 'RESTRICT'));
  // eletricista_id por último: cada changeColumn recria a tabela e só preserva o ON DELETE da coluna alterada
  await queryInterface.changeColumn('atividade_os', 'status', status);
  await queryInterface.changeColumn('atividade_os', 'eletricista_id', fk('usuario', 'RESTRICT'));

  // no SQLite cada changeColumn recria a tabela e perde CHECKs e índices (mesmo caso da 20261027000001)
  if (sqlite) {
    await queryInterface.addConstraint('atividade_os', {
      type: 'check', name: 'chk_atividade_os_horario', fields: ['hora_fim'],
      where: { hora_fim: { [Op.gt]: Sequelize.col('hora_inicio') } },
    });
    await queryInterface.addConstraint('atividade_os', {
      type: 'check', name: 'chk_atividade_os_tipo_ou_descricao', fields: ['tipo_atividade_id'],
      where: { [Op.or]: [{ tipo_atividade_id: { [Op.ne]: null } }, { descricao: { [Op.ne]: null } }] },
    });
    await queryInterface.addIndex('atividade_os', ['data'], { name: 'idx_atividade_os_data' });
    await queryInterface.addIndex('atividade_os', ['eletricista_id', 'data'], { name: 'idx_atividade_os_eletricista_data' });
  }
}

// SQLite: PRAGMA foreign_keys só vale fora de transação e o DROP da tabela recriada falharia com FKs ligadas;
// por isso o BEGIN/COMMIT é manual, depois do PRAGMA, na conexão padrão. No MySQL o DDL faz commit implícito.
async function emTransacao(queryInterface, fn) {
  const q = (sql) => queryInterface.sequelize.query(sql);
  if (queryInterface.sequelize.getDialect() !== 'sqlite') return fn();
  await q('PRAGMA foreign_keys = OFF');
  await q('BEGIN');
  try {
    await fn();
    await q('COMMIT');
  } catch (e) {
    await q('ROLLBACK');
    throw e;
  } finally {
    await q('PRAGMA foreign_keys = ON');
  }
  return undefined;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const nulos = [];
    for (const [tabela, coluna] of COLUNAS_FK) {
      const [[{ n }]] = await sequelize.query(`SELECT COUNT(*) AS n FROM ${tabela} WHERE ${coluna} IS NULL`);
      if (Number(n) > 0) nulos.push(`${tabela}.${coluna}: ${n} linha(s) com NULL`);
    }
    if (nulos.length) {
      throw new Error(`Migration abortada: corrija os dados antes de tornar as colunas obrigatórias.\n${nulos.join('\n')}`);
    }
    await emTransacao(queryInterface, async () => {
      await sequelize.query("UPDATE atividade_os SET status = 'agendada' WHERE status IS NULL");
      await aplicar(queryInterface, Sequelize, false);
    });
  },

  async down(queryInterface, Sequelize) {
    await emTransacao(queryInterface, () => aplicar(queryInterface, Sequelize, true));
  },
};
