var async = require('async');
var express = require('express');
var nunjucks = require('nunjucks');
var Twit = require('twit');
var tweetParser = require(__dirname + '/parser.js');
var parser = tweetParser.createParser();
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

// Heroku doesn't like web sockets so we switch to long polling :-/
io.configure(function() {
    io.set('transports', ['xhr-polling']);
    io.set('polling duration', 10);
    io.set('log level', 1);
});

// Allows res.render() to work with nunjucks
var env = new nunjucks.Environment(new nunjucks.FileSystemLoader(__dirname + '/public/views'));
var port = process.env.PORT || 5000;
env.express(app);
server.listen(port);

var T = new Twit({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token: process.env.ACCESS_TOKEN,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

function startFirehose() {
    stream = T.stream('statuses/sample');
    stream.on('tweet', tweetParser.parseTweet);
}

app.use('/js', express.static(__dirname + '/public/js'));
app.use('/css', express.static(__dirname + '/public/css'));
app.use('/css', express.static(__dirname + '/vendor'));

app.get('/', function(req, res) {
    res.render('index.html');
});

io.sockets.on('connection', function(socket) {
    socket.emit('getStates', tweetParser.getStates());
});

parser.on('update', function(state) {
    var clients = io.sockets.clients();
    function updateState(socket) {
	   socket.emit('update', state);
    }
    async.each(clients, updateState)
});

startFirehose();
