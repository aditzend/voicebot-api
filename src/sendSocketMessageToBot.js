/*
 * Botfarm Gateway
 * sendSocketMessageToBot.js
 */

const requestPromise = require("request-promise");
const { logger } = require("./logger");
const helpers = require("./helpers");

const noBotNameSocket = (socket, body) => {
  logger
    .child({
      module: `sendSocketMessageToBot noBotName`,
    })
    .error("❌ No BotName. Message will not be dispatched.");
  body.Message = `Error 1004 . No BotName received.`
  logger
    .child({
      module: `sendSocketMessageToBot noBotNameSocket`,
      ...body,
    })
    .debug(`⬅️ Outbound Message sent via Socket`);
  socket.send(JSON.stringify(body))
};


const coldTransferSocket = (socket, body) => {
  body.EventName = `*transfer`;
  logger
    .child({
      module: `sendSocketMessageToBot coldTransferSocket`,
      ...body,
    })
    .debug(`⬅️ Outbound Message sent via Socket`);
  socket.send(JSON.stringify(body));
  logger
    .child({
      module: `sendSocketMessageToBot coldTransferSocket`,
      ...body
    })
    .debug("COLD TRANSFERED");
};

const showMessageThenTransferSocket = (socket, body, msgForSocket) => {
  // envio un mensaje con *text
  logger.debug("Showing last message before transfer ");
  body.EventName = "*text"
  body.Message = msgForSocket || ""
  logger
    .child({
      module: `sendSocketMessageToBot showMessageThenTransferSocket`,
    })
    .debug(
      `${body.BotName || "No Bot"} asked to transfer session ${
        body.InteractionId || "No id"
      }`
    );
    logger
      .child({
        module: `sendSocketMessageToBot showMessageThenTransferSocket`,
        ...body,
      })
      .debug(`⬅️ Outbound Message sent via Socket`);
  socket.send(JSON.stringify(body));
  helpers.getParamsFromBotAndFinish("*transfer", socket, body);
};
const showMessageThenCloseSocket = (socket, body, msgForSocket) => {
  // envio un mensaje con *text
  logger
    .child({
      module: `sendSocketMessageToBot showMessageThenCloseSocket`,
    })
    .debug(
      `${body.BotName || "No Bot"} asked to close session ${
        body.InteractionId || "No id"
      }`
    );
  body.EventName = "*text"
  body.Message = msgForSocket || ""
  logger
    .child({
      module: `sendSocketMessageToBot showMessageThenCloseSocket`,
      ...body,
    })
    .debug(`⬅️ Outbound Message sent via Socket`);
  socket.send(JSON.stringify(body));
  helpers.getParamsFromBotAndFinish("*offline", socket, body)

};

const sendMessageToSocket = (socket, body) => {
  body.EventName = "*text"
  logger.child({ module: `sendSocketMessageToBot sendMessageToSocket`, ...body }).debug(`⬅️ Outbound Message sent via Socket`);
  socket.send(JSON.stringify(body));
};

const postBotFromSocket = (socket, uri, body) => {
  let msgForBot = body.Message || "";
  // atencion! la uri incluye http o https, no anteponerlo en este codigo
  const options = {
    method: "POST",
    uri: `${uri}/webhooks/rest/webhook`,
    body: {
      sender: body.InteractionId,
      message: msgForBot,
    },
    json: true,
  };
  logger
    .child({ ...options })
    .debug(` 🚛 Requested BotName: ${body.BotName} Dispatched to:${uri}`);
  // enviamos el mensaje al bot server que pidio el concordia

  requestPromise(options)
    .then((botResponses) => {
      botResponses.map( botResponse =>  {
        logger
          .child({ ...botResponse })
          .debug(`📥 Inbound Message from ${body.BotName} : '${botResponse.text}'`);
        body.Message = botResponse.text;
        gatewayInstruction = botResponse.text.split(">>>")[0] 
        msgForSocket = botResponse.text.split(">>>")[1];

        gatewayInstruction === "gwi_cold_transfer"
          ? coldTransferSocket(socket, body)
          : gatewayInstruction === "gwi_show_message_then_transfer"
          ? showMessageThenTransferSocket(socket, body, msgForSocket)
          : gatewayInstruction === "gwi_show_message_then_close"
          ? showMessageThenCloseSocket(socket, body, msgForSocket)
          : sendMessageToSocket(socket, body)

          return null
      });
    })
    .catch((error) =>
      logger
        .child({
          module: `sendSocketMessageToBot requestPromise`,
        })
        .error(error)
    );
};

module.exports = function (socket, body) {
  body.BotName.length < 1
    ? noBotNameSocket(socket, body)
    : helpers.getUri(body.BotName).then((uri) => {
        body.InteractionId.length < 1
          ? helpers.noInteractionId()
          : body.Message === "t" && body.EventName === "*text"
          ? coldTransferSocket(socket, body)
          : postBotFromSocket(socket, uri, body);
      })
      .catch(error => logger.error(error))
};
