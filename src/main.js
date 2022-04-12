/*
 * Botfarm Gateway
 * main.js
 */

VERSION = `2.4.0`

const {logger} = require("./logger")

ONLINE_INTERACTIONS = [] // List of online interactions

logger
  .child({
    module: `main`,
    VERSION,
  })
  .info(`Botfarm Gateway started`);

require("./webSocket")


require("./apiRest");
// la apirest es para pruebas, como le hace un bypass a concordia no se crean tareas de etl.
