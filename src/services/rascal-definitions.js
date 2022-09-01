const url = process.env.RABBITMQ_HOST || 'amqp://localhost';

module.exports.definitions = {
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
