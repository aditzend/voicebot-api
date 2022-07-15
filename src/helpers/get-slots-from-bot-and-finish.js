const requestPromise = require('request-promise');
const { logger } = require('./logger');

/**
 * Lo
 * @param {Object} argObject:  eventName, socket, body
 */
module.exports.default = function getSlotsFromBotAndFinish(argObject) {
  const { eventName, socket, body } = argObject;
  body.BotName = body.BotName || 'localhost';
  body.InteractionId = body.InteractionId || 'test';
  const uri = `${botNameToBotUri(body.BotName)}/conversations/${
    body.InteractionId
  }/tracker`;
  const options = {
    method: 'GET',
    uri,
  };

  requestPromise(options)
    .then((res) => {
      const tracker = JSON.parse(res);
      const { slots } = tracker;
      const params = Object.keys(slots);
      const paramArray = [];

      params.forEach((param) => {
        const line = `${param}=${slots[param]}`;
        paramArray.push(line);
        logger
          .child({ module: 'helpers getParamsFromBotAndFinish', body })
          .trace(line);
      });

      logger
        .child({ module: 'helpers getParamsFromBotAndFinish', paramArray })
        .debug('Slots extracted');
      return paramArray;
    })
    .then((paramArray) => {
      body.Parameters = paramArray;
      body.EventName = eventName;
      body.Message = '';

      logger
        .child({
          module: 'helpers getParamsFromBotAndFinish',
          ...body,
        })
        .debug(' ⬅️  Outbound Message sent via Socket');

      socket.send(JSON.stringify(body));

      if (eventName === '*offline') {
        logger
          .child({ module: 'helpers getParamsFromBotAndFinish' })
          .debug(` 👋 ${body.InteractionId || 'No id'} SESSION CLOSED`);
      } else {
        logger
          .child({ module: 'helpers getParamsFromBotAndFinish' })
          .debug(` 👩🏽‍💼 ${body.InteractionId || 'No id'} SESSION TRANSFERED`);
      }
    })
    .catch((error) => logger
      .child({
        module: 'helpers getParams',
      })
      .error(error));
};
