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
	// Function-scoped Variables and requires
	////////////////////////////////////////////////////
	var Q = require('q'),
		exec = require("child_process").exec,
		onoff = require('onoff'),
		Gpio = onoff.Gpio,
		configuration,
		appModel;

	// Configure Q
	Q.longStackSupport = true;

	// Private Functions
	////////////////////////////////////////////////////
	function shutterPressed() {
		console.log('Shutter button pressed!');
	}

	function setup(app) {
		console.log('Setting up GPIO objects');

		
		return Q.fcall(function(){
				console.log("Reserving GPIOs");
				exec("gpio-admin export " + app.Configuration.ShutterButtonPin, function(err) { console.error(err); });
				exec("gpio-admin export " + app.Configuration.QuitButtonPin, function(err) { console.error(err); });
				exec("gpio-admin export " + app.Configuration.ProcessingLedPin, function(err) { console.error(err); });
				exec("gpio-admin export " + app.Configuration.PosingLedPin, function(err) { console.error(err); });
				exec("gpio-admin export " + app.Configuration.ShutterButtonLedPin, function(err) { console.error(err); });

				return app;
			})
			// Reserve GPIOs
			.then(function(a){
				return a;
			})
			// Configure Inputs
			.then(function(a) {
				a.Gpios.ShutterButton = new Gpio(app.Configuration.ShutterButtonPin, 'in');
				a.Gpios.QuitButton = new Gpio(app.Configuration.QuitButtonPin, 'in');

				return a;
			})
			// Configure Outputs
			.then(function(a) {
				a.Gpios.ProcessingLed = new Gpio(app.Configuration.ProcessingLedPin, 'out');
				a.Gpios.PosingLed = new Gpio(app.Configuration.PosingLedPin, 'out');
				a.Gpios.ShutterButtonLed = new Gpio(app.Configuration.ShutterButtonLedPin, 'out');

				a.Gpios.PosingLed.writeSync(true);

				return a;
			});
	}

	function run(app) {
		var deferred = Q.defer();

		console.log('Running application');

		app.Gpios.ShutterButton.watch(function(err, value) {
			if(err){
				console.error(err);
			}

			console.log("Shutter button value triggered: " + value);
			shutterPressed();
		});

		app.Gpios.QuitButton.watch(function(err, value) {
			if(err){
				console.error(err);
			}

			console.log("Quit button value triggered: " + value);
			deferred.resolve(app.Configuration);
		});

		return deferred.promise;
	}

	function cleanup(app) {
		var config = app.Configuration;
		console.log('Cleaning up GPIOs');

		exec("gpio-admin unexport " + config.ShutterButtonPin, function(err) { console.error(err); });
		exec("gpio-admin unexport " + config.QuitButtonPin, function(err) { console.error(err); });
		exec("gpio-admin unexport " + config.ProcessingLedPin, function(err) { console.error(err); });
		exec("gpio-admin unexport " + config.PosingLedPin, function(err) { console.error(err); });
		exec("gpio-admin unexport " + config.ShutterButtonLedPin, function(err) { console.error(err); });

		return app;
	}

	// Options and Configuration
	////////////////////////////////////////////////////
	if(!options || (typeof options !== 'object')) {
		options = {};
	}

	configuration = {
		ShutterButtonPin: options.ShutterButtonPin || 24,
		ShutterButtonLedPin: options.ShutterButtonLedPin || 23,
		QuitButtonPin: options.QuitButtonPin || 26,
		ProcessingLedPin: options.ProcessingLedPin || 22,
		PosingLedPin: options.PosingLedPin || 18,
		TakePhotoCommandText: options.TakePhotoCommandText || 'gphoto2 --capture-image-and-download --filename "/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg"',
		ProcessPhotosCommandText: options.ProcessPhotosCommandText || 'sudo /home/pi/scripts/photobooth/assemble_and_print'
	};

	appModel = {
		Configuration: configuration,
		Gpios: {}
	};


	// Safety Nets
	////////////////////////////////////////////////////
	process.on('SIGINT', function(){
		cleanup(appModel);
	});

	// Run the App!
	////////////////////////////////////////////////////
	return Q.fcall(function() {
			// While we could just do Q(appModel), jslint doesn't like it
			return appModel;
		})
		.then(cleanup)
		.then(setup)
		.then(run)
		.then(cleanup)
		.catch(function(error) {
			console.error(error.stack);
		})
		.done();
};