const axios = require('axios');
const { logger } = require('../utils/logger');
const { getUri } = require('../helpers/name-to-uri');

/**
 * Gets the updated slots from the bot
 * @param {Object} argObject: botName {String} interactionId {String}
 * @returns {Array} slots {Array}
 */
async function getSlots({ botName, interactionId }) {
  const uri = `${getUri({ botName })}/conversations/${interactionId}/tracker`;
  const response = await axios.get(uri);
  logger
    .child({ module: 'rasa getSlots', uri })
    .trace(`${interactionId} 🔎 Slots: ${JSON.stringify(response.data.slots)}`);
  const { slots } = response.data;
  const slotsArray = Object.keys(slots).map(
    (key) => `${key}=${slots[key]}`,
  );
  return slotsArray;
}

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
 * @returns {Object} events {Array} slots {Array}
 */
// eslint-disable-next-line consistent-return
async function postMessage({ uri, body }) {
  try {
    let events = [];
    let slotsNeeded = false;
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
          slotsNeeded = true;
          logger.debug(`${body.InteractionId} 🔪 closed`);
          break;
        case 'show_message_then_transfer':
          events = showMessageThenTransfer({ message });
          slotsNeeded = true;

          logger.debug(`${body.InteractionId} 👋 transfered`);
          break;
        default:
          slotsNeeded = false;

          events.push({
            name: '*text',
            message: event.text,
          });
          break;
      }
    });
    let slots = [];
    if (slotsNeeded) {
      slots = await getSlots({ botName: body.BotName, interactionId: body.InteractionId });
    } else {
      slots = ['Slots will be updated when the conversation is closed'];
    }
    return { events, slots };
  } catch (error) {
    logger
      .child({
        module: 'rasa postMessage',
      })
      .error(error);
  }
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
 * Loads a slot from a key-value pair
 * @param {Object} argObject: name {String} value {String} uri {String}
 * @returns {Promise} Result of the request
 */
// eslint-disable-next-line consistent-return
async function loadFieldAsSlot({ name, value, uri }) {
  try {
    const response = await axios.post(
      uri,
      {
        event: 'slot',
        name,
        value,
        timestamp: new Date().getTime(),
      },
      {
        'Content-Type': 'application/json',
      },
    );

    logger
      .child({ module: 'rasa loadFieldAsSlot' })
      .debug(`Field ${name} loaded as slot`);
    return response;
  } catch (error) {
    logger
      .child({
        module: 'helpers sendParam',
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
  const result = body;
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
  const { events, slots } = await postMessage({ uri, body });
  result.Events = events;
  result.Parameters = slots;
  logger
    .child({ module: 'rasa sendRestMessageToBot', uri, body })
    .trace(`${result.Parameters.length} parameters loaded`);
  return result;
};

module.exports.loadInitialFieldsIntoSlots = async function loadSlots({ body }) {
  const uri = `${getUri({ botName: body.BotName })}/conversations/${
    body.InteractionId
  }/tracker/events?include_events=NONE`;
  const paramInserts = Object.entries(body).map(async ([key, value]) => {
    let fixedKey = key;
    if (key.includes('.')) {
      logger
        .child({ module: 'rasa loadInitialFieldsIntoSlots' })
        .warn(` ⚠️ ${key} should not contain dots`);
      fixedKey = key.replace('.', '_');
      logger
        .child({ module: 'rasa sendParloadInitialFieldsIntoSlotsamsToBot' })
        .warn(`📝 ${key} is the new field name`);
    }
    const paramInsert = await loadFieldAsSlot({ name: fixedKey, value, uri });
    return paramInsert;
  });
  const result = await Promise.all(paramInserts);
  return result;
};
