var express = require('express');
var graph = require('fbgraph');
var http = require('http');
var handlebars = require('express3-handlebars');
var path = require('path');
var app = express();
app.use(express.static(path.join(__dirname,'public')));
app.use(express.bodyParser());

//Require routes
var	hashtag	= require('./routes/hashtag');
var	index	= require('./routes/index');


//database setuo
var	mongoose=	require('mongoose');	
mongoose.connect(process.env.MONGOHQ_URL	||	'mongodb://localhost/instagramexample');	



//Configures the Template engine
app.engine('handlebars',handlebars());
app.set('view engine','handlebars');
app.set('views',__dirname+'/views');

app.get('/',index.view);
app.get('/hashtag',hashtag.view);
app.post('/hashtag',hashtag.getHashtag);
app.post('/save',hashtag.saveFavorites);
app.post('/delete',	index.deleteImage);
app.set('port',process.env.PORT || 3000);


http.createServer(app).listen(app.get('port'),function(){
	console.log('Express server listening on port'+app.get('port'));
});