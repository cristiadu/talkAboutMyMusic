var auth = require('../auth')
var	models = require('../models');

exports.view = function(req,res){
	res.render('hashtag');
};

exports.getHashtag = function(req,res){
	auth.ig.tags.recent({
		name:req.body.hashtag,
		complete: function(data){
			imageArr = [];
			// map will interate on the object
			data.map(function(item){
				//create temporaryjson object
				tempJSON = {};
				tempJSON.url = item.images.standard_resolution.url;
				//insert json object into image array
				imageArr.push(tempJSON);
			});
			//turn image array and the hashtag name into data to return
			data = {imageArray:imageArr,hashtagValue:req.body.hashtag};

			res.render('hashtag',data);
		}
	});
	
};

exports.saveFavorites =	function(req,res){	
	//create	a	new	model	for	the	database	
	var	newImage= new models.Img({	
	 	"hashtag":	req.body.hashtag,	
	 	"image":	req.body.url	
	});	
	//save	the	model	in	the	database	
	newImage.save(callbackFunction);	
	//callback	function	that	prints	out	errors	and	then	redirects	to	home	
	function	callbackFunction(err)	{	
	 	err	?	(console.log(err),	res.redirect('/'))	:	res.redirect('/');	
	}	
}