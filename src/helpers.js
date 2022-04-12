/*
 * Botfarm Gateway
 * helpers.js
 */

const requestPromise = require("request-promise");
const { logger } = require("./logger");

const cleanMessage = function (message) {
  //si viene un falsey va string vacio
  message = message || "";
  // todo a minusculas
  message = message.toLowerCase();
  //sacamos tildes
  message = message.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // sacamos los caracteres raros que esta tirando concordia 15
  message = message.replace("cmd=&msg=", "");
  while (message.includes("&")) {
    message = message.replace("&", "");
  }

  logger
    .child({ module: `helpers cleanMessage` })
    .trace(`cleaned : ${message}`);

  return message;
};

const botNameToBotUri = (BotName) => {
  BotName = BotName && BotName.toLowerCase();
  return process.env.BOT_ENV === `development`
    ? process.env.BOT_DEV_URL
    : `http://${BotName}_${process.env.PRODUCTION_RASA_SERVICE_NAME || 'bm'}:5005`;
};

const noInteractionId = () => {
  logger
    .child({
      module: `helpers noInteractionId`,
    })
    .error("❌ No InteractionId. Message will not be dispatched.");
};

const sendParam = async (param, uri) => {
  param = param || "";

  const name = param.split("=")[0];
  const value = param.split("=")[1];

  let options = {
    method: "POST",
    uri,
    body: {
      event: "slot",
      name,
      value,
      timestamp: new Date().getTime(),
    },
    json: true,
  };

  try {
    let botResponse = await requestPromise(options);

    logger
      .child({ module: `helpers sendParam`, ...options})
      .debug(`Param ${param} inserted`);
      return botResponse
  } catch (error) {
    logger
      .child({
        module: `helpers sendParam`,
      })
      .error(error);
  }
};

const sendParamsToBot = async (body) => {
  body.BotName = body.BotName || "localhost";
  body.InteractionId = body.InteractionId || "test";
  body.Parameters = body.Parameters || [];

  const uri = `${botNameToBotUri(body.BotName)}/conversations/${
    body.InteractionId
  }/tracker/events?include_events=NONE`;
  
    const paramInserts = body.Parameters.map(async (param) => {

      param = param.toString()
      if (param.includes(".")) {
        logger.child({ module: `helpers sendParamsToBot` }).warn(` ⚠️ ${param} should not contain dots`)
        param = param.replace(".", "_")
        logger.child({ module: `helpers sendParamsToBot` }).warn(`📝 ${param} is the new param name`)
      }
      let paramInsert = await sendParam(param, uri)
      return paramInsert
    });
    return await Promise.all(paramInserts);
};

const getParamsFromBotAndFinish = (event_name, socket, body) => {
  body.BotName = body.BotName || "localhost";
  body.InteractionId = body.InteractionId || "test";
  const uri = `${botNameToBotUri(body.BotName)}/conversations/${
    body.InteractionId
  }/tracker`;

  const options = {
    method: "GET",
    uri,
  };

  requestPromise(options)
    .then((res) => {
      const tracker = JSON.parse(res);
      const slots = tracker["slots"];
      const params = Object.keys(slots);
      let paramArray = [];

      params.map((param) => {
        const line = `${param}=${slots[param]}`;
        paramArray.push(line);
        logger.debug(line);
      });

      logger
        .child({ module: `helpers getParamsFromBotAndFinish`, paramArray })
        .debug("Parameters extracted");
      return paramArray;
    })
    .then((paramArray) => {
      body.Parameters = paramArray;
      body.EventName = event_name;
      body.Message = "";


      logger
        .child({
          module: `helpers getParamsFromBotAndFinish`,
          ...body,
        })
        .debug(`⬅️ Outbound Message sent via Socket`);
      socket.send(JSON.stringify(body));


      event_name === "*offline"
        ? logger
            .child({ module: `helpers getParamsFromBotAndFinish` })
            .debug(` 👋 ${body.InteractionId || "No id"} SESSION CLOSED`)
        : logger
            .child({ module: `helpers getParamsFromBotAndFinish` })
            .debug(` 👩🏽‍💼 ${body.InteractionId || "No id"} SESSION TRANSFERED`);
    })
    .catch((error) =>
      logger
        .child({
          module: `helpers getParams`,
        })
        .error(error)
    );

  // return paramArray
};

const getUri = async function (BotName) {
  let result = "";
  try {
    result = botNameToBotUri(BotName);
    return result;
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  cleanMessage,
  botNameToBotUri,
  noInteractionId,
  getUri,
  sendParamsToBot,
  getParamsFromBotAndFinish,
};
