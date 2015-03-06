/*jslint node: true, white: true */

/*
 * PhotoBoothRunner
 * https://github.com/brandonmartinez/MM.Photography.PhotoBoothRunner
 *
 * Copyright (c) 2015 Martinez Media, LLC
 * Licensed under the MIT license.
 */

'use strict';

exports.start = function (options) {
	var express = require('express'),
		app = express(),
		http = require('http').Server(app),
		io = require('socket.io')(http),
		debug = require('debug')('photoboothserver:debug'),
		configuration = {
			serverHttpPort: options.serverHttpPort || 80
		};

		// Configure Express
		app.use(express.static(__dirname + '/public'));

		app.get('/', function(req, res) {
			debug('Home page request received.');
			res.sendFile(__dirname + '/index.html');
		});

		// Configure HTTP server
		http.listen(configuration.serverHttpPort, function(){
			debug('listening on *:%s', configuration.serverHttpPort);
		});

		// Configure Socket.IO
		io.on('connection', function(socket){
			debug('a user connected', socket);

			socket.on('message', function(message){
				io.emit('message', message);
			});
		});

		setInterval(function() {
			io.emit('message', 'A button was pressed at' + new Date() + '.');
		}, 5*1000);
};