const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const send = require('./sendRestMessageToBot.js')
const {logger} = require("./logger");



const app = express()
const port=process.env.API_PORT || 8656

app.use(cors())

app.use(bodyParser.urlencoded({ extended: false}))
app.use(bodyParser.json())

app.post('/bot', (req, res) => {
    const body = req.body

    if (body.Message === undefined || body.Message === null) body.Message = "";

    // logear el mensaje que crudo como llega
    logger.child({...body}).debug(`${body.InteractionId} 📥 BEFORE FILTERS: "${body.Message}"`);

    // sacamos las tildes
    body.Message = body.Message.normalize("NFD").replace(
      /[\u0300-\u036f]/g,
      ""
    );

    // sacamos el $
    body.Message = body.Message.replace(/\$/g, " pesos ");


    // separamos los centavos
    body.Message = body.Message.replace(/centavo/g, " centavo");

    // reemplazamos sentado por centavo
    body.Message = body.Message.replace(/sentado/g, "centavo");

    // cambiamos sentados por centavos, es un error comun del ASR cuando hay ruido de fondo
    body.Message = body.Message.replace(/\ssentado/g, " centavo");

    // si hay un con, borramos los centavos
    const conRegex = /\d\scon\s\d/g;
    const conReplacementRegex = /\scon\s/g
    const centavoRegex = /(\d\scentavos?)||(\d\ssentados?)/g;
    const centavoReplacementRegex = /(centavos?)||(sentados?)/g;
    if (body.Message.match(conRegex)) {
      // borramos centavo o centavos
      body.Message = body.Message.replace(centavoReplacementRegex, "");
      // reemplazamos el con por coma
      body.Message = body.Message.replace(conReplacementRegex, ".");
    }

    //logear el mensaje despues de los filtros
    logger.child({...body}).debug(`${body.InteractionId}   🦿 AFTER FILTERS: "${body.Message}"`);


    // TODO Revisar esto, no seria necesario para el voicebot. 
    // if (body.Message.includes("cmd=&msg=")) body.Message = body.Message.replace("cmd=&msg=", "");
    // if (body.Message.includes("&")) body.Message = body.Message.replace("&", "");
    // if (body.Message.includes("&")) body.Message = body.Message.replace("&", "");

    // primero veo si tengo un id de interaccion
    if (body.InteractionId && body.Message !== "error:1003") {

        const connectionID = body.InteractionId;
        // se supone que todos los bots corren en servidores propios
        logger.debug({
            origin: "USER",
            connection_id: connectionID,
            user_name: body.UserName,
            bot_name: body.BotName,
            event_name: body.EventName,
            message: body.Message,
        });

        switch (body.EventName) {
            case "*online": {
              body.Message = process.env.BOT_WAKE_UP_WORD || "/get_started";
            logger.child({ body }).debug(`${body.InteractionId} 🔌  Client: *online`)
            send(res, body)
            break;
            }
            case "*offline": {
                logger.child({ body }).debug(`${body.InteractionId} 🔌  Client: *offline`)
                // body.EventName = "*offline";
                // body.Message = `${body.InteractionId} is now offline`;
                // send(res, body)
                break;
            }
            case "*text": {
              if (body.Message.length > 0) {
                logger.child({ body }).debug(`${body.InteractionId} 🗣 Client: *text '${body.Message}'`)
                let msgForBot = body.Message.toLowerCase();


                if (process.env.NUMBER_CONDENSING_ENABLED === "true") {
                  let asrBugRegex = /\d\s\d/;
                  let numberOrSpaceRegex = /\d|\s/;
                  let spaceRegex = /\s/;
                  let notNumberRegex = /\D/;
                  let match = asrBugRegex.exec(msgForBot)
                  if (match) {
                    logger.trace("match found at " + match.index + " char:" + msgForBot[match.index])
                    let firstCursor = match.index;
                    while (numberOrSpaceRegex.exec(msgForBot[firstCursor])) {
                      firstCursor--;
                    } 
                    logger.trace(`First cursor stopped at ${firstCursor}, char : ${msgForBot[firstCursor]}`)
                    let secondCursor = firstCursor + 1;
                    while (spaceRegex.exec(msgForBot[secondCursor])) {
                      secondCursor++;
                    }
                    logger.trace(`Second cursor stopped at ${secondCursor}, char : ${msgForBot[secondCursor]}`)

                    let thirdCursor = secondCursor

                    while (numberOrSpaceRegex.exec(msgForBot[thirdCursor])) {
                      thirdCursor++;
                    }
                    logger.trace(`Third cursor stopped at ${thirdCursor}, char : ${msgForBot[thirdCursor]}`)

                    let fourthCursor = msgForBot[thirdCursor] === undefined ? thirdCursor - 1 : thirdCursor;
                    while (notNumberRegex.exec(msgForBot[fourthCursor])) {
                      fourthCursor--;
                    }
                    logger.trace(`Fourth cursor stopped at ${fourthCursor}, char : ${msgForBot[fourthCursor]}`)

                    let toBeCondensed = msgForBot.substring(secondCursor, fourthCursor + 1);
                    let condensed = toBeCondensed.replace(/\s/g, '');
                    logger.trace(`Condensed ${toBeCondensed} to ${condensed}`)

                    let beforeString = msgForBot.substring(0, secondCursor);
                    let afterString = msgForBot.substring(fourthCursor + 1);

                    msgForBot = beforeString + condensed + afterString;

                    logger.trace(`Final message: ${msgForBot}`)
                  }


                  
                }
                
                body.Message = msgForBot
                send(res, body)
                break;
              } else {
                logger.child({ body }).error(`2000 : ${body.InteractionId} 🗣 Client: *text empty`)

                body.Message = "/2000";
                send(res, body)
              }
            }
          }
       
    // error 1003, vino sin InteractionId el mensaje
    } else {

        if (body.EventName === "*offline") {
          logger.child({ body }).debug(`${body.InteractionId} 🗣 Client: *offline '${body.Message}'`)
        } else {
            let msg = body;
            msg.error_number = "1003";
            logger
              .child({
                module: `apiRest app.post`,
                body,
                req
              })
              .error(`NO InteractionId PARAM RECEIVED`);
        }
    // res.json({id:1, msg: `tu mensaje fue ${msg}`})
    }
})

app.get('/', (req, res) => {
    res.send(`Voicebot API REST ${VERSION}`)


})

app.listen(port, () =>
  logger
    .child({
      module: `apiRest`,
    })
    .info("Endpoint /bot is listening on port " + port)
);