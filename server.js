const serialPath = '/dev/tty.usbserial-00000000'


var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var Sylvester = require('sylvester');
var Kalman = require('kalman').KF;

const SerialPort = require('serialport');
const parsers = SerialPort.parsers;

const parser = new parsers.Readline({
    delimiter: '\r\n'
});

const port = new SerialPort(serialPath, {
    baudRate: 9600
});

port.pipe(parser);


var GPS = require('gps');
var gps = new GPS;

// Simple Kalman Filter set up
var A = Sylvester.Matrix.I(2);
var B = Sylvester.Matrix.Zero(2, 2);
var H = Sylvester.Matrix.I(2);
var C = Sylvester.Matrix.I(2);
var Q = Sylvester.Matrix.I(2).multiply(1e-11);
var R = Sylvester.Matrix.I(2).multiply(0.00001);

// Measure
var u = $V([0, 0]);

var filter = new Kalman($V([0, 0]), $M([
    [1, 0],
    [0, 1]
]));

gps.on('data', function (data) {

    if (data.lat && data.lon) {

        filter.update({
            A: A,
            B: B,
            C: C,
            H: H,
            R: R,
            Q: Q,
            u: u,
            y: $V([data.lat, data.lon])
        });

        gps.state.position = {
            cov: filter.P.elements,
            pos: filter.x.elements
        };
    }

    io.emit('position', gps.state);
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

http.listen(3000, function () {

    console.log('listening on port: 3000');
});

parser.on('data', function (data) {
    gps.update(data);
});