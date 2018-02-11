const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const moment = require('moment');

const ChatSchema = new Schema({
    message: {
        type: String,
        required: true
    },
    time: {
        type: String,
        default: moment().format('YYYY-MM-DD hh:mm:ss')
    },
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    username: {
        type: String
    }
});

module.exports = mongoose.model('Chat', ChatSchema);