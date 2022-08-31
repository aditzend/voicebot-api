const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { cleanMessage } = require('./helpers/filters');
const {
  sendRestMessageToBot,
  loadInitialFieldsIntoSlots,
  getDomain,
} = require('./services/rasa');
const { logger } = require('./utils/logger');

const { publishTaskToRabbitMQ } = require('./services/rabbit');

const app = express();
const port = process.env.API_PORT || 8656;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/nlu', async (req, res) => {
  const { bot_name } = req.query;
  const domain = await getDomain({ botName: bot_name });
  const result = domain;
  res.json(result);
});

app.post('/bot', async (req, res) => {
  // Do not mutate the argument
  const { body } = req;
  // Prepare the response in the `result` mutable object
  let result = body;
  result.Events = [];

  // Apply filters
  if (body.message) {
    // logear el mensaje despues de los filtros
    result.message = cleanMessage(body.message);
    logger
      .child({ module: 'server', body })
      .debug(`${body.InteractionId}  FROM "${body.Message}"`
       + ` TO FILTERED: "${result.Message}"`);
  }

  // Check if there is an InteractionId
  if (!body.InteractionId) {
    logger
      .child({ module: 'server app.post', body })
      .error('❌ No InteractionId. Message will not be dispatched.');
    result.Events.push({
      name: '*text',
      message: 'Error 1003 . No se recibió el id de interacción',
    });
    logger
      .child({ module: 'server app.post', result })
      .debug('↩️  Responded to Caller online');
    res.json(result);
    return;
  }

  switch (body.EventName) {
    case '*online': {
      let etlProcessor = 'DUAL';
      try {
        etlProcessor = body.Parameters.find(
          (param) => param.split('=')[0] === 'etlProcessor',
        ).split('=')[1];
      } catch (error) {
        logger
          .child({ module: 'server.online', parameters: body.Parameters, error })
          .debug('No etlProcessor specified.');
      }
      publishTaskToRabbitMQ({
        botName: body.BotName.toLowerCase(),
        interactionId: body.InteractionId,
        processingOptions: { etlProcessor },
      });
      result.Message = process.env.BOT_WAKE_UP_WORD || '/get_started';
      logger
        .child({ module: 'server app.post', body })
        .debug(`${body.InteractionId} ▶️  API Caller online`);
      await loadInitialFieldsIntoSlots({ body });
      result = await sendRestMessageToBot({ body: result });
      logger
        .child({ module: 'server /bot', result })
        .debug(`${result.InteractionId} ↩️  Responded to API Caller`
          + ' with: ""');
      res.json(result);
      break;
    }
    case '*offline': {
      logger
        .child({ module: 'server app.post', body })
        .debug(`${body.InteractionId} ➡️  API Caller offline`);
      // Nothing to respond to *offline
      break;
    }
    default: {
      if (
        !body
        || !body.Message
        || body?.Message?.length < 1
      ) {
        logger
          .child({ module: 'server app.post' })
          .debug(' ➡️  Client error');
        logger
          .child({ module: 'server app.post' })
          .error(' ❌ No body.Message found.'
            + 'Message will be dispatched as "/AsrError2000_Errores".');

        result.Events.push({
          name: '*text',
          message: '/AsrError2000_Errores',
        });
        // TODO: Ver si esto afecta el funcionamiento del scribe
        // result.Events.push({
        //   name: '*error',
        //   message: 'Error 2000. Message empty.',
        // });
        result = await sendRestMessageToBot({ body: result });
        logger
          .child({ module: 'server /bot', result })
          .debug(`${result.InteractionId} ⬅️ Responded to API Caller`
          + `with: "${result.Events.forEach((e) => e.message)}"`);
        res.json(result);
        break;
      }
      logger
        .child({ module: 'server', body })
        .debug(`${body.InteractionId}  🗣 Incoming: *text '${body.Message}'`);
      result = await sendRestMessageToBot({ body: result });
      logger
        .child({ module: 'server /bot', result })
        .debug(`${result.InteractionId} ⬅️ Responded to API Caller`
          + ` with: "${result.Events}"`);
      res.json(result);
      break;
    }
  }
});

app.get('/', (req, res) => {
  res.send('Voicebot API REST');
});

app.listen(port, () => logger
  .child({
    module: 'apiRest',
  })
  .info(`Endpoint /bot is listening on port ${port}`));
