// RabbitMQ
const rascal = require('rascal');
const { logger } = require('../utils/logger');

const url = process.env.RABBITMQ_HOST || 'amqp://localhost';

// const { definitions } = require('./rascal-definitions-empty');

module.exports.publishTaskToRabbitMQ = async function publish(
  {
    botName,
    interactionId,
    processingOptions,
  },
) {
  try {
    const definitions = {
      vhosts: {
        analytics: {
          connection: {
            url,
          },
          exchanges: {
            analytics_exchange: {
              assert: true,
              type: 'direct',
            },
          },
          queues: [`${botName}_etl`],
          bindings: {},
          publications: {},
        },
      },
    };
    // definitions.vhosts.analytics.queues = [`${botName}_etl`];
    definitions.vhosts.analytics.bindings[botName] = {
      source: 'analytics_exchange',
      destination: `${botName}_etl`,
      destinationType: 'queue',
      bindingKey: `${botName}_route`,
    };
    definitions.vhosts.analytics.publications[
      `${botName}_publication`
    ] = {
      vhost: 'analytics',
      exchange: 'analytics_exchange',
      routingKey: `${botName}_route`,
    };
    logger
      .child({
        module: 'rabbit', botName, interactionId, processingOptions, definitions,
      })
      .info('Publishing task to RabbitMQ');
    const config = rascal.withDefaultConfig(definitions);
    const broker = await rascal.BrokerAsPromised.create(config);
    broker.on('error', (err) => {
      logger
        .child({ module: 'rabbit', err })
        .error('Error while publishing task to RabbitMQ');
    });

    // Publish
    const publication = await broker.publish(
      `${botName}_publication`,
      {
        botName,
        interactionId,
        processingOptions,
      },
    );
    publication.on('error', (err) => {
      logger
        .child({ module: 'rabbit', err })
        .error('Error while publishing task to RabbitMQ');
    });
  } catch (error) {
    logger
      .child({ module: 'rabbit.publish' })
      .error('Error publishing task to RabbitMQ', error);
  }
};
