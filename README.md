### REQUIERE CONCORDIA 1.15.0 O SUPERIOR!

## Voicebot API REST


Este servicio es el encargado de comunicarse con ChatServer y despachar el mensaje al bot correcto a través del parámetro BotName


## Changelog 1.0.1
- Se borraron todos los modulos de websocket, se mando eso a concordia-ws para separar los criterios de ruteo.
- Los params solo se cargan cuando el bot pide una transferencia, esto lo pidio Muke pero yo no entiendo bien porque.

## Changelog 1.0.3
- Los params se cargan en el bot antes del online