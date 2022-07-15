// RabbitMQ
const amqp = require('amqplib/callback_api');
const { logger } = require('./logger');

const rabbitUrl = process.env.RABBITMQ_HOST || 'amqp://localhost';

module.exports.sendTask = (queueName, data) => {
  amqp.connect(rabbitUrl, (error0, connection) => {
    if (error0) {
      throw error0;
    }
    connection.createChannel((error1, channel) => {
      if (error1) {
        throw error1;
      }

      const queue = queueName;

      channel.assertQueue(queue, {
        durable: true,
      });
      channel.sendToQueue(queue, Buffer.from(data), { persistent: true });

      logger.child({ module: 'sendTask' }).info(`[x] Sent ${data}`);
    });
    setTimeout(() => {
      connection.close();
      // process.exit(0);
    }, 500);
  });
};
