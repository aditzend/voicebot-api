/*
 * Voicebot API
 * main.js
 */

VERSION = `1.0.1`

const {logger} = require("./logger")

ONLINE_INTERACTIONS = [] // List of online interactions

logger
  .child({
    module: `main`,
    VERSION,
  })
  .info(`Voicebot API started`);

require("./apiRest");
