var express = require('express');
var bodyParser = require('body-parser')
var graph = require('fbgraph');
var Twit = require('twit')
var http = require('http');
var handlebars = require('express-handlebars');
var path = require('path');
var app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Require routes
var index = require('./routes/index');

//load environment variables
var dotenv = require('dotenv');
dotenv.config();

//Configures the Template engine
app.engine('handlebars', handlebars.engine());
app.set('view engine', 'handlebars');
app.set('views', './public/views');

// Routes

app.get('/', function (req, res) {
	res.render("index", { title: "click link to connect", layout: false });
});

app.post('/', function (req, res) {
	res.render('index', { layout: false });
});

// Acessing public twitter
var T = new Twit({
	consumer_key: process.env.key_twitter,
	consumer_secret: process.env.secret_twitter,
	access_token: process.env.token_twitter,
	access_token_secret: process.env.token_secret_twitter
})

//Auth with facebook
app.get('/auth/facebook', function (req, res) {
	// we don't have a code yet
	// so we'll redirect to the oauth dialog
	if (!req.query.code) {
		var authUrl = graph.getOauthUrl({
			"client_id": process.env.appid_facebook,
			"redirect_uri": process.env.redirect_uri_facebook,
			"scope": 'user_friends,user_status,friends_status,friends_likes,read_stream'
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
		"client_id": process.env.appid_facebook,
		"redirect_uri": process.env.redirect_uri_facebook,
		"client_secret": process.env.client_secret_facebook,
		"code": req.query.code
	}, function (err, facebookRes) {
		res.redirect('/initial');
	});


});

// user gets sent here after being authorized
app.get('/initial', function (req, res) {
	res.render("initial", { layout: false });
});

app.get('/search', function (req, res) {
	// get the artist page
	var query = 'SELECT page_id FROM page WHERE (CONTAINS("' + req.query.artist + '") OR name="' + req.query.artist + '") and type="Musician/Band" LIMIT 1';

	graph.fql(query, function (err, res3) {
		if (res3.data !== undefined) {
			if ((res3.data.length >= 1)) {

				var query2 = {
					artist: 'SELECT page_id,name,about,hometown,fan_count,pic_cover FROM page WHERE (CONTAINS("' + req.query.artist + '") OR name="' + req.query.artist + '") and type="Musician/Band" LIMIT 1',
					friends: 'SELECT pic FROM user WHERE uid IN (SELECT uid FROM page_fan WHERE uid IN (SELECT uid2 FROM friend WHERE uid1 = me()) AND page_id = ' + res3.data[0].page_id + ' LIMIT 12)',
					posts: 'SELECT message,like_info,created_time,share_info FROM stream WHERE source_id=' + res3.data[0].page_id + ' LIMIT 20'
				};


				graph.fql(query2, function (err, res2) {
					if ((res2.data.length >= 1) && (res2.data !== undefined)) {
						var artist = res2.data[0].fql_result_set;
						var pics = res2.data[1].fql_result_set;
						var posts = res2.data[2].fql_result_set;


						for (var i in posts) {
							var date = new Date(posts[i].created_time * 1000);
							posts[i].created_time = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + (date.getHours() + 1) + ':' + (date.getMinutes() + 1);
						}

						T.get('search/tweets', { q: artist[0].name + ' lang:en', count: 25 }, function (err, reply) {
							var date = new Date();
							for (i in reply.statuses) {
								date = new Date(reply.statuses[i].created_at);
								reply.statuses[i].created_at = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear() + ' ' + (date.getHours() + 1) + ':' + (date.getMinutes() + 1);
							}
							res.render('artist', { 'artist': artist[0], 'pics': pics, 'posts': posts, 'tweets': reply, layout: false });
						});

					}
					else
						res.render('initial', { 'error': 'No results with the string you put', layout: false });
				});

			}
			else
				res.render('initial', { 'error': 'No results with the string you put', layout: false });
		}
		else
			res.render('index', { layout: false });
	});
	// #END OF FACEBOOK DATA
});

app.set('port', process.env.PORT || 3000);


http.createServer(app).listen(app.get('port'), function () {
	console.log('Express server listening on port' + app.get('port'));
});