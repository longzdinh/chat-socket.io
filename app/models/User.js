var mongoose = require('mongoose');

var UserSchema = mongoose.Schema({	
	username: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	password: {
		type: String,
		required: true
	},
});


//create the model for users and expose it to our app
module.exports = mongoose.model('User', UserSchema);