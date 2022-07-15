const { logger } = require('../utils/logger');

/**
 * Clean bot name and return bot uri
 * @param {Object} argObject:  botName {String}
 * @returns {String} BotUri
 */
function botNameToBotUri({ botName = 'bot' }) {
  const name = botName.toLowerCase();
  return process.env.BOT_ENV === 'development'
    ? process.env.BOT_DEV_URL
    : `http://${name}_${process.env.PRODUCTION_RASA_SERVICE_NAME || 'bm'}:5005`;
}

/**
 * Returns the uri of the bot
 * @param {Object} argObject:  botName {String}
 * @returns
 */
// eslint-disable-next-line consistent-return
module.exports.getUri = function getUri({ botName }) {
  let result = '';
  try {
    result = botNameToBotUri({ botName });
    return result;
  } catch (error) {
    logger
      .child({ module: 'helpers getUri' })
      .error(error);
  }
};
