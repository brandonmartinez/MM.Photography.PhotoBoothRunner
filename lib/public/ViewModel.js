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

		// Start the heartbeat
		setInterval(function(){
			socket.send('Client heartbeat at ' + new Date());
		}, 60 * 1000);
	}

	function configureHandlers(options) {
		// Create a handler for when a message arrives from the server.
		socket.on('message', function(message) {  
		  options.messageElement.html(message);
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