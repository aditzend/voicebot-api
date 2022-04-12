/*
 * Voicebot API
 * sendJob.js
 */

const moment = require("moment");
const sendMessageToBot = require("./sendMessageToBot.js");
const {logger} = require("./logger");

module.exports = (socket) => {
  let i = 1;
  let currentTime = moment().format();
  let limitTime = moment(currentTime).subtract(
    waitTimeBetweenMessages,
    "seconds"
  );

  for (let key in Queue.time_stamps) {
    if (Queue.bodies[key] === undefined) {
      logger.child({ module: `sendJobs` }).error("No messages in pool.");
    } else {
      logger
        .child({
          module: `sendJobs`,
          position: `${i}`,
          connectionId: `${key}`,
          time: `${Queue.time_stamps[key]}`,
          launch_phrase: `${Queue.launch_phrases[key]}`,
        })
        .debug(`body msg: ${Queue.bodies[key]["Message"]}`);
      if (Queue.time_stamps[key] === undefined) {
        logger.child({ module: `sendJobs` }).error("no messages");
      } else {
        if (moment(Queue.time_stamps[key]).isBefore(limitTime)) {
          sendMessageToBot(socket, Queue.bodies[key]);
          delete Queue.bodies[key];
          delete Queue.time_stamps[key];
          delete Queue.launch_phrases[key];
        }
      }
    }

    i++;
  }
};

// SOCKET_SERVER.on("connection", (socket) => {
//   let job = function () {

//   };

//   setInterval(() => job(), pollingInterval);
// });
