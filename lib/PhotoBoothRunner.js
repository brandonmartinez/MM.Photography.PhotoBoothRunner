/*
 * PhotoBoothRunner
 * https://github.com/brandonmartinez/MM.Photography.PhotoBoothRunner
 *
 * Copyright (c) 2015 Martinez Media, LLC
 * Licensed under the MIT license.
 */

'use strict';

exports.start = function() {
	var Q = require('q');
	var gpio = require('rpi-gpio');

	function shutterPressed() {
		console.log('Shutter button pressed!')
	}

	function configureInputPin(pin){
		var deferred = Q.defer();

		gpio.setup(pin, gpio.DIR_IN, deferred.resolve);

		return deferred.promise;
	}

	function configureOutputPin(pin, initialValue){
		var deferred = Q.defer();

		gpio.setup(pin, gpio.DIR_OUT, function(){
			gpio.write(pin, initialValue, deferred.resolve);
		});

		return deferred.promise;
	}

	function registerEventLogging(config){
		gpio.on('change', function(channel, value) {
			console.log('Channel ' + channel + ' value is now ' + value);
		});

		gpio.on('export', function(channel) {
			//console.log('Channel set: ' + channel);
		});

		gpio.on('modeChange', function(mode) {
			//console.log('Mode changed: ' + mode);
		});

		return config;
	}

	function setup(config) {
		console.log('Setting up GPIO');

		// Set Mode to BCM
		gpio.setMode(gpio.MODE_BCM);
		gpio.setPollFrequency(100);

		// Configure Inputs
		return configureInputPin(config.ShutterButtonPin)
			.then(function(){
				return configureInputPin(config.QuitButtonPin);
			})
			// Configure Outputs
			.then(function(){
				return configureOutputPin(config.ProcessingLedPin, false);
			})
			.then(function(){
				return configureOutputPin(config.PosingLedPin, true);
			})
			.then(function(){
				return configureOutputPin(config.ShutterButtonLedPin, true);
			})
			// Complete promise chain with our config
			.then(function(){
				return config;
			});
	}

	function run(config) {
		var deferred = Q.defer();

		console.log('Running application');

		gpio.on('change', function(channel, value) {
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
		    		console.log('No action available for this channel.');
		    }
		});

		return deferred.promise;
	}

	function cleanup() {
		console.log('Cleaning up GPIO');

		var deferred = Q.defer();

		gpio.destroy(deferred.resolve);

		return deferred.promise;
	}

	// setup our safety net if we get killed
	process.on('SIGINT', cleanup);

	// Start our promise chain
	return Q({
			ShutterButtonPin: 24,
			ShutterButtonLedPin: 23,
			QuitButtonPin: 26,
			ProcessingLedPin: 22,
			PosingLedPin: 18,
			TakePhotos: true,
			TakePhotoCommandText: 'gphoto2 --capture-image-and-download --filename "/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg"',
			ProcessPhotosCommandText: 'sudo /home/pi/scripts/photobooth/assemble_and_print'
		})
		.then(registerEventLogging)
		.then(setup)
		.then(run)
		.then(cleanup);
};