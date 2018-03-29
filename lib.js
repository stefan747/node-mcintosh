"use strict";

let SerialPort = require("serialport"),
    util       = require("util"),
    events     = require('events'),
    usbDetect  = require('usb-detection');

function McIntosh() {
    this.seq = 0;
}

util.inherits(McIntosh, events.EventEmitter);

let _processw = function() {
    if (!this._port) return;
    if (this._woutstanding) return;
    if (this._qw.length == 0) return;

    this._woutstanding = true;
    console.log("[McIntosh] writing:", this._qw[0]);

    this._port.write(this._qw[0] + "\n",
                    (err) => {
                        if (err) return;
                        this._qw.shift();
                        this._woutstanding = false;
                        setTimeout(() => { _processw.call(this); }, 150);
                    });
}

function send(val, cb) {
    this._qw.push(val);
    _processw.call(this);
};

McIntosh.prototype.volume_up = function() {
        send.call(this, "(VUP Z1)\n");
};
McIntosh.prototype.volume_down = function() {
       send.call(this, "(VDN Z1)\n");
};
McIntosh.prototype.set_volume = function(val) {
	if (this.properties.volume == val) return;
	if (this.volumetimer) clearTimeout(this.volumetimer);
        this.volumetimer = setTimeout(() => {
            send.call(this, "(VST Z1 " + val + ")\n");
	}, 50)
};
McIntosh.prototype.get_status = function() {
       send.call(this, "(QRY)\n");
};
McIntosh.prototype.power_off = function() {
       send.call(this, "(POF Z1)\n");
	        let val = "Standby";
	        if (this.properties.source != val) { this.properties.source = val; this.emit('source', val); }
};
McIntosh.prototype.power_on = function() {
       send.call(this, "(PON Z1)\n");
};
McIntosh.prototype.set_source = function(val) {
        send.call(this, "(INP Z1 " + val + ")\n");
};
McIntosh.prototype.mute = function(val) {
        send.call(this, "(MUT Z1 " + val +")\n");
};

McIntosh.prototype.init = function(opts, closecb) {
    let self = this;

    this._qw = [];
    this._woutstanding = false;

    this.properties = { volume: opts.volume || 1, source: opts.source || '8', usbVid: opts.usbVid };

    this.initializing = true;

        this._port = new SerialPort(opts.port, {
            baudRate: opts.baud || 115200,
            parser:   SerialPort.parsers.readline("\n")
        });

        this._port.on('data', data => {
	    if (this.initializing) {
		this.initializing = false;
		this.emit('connected');
            }
	    data = data.trim();
	    console.log('[McIntosh] received: %s', data);

	    if (/^\(VST Z1 ([0-9]*)\)$/.test(data)) {
	       let val = Number(data.trim().replace(/^\(VST Z1 ([0-9]*)\)$/, "$1"));
	       if (this.properties.volume != val) {
			   console.log('Changing volume from %d to %d', this.properties.volume, val);
		   this.properties.volume = val;
	           this.emit('volume', val);
	       }

	    } else if (/^.*\(POF Z1\)$/.test(data)) {
	        let val = "Standby";
	        if (this.properties.source != val) { this.properties.source = val; this.emit('source', val); }

	    } else if (/^.*\(MUT Z1 1\)$/.test(data)) { // Mute or Muted
	        let val = "Muted";
	        if (this.properties.source != val) { this.properties.source = val; this.emit('source', val); }

	    } else if (/^.*\(MUT Z1 0\)$/.test(data)) { // UnMute or UnMuted
	        let val = "UnMuted";
	        if (this.properties.source != val) { this.properties.source = val; this.emit('source', val); }

	    } else if (/^.*\(INP Z1 ([0-9])\)$/.test(data)) {
	        let val = data.trim().replace(/^.*\(INP Z1 ([0-9])\)$/, "$1");
	        if (this.properties.source != val) { this.properties.source = val; this.emit('source', val); }

		} else if (/^.*\(OP1 Z1 ([0-9])\)$/.test(data)) {
			let val = "Passthru";
	        if (this.properties.source != val) { this.properties.source = val; this.emit('source', val); }
	    }
		  else {
			console.log('No matching string');
		  }
        });

    

    let timer = setTimeout(() => {
	if (this.initializing) {
            this.initializing = false;
	    this.emit('connected');
	}
    }, 3000);
    this._port.on('open', err => {
        this.emit('preconnected');

            send.call(this, "(PON Z1)\n");
			send.call(this, "(INP Z1 " + this.properties.source + ")\n");
//            send.call(this, "(VDN Z1 " + this.properties.volume + ")\n");
//            send.call(this, "(VUP Z1 " + this.properties.volume + ")\n");
            send.call(this, "(VST Z1 " + this.properties.volume + ")\n");
    });

		//detection of McIntosh USB disconnection (at power-off)
		usbDetect.on('remove:' + this.properties.usbVid, device => { 
			console.log('remove', device); 
			let val = "Standby";
			if (this.properties.source != val) { this.properties.source = val; this.emit('source', val); }
		});

    this._port.on('close',      ()  => { this._port.close(() => { this._port = undefined; if (closecb) { var cb2 = closecb; closecb = undefined; cb2('close');      } }) });
    this._port.on('error',      err => { this._port.close(() => { this._port = undefined; if (closecb) { var cb2 = closecb; closecb = undefined; cb2('error');      } }) });
    this._port.on('disconnect', ()  => { this._port.close(() => { this._port = undefined; if (closecb) { var cb2 = closecb; closecb = undefined; cb2('disconnect'); } }) });
};

McIntosh.prototype.start = function(opts) {
    this.seq++;

    usbDetect.startMonitoring();
    let closecb = (why) => {
        this.emit('disconnected');
        if (why != 'close') {
            var seq = ++this.seq;
            setTimeout(() => {
                if (seq != this.seq) return;
                this.start(opts);
            }, 1000);
        }
    };

    if (this._port) {
        this._port.close(() => {
            this.init(opts, closecb);
        });
    } else {
        this.init(opts, closecb);
    }
};

McIntosh.prototype.stop = function() {
    this.seq++;
    usbDetect.stopMonitoring();
    if (this._port)
        this._port.close(() => {});
};

exports = module.exports = McIntosh;

