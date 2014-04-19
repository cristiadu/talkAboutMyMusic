var express = require('express');
var graph = require('fbgraph');
var http = require('http');
var handlebars = require('express3-handlebars');
var path = require('path');
var app = express();
app.use(express.static(path.join(__dirname,'public')));
app.use(express.bodyParser());

//Require routes
var	index	= require('./routes/index');
var dataReturn = {};

//load environment variables
var dotenv = require('dotenv');
dotenv.load();

//Configures the Template engine
app.engine('handlebars',handlebars());
app.set('view engine','handlebars');
app.set('views',__dirname+'/views');

// Routes

app.get('/', function(req, res){
  res.render("index", { title: "click link to connect" });
});

app.get('/auth/facebook', function(req, res) {

  // we don't have a code yet
  // so we'll redirect to the oauth dialog
  if (!req.query.code) {
    var authUrl = graph.getOauthUrl({
        "client_id":      process.env.appid_facebook
      , "redirect_uri":  process.env.redirect_uri_facebook
      , "scope":         process.env.scope_facebook
    });

    if (!req.query.error) { //checks whether a user denied the app facebook login/permissions
      res.redirect(authUrl);
    } else {  //req.query.error == 'access_denied'
      res.send('access denied');
    }
    return;
  }

  // code is set
  // we'll send that and get the access token
  graph.authorize({
      "client_id":      process.env.appid_facebook
    , "redirect_uri":   process.env.redirect_uri_facebook
    , "client_secret":  process.env.client_secret_facebook
    , "code":           req.query.code
  }, function (err, facebookRes) {
    res.redirect('/UserHasLoggedIn');
  });


});


// user gets sent here after being authorized
app.get('/UserHasLoggedIn', function(req, res) {

  res.render("initial");
});

app.post('/search',function(req,res){
		
	
 	// #FACEBOOK DATA#
 	

 	// get the artist page
	var query = 'SELECT page_id,name,about,hometown,fan_count,pic_cover FROM page WHERE CONTAINS("'+req.body.artist+'") and type="Musician/Band" LIMIT 1';
	
	graph.fql(query, function(err, res3) 
	{
	  
	  var query2 = {
	  	artist: 'SELECT page_id,name,about,hometown,fan_count,pic_cover FROM page WHERE CONTAINS("'+req.body.artist+'") and type="Musician/Band" LIMIT 1',
	  	friends: 'SELECT pic FROM user WHERE uid IN (SELECT uid FROM page_fan WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me()) AND page_id = '+res3.data[0].page_id+' LIMIT 12)',
	  	posts: 'SELECT message,like_info,created_time,share_info FROM stream WHERE source_id='+res3.data[0].page_id+' AND actor_id!='+res3.data[0].page_id+' LIMIT 20'};
	  
	 
	  graph.fql(query2, function(err, res2) 
	  {
		  
		   var artist = res2.data[0].fql_result_set;
		   var pics = res2.data[1].fql_result_set;
		   var posts = res2.data[2].fql_result_set;
		  

		   for(var i in posts)
		   {
		   	 var date = new Date(posts[i].created_time*1000);
			 posts[i].created_time = (date.getMonth()+1)+'/'+date.getDate()+'/'+date.getFullYear()+' '+(date.getHours()+1)+':'+(date.getMinutes()+1);
		   }
		 
		  res.render('artist',{'artist':artist[0],'pics':pics,'posts':posts});
		  
		  
	  });
	  


	});
	// #END OF FACEBOOK DATA


});

function timeAgo(time){
var date = new Date((time || "").replace(/-/g,"/").replace(/[TZ]/g," ")),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);

if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
    return;

return day_diff == 0 && (
        diff < 60 && "just now" ||
        diff < 120 && "1 minute ago" ||
        diff < 3600 && Math.floor( diff / 60 ) + " minutes ago" ||
        diff < 7200 && "1 hour ago" ||
        diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
    day_diff == 1 && "Yesterday" ||
    day_diff < 7 && day_diff + " days ago" ||
    day_diff < 31 && Math.ceil( day_diff / 7 ) + " weeks ago";
}

app.set('port',process.env.PORT || 3000);


http.createServer(app).listen(app.get('port'),function(){
	console.log('Express server listening on port'+app.get('port'));
});