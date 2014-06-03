var request = require('browser-request');
var qs = require('querystring');

(function(exports){
	exports.getProduct = function(q, callback) {
		var inqry = "https://thebootic-bootic-product-search.p.mashape.com/products?q=[[query]]";
		var req = {
			uri : inqry.replace('[[query]]', q.replace(/ /g, '+') ),
			headers : {
				"X-Mashape-Authorization" : "hQqT9ikYLtgFFjclDvum3kT6Wl55lddX"
			},
			json : true
		};
		request(req, function(err, ret){
			callback(err, ret ? ret.body.products : undefined);
		});
	};
})(typeof exports === 'undefined' ? this : exports);
