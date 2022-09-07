const axios = require('axios');
const _ = require('lodash');
// const { response } = require('express');
const { logger } = require('../utils/logger');
const { getUri } = require('../helpers/name-to-uri');

async function eventMapper({ uri, body, events }) {
  const incomingEvents = events;
  const incomingBody = body;
  // const mappedEvents = [];
  // events.forEach((event) => mappedEvents.push(event));
  const result = {};
  const process = async (event) => {
    if (event.name !== '*echo') return event;
    const requestBody = { ...incomingBody, Message: event.message };
    const response = await postMessage({ uri, body: requestBody });
    return eventMapper({ uri, body, events: response.events });
  };
  const mappedEvents = _.flatMapDeep(incomingEvents, process);
  result.events = await Promise.all(mappedEvents);
  return result;
}
/**
 * Gets the updated slots from the bot
 * @param {Object} argObject: botName {String} interactionId {String}
 * @returns {Object} slots
 */
module.exports.getSlots = async function getSlots({ botName, interactionId }) {
  const uri = `${getUri({ botName })}/conversations/${interactionId}/tracker`;
  const response = await axios.get(uri);
  logger
    .child({ module: 'rasa getSlots', uri })
    .trace(`${interactionId} 🔎 Slots: ${JSON.stringify(response.data.slots)}`);
  const { slots } = response.data;
  //   const slotsArray = Object.keys(slots).map(
  //     (key) => `${key}=${slots[key]}`,
  //   );
  return slots;
};

/**
 *
 * @param {Object} argObject: body {Object} uri {String}
 * @returns {Object} events {Array} slots {Array}
 */
// eslint-disable-next-line consistent-return
async function postMessage({ uri, body }) {
  try {
    const events = [];
    let slotsNeeded = false;
    const sender = body.InteractionId;

    // uri includes http or https
    logger
      .child({
        module: 'rasa postMessage', uri, body,
      })
      .debug(`${body.InteractionId} ⏩ 🤖 '${body.Message}' posted to ${uri}`);

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
    logger
      .child({ response: response.data })
      .trace('RASA response');
    response.data.forEach(async (event) => {
      logger
        .child({ module: 'rasa postMessage', event })
        .debug(`${body.InteractionId}  🔙🤖 Bot says: " ${event.text} "`);
      const command = event.text.split('>>>')[0];
      const message = event.text.split('>>>')[1];
      switch (command) {
        case 'show_message_then_close':
          events.push({ name: '*text', message });
          events.push({ name: '*offline', message: '' });
          slotsNeeded = true;
          logger
            .child({ module: 'rasa postMessage', message })
            .debug(`${body.InteractionId} 🔪 closed`);
          break;
        case 'show_message_then_transfer':
          events.push({ name: '*text', message });
          events.push({ name: '*transfer', message: '' });
          slotsNeeded = true;
          logger
            .child({ module: 'rasa postMessage', message })
            .debug(`${body.InteractionId} 👋 transfered`);
          break;
        case 'echo':
          slotsNeeded = true;
          events.push({
            name: '*echo',
            message,
          });
          break;
        default:
          slotsNeeded = true;
          events.push({
            name: '*text',
            message: event.text,
          });
          break;
      }
    });
    const slots = [];
    // if (slotsNeeded) {
    //   slots = await getSlots({ botName: body.BotName, interactionId: body.InteractionId });
    // }
    return { events, slots, slotsNeeded };
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
async function sendRestMessageToBotRecursive({ body }) {
  const result = body;
  try {
    // One interaction can have many responses and echoes
    if (body.BotName.length < 1) {
      logger
        .child({
          module: 'rasa sendRestMessageToBot',
        })
        .error('❌ No BotName. Message will not be dispatched.');
      result.Events.push({
        name: '*text',
        message: 'Error 1004 . Debe especificar un bot',
      });
      return result;
    }
    const uri = getUri({ botName: body.BotName });
    const { events, slotsNeeded } = await postMessage({ uri, body });
    const mainEvents = await eventMapper({ uri, body: result, events });
    // logger.child({ ...mainEvents }).debug('Rasa response filtered');
    // const allEvents = await Promise.all(mainEvents);
    logger
      .child({ module: 'rasa sendRestMessageToBot', mainEvents })
      .debug('All events recursively filtered');
    result.Events = mainEvents;
    // result.Parameters = slots;
    result.ParamsNeeded = slotsNeeded;
    // logger
    //   .child({ module: 'rasa sendRestMessageToBot', uri, body })
    //   .trace(`${result.Parameters.length} parameters loaded`);
    return result;
  } catch (error) {
    logger
      .child({ module: 'rasa sendRestMessageToBot', error })
      .error(error);
    return { ...result, Events: [{ name: '*text', message: 'Error 1005' }] };
  }
}
async function sendRestMessageToBot({ body }) {
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
  const mainEvents = events.map(async (firstOrderEvent) => {
    logger.trace(`msg: ${firstOrderEvent.message} name: ${firstOrderEvent.name}`);
    if (firstOrderEvent.name === '*echo') {
      // Send the echo message to the bot
      const firstEchoResponse = await postMessage(
        { uri, body: { ...body, Message: firstOrderEvent.message } },
      );
      const secondOrderEvents = firstEchoResponse.events.map(async (secondOrderEvent) => {
        if (secondOrderEvent.name === '*echo') {
          logger.trace(`msg: ${secondOrderEvent.message} name: ${secondOrderEvent.name}`);
          // Send the second echo message to the bot
          const secondOrderEchoResponse = await postMessage({
            uri, body: { ...body, Message: secondOrderEvent.message },
          });
          const thirdOrderEvents = secondOrderEchoResponse.events.map(async (thirdOrderEvent) => {
            if (thirdOrderEvent.name === '*echo') {
              logger.trace(`msg: ${thirdOrderEvent.message} name: ${thirdOrderEvent.name}`);
              const thirdOrderEchoResponse = await postMessage({
                uri, body: { ...body, Message: thirdOrderEvent.message },
              });
              const fourthOrderEvents = thirdOrderEchoResponse
                .events.map(async (fourthOrderEvent) => {
                  if (fourthOrderEvent.name === '*echo') {
                    logger.trace(`msg: ${fourthOrderEvent.message} name: ${fourthOrderEvent.name}`);
                    const fourthOrderEchoResponse = await postMessage({
                      uri, body: { ...body, Message: fourthOrderEvent.message },
                    });
                    const fifthOrderEvents = fourthOrderEchoResponse
                      .events.map(async (fifthOrderEvent) => fifthOrderEvent);
                    return Promise.all(fifthOrderEvents);
                  }
                  return fourthOrderEvent;
                });
              return Promise.all(fourthOrderEvents);
            }
            return thirdOrderEvent;
          });
          return Promise.all(thirdOrderEvents);
        }
        return secondOrderEvent;
      });
      return Promise.all(secondOrderEvents);
    }
    return firstOrderEvent;
  });

  logger.child({ ...mainEvents }).debug('Rasa response filtered');
  const allEvents = await Promise.all(mainEvents);
  result.Events = _.flatten(_.flatten(_.flatten(_.flatten(allEvents))));
  result.Parameters = slots;
  logger
    .child({ module: 'rasa sendRestMessageToBot', uri, body })
    .trace(`${result.Parameters.length} parameters loaded`);
  return result;
}
module.exports.sendRestMessageToBot = sendRestMessageToBot;

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
