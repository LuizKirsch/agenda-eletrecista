// Cor do eletricista (#rrggbb), usada no filtro e nos blocos da agenda. NULL para a secretária.
// Eletricistas existentes recebem as cores da paleta (config/paleta.js) em ordem de id.
const paleta = require('../config/paleta');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('usuario', 'cor', { type: Sequelize.STRING(7), allowNull: true });
    const [eletricistas] = await queryInterface.sequelize.query("SELECT id FROM usuario WHERE perfil = 'eletricista' ORDER BY id");
    for (const [i, { id }] of eletricistas.entries()) {
      await queryInterface.bulkUpdate('usuario', { cor: paleta[i % paleta.length].cor }, { id });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('usuario', 'cor');
  },
};
