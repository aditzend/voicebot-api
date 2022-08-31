/**
 * Voicebot API
 * helpers.js
 */

const requestPromise = require('request-promise');
const { logger } = require('./utils/logger');

const correctBigNumber = function (argObject) {
  const { message } = argObject;
};

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

function noInteractionId() {
  logger
    .child({
      module: 'helpers noInteractionId',
    })
    .error('❌ No InteractionId. Message will not be dispatched.');
}

module.exports = {
  addVoiceBotApiReplacement,
  noInteractionId,
};
