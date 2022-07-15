const axios = require('axios');
const { logger } = require('../utils/logger');
const { getUri } = require('../helpers/name-to-uri');

// /**
//  *
//  * @param {Object} argObject: response {Object} body {Object}
//  */
// const noBotName = ({ response, body }) => {
//   logger
//     .child({
//       module: 'rasa noBotName',
//     })
//     .error('❌ No BotName. Message will not be dispatched.');
//   body.Events.push({
//     name: '*error',
//     message: 'Error 1004 . No BotName received.',
//   });
//   response.json(body);
// };

/**
 * Push a message and then close the conversation
 * @param {Object} argObject: message {String}
 * @returns {Object} events {Array}
 */
function showMessageThenClose({ message }) {
  const events = [];
  events.push({ name: '*text', message });
  events.push({ name: '*offline', message: '' });
  return events;
}

/**
 * Push a message and then transfer the conversation
 * @param {Object} argObject: message {String}
 * @returns {Object} events {Array}
 */
function showMessageThenTransfer({ message }) {
  const events = [];
  events.push({ name: '*text', message });
  events.push({ name: '*transfer', message: '' });
  return events;
}

/**
 *
 * @param {Object} argObject: body {Object} uri {String}
 * @returns {Object} events {Array}
 */
// eslint-disable-next-line consistent-return
async function postMessage({ uri, body }) {
  let events = [];
  try {
    const sender = body.InteractionId;

    // uri includes http or https
    logger
      .child({
        module: 'rasa postMessage', uri, body,
      })
      .debug(`${body.InteractionId} 🚏 Routed to ${uri}`);

    const response = await axios.post(
      `${uri}/webhooks/rest/webhook`,
      {
        sender,
        message: body.Message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    logger.child({ response: response.data }).trace('RASA response');
    response.data.forEach((event) => {
      logger
        .child({ module: 'rasa postMessage', event })
        .debug(`${body.InteractionId} 🤖 Bot: ${event.text}`);
      const command = event.text.split('>>>')[0];
      const message = event.text.split('>>>')[1];
      switch (command) {
        case 'show_message_then_close':
          events = showMessageThenClose({ message });
          logger.debug(`${body.InteractionId} 🔪 closed`);
          break;
        case 'show_message_then_transfer':
          events = showMessageThenTransfer({ message });
          logger.debug(`${body.InteractionId} 👋 transfered`);
          break;
        default:
          events.push({
            name: '*text',
            message: event.text,
          });
          break;
      }
    });
    return events;
  } catch (error) {
    logger
      .child({
        module: 'rasa postMessage',
      })
      .error(error);
  }
}

/**
 * Sends a message to a bot and transforms the response
 * according to the bot's commands
 * @param {Object} body {Object}
 * @returns {Object} result
 */
module.exports.sendRestMessageToBot = async function send({ body }) {
  if (body.BotName.length < 1) {
    logger
      .child({
        module: 'rasa sendRestMessageToBot',
      })
      .error('❌ No BotName. Message will not be dispatched.');
    result.Events.push({
      name: '*error',
      message: 'Error 1004 . No BotName received.',
    });

    return result;
  }
  const uri = getUri({ botName: body.BotName });
  const botEvents = await postMessage({ uri, body });
  const result = body;
  result.Events = botEvents;
  return result;
};
