var express = require("express"), 
    mongoose = require("mongoose"), 
    passport = require("passport"), 
    bodyParser = require("body-parser"), 
    LocalStrategy = require("passport-local"), 
    passportLocalMongoose = require("passport-local-mongoose"), 
	User = require("./models/user"),
	mqttdata = require("./models/mqttdata");
	const mqtt = require("mqtt");
var app = express();
var mosca = require('mosca')
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert'); 
var url = 'mongodb://usouioeghnsihatl7x5h:qg886zaQ6yYUj9Z3ipM1@bcxknxi8rijrmdf-mongodb.services.clever-cloud.com:27017/bcxknxi8rijrmdf';
var ObjectId = require('mongodb').ObjectID;
mongoose.set('useNewUrlParser', true); 
mongoose.set('useFindAndModify', false); 
mongoose.set('useCreateIndex', true); 
mongoose.set('useUnifiedTopology', true); 
var MongoClientOptions = 
{
	
    /** username for authentication, equivalent to `options.auth.user`. Maintained for backwards compatibility. */
    user = 'usouioeghnsihatl7x5h',
    /** password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility. */
    pass = 'qg886zaQ6yYUj9Z3ipM1'
}
mongoose.connect(url,MongoClientOptions);  

app.set("view engine", "ejs"); 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

app.use(require("express-session")({ 
    secret: "I am a secret man", 
    resave: false, 
    saveUninitialized: false
})); 
  
app.use(passport.initialize()); 
app.use(passport.session()); 
passport.use(new LocalStrategy(User.authenticate())); 
passport.serializeUser(User.serializeUser()); 
passport.deserializeUser(User.deserializeUser());
 
var pubsubsettings = 
{
  type: 'mongo',
  url: 'mongodb://localhost:27017/mqtt',
  pubsubCollection: 'mqtt',
  mongo: {}
};
 
var settings =
{
  port: 1883,
  keepalive : 10,
  backend: pubsubsettings
}; 

//here we start mosca
var server = new mosca.Server(settings);
/////////////////////////////////////
// fired when the mqtt server is ready
server.on('ready', F_ready);   

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var authenticateme = function(client, username, password, callback) {
	 console.log(username,password.toString());
	 MongoClient.connect(url, function(err, db) 
	 {
		 assert.equal(null, err);

		 User.findOne({username: username,password: password.toString()},function (err, result) 
		 {
			 if (err)
			 {
				 console.log("(****error****  aa gya Connection authenticate krny me)");
				 console.log(err);
				 callback(null, false);
			 }
			 else if (result)
			 {
				client.user = username;
				callback(null, true);
			 }
			 else
			 {
				callback(null, false);
				console.log("Tumne register ni kiya hai ");
			 }
		 })
	 })
	 
	
  }
  // fired whena  client is connected
  server.on("clientConnected", function(client) {
	console.log("client connected", client.id);
  });

  // fired when a message is received
  server.on("published", function(packet, client) {
	if (packet.topic.split("/")[0] != "$SYS" && client.user == packet.topic.split("/")[1]) {  
	  InsertUpdatePayload(client,packet.payload,packet.topic)
	}
  });
	// In this case the client authorized as alice can publish to /users/alice taking
    // the username from the topic and verifing it is the same of the authorized user
	var authorizePublish = function(client, topic, payload, callback) {
		console.log('Auth and publish');
		console.log(topic);
		console.log('Client User');
		console.log(client.user);
		if (topic.split("/")[0] != "$SYS" && client.user == topic.split("/")[1]) { 
			console.log('inside if');
			
			InsertUpdatePayload(client,payload,topic);
			callback(null, true);
		}
	
	};
  
	function InsertUpdatePayload(client,payload,topic)
	{
		mqttdata.findOne(
			{clientId: client.id,
			userTopic: topic,
			username:client.user},
			function(err,data)
			{
				if (err) 
				{
					 
					console.log("Fail to insert document");
				}
				else if(data && data.clientId)
				{
					  
					  data.payload = payload.toString("utf-8");
					  data.save(); 
				}
				else
				{
					mqttdata.insertMany(
						[{
							clientId: client.id,
							payload: payload.toString("utf-8"),
							userTopic: topic,
							username:client.user				
						}],
						{
							timestamps:true
						},
						function(err, res) {
						if (err) 
						{
							 
							console.log("Fail to insert document"); 
						}
						else
						{
							 
							console.log("1 document inserted"); 
							 
						} 
					 });
				} 
			console.log(payload.toString("utf-8"));
			console.log("Published : ", payload.toString("utf-8"));
			});
			
	}
	// In this case the client authorized as alice can subscribe to /users/alice taking
	// the username from the topic and verifing it is the same of the authorized user
	var authorizeSubscribe = function(client, topic, callback) {
		console.log('Auth and subscribe');
		console.log(topic);

	callback(null, client.user == topic.split("/")[1]);
	};
  // fired when a client subscribes to a topic
  server.on("subscribed", function(topic, client) {
	console.log("subscribed : ", topic);
  });

  // fired when a client subscribes to a topic
  server.on("unsubscribed", function(topic, client) {
	console.log("unsubscribed : ", topic);
  });
  // fired when a client is disconnecting
  server.on("clientDisconnecting", function(client) {
	console.log("clientDisconnecting : ", client.id);
  });

  // fired when a client is disconnected
  server.on("clientDisconnected", function(client) {
	console.log("clientDisconnected : ", client.id);
  });


/////////////////////////////////////// fired when the mqtt server is ready

function F_ready ()
{
  console.log(' ');
  console.log('(Mosca server chal rha hy)');
  server.authenticate = authenticateme;
  server.authorizePublish = authorizePublish;
  server.authorizeSubscribe = authorizeSubscribe; 
}
 
 /////////////////////////////////=====///////////////////////////////////////// fired whena  client is connected


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



//===================== 
// ROUTES 
//===================== 
  
// Showing home page 
app.get("/", function (req, res) { 
    res.render("home"); 
}); 
  
// Showing secret page 
app.get("/secret", isLoggedIn, function (req, res) { 
    console.log(req.user._id); 
    res.render("secret",{ Id: req.user._id,userTopic: req.user.username+"_m",espTopic:req.user.username+"_e"}); 
}); 
  
// Showing register form 
app.get("/register", function (req, res) { 
    res.render("register"); 
});  

app.post("/ifttt",function(req,res){
// google assistant sent request through ifttt
console.log("google assistant sent request through ifttt");
const serverUrl   = "http://localhost:1833";
const topic = req.body.topic;
const payload = req.body.payload;
const clientid = req.body.clientId;
User.findById({_id: ObjectId(clientid)},function (err, result) 
		 { 
			 if(result != null)
			 { 
				//connect the client to Cumulocity
				const client = mqtt.connect(serverUrl, {
					host: 'localhost',
					port: 1883,
					clientId: clientid,
					username:result.username,
					password:result.password
				}); 
				client.publish(topic,payload, function() {  
				}) 
				client.subscribe(topic);
				 
			 }
		 })
		return res.status(200).send("Successfully done.");
})
// Handling user signup 
app.post("/register", function (req, res) { 
    var username = req.body.username 
    var password = req.body.password 
    User.register(new User({ username: username,password: password}), 
            password, function (err, user) { 
        if (err) { 
            console.log(err); 
            return res.render("register"); 
        }  
        passport.authenticate("local")( 
            req, res, function () { 
                res.render("secret",{ Id: req.user._id,userTopic: req.user.username,espTopic:req.user.username}); 
        }); 
    }); 
}); 
  
//Showing login form 
app.get("/login", function (req, res) { 
    res.render("login"); 
}); 
  
//Handling user login 
app.post("/login", passport.authenticate("local", { 
    successRedirect: "/secret", 
    failureRedirect: "/login"
}), function (req, res) { 
    console.log(req);
}); 
  
//Handling user logout  
app.get("/logout", function (req, res) { 
    req.logout(); 
    res.redirect("/"); 
}); 
  
function isLoggedIn(req, res, next) { 
    if (req.isAuthenticated()) return next(); 
    res.redirect("/login"); 
}
const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log("app running on port. 80");
});
