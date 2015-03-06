/*jslint node: true, white: true */
/*globals io */

function ViewModel() {
	// Private Variables

	var self = this,
		socket;

	// Private Functions
	function configureSocket(options) {
		// Create a socket, connect, and send initial message
		socket = options.socket;
		socket.connect();
		socket.send('Connected to server at ' + new Date());
	}

	function configureHandlers(options) {
		// Create a handler for when a message arrives from the server.
		socket.on('shutter-pressed', function(message) {  
		  options.messageElement.html(message.text + ' ' + message.datetime);
		});

		socket.on('forcequit-pressed', function(message) {  
		  options.messageElement.html(message.text + ' ' + message.datetime);
		});

		socket.on('photocaptured', function(message) {  
		  options.messageElement.html(message.text + ' ' + message.datetime + ' - ' + message.location);
		});
	}

	// Public Properties


	// Public Methods
	self.init = function(options) {
		configureSocket(options);
		configureHandlers(options);
		console.log('ViewModel initialized.', options);
	};
}