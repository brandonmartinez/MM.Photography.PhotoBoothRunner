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
		gpio = require('rpi-gpio'),
		exec = require("child_process").exec,
		configuration;

	// Configure Q
	Q.longStackSupport = true;

	// Make gpio promise-friendly
	gpio.setup = Q.denodeify(gpio.setup);
	gpio.read = gpio.input = Q.denodeify(gpio.read);
	gpio.write = gpio.output = Q.denodeify(gpio.write);

	// Private Functions
	////////////////////////////////////////////////////
	function shutterPressed() {
		console.log('Shutter button pressed!');
	}

	function configureInputPin(pin) {
		return gpio.setup(pin, gpio.DIR_IN);
	}

	function configureOutputPin(pin, initialValue) {
		return gpio.setup(pin, gpio.DIR_OUT)
			.then(function () {
				return gpio.write(pin, initialValue);
			});
	}

	function setup(config) {
		console.log('Setting up GPIO');

		// Set Mode to BCM
		gpio.setMode(gpio.MODE_BCM);
		gpio.setPollFrequency(config.InputPinMonitoringInterval);

		// Configure Inputs
		return Q.fcall(function() {
				return configureInputPin(config.ShutterButtonPin);
			})
			.then(function () {
				return configureInputPin(config.QuitButtonPin);
			})
			// Configure Outputs
			.then(function () {
				return configureOutputPin(config.ProcessingLedPin, false);
			})
			.then(function () {
				return configureOutputPin(config.PosingLedPin, true);
			})
			.then(function () {
				return configureOutputPin(config.ShutterButtonLedPin, true);
			})
			// Complete promise chain with our config
			.then(function () {
				return config;
			});
	}

	function run(config) {
		var deferred = Q.defer();

		console.log('Running application');

		gpio.on('change', function (channel, value) {
		    console.log('Channel ' + channel + ' value is now ' + value);

		    switch(channel) {
		    	case config.ShutterButtonPin:
		    		shutterPressed();
		    		break;
		    	case config.QuitButtonPin:
		    		// If asked to quit, we'll resolve our promise
		    		deferred.resolve(config);
		    		break;
		    	default:
		    		console.log('No action available for channel' + channel + '.');
		    }
		});

		return deferred.promise;
	}

	function cleanup(config) {
		console.log('Cleaning up GPIO');
		var commandText = 'gpio unexportall';
		exec(commandText, {}, function () { return; });
		gpio.destroy();

		return config;
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
		InputPinMonitoringInterval: options.InputPinMonitoringInterval || 0,
		TakePhotoCommandText: options.TakePhotoCommandText || 'gphoto2 --capture-image-and-download --filename "/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg"',
		ProcessPhotosCommandText: options.ProcessPhotosCommandText || 'sudo /home/pi/scripts/photobooth/assemble_and_print'
	};


	// Safety Nets
	////////////////////////////////////////////////////
	process.on('SIGINT', cleanup);

	// Run the App!
	////////////////////////////////////////////////////
	return Q.fcall(function() {
			// While we could just do Q(configuration), jslint doesn't like it
			return configuration;
		})
		.then(cleanup)
		.then(setup)
		.then(run)
		.then(cleanup)
		.catch(function(error) {
			console.error(error.stack);
			cleanup();
		})
		.done();
};