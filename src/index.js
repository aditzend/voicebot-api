/*
 * Voicebot API
 * main.js
 */

const VERSION = '1.2.0';

const { logger } = require('./utils/logger');
require('./server');

logger
  .child({
    module: 'main',
    VERSION,
  })
  .info('Voicebot API started');
