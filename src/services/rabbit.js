// RabbitMQ
const rascal = require('rascal');
const { logger } = require('../utils/logger');

const url = process.env.RABBITMQ_HOST || 'amqp://localhost';

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
      queues: [
        'analytics_etl',
      ],
      bindings: {
        analytics: {
          source: 'analytics_exchange',
          destination: 'analytics_etl',
          destinationType: 'queue',
          bindingKey: 'analytics_route',
        },
      },
      publications: {
        analytics_publication: {
          vhost: 'analytics',
          exchange: 'analytics_exchange',
          routingKey: 'analytics_route',
        },
      },
    },
  },
};

logger.child(definitions).trace('definitions');
const config = rascal.withDefaultConfig(definitions);

module.exports.publishTaskToRabbitMQ = async function publish(
  {
    botName,
    interactionId,
    processingOptions,
  },
) {
  try {
    const broker = await rascal.BrokerAsPromised.create(config);
    broker.on('error', console.error);

    // Publish
    const publication = await broker.publish(
      'analytics_publication',
      {
        botName,
        interactionId,
        processingOptions,
      },
    );
    publication.on('error', console.error);
  } catch (error) {
    logger
      .child({ module: 'rabbit.publish' })
      .error(error);
  }
  // amqp.connect(rabbitUrl, (error0, connection) => {
  //   if (error0) {
  //     throw error0;
  //   }
  //   connection.createChannel((error1, channel) => {
  //     if (error1) {
  //       throw error1;
  //     }

  //     const queue = queueName;

  //     channel.assertQueue(queue, {
  //       durable: true,
  //     });
  //     channel.sendToQueue(queue, Buffer.from(data), { persistent: true });

  //     logger.child({ module: 'sendTask' }).info(`[x] Sent ${data}`);
  //   });
  //   setTimeout(() => {
  //     connection.close();
  //     // process.exit(0);
  //   }, 500);
  // });
};
