// Store outgoing task params

const axios = require('axios');
const { logger } = require('../utils/logger');

const storeOutgoingTaskParams = async (taskParams) => {
  const { data } = await axios.post(
    `${process.env.DBINTERFACE_URL}/outgoing_task_params/update_or_create/`,
    taskParams,
  );

  logger
    .child({ module: 'storeOutgoingTaskParams' })
    .debug(`Stored outgoing task with idTarea: ${data.idTarea}`);
};

module.exports = storeOutgoingTaskParams;
