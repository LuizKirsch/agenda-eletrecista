// RF 6.21 / RF 6.22: eletricista por OS e por atividade.
// Dados existentes: o vault não define; as OS e atividades antigas recebem o primeiro eletricista
// cadastrado (ativo de preferência). Sem nenhum eletricista, ficam NULL e o usuário escolhe na próxima edição da OS.
const fk = (Sequelize) => ({
  type: Sequelize.BIGINT.UNSIGNED,
  references: { model: 'usuario', key: 'id' },
  onDelete: 'RESTRICT', // RN 64: eletricista com vínculo não é excluído
});

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ordem_servico', 'eletricista_id', fk(Sequelize));
    await queryInterface.addColumn('atividade_os', 'eletricista_id', fk(Sequelize));
    await queryInterface.sequelize.query(`
      UPDATE ordem_servico SET eletricista_id = (
        SELECT id FROM usuario WHERE perfil = 'eletricista' ORDER BY ativo DESC, id ASC LIMIT 1)`);
    await queryInterface.sequelize.query(
      'UPDATE atividade_os SET eletricista_id = (SELECT eletricista_id FROM ordem_servico WHERE ordem_servico.id = atividade_os.ordem_servico_id)',
    );
    await queryInterface.addIndex('atividade_os', ['eletricista_id', 'data'], { name: 'idx_atividade_os_eletricista_data' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('atividade_os', 'idx_atividade_os_eletricista_data');
    await queryInterface.removeColumn('atividade_os', 'eletricista_id');
    await queryInterface.removeColumn('ordem_servico', 'eletricista_id');
  },
};
