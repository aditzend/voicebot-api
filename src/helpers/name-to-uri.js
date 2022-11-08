const { logger } = require('../utils/logger');

/**
 * Clean bot name and return bot uri
 * @param {Object} argObject:  botName {String}
 * @returns {String} BotUri
 */
function botNameToBotUri({ botName }) {
  const name = botName.toLowerCase();
  const uri = process.env.BOT_ENV === 'development'
    ? process.env.BOT_DEV_URL
    : `http://${name}_${process.env.PRODUCTION_RASA_SERVICE_NAME}:5005`;
  return uri;
}

/**
 * Returns the uri of the bot
 * @param {Object} argObject:  botName {String}
 * @returns {String} BotUri
 */
// eslint-disable-next-line consistent-return
module.exports.getUri = function getBotUri({ botName }) {
  if (botName.length === 0) {
    logger
      .child({ module: 'name-to-uri getUri' })
      .error('Bot name is empty');
  } else {
    try {
      return botNameToBotUri({ botName });
    } catch (error) {
      logger
        .child({ module: 'helpers getUri' })
        .error(error);
    }
  }
};
