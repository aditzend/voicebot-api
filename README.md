### REQUIERE CONCORDIA 1.15.0 O SUPERIOR!

## BotFarm Gateway Version apirest-experimental


Este servicio es el encargado de comunicarse con ChatServer y despachar el mensaje al bot correcto a través del parámetro BotName

### Para correr 




### Configuracion de los bots

Tiene que haber una variable de entorno llamada BOT_URIS={"NombreDelBot":"ip o dockerservice o url: puerto"}, 
por ejemplo, si ChatServer enviá un llamado con BotName="PI_Bot" y nosotros tenemos en docker un servicio de 
atenea llamado pi_bot que hacia afuera de sus contenedores expone el puerto 15005, la configuración debe ser BOT_URIS={"PI_Bot":"atenea_pi_bot:15005"}

Cada bot va dentro de la variable, de la misma manera. Atenea Gateway parsea el contenido de esta variable y extrae la address.

## Changelog 0.2.12

- Se puede simular el error de falta de InteractionId con el mensaje ```error:1003``` 
- En vez de enviar un error que rompe concordia se envia un json y se loguea el error a gateway.
- El mensaje de error no se muestra al usuario sino que se guarda en el campo "source" del mensaje de transferencia.

