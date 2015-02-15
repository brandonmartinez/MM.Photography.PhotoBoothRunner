/*jslint node: true, white: true */

/*
 * PhotoBoothRunner - Server
 * https://github.com/brandonmartinez/MM.Photography.PhotoBoothRunner
 *
 * Copyright (c) 2015 Martinez Media, LLC
 * Licensed under the MIT license.
 */

var PhotoBoothRunner = require('./lib/PhotoBoothRunner.js');
PhotoBoothRunner.start({
	PhotoCapturer: 'echo $USER captured photo'
});