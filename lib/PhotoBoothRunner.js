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
		debug = require('debug')('photoboothrunner'),
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
		debug('Shutter button pressed!');
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
		debug('Setting up GPIO');

		// Set Mode to BCM and Export Utility to gpio-admin
		gpio.setMode(gpio.MODE_BCM);
		gpio.setExportUtility(gpio.EXPORT_WIRING_PI_GPIO);

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

		debug('Application Loop Starting');

		console.log('Press the shutter button to begin!');

		gpio.on('change', function (channel, value) {
		    debug('Channel ' + channel + ' value is now ' + value);

		    switch(channel) {
		    	case config.ShutterButtonPin:
		    		if(value){
		    			shutterPressed();
		    		}
		    		break;
		    	case config.QuitButtonPin:
		    		// If asked to quit, we'll resolve our promise
		    		if(value) {
		    			deferred.resolve(config);
		    		}
		    		break;
		    	default:
		    		debug('No action available for channel' + channel + '.');
		    }
		});

		return deferred.promise;
	}

	function cleanup(config) {
		debug('Cleaning up GPIO');
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