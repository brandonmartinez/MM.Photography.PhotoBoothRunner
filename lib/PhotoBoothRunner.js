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
		exec = Q.denodeify(require('child_process').exec),
		debug = require('debug')('photoboothrunner'),
		configuration,
		captureCommand,
		lock = false;

	// Configure Q
	Q.longStackSupport = true;

	// Private Functions
	////////////////////////////////////////////////////
	function shutterPressed(config) {
		if(!lock){
			lock = true;
			debug('Shutter button pressed!');

			return gpio.write({
				channel: config.PosingLedPin,
				value: true
			})
			.delay(500)
			.then(function(){
				return gpio.write({
					channel: config.PosingLedPin,
					value: false
				});
			})
			.delay(500)
			.then(function(){
				return gpio.write({
					channel: config.PosingLedPin,
					value: true
				});
			})
			.delay(500)
			.then(function(){
				return gpio.write({
					channel: config.PosingLedPin,
					value: false
				});
			})
			.delay(500)
			.then(function(){
				return gpio.write({
					channel: config.PosingLedPin,
					value: true
				});
			})
			.delay(500)
			.then(function(){
				return gpio.write({
					channel: config.PosingLedPin,
					value: false
				});
			})
			.then(function() {
				return exec(captureCommand, {}).then(function(stdout){
					debug(stdout);
				});
			})
			.done(function() {
				lock = false;
			});
		}
		
		debug('Shutter button pressed, but currently taking photos.');
	}

	function setup(config) {
		debug('Setting up GPIO');

		// Set Mode to BCM and Export Utility to gpio-admin
		gpio.setMode(gpio.MODE_BCM);

		// Pins to setup
		var channelConfigs = [
			{
				channel: config.ShutterButtonPin,
				direction: gpio.DIR_IN
			},
			{
				channel: config.QuitButtonPin,
				direction: gpio.DIR_IN
			},
			{
				channel: config.ProcessingLedPin,
				direction: gpio.DIR_OUT
			},
			{
				channel: config.PosingLedPin,
				direction: gpio.DIR_OUT
			},
			// {
			// 	channel: config.ShutterButtonLedPin,
			// 	direction: gpio.DIR_OUT
			// },
			{
				channel: config.HeartbeatLedPin,
				direction: gpio.DIR_OUT
			}
		];

		return channelConfigs
			.reduce(function (chain, channelConfig) {
				return chain
					.then(function(){ return channelConfig; })
					.then(gpio.setup);
			}, new Q())
		    .then(function(){
				return config;
			});
	}

	function setDefaultValues(config) {
		return gpio.write({
			channel: config.HeartbeatLedPin,
			value: true
		})
		// .then(function(){
		// 	return gpio.write({
		// 		channel: config.ShutterButtonLedPin,
		// 		value: true
		// 	});
		// })
		.then(function(){
			return gpio.write({
				channel: config.PosingLedPin,
				value: false
			});
		})
		.then(function(){
			return gpio.write({
				channel: config.ProcessingLedPin,
				value: false
			});
		})
		.then(function(){
			return config;
		});
	}

	function run(config) {
		var deferred = Q.defer();

		debug('Application Loop Starting');

		console.log('Press the shutter button to begin!');
		shutterPressed(config);

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
		ShutterButtonPin: options.ShutterButtonPin || 17,
		//ShutterButtonLedPin: options.ShutterButtonLedPin || 23,
		QuitButtonPin: options.QuitButtonPin || 27,
		ProcessingLedPin: options.ProcessingLedPin || 16,
		PosingLedPin: options.PosingLedPin || 20,
		HeartbeatLedPin: options.HeartbeatLedPin || 21,
		// fswebcam -r 1280x720 --no-banner "/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg"
		PhotoCapturer: options.PhotoCapturer || 'gphoto2',
		CapturedPhotoFilenameTemplate: options.CapturedPhotoFilenameTemplate || '/home/pi/Pictures/Photobooth/%Y%m%d%H%M%S.jpg',
		ProcessPhotosCommandText: options.ProcessPhotosCommandText || 'sudo /home/pi/scripts/photobooth/assemble_and_print',
		Status: {
			TakingPhotos: false,
		}
	};

	switch(configuration.PhotoCapturer.toLowerCase()) {
		case 'gphoto2':
			captureCommand = 'gphoto2 --capture-image-and-download --filename "' + configuration.CapturedPhotoFilenameTemplate + '"';
			break;
		case 'fswebcam':
			captureCommand = 'fswebcam -r 1280x720 --no-banner "' + configuration.CapturedPhotoFilenameTemplate + '"';
			break;
		// rpi cam
		// case 'rpicam':
		// captureCommand = '';
		// break;
		default:
			captureCommand = configuration.PhotoCapturer;
			break;
	}

	// Safety Nets
	////////////////////////////////////////////////////
	process.on('SIGINT', gpio.destroy);

	// Run the App!
	////////////////////////////////////////////////////
	return Q.fcall(function() {
			// While we could just do Q(configuration), jslint doesn't like it
			return configuration;
		})
		.then(setup)
		.then(setDefaultValues)
		.then(run)
		.catch(function(error) {
			debug(error.stack);
		})
		.then(gpio.destroy, function(error){
			debug(error.stack);
		})
		.done();
};