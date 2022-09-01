const url = process.env.RABBITMQ_HOST || 'amqp://localhost';

module.exports.default = {
  vhosts: {
    analytics: {
      connection: {
        url,
      },
    },
  },
};
