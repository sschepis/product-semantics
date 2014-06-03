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
	exports.semGetProduct = function(q, callback) {
		var inqry = "http://127.0.0.1:3000/query?search=[[query]]";
		var req = {
			uri : inqry.replace('[[query]]', q.replace(/ /g, '+') ),
			json : true
		};
		request(req, function(err, ret){
			callback(err, ret ? ret : undefined);
		});
	};

	exports.semGetProduct('Radeon HD 6990', function(err, response) {
		console.log( JSON.stringify( JSON.parse(response.body), null, 4 ) );
	});

})(typeof exports === 'undefined' ? this : exports);
