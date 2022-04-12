/*
 * Botfarm Gateway
 * webSocket.js
 */

const WebSocket = require("ws");
const { sendTask } = require("./rabbit");

// Las variables de entorno tienen que estar cargadas en el environment de alguna manera, pero no con dotenv
const { logger } = require("./logger");
const helpers = require("./helpers");
const sendSocketMessageToBot = require("./sendSocketMessageToBot.js");

const webSocketPort = process.env.WEB_SOCKET_PORT || 8646;

// Global vars
waitTimeBetweenMessages = process.env.WAIT_TIME_BETWEEN_MESSAGES || 1;
pollingInterval = process.env.POLLING_INTERVAL || 100;
SocketServer = new WebSocket.Server({
  port: webSocketPort,
});

logger
  .child({
    module: `webSocket`,
    depends_on: `CONCORDIA ^1.15.0`,
    web_socket_port: `${webSocketPort}`,
  })
  .info(`WebSocket started`);

const processMessage = async (socket, payload) => {
  payload = payload || {};
  let body = JSON.parse(payload);
  logger.child({ ...body }).debug(` 🦅 Concordia sent ${body.Message}`);
  body.Message = helpers.cleanMessage(body.Message);
  logger.child({ module: `main` }).trace(`Cleaned message :  ${body.Message}`);

  const concordiaIsCompatible =
    body.InteractionId && body.Message !== "error:1003";

  body.InteractionId = body.InteractionId || "ERROR_1003_TEST";

  const eventNameOffline = body.EventName === "*offline";
  const eventNameOnline = body.EventName === "*online";

  const sendWakeUpToBot = async (socket, body) => {
    body.Message = process.env.BOT_WAKE_UP_WORD || "/start";
    logger
      .child({
        origin: "USER",
        connection_id: body.InteractionId,
        user_name: body.UserName,
        bot_name: body.BotName,
        event_name: body.EventName,
        message: body.Message,
      })
      .debug(`Wake up ${body.BotName || "No bot"} with '${body.Message}'`);

    try {
      await helpers.sendParamsToBot(body);
      logger
        .child({
          module: `webSocket processMessage`,
        })
        .debug(`✅ All params inserted`);
      sendSocketMessageToBot(socket, body);
      const BotName = body.BotName.toLowerCase();
      BotName.includes("worker")
        ? logger
            .child({ module: `webSocket` })
            .debug(`No task to send, bot is a worker`)
        : sendTask(`${BotName}_etl`, `${body.InteractionId}`)
      ONLINE_INTERACTIONS.push(body.InteractionId);
      setTimeout(() => {
        ONLINE_INTERACTIONS = ONLINE_INTERACTIONS.pop(body.InteractionId);
        logger
          .child({ module: `webSocket processMessage` })
          .info(
            `🔌 ${body.InteractionId} removed from ONLINE_INTERACTIONS, one week has passed since first *online`
          );
      }, 1000 * 60 * 60 * 24 * 7);
      // en una semana se borra la interaccion
    } catch (error) {
      logger
        .child({
          module: `webSocket processMessage`,
        })
        .error(error);
    }
  };

  !concordiaIsCompatible
    ? logger
        .child({
          module: `webSocket processMessage`,
        })
        .fatal(
          `No InteractionId param received, check if Concordia is compatible`
        )
    : eventNameOffline
    ? logger.debug(`${body.InteractionId} OFFLINE`)
    : eventNameOnline
    ? ONLINE_INTERACTIONS.includes(body.InteractionId)
      ? logger
          .child({ module: `webSocket` })
          .warn(`${body.InteractionId} is already ONLINE`)
      : await sendWakeUpToBot(socket, body)
    : sendSocketMessageToBot(socket, body);
};

SocketServer.on("connection", (SocketConnection) => {
  // setInterval(() => sendJob(SocketConnection), pollingInterval);

  SocketConnection.on("message", (payload) => {
    payload && processMessage(SocketConnection, payload);
  });
});
