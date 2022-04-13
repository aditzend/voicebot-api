/*
 * Voicebot API
 * sendRestMessageToBot.js
 */

const rp = require("request-promise");
const helpers = require("./helpers")
const {logger} = require("./logger");





const noBotName = (res, body) => {
  logger
    .child({
      module: `sendRestMessageToBot noBotName`,
    })
    .error("❌ No BotName. Message will not be dispatched.");
  body.Events.push({
    name: "*error",
    message: `Error 1004 . No BotName received.`,
  });
  res.json(body);
};
const directTransfer = (body) => {
  // Transferimos sin pasar este mensaje al bot
  logger.debug(`${body.InteractionId} 👋 transfered`);


  body.Events.push = { name: "*transfer", message: "" };
};

const gwiTransfer = (body, msgForClient) => {
  logger.debug(`${body.InteractionId} 👋 transfered`);


  body.Events.push({ name: "*transfer", message: msgForClient });
};

const showMessageThenTransfer = (body, msgForClient) => {
  // envio un mensaje con *text
  logger.debug(`${body.InteractionId} 👋 transfered`);

  body.Events.push({ name: "*text", message: msgForClient });

  logger.debug(`${body.InteractionId} 👋 transfered`);
  body.Events.push({ name: "*transfer", message: "" });
};

const sendResponse = (res, body) => {
  logger.child({...body}).debug(`${body.InteractionId} ⬅️  ${body.Events.length} ${body.Events.length === 1? "Event":"Events"} sent to client`);

  res.json(body);
};

const requestBot = (res, uri, body) => {
  let msgForBot = body && body.Message && body.Message.toLowerCase();
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
  logger.child({...options}).debug(`${body.InteractionId} 🚏 Routed to ${uri}, requested bot was ${body.BotName}`);
  // enviamos el mensaje al bot server que se pidio

  rp(options)
    .then((b) => {
      b.map(function (i) {
        logger.child({ ...i }).debug(`${body.InteractionId} 🤖 Bot: ${i.text}`);
        body.Message = i.text;
        command = i.text.split(">>>")[0];
        msgForClient = i.text.split(">>>")[1];

        if (
          command.includes("showMessageThenTransfer") ||
          command.includes("ShowMessageThenTransfer") ||
          command.includes("mostrarMensajeLuegoTransferir") || 
          command.includes("MostrarMensajeLuegoTransferir")       ) {
          showMessageThenTransfer(body, msgForClient);
        } else {
          body.Parameters = [];
          body.Events.push({ name: "*text", message: i.text })
        }
          
      });

      sendResponse(res, body);
    })
    .catch((err) =>
      logger
        .child({
          module: `sendRestMessageToBot rp`,
        })
        .error(err)
    );
};

module.exports = function (res, body) {
  //acumulo los mensajes en esta lista
  body.Events = [];

  body.BotName.length < 1
    ? noBotName(res, body)
    : helpers.getUri(body.BotName).then((uri) => {
        body.InteractionId.length < 1
          ? helpers.noInteractionId()
          : body.Message == "t" && body.EventName == "*text"
          ? directTransfer(body)
          : requestBot(res, uri, body);
      });
};
