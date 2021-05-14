
const mongoose = require('mongoose');
const Schema = mongoose.Schema;  

const mqttdata = new Schema({ 
    clientId: String,
    payload: String,
    userTopic: String,
    username:String
});
 
module.exports = mongoose.model('mqttdata', mqttdata);