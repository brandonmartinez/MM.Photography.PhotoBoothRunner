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
	var http = require('http'),  
	    io = require('socket.io'),
	    fs = require('fs'),
	    debug = require('debug')('server'),
	    configuration = {
	    	serverHttpPort: options.serverHttpPort || 80
	    };

	// for the sake of this example, lets have some html to serve up.
	var servedPages = {};

	// business as usual, create an http server.
	var server = http.createServer(function (request, response) {  
		debug('Request received', request.url);
		try {
			var html = servedPages[request.url] || fs.readFileSync('./lib' + (request.url === '/'? '/ui.html' : request.url)).toString();
			servedPages[request.url] = html;
			//response.writeHead(200, {'Content-Type': 'text/html'});
	    response.writeHead(200);
			response.end(html);
		}
		catch(error) {
			debug('An error occurred during the request for ' + request.url, error);
			response.writeHead(error.errno === 34? 404 : 500);
			response.end();
		}
	});

	// listen on port
	server.listen(configuration.serverHttpPort);

	// attach socket.io to the server
	var socket = io.listen(server);

	// set up an event that handles connections that get made to the server.
	// the callback for this event will supply the socket as a parameter.
	socket.on('connection', function(client) {  
	  // on the socket we can attach events, lets respond to the client when
	  // we recieve a message.
	  client.on('message', function(message) {
	    // we can log the message on the server side.
	    console.log(message); 
	    // then send it back to the client.
	    client.send('Thanks for telling me "' + message + '"');
	  });
	});
};