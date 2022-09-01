const url = process.env.RABBITMQ_HOST || 'amqp://localhost';

module.exports.default = {
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
      queues: [],
      bindings: {
      },
      publications: {},
    },
  },
};
