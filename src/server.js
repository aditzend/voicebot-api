const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { cleanMessage } = require('./helpers/filters');
const { sendRestMessageToBot, loadInitialFieldsIntoSlots } = require('./services/rasa');
const { logger } = require('./utils/logger');

const app = express();
const port = process.env.API_PORT || 8656;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post('/bot', async (req, res) => {
  // Do not mutate the argument
  const { body } = req;
  // Prepare the response in the `result` mutable object
  let result = body;

  // Apply filters
  if (body.message) {
    // logear el mensaje despues de los filtros
    result.message = cleanMessage(body.message);
    logger
      .child({ module: 'server', body })
      .debug(`${body.InteractionId}  FROM "${body.Message}" TO FILTERED: "${result.Message}"`);
  }

  // Check if there is an InteractionId
  if (!body.InteractionId) {
    logger
      .child({ module: 'server app.post', body })
      .error('❌ No InteractionId. Message will not be dispatched.');
    result.Events.push({
      name: '*error',
      message: 'Error 1004 . No InteractionId received.',
    });
    res.json(result);
    return;
  }

  switch (body.EventName) {
    case '*online': {
      result.Message = process.env.BOT_WAKE_UP_WORD || '/get_started';
      logger
        .child({ module: 'server app.post', body })
        .debug(`${body.InteractionId} 🔌  Client: *online`);
      await loadInitialFieldsIntoSlots({ body });
      result = await sendRestMessageToBot({ body: result });
      res.json(result);
      break;
    }
    case '*offline': {
      logger
        .child({ module: 'server app.post', body })
        .debug(`${body.InteractionId} 🗣 Client: *offline`);
      // Nothing to respond to *offline
      break;
    }
    default: {
      if (body.Message.length < 1) {
        logger
          .child({ module: 'server app.post', body })
          .error('❌ No Message. Message will not be dispatched.');
        result.Events.push({
          name: '*error',
          message: 'Error 2000 . Message empty.',
        });
        res.json(result);
        break;
      }
      logger
        .child({ module: 'server', body })
        .debug(`${body.InteractionId} 🗣 Client: *text '${body.Message}'`);
      result = await sendRestMessageToBot({ body: result });
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
