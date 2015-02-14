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
		debug = require('debug')('photoboothrunner'),
		configuration;

	// Configure Q
	Q.longStackSupport = true;

	// Private Functions
	////////////////////////////////////////////////////
	function shutterPressed(config) {
		if(!config.Status.TakingPhotos){
			config.Status.TakingPhotos = true;
			debug('Shutter button pressed!');

			// Simulating a delay
			setTimeout(function(){
				config.Status.TakingPhotos = false;
			}, 5000);
		}
		else {
			debug('Shutter button pressed, but currently taking photos.');
		}
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
		    			shutterPressed(config);
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
		// fswebcam -r 1280x720 --no-banner "/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg"
		TakePhotoCommandText: options.TakePhotoCommandText || 'gphoto2 --capture-image-and-download --filename "/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg"',
		ProcessPhotosCommandText: options.ProcessPhotosCommandText || 'sudo /home/pi/scripts/photobooth/assemble_and_print',
		Status: {
			TakingPhotos: false,
		}
	};


	// Safety Nets
	////////////////////////////////////////////////////
	process.on('SIGINT', gpio.destroy);

	// Run the App!
	////////////////////////////////////////////////////
	return Q.fcall(function() {
			// While we could just do Q(configuration), jslint doesn't like it
			return configuration;
		})
		.then(gpio.destroy)
		.then(setup)
		.then(run)
		.catch(function(error) {
			debug(error.stack);
		})
		.then(gpio.destroy, function(error){
			debug(error.stack);
		})
		.done();
};