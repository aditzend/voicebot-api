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

    // sacamos las tildes
    body.Message = body.Message.normalize("NFD").replace(
      /[\u0300-\u036f]/g,
      ""
    );

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

        if (body.EventName === "*online") {
            
            body.Message = process.env.BOT_WAKE_UP_WORD || "/get_started";
            logger.child({ body }).debug(`${body.InteractionId} 🔌  Client: *online`)
            send(res, body)
        } else {
            // *text
            logger.child({ body }).debug(`${body.InteractionId} 🗣 Client: *text '${body.Message}'`)
            send(res, body)
        }

    // error 1003, vino sin InteractionId el mensaje
    } else {

        if (body.EventName === "*offline") {
            logger.debug({message: "OFFLINE"});
        } else {
            let msg = body;
            msg.error_number = "1003";
            logger
              .child({
                module: `apiRest app.post`,
              })
              .error(msg, `NO InteractionId PARAM RECEIVED, CHECK CONCORDIA`);
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