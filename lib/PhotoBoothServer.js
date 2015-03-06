/*jslint node: true, white: true */

/*
 * PhotoBoothRunner
 * https://github.com/brandonmartinez/MM.Photography.PhotoBoothRunner
 *
 * Copyright (c) 2015 Martinez Media, LLC
 * Licensed under the MIT license.
 */

'use strict';

exports.server = function () {
	// Private Variables
	var self = this,
		express = require('express'),
		app = express(),
		http = require('http').Server(app),
		io = require('socket.io')(http),
		debug = require('debug')('photoboothserver:debug'),
		configuration;

	// Private Functions
	function configureAndStartServer() {
		// Configure Express
		app.use(express.static(__dirname + '/public'));

		app.get('/', function(req, res) {
			res.sendFile(__dirname + '/index.html');
		});

		// Configure HTTP server
		http.listen(configuration.serverHttpPort, function(){
			debug('listening on *:%s', configuration.serverHttpPort);
		});

		// Configure Socket.IO
		io.on('connection', function(socket){
			debug('Socket.IO connected at %s.', new Date());
			socket.on('shutter-pressed', function(message) {
				debug('shutter-pressed: %s', message);
			});
			// socket.on('message', function(message){
			// 	io.emit('message', message);
			// });
		});
	}

	// Public Properties
	self.configuration = configuration;

	// Public Methods
	self.shutterPressed = function() {
		io.emit('shutter-pressed', {
			text: 'Shutter was pressed.',
			datetime: new Date()
		});
	};

	self.forceQuitPressed = function() {
		io.emit('forcequit-pressed', {
			text: 'A request to quit the application was made.',
			datetime: new Date()
		});
	};

	self.photoCaptured = function(location) {
		io.emit('photocaptured', {
			text: 'A photo has been captured',
			datetime: new Date(),
			location: location
		});
	};

	self.init = function(options) {
		configuration = {
			serverHttpPort: options.serverHttpPort || 80
		};
		
		configureAndStartServer();	
	};

	self.disconnect = function(){
		http.close(function () {
			process.exit(0);
		});
	};
};