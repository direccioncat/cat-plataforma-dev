const { getBasesActivas } = require('../model/bases');

async function listarBases() {
  return await getBasesActivas();
}

module.exports = { listarBases };
