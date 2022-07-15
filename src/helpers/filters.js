const { logger } = require('../utils/logger');

/**
 * @param {Object} argObject: message {String}
 * @returns {String}
 */
module.exports.cleanMessage = function voiceBotCleaner({ message = '' }) {
  // todo a minusculas
  let cleanedMessage = message.toLowerCase();

  // sacamos tildes
  cleanedMessage = cleanedMessage.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // sacamos los caracteres raros que esta tirando concordia 15
  cleanedMessage = cleanedMessage.replace('cmd=&msg=', '');
  while (cleanedMessage.includes('&')) {
    cleanedMessage = cleanedMessage.replace('&', '');
  }

  // sacamos el $
  cleanedMessage = cleanedMessage.replace(/\$/g, ' pesos ');

  // separamos los centavos
  cleanedMessage = cleanedMessage.replace(/centavo/g, ' centavo');

  // reemplazamos sentado por centavo
  cleanedMessage = cleanedMessage.replace(/sentado/g, 'centavo');

  // cambiamos sentados por centavos, es un error comun del ASR cuando hay ruido de fondo
  cleanedMessage = cleanedMessage.replace(/\ssentado/g, ' centavo');

  // si hay un con, borramos los centavos
  const conRegex = /\d\scon\s\d/g;
  const conReplacementRegex = /\scon\s/g;
  const centavoReplacementRegex = /(centavos?)||(sentados?)/g;
  if (cleanedMessage.match(conRegex)) {
    // borramos centavo o centavos
    cleanedMessage = cleanedMessage.replace(centavoReplacementRegex, '');
    // reemplazamos el con por coma
    cleanedMessage = cleanedMessage.replace(conReplacementRegex, '.');
  }

  if (process.env.NUMBER_CONDENSING_ENABLED === 'true') {
    const asrBugRegex = /\d\s\d/;
    const numberOrSpaceRegex = /\d|\s/;
    const spaceRegex = /\s/;
    const notNumberRegex = /\D/;
    const match = asrBugRegex.exec(cleanedMessage);
    if (match) {
      logger.trace(`match found at ${match.index} char:${cleanedMessage[match.index]}`);
      let firstCursor = match.index;
      while (numberOrSpaceRegex.exec(cleanedMessage[firstCursor])) {
        firstCursor -= 1;
      }
      logger.trace(`First cursor stopped at ${firstCursor}, char : ${cleanedMessage[firstCursor]}`);
      let secondCursor = firstCursor + 1;
      while (spaceRegex.exec(cleanedMessage[secondCursor])) {
        secondCursor += 1;
      }
      logger.trace(`Second cursor stopped at ${secondCursor}, char : ${cleanedMessage[secondCursor]}`);

      let thirdCursor = secondCursor;

      while (numberOrSpaceRegex.exec(cleanedMessage[thirdCursor])) {
        thirdCursor += 1;
      }
      logger.trace(`Third cursor stopped at ${thirdCursor}, char : ${cleanedMessage[thirdCursor]}`);

      let fourthCursor = cleanedMessage[thirdCursor] === undefined ? thirdCursor - 1 : thirdCursor;
      while (notNumberRegex.exec(cleanedMessage[fourthCursor])) {
        fourthCursor -= 1;
      }
      logger.trace(`Fourth cursor stopped at ${fourthCursor}, char : ${cleanedMessage[fourthCursor]}`);

      const toBeCondensed = cleanedMessage.substring(secondCursor, fourthCursor + 1);
      const condensed = toBeCondensed.replace(/\s/g, '');
      logger.trace(`Condensed ${toBeCondensed} to ${condensed}`);

      const beforeString = cleanedMessage.substring(0, secondCursor);
      const afterString = cleanedMessage.substring(fourthCursor + 1);

      cleanedMessage = beforeString + condensed + afterString;

      logger.trace(`Final message: ${cleanedMessage}`);
    }
  }

  logger
    .child({ module: 'filters voiceBotCleaner' })
    .trace(`cleaned : ${cleanedMessage}`);

  return cleanedMessage;
};
