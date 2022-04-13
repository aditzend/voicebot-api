const { addColors, createLogger, format, transports } = require("winston");

const logLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  trace: 5,
};

var logger = {};

const colors = {
  fatal: "red",
  error: "magenta",
  warn: "yellow",
  info: "green",
  debug: "cyan",
  trace: "blue",
};

if (process.env.NODE_ENV !== "production") {
  // logs copados para desarrollar y hacer debug local
  logger = createLogger({
    levels: logLevels,

    transports: [
      new transports.Console({
        level: process.env.LOG_LEVEL,

        format: format.combine(
          format.colorize(),
          format.prettyPrint(),
          format.simple()
        ),
      }),
    ],
  });

  

  addColors(colors);
} else {
// TODO ver como transportar estos logs porque son los mismos que desarrollo
logger = createLogger({
  levels: logLevels,
  transports: [
    new transports.Console({
      level: process.env.LOG_LEVEL,

      format: format.combine(
        format.colorize(),
        format.prettyPrint(),
        format.simple()
      ),
    }),
  ],
});




  // logger = createLogger({
  //   level: process.env.LOG_LEVEL,
  //   levels: logLevels,
  //   colors: colors,
  //   transports: [
  //     //
  //     // - Write all logs with level `error` and below to `error.log`
  //     // - Write all logs with level `info` and below to `combined.log`
  //     //
  //     // new winston.transports.File({ filename: "error.log", level: "error" }),
  //     // new winston.transports.File({ filename: "combined.log" }),
  //     new transports.Console(),
  //   ],

  //   format: format.combine(format.timestamp(), format.json()),

  //   defaultMeta: {
  //     service: `${process.env.BOT_NAME}_gateway`,
  //   },
  // });
}

module.exports = {
  logger,
};
