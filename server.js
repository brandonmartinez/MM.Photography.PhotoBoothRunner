/*jslint node: true, white: true */

/*
 * PhotoBoothRunner - Server
 * https://github.com/brandonmartinez/MM.Photography.PhotoBoothRunner
 *
 * Copyright (c) 2015 Martinez Media, LLC
 * Licensed under the MIT license.
 */

var PhotoBoothServer = require('./lib/PhotoBoothServer.js').server,
	server = new PhotoBoothServer(),
	PhotoBoothRunner = require('./lib/PhotoBoothRunner.js');

// Configure and initialize our server
server.init({
	serverHttpPort: 8888
});
// PhotoBoothRunner.start({
// 	//PhotoCapturer: 'echo $USER captured photo'
// }, server);