require('./instrument');

const mongoose = require('mongoose');
const logger = require('./src/config/logger');
const validarEnv = require('./src/config/env');
const { ejecutarRecordatorios } = require('./src/services/recordatorios.service');

const run = async () => {
  validarEnv();
  await mongoose.connect(process.env.MONGO_URI);
  try {
    await ejecutarRecordatorios();
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  logger.error('Falló la ejecución de recordatorios', { error: error.message });
  process.exitCode = 1;
});
