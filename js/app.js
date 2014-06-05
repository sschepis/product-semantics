var request = require('browser-request');
var qs = require('querystring');

(function(exports){
    var _trackedItems = null;

    /**
     * search
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
    
    /**
     * trackedItems
     * @type {Object}
     */
    exports.trackedItems = function(){ return JSON.parse(JSON.stringify(_trackedItems)); };

    /**
     * addToTrackingList
     * @param pidobject
     * @param callback
     */
    exports.addToTrackingList = function(pidobject, callback) {
        if(pidobject && pidobject.name && pidobject.id) {
            if(!_trackedItems)
                _trackedItems = $.jStorage.get('trackedItems', {});
            _trackedItems[pidobject.id] = pidobject;
            $.jStorage.set('trackedItems', _trackedItems);
        }
        if(callback) callback(null, _trackedItems);
    };

    /**
     * removeFromTrackingList
     * @param pidobject
     * @param callback
     */
    exports.removeFromTrackingList = function(pidobject, callback) {
        if(pidobject && pidobject.name && pidobject.id) {
            if (!_trackedItems)
                _trackedItems = $.jStorage.get('trackedItems', {});
            delete _trackedItems[pidobject];
            $.jStorage.set('trackedItems', _trackedItems);
            if(callback) callback(null, _trackedItems);
        }
    };

    /**
     * updateTrackingList
     * @param callback
     */
    exports.updateTrackingList = function(callback) {
        if(callback) callback(null, _trackedItems);
    };

    /**
     * updateTrackingListItem
     * @param pidobject
     * @param callback
     */
    exports.updateTrackingListItem = function(pidobject, callback) {

    };

    /**
     * startAutoTracker
     * @param interval
     * @param callback
     * @returns {*}
     */
    exports.startAutoTracker = function(interval, callback) {
        if(callback == undefined ) {
            callback = interval;
            interval = 60;
        }
        if(callback == undefined) return;
        if(exports.autoTracker === true)
            return callback({error:'auto tracker already started.'});
        exports.autoTracker = setInterval(exports.updateTrackingList, interval * 1000);
    };

    /**
     * stopAutoTracker
     * @param callback
     * @returns {*}
     */
    exports.stopAutoTracker = function(callback) {
        if(callback == undefined) return;
        if(!exports.autoTracker)
            return callback({error:'auto tracker not started.'});
        clearInterval(exports.autoTracker);
        delete exports.autoTracker;
    };

    /**
     * refresh
     * @param callback
     */
    exports.refresh = function(callback) {
        if (!_trackedItems)
            _trackedItems = $.jStorage.get('trackedItems', {});
        if(callback) callback(null, _trackedItems);
    }
})(typeof exports === 'undefined' ? this : exports);
