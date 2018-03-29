# McIntosh Line Device Control via RS232

The McIntosh RS232 protocol implementation is based on [McIntosh Labs equipment control](https://community.particle.io/t/mcintosh-labs-audio-equipment-control/16338) article and documentation.

Configure your McIntosh:

* Link speed: 115200
* Identifier: McIntosh

Initialization:

```javascript
var McIntosh = require("node-mcintosh");
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

* `'power_on'`
* `'power_off'`
* `'volume'`
* `'source'`
* `'mute'`

Starting/Stopping the connection to the McIntosh device:

```javascript
d.start(port, baud);
```

* `port` should be like `'/dev/cu.usbserial'` or something similar on MacOS or Linux, or `'COM3'` on Windows
* `baud` should be like `115200`, or whatever you configured your McIntosh to be (see above)



```javascript
d.stop();
```
McIntosh RS232 issues and workarounds

	- C47 does not send any response when it goes in stand by. This means the extension would loose track of the current state.
      Workaround used is to monitor USB state of the connected USB DAC (I am using the McIntosh C47's DAC via USB connection). C47 is closing DAC USB on standby.

	 - I'm using the Passthru feature on C47 (for Hometheater), but when this mode is initialized, there is no indication via RS232.
      Workaround is based on RS232 OP1 command response (output 1) which is returned back at this moment.
