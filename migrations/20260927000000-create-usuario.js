const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const { SECRETARIA_NOME, SECRETARIA_LOGIN, SECRETARIA_SENHA } = process.env;
    const faltando = ['SECRETARIA_NOME', 'SECRETARIA_LOGIN', 'SECRETARIA_SENHA'].filter((v) => !process.env[v]);
    if (faltando.length) {
      throw new Error(`Defina no .env antes de migrar: ${faltando.join(', ')}`);
    }

    await queryInterface.createTable('usuario', {
      id: { type: Sequelize.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false },
      nome: { type: Sequelize.STRING(100), allowNull: false },
      login: { type: Sequelize.STRING(60), allowNull: false, unique: true },
      senha_hash: { type: Sequelize.STRING(255), allowNull: false },
      perfil: { type: Sequelize.ENUM('eletricista', 'secretaria'), allowNull: false },
      ativo: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
    });

    await queryInterface.bulkInsert('usuario', [{
      nome: SECRETARIA_NOME,
      login: SECRETARIA_LOGIN,
      senha_hash: await bcrypt.hash(SECRETARIA_SENHA, 10),
      perfil: 'secretaria',
      ativo: true,
    }]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('usuario');
  },
};
