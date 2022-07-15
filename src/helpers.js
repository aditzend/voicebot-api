/**
 * Voicebot API
 * helpers.js
 */

const requestPromise = require('request-promise');
const { logger } = require('./utils/logger');

/**
 * TODO: Refactor this function
 * @param {Object} argObject: body {Object}
 */
const addVoiceBotApiReplacement = (argObject) => {
  const { body } = argObject;
  body.BotName = body.BotName || 'localhost';
  body.InteractionId = body.InteractionId || 'test';
  body.Parameters = body.Parameters || [];

  const uri = `${botNameToBotUri(body.BotName)}/conversations/${
    body.InteractionId
  }/tracker/events?include_events=NONE`;

  /**
   * usar sendParams pero es confuso porque esto no es un param,
    * es un replacement que tiene que llenar el slot
    *  voicebot_api_replacements que tiene formato lista */
};

/**
 * Clean bot name and return bot uri
 * @param {String} BotNameInput
 * @returns {String} BotUri
 */
function botNameToBotUri({ botName = 'bot' }) {
  const name = botName.toLowerCase();
  return process.env.BOT_ENV === 'development'
    ? process.env.BOT_DEV_URL
    : `http://${name}_${process.env.PRODUCTION_RASA_SERVICE_NAME || 'bm'}:5005`;
}

function noInteractionId() {
  logger
    .child({
      module: 'helpers noInteractionId',
    })
    .error('❌ No InteractionId. Message will not be dispatched.');
}

/**
 * Loads a slot on a bot
 * @param {Object} uri {String} param {String}
 * @returns {Object} BotResponse
 */
// eslint-disable-next-line consistent-return
async function sendParam({ uri, param = '' }) {
  // un ejemplo de param es "user_name=juan"
  const name = param.split('=')[0];
  const value = param.split('=')[1];

  const options = {
    method: 'POST',
    uri,
    body: {
      event: 'slot',
      name,
      value,
      timestamp: new Date().getTime(),
    },
    json: true,
  };

  try {
    const botResponse = await requestPromise(options);
    logger
      .child({ module: 'helpers sendParam', ...options })
      .debug(`Parameter ${param} inserted`);
    return botResponse;
  } catch (error) {
    logger
      .child({
        module: 'helpers sendParam',
      })
      .error(error);
  }
}

/**
 * Sends Request Parameters as slots to the bot
 * @param {Object} argObject: body {Object}
 * @returns {Promise} Result of the request
 */
async function sendParamsToBot(argObject) {
  const { body } = argObject;
  body.BotName = body.BotName || 'localhost';
  body.InteractionId = body.InteractionId || 'test';
  body.Parameters = body.Parameters || [];

  const uri = `${botNameToBotUri(body.BotName)}/conversations/${
    body.InteractionId
  }/tracker/events?include_events=NONE`;

  const paramInserts = body.Parameters.map(async (item) => {
    let param = item.toString();
    if (param.includes('.')) {
      logger.child({ module: 'helpers sendParamsToBot' }).warn(` ⚠️ ${param} should not contain dots`);
      param = param.replace('.', '_');
      logger.child({ module: 'helpers sendParamsToBot' }).warn(`📝 ${param} is the new param name`);
    }
    const paramInsert = await sendParam(param, uri);
    return paramInsert;
  });
  const result = await Promise.all(paramInserts);
  return result;
}

/**
 * Returns the uri of the bot
 * @param {Object} argObject:  botName {String}
 * @returns
 */
// eslint-disable-next-line consistent-return
function getUri({ botName }) {
  let result = '';
  try {
    result = botNameToBotUri(botName);
    return result;
  } catch (error) {
    logger
      .child({ module: 'helpers getUri' })
      .error(error);
  }
}

module.exports = {
  addVoiceBotApiReplacement,
  botNameToBotUri,
  getUri,
  noInteractionId,
  sendParamsToBot,
};
