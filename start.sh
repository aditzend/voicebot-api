#!/bin/bash
LOG_LEVEL="trace" \
NODE_ENV="production" \
BOT_ENV="development" \
BOT_DEV_URL="http://192.168.43.169:11005" \
BLUEBIRD_W_FORGOTTEN_RETURN=0 \
RABBITMQ_HOST="amqp://192.168.43.169:35672" \
BOT_WAKE_UP_WORD="/start" \
PRODUCTION_RASA_SERVICE_NAME="rasa" \
NUMBER_CONDENSING_ENABLED="true" \
node --trace-warnings src/main 
