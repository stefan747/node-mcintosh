# McIntosh Line Device Control via RS232

Configure your McIntosh:

* Link speed: 115200
* Identifier: McIntosh

Initialization:

```javascript
var McIntoshMcIntosh = require("node-mcintosh");
var d = new McIntosh();
```

Listening to events:

```javascript
d.on('status', function(status) { });
d.on('changed', function(property, value) { });
```

`status` can be one of the following:

* `'connecting'`
* `'initializing'`
* `'connected'`
* `'disconnected'`

`property` can be one of the following:

* `'power'`
* `'volume'`
* `'source'`
* `'mute'`
* `'riaa'`

Starting/Stopping the connection to the McIntosh device:

```javascript
d.start(port, baud);
```

* `port` should be like `'/dev/cu.usbserial'` or something similar on MacOS or Linux, or `'COM3'` on Windows
* `baud` should be like `115200`, or whatever you configured your McIntosh to be (see above)



```javascript
d.stop();
```
