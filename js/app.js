var request = require('browser-request');
var qs = require('querystring');

(function(exports){
    /**
     *
     * @param q
     * @param callback
     */
	exports.search = function(q, callback) {
		var req = {
			uri : "http://127.0.0.1:8080/query?q=" + qs.stringify(q),
			json : true
		};
		request(req, function(err, ret){
			callback(err, ret ? ret.body : undefined);
		});
	};

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
    
    /**
     *
     * @type {Array}
     */
    exports.trackedItems = [];

    /**
     *
     * @param pidobject
     * @param callback
     */
    exports.addToTrackingList = function(pidobject, callback) {

    };

    /**
     *
     * @param pidobject
     * @param callback
     */
    exports.removeFromTrackingList = function(pidobject, callback) {

    };

    /**
     *
     * @param callback
     */
    exports.updateTrackingList = function(callback) {

        if(callback) callback(null, true);
    };

    /**
     *
     * @param pidobject
     * @param callback
     */
    exports.updateTrackingListItem = function(pidobject, callback) {

    };

    /**
     *
     * @param interval
     * @param callback
     * @returns {*}
     */
    exports.startAutoTracker = function(interval, callback) {
        if(callback == undefined ) {
            callback = interval;
            interval = 60;
        }
        if(callback == undefined ) return;
        if(exports.autoTracker === true)
            return callback({error:'auto tracker already started.'});
        exports.autoTracker = setInterval(exports.updateTrackingList, interval * 1000);
    };

    /**
     *
     * @param callback
     * @returns {*}
     */
    exports.stopAutoTracker = function(callback) {
        if(callback == undefined ) return;
        if(!exports.autoTracker)
            return callback({error:'auto tracker not started.'});
        clearInterval(exports.autoTracker);
        delete exports.autoTracker;
    };
})(typeof exports === 'undefined' ? this : exports);
