require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"Focm2+":[function(require,module,exports){
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

},{"browser-request":"jhzXOo","querystring":89}],"products":[function(require,module,exports){
module.exports=require('Focm2+');
},{}],"jhzXOo":[function(require,module,exports){
// Browser Request
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var XHR = XMLHttpRequest
if (!XHR) throw new Error('missing XMLHttpRequest')

module.exports = request
request.log = {
  'trace': noop, 'debug': noop, 'info': noop, 'warn': noop, 'error': noop
}

var DEFAULT_TIMEOUT = 3 * 60 * 1000 // 3 minutes

//
// request
//

function request(options, callback) {
  // The entry-point to the API: prep the options object and pass the real work to run_xhr.
  if(typeof callback !== 'function')
    throw new Error('Bad callback given: ' + callback)

  if(!options)
    throw new Error('No options given')

  var options_onResponse = options.onResponse; // Save this for later.

  if(typeof options === 'string')
    options = {'uri':options};
  else
    options = JSON.parse(JSON.stringify(options)); // Use a duplicate for mutating.

  options.onResponse = options_onResponse // And put it back.

  if (options.verbose) request.log = getLogger();

  if(options.url) {
    options.uri = options.url;
    delete options.url;
  }

  if(!options.uri && options.uri !== "")
    throw new Error("options.uri is a required argument");

  if(typeof options.uri != "string")
    throw new Error("options.uri must be a string");

  var unsupported_options = ['proxy', '_redirectsFollowed', 'maxRedirects', 'followRedirect']
  for (var i = 0; i < unsupported_options.length; i++)
    if(options[ unsupported_options[i] ])
      throw new Error("options." + unsupported_options[i] + " is not supported")

  options.callback = callback
  options.method = options.method || 'GET';
  options.headers = options.headers || {};
  options.body    = options.body || null
  options.timeout = options.timeout || request.DEFAULT_TIMEOUT

  if(options.headers.host)
    throw new Error("Options.headers.host is not supported");

  if(options.json) {
    options.headers.accept = options.headers.accept || 'application/json'
    if(options.method !== 'GET')
      options.headers['content-type'] = 'application/json'

    if(typeof options.json !== 'boolean')
      options.body = JSON.stringify(options.json)
    else if(typeof options.body !== 'string')
      options.body = JSON.stringify(options.body)
  }

  // If onResponse is boolean true, call back immediately when the response is known,
  // not when the full request is complete.
  options.onResponse = options.onResponse || noop
  if(options.onResponse === true) {
    options.onResponse = callback
    options.callback = noop
  }

  // XXX Browsers do not like this.
  //if(options.body)
  //  options.headers['content-length'] = options.body.length;

  // HTTP basic authentication
  if(!options.headers.authorization && options.auth)
    options.headers.authorization = 'Basic ' + b64_enc(options.auth.username + ':' + options.auth.password);

  return run_xhr(options)
}

var req_seq = 0
function run_xhr(options) {
  var xhr = new XHR
    , timed_out = false
    , is_cors = is_crossDomain(options.uri)
    , supports_cors = ('withCredentials' in xhr)

  req_seq += 1
  xhr.seq_id = req_seq
  xhr.id = req_seq + ': ' + options.method + ' ' + options.uri
  xhr._id = xhr.id // I know I will type "_id" from habit all the time.

  if(is_cors && !supports_cors) {
    var cors_err = new Error('Browser does not support cross-origin request: ' + options.uri)
    cors_err.cors = 'unsupported'
    return options.callback(cors_err, xhr)
  }

  xhr.timeoutTimer = setTimeout(too_late, options.timeout)
  function too_late() {
    timed_out = true
    var er = new Error('ETIMEDOUT')
    er.code = 'ETIMEDOUT'
    er.duration = options.timeout

    request.log.error('Timeout', { 'id':xhr._id, 'milliseconds':options.timeout })
    return options.callback(er, xhr)
  }

  // Some states can be skipped over, so remember what is still incomplete.
  var did = {'response':false, 'loading':false, 'end':false}

  xhr.onreadystatechange = on_state_change
  xhr.open(options.method, options.uri, true) // asynchronous
  if(is_cors)
    xhr.withCredentials = !! options.withCredentials
  xhr.send(options.body)
  return xhr

  function on_state_change(event) {
    if(timed_out)
      return request.log.debug('Ignoring timed out state change', {'state':xhr.readyState, 'id':xhr.id})

    request.log.debug('State change', {'state':xhr.readyState, 'id':xhr.id, 'timed_out':timed_out})

    if(xhr.readyState === XHR.OPENED) {
      request.log.debug('Request started', {'id':xhr.id})
      for (var key in options.headers)
        xhr.setRequestHeader(key, options.headers[key])
    }

    else if(xhr.readyState === XHR.HEADERS_RECEIVED)
      on_response()

    else if(xhr.readyState === XHR.LOADING) {
      on_response()
      on_loading()
    }

    else if(xhr.readyState === XHR.DONE) {
      on_response()
      on_loading()
      on_end()
    }
  }

  function on_response() {
    if(did.response)
      return

    did.response = true
    request.log.debug('Got response', {'id':xhr.id, 'status':xhr.status})
    clearTimeout(xhr.timeoutTimer)
    xhr.statusCode = xhr.status // Node request compatibility

    // Detect failed CORS requests.
    if(is_cors && xhr.statusCode == 0) {
      var cors_err = new Error('CORS request rejected: ' + options.uri)
      cors_err.cors = 'rejected'

      // Do not process this request further.
      did.loading = true
      did.end = true

      return options.callback(cors_err, xhr)
    }

    options.onResponse(null, xhr)
  }

  function on_loading() {
    if(did.loading)
      return

    did.loading = true
    request.log.debug('Response body loading', {'id':xhr.id})
    // TODO: Maybe simulate "data" events by watching xhr.responseText
  }

  function on_end() {
    if(did.end)
      return

    did.end = true
    request.log.debug('Request done', {'id':xhr.id})

    xhr.body = xhr.responseText
    if(options.json) {
      try        { xhr.body = JSON.parse(xhr.responseText) }
      catch (er) { return options.callback(er, xhr)        }
    }

    options.callback(null, xhr, xhr.body)
  }

} // request

request.withCredentials = false;
request.DEFAULT_TIMEOUT = DEFAULT_TIMEOUT;

//
// defaults
//

request.defaults = function(options, requester) {
  var def = function (method) {
    var d = function (params, callback) {
      if(typeof params === 'string')
        params = {'uri': params};
      else {
        params = JSON.parse(JSON.stringify(params));
      }
      for (var i in options) {
        if (params[i] === undefined) params[i] = options[i]
      }
      return method(params, callback)
    }
    return d
  }
  var de = def(request)
  de.get = def(request.get)
  de.post = def(request.post)
  de.put = def(request.put)
  de.head = def(request.head)
  return de
}

//
// HTTP method shortcuts
//

var shortcuts = [ 'get', 'put', 'post', 'head' ];
shortcuts.forEach(function(shortcut) {
  var method = shortcut.toUpperCase();
  var func   = shortcut.toLowerCase();

  request[func] = function(opts) {
    if(typeof opts === 'string')
      opts = {'method':method, 'uri':opts};
    else {
      opts = JSON.parse(JSON.stringify(opts));
      opts.method = method;
    }

    var args = [opts].concat(Array.prototype.slice.apply(arguments, [1]));
    return request.apply(this, args);
  }
})

//
// CouchDB shortcut
//

request.couch = function(options, callback) {
  if(typeof options === 'string')
    options = {'uri':options}

  // Just use the request API to do JSON.
  options.json = true
  if(options.body)
    options.json = options.body
  delete options.body

  callback = callback || noop

  var xhr = request(options, couch_handler)
  return xhr

  function couch_handler(er, resp, body) {
    if(er)
      return callback(er, resp, body)

    if((resp.statusCode < 200 || resp.statusCode > 299) && body.error) {
      // The body is a Couch JSON object indicating the error.
      er = new Error('CouchDB error: ' + (body.error.reason || body.error.error))
      for (var key in body)
        er[key] = body[key]
      return callback(er, resp, body);
    }

    return callback(er, resp, body);
  }
}

//
// Utility
//

function noop() {}

function getLogger() {
  var logger = {}
    , levels = ['trace', 'debug', 'info', 'warn', 'error']
    , level, i

  for(i = 0; i < levels.length; i++) {
    level = levels[i]

    logger[level] = noop
    if(typeof console !== 'undefined' && console && console[level])
      logger[level] = formatted(console, level)
  }

  return logger
}

function formatted(obj, method) {
  return formatted_logger

  function formatted_logger(str, context) {
    if(typeof context === 'object')
      str += ' ' + JSON.stringify(context)

    return obj[method].call(obj, str)
  }
}

// Return whether a URL is a cross-domain request.
function is_crossDomain(url) {
  var rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/

  // jQuery #8138, IE may throw an exception when accessing
  // a field from window.location if document.domain has been set
  var ajaxLocation
  try { ajaxLocation = location.href }
  catch (e) {
    // Use the href attribute of an A element since IE will modify it given document.location
    ajaxLocation = document.createElement( "a" );
    ajaxLocation.href = "";
    ajaxLocation = ajaxLocation.href;
  }

  var ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || []
    , parts = rurl.exec(url.toLowerCase() )

  var result = !!(
    parts &&
    (  parts[1] != ajaxLocParts[1]
    || parts[2] != ajaxLocParts[2]
    || (parts[3] || (parts[1] === "http:" ? 80 : 443)) != (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? 80 : 443))
    )
  )

  //console.debug('is_crossDomain('+url+') -> ' + result)
  return result
}

// MIT License from http://phpjs.org/functions/base64_encode:358
function b64_enc (data) {
    // Encodes string using MIME base64 algorithm
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc="", tmp_arr = [];

    if (!data) {
        return data;
    }

    // assume utf8 data
    // data = this.utf8_encode(data+'');

    do { // pack three octets into four hexets
        o1 = data.charCodeAt(i++);
        o2 = data.charCodeAt(i++);
        o3 = data.charCodeAt(i++);

        bits = o1<<16 | o2<<8 | o3;

        h1 = bits>>18 & 0x3f;
        h2 = bits>>12 & 0x3f;
        h3 = bits>>6 & 0x3f;
        h4 = bits & 0x3f;

        // use hexets to index into b64, and append result to encoded string
        tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);

    enc = tmp_arr.join('');

    switch (data.length % 3) {
        case 1:
            enc = enc.slice(0, -2) + '==';
        break;
        case 2:
            enc = enc.slice(0, -1) + '=';
        break;
    }

    return enc;
}

},{}],"request":[function(require,module,exports){
module.exports=require('jhzXOo');
},{}],"j1g5Bd":[function(require,module,exports){
var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');
var url = require('url')

http.request = function (params, cb) {
    if (typeof params === 'string') {
        params = url.parse(params)
    }
    if (!params) params = {};
    if (!params.host && !params.port) {
        params.port = parseInt(window.location.port, 10);
    }
    if (!params.host && params.hostname) {
        params.host = params.hostname;
    }
    
    if (!params.scheme) params.scheme = window.location.protocol.split(':')[0];
    if (!params.host) {
        params.host = window.location.hostname || window.location.host;
    }
    if (/:/.test(params.host)) {
        if (!params.port) {
            params.port = params.host.split(':')[1];
        }
        params.host = params.host.split(':')[0];
    }
    if (!params.port) params.port = params.scheme == 'https' ? 443 : 80;
    
    var req = new Request(new xhrHttp, params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = (function () {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
})();

http.STATUS_CODES = {
    100 : 'Continue',
    101 : 'Switching Protocols',
    102 : 'Processing',                 // RFC 2518, obsoleted by RFC 4918
    200 : 'OK',
    201 : 'Created',
    202 : 'Accepted',
    203 : 'Non-Authoritative Information',
    204 : 'No Content',
    205 : 'Reset Content',
    206 : 'Partial Content',
    207 : 'Multi-Status',               // RFC 4918
    300 : 'Multiple Choices',
    301 : 'Moved Permanently',
    302 : 'Moved Temporarily',
    303 : 'See Other',
    304 : 'Not Modified',
    305 : 'Use Proxy',
    307 : 'Temporary Redirect',
    400 : 'Bad Request',
    401 : 'Unauthorized',
    402 : 'Payment Required',
    403 : 'Forbidden',
    404 : 'Not Found',
    405 : 'Method Not Allowed',
    406 : 'Not Acceptable',
    407 : 'Proxy Authentication Required',
    408 : 'Request Time-out',
    409 : 'Conflict',
    410 : 'Gone',
    411 : 'Length Required',
    412 : 'Precondition Failed',
    413 : 'Request Entity Too Large',
    414 : 'Request-URI Too Large',
    415 : 'Unsupported Media Type',
    416 : 'Requested Range Not Satisfiable',
    417 : 'Expectation Failed',
    418 : 'I\'m a teapot',              // RFC 2324
    422 : 'Unprocessable Entity',       // RFC 4918
    423 : 'Locked',                     // RFC 4918
    424 : 'Failed Dependency',          // RFC 4918
    425 : 'Unordered Collection',       // RFC 4918
    426 : 'Upgrade Required',           // RFC 2817
    428 : 'Precondition Required',      // RFC 6585
    429 : 'Too Many Requests',          // RFC 6585
    431 : 'Request Header Fields Too Large',// RFC 6585
    500 : 'Internal Server Error',
    501 : 'Not Implemented',
    502 : 'Bad Gateway',
    503 : 'Service Unavailable',
    504 : 'Gateway Time-out',
    505 : 'HTTP Version Not Supported',
    506 : 'Variant Also Negotiates',    // RFC 2295
    507 : 'Insufficient Storage',       // RFC 4918
    509 : 'Bandwidth Limit Exceeded',
    510 : 'Not Extended',               // RFC 2774
    511 : 'Network Authentication Required' // RFC 6585
};
},{"./lib/request":7,"events":81,"url":104}],"http":[function(require,module,exports){
module.exports=require('j1g5Bd');
},{}],7:[function(require,module,exports){
var Stream = require('stream');
var Response = require('./response');
var Base64 = require('Base64');
var inherits = require('inherits');

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.writable = true;
    self.xhr = xhr;
    self.body = [];
    
    self.uri = (params.scheme || 'http') + '://'
        + params.host
        + (params.port ? ':' + params.port : '')
        + (params.path || '/')
    ;
    
    if (typeof params.withCredentials === 'undefined') {
        params.withCredentials = true;
    }

    try { xhr.withCredentials = params.withCredentials }
    catch (e) {}
    
    xhr.open(
        params.method || 'GET',
        self.uri,
        true
    );

    self._headers = {};
    
    if (params.headers) {
        var keys = objectKeys(params.headers);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (!self.isSafeRequestHeader(key)) continue;
            var value = params.headers[key];
            self.setHeader(key, value);
        }
    }
    
    if (params.auth) {
        //basic auth
        this.setHeader('Authorization', 'Basic ' + Base64.btoa(params.auth));
    }

    var res = new Response;
    res.on('close', function () {
        self.emit('close');
    });
    
    res.on('ready', function () {
        self.emit('response', res);
    });
    
    xhr.onreadystatechange = function () {
        // Fix for IE9 bug
        // SCRIPT575: Could not complete the operation due to error c00c023f
        // It happens when a request is aborted, calling the success callback anyway with readyState === 4
        if (xhr.__aborted) return;
        res.handle(xhr);
    };
};

inherits(Request, Stream);

Request.prototype.setHeader = function (key, value) {
    this._headers[key.toLowerCase()] = value
};

Request.prototype.getHeader = function (key) {
    return this._headers[key.toLowerCase()]
};

Request.prototype.removeHeader = function (key) {
    delete this._headers[key.toLowerCase()]
};

Request.prototype.write = function (s) {
    this.body.push(s);
};

Request.prototype.destroy = function (s) {
    this.xhr.__aborted = true;
    this.xhr.abort();
    this.emit('close');
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.body.push(s);

    var keys = objectKeys(this._headers);
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = this._headers[key];
        if (isArray(value)) {
            for (var j = 0; j < value.length; j++) {
                this.xhr.setRequestHeader(key, value[j]);
            }
        }
        else this.xhr.setRequestHeader(key, value)
    }

    if (this.body.length === 0) {
        this.xhr.send('');
    }
    else if (typeof this.body[0] === 'string') {
        this.xhr.send(this.body.join(''));
    }
    else if (isArray(this.body[0])) {
        var body = [];
        for (var i = 0; i < this.body.length; i++) {
            body.push.apply(body, this.body[i]);
        }
        this.xhr.send(body);
    }
    else if (/Array/.test(Object.prototype.toString.call(this.body[0]))) {
        var len = 0;
        for (var i = 0; i < this.body.length; i++) {
            len += this.body[i].length;
        }
        var body = new(this.body[0].constructor)(len);
        var k = 0;
        
        for (var i = 0; i < this.body.length; i++) {
            var b = this.body[i];
            for (var j = 0; j < b.length; j++) {
                body[k++] = b[j];
            }
        }
        this.xhr.send(body);
    }
    else {
        var body = '';
        for (var i = 0; i < this.body.length; i++) {
            body += this.body[i].toString();
        }
        this.xhr.send(body);
    }
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.prototype.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return indexOf(Request.unsafeHeaders, headerName.toLowerCase()) === -1;
};

var objectKeys = Object.keys || function (obj) {
    var keys = [];
    for (var key in obj) keys.push(key);
    return keys;
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var indexOf = function (xs, x) {
    if (xs.indexOf) return xs.indexOf(x);
    for (var i = 0; i < xs.length; i++) {
        if (xs[i] === x) return i;
    }
    return -1;
};

},{"./response":8,"Base64":9,"inherits":10,"stream":103}],8:[function(require,module,exports){
var Stream = require('stream');
var util = require('util');

var Response = module.exports = function (res) {
    this.offset = 0;
    this.readable = true;
};

util.inherits(Response, Stream);

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
            
                if (isArray(headers[key])) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getResponse = function (xhr) {
    var respType = String(xhr.responseType).toLowerCase();
    if (respType === 'blob') return xhr.responseBlob || xhr.response;
    if (respType === 'arraybuffer') return xhr.response;
    return xhr.responseText;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this._emitData(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this._emitData(res);
        
        if (res.error) {
            this.emit('error', this.getResponse(res));
        }
        else this.emit('end');
        
        this.emit('close');
    }
};

Response.prototype._emitData = function (res) {
    var respBody = this.getResponse(res);
    if (respBody.toString().match(/ArrayBuffer/)) {
        this.emit('data', new Uint8Array(respBody, this.offset));
        this.offset = respBody.byteLength;
        return;
    }
    if (respBody.length > this.offset) {
        this.emit('data', respBody.slice(this.offset));
        this.offset = respBody.length;
    }
};

var isArray = Array.isArray || function (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

},{"stream":103,"util":106}],9:[function(require,module,exports){
;(function () {

  var object = typeof exports != 'undefined' ? exports : this; // #8: web workers
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  function InvalidCharacterError(message) {
    this.message = message;
  }
  InvalidCharacterError.prototype = new Error;
  InvalidCharacterError.prototype.name = 'InvalidCharacterError';

  // encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  object.btoa || (
  object.btoa = function (input) {
    for (
      // initialize result and counter
      var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
      input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
      output += map.charAt(63 & block >> 8 - idx % 1 * 8)
    ) {
      charCode = input.charCodeAt(idx += 3/4);
      if (charCode > 0xFF) {
        throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }
      block = block << 8 | charCode;
    }
    return output;
  });

  // decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  object.atob || (
  object.atob = function (input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 == 1) {
      throw new InvalidCharacterError("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (
      // initialize result and counters
      var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
      buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        // and if not first of each 4 characters,
        // convert the first 8 bits to one ascii character
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  });

}());

},{}],10:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],"J73pmz":[function(require,module,exports){

module.exports = require('./lib/jade');

},{"./lib/jade":17}],"jade":[function(require,module,exports){
module.exports=require('J73pmz');
},{}],13:[function(require,module,exports){
'use strict';

var nodes = require('./nodes');
var filters = require('./filters');
var doctypes = require('./doctypes');
var runtime = require('./runtime');
var utils = require('./utils');
var selfClosing = require('./self-closing');
var parseJSExpression = require('character-parser').parseMax;
var constantinople = require('constantinople');

function isConstant(src) {
  return constantinople(src, {jade: runtime, 'jade_interp': undefined});
}
function toConstant(src) {
  return constantinople.toConstant(src, {jade: runtime, 'jade_interp': undefined});
}
function errorAtNode(node, error) {
  error.line = node.line;
  error.filename = node.filename;
  return error;
}

/**
 * Initialize `Compiler` with the given `node`.
 *
 * @param {Node} node
 * @param {Object} options
 * @api public
 */

var Compiler = module.exports = function Compiler(node, options) {
  this.options = options = options || {};
  this.node = node;
  this.hasCompiledDoctype = false;
  this.hasCompiledTag = false;
  this.pp = options.pretty || false;
  this.debug = false !== options.compileDebug;
  this.indents = 0;
  this.parentIndents = 0;
  this.terse = false;
  this.mixins = {};
  this.dynamicMixins = false;
  if (options.doctype) this.setDoctype(options.doctype);
};

/**
 * Compiler prototype.
 */

Compiler.prototype = {

  /**
   * Compile parse tree to JavaScript.
   *
   * @api public
   */

  compile: function(){
    this.buf = [];
    if (this.pp) this.buf.push("var jade_indent = [];");
    this.lastBufferedIdx = -1;
    this.visit(this.node);
    if (!this.dynamicMixins) {
      // if there are no dynamic mixins we can remove any un-used mixins
      var mixinNames = Object.keys(this.mixins);
      for (var i = 0; i < mixinNames.length; i++) {
        var mixin = this.mixins[mixinNames[i]];
        if (!mixin.used) {
          for (var x = 0; x < mixin.instances.length; x++) {
            for (var y = mixin.instances[x].start; y < mixin.instances[x].end; y++) {
              this.buf[y] = '';
            }
          }
        }
      }
    }
    return this.buf.join('\n');
  },

  /**
   * Sets the default doctype `name`. Sets terse mode to `true` when
   * html 5 is used, causing self-closing tags to end with ">" vs "/>",
   * and boolean attributes are not mirrored.
   *
   * @param {string} name
   * @api public
   */

  setDoctype: function(name){
    this.doctype = doctypes[name.toLowerCase()] || '<!DOCTYPE ' + name + '>';
    this.terse = this.doctype.toLowerCase() == '<!doctype html>';
    this.xml = 0 == this.doctype.indexOf('<?xml');
  },

  /**
   * Buffer the given `str` exactly as is or with interpolation
   *
   * @param {String} str
   * @param {Boolean} interpolate
   * @api public
   */

  buffer: function (str, interpolate) {
    var self = this;
    if (interpolate) {
      var match = /(\\)?([#!]){((?:.|\n)*)$/.exec(str);
      if (match) {
        this.buffer(str.substr(0, match.index), false);
        if (match[1]) { // escape
          this.buffer(match[2] + '{', false);
          this.buffer(match[3], true);
          return;
        } else {
          var rest = match[3];
          var range = parseJSExpression(rest);
          var code = ('!' == match[2] ? '' : 'jade.escape') + "((jade_interp = " + range.src + ") == null ? '' : jade_interp)";
          this.bufferExpression(code);
          this.buffer(rest.substr(range.end + 1), true);
          return;
        }
      }
    }

    str = JSON.stringify(str);
    str = str.substr(1, str.length - 2);

    if (this.lastBufferedIdx == this.buf.length) {
      if (this.lastBufferedType === 'code') this.lastBuffered += ' + "';
      this.lastBufferedType = 'text';
      this.lastBuffered += str;
      this.buf[this.lastBufferedIdx - 1] = 'buf.push(' + this.bufferStartChar + this.lastBuffered + '");'
    } else {
      this.buf.push('buf.push("' + str + '");');
      this.lastBufferedType = 'text';
      this.bufferStartChar = '"';
      this.lastBuffered = str;
      this.lastBufferedIdx = this.buf.length;
    }
  },

  /**
   * Buffer the given `src` so it is evaluated at run time
   *
   * @param {String} src
   * @api public
   */

  bufferExpression: function (src) {
    if (isConstant(src)) {
      return this.buffer(toConstant(src) + '', false)
    }
    if (this.lastBufferedIdx == this.buf.length) {
      if (this.lastBufferedType === 'text') this.lastBuffered += '"';
      this.lastBufferedType = 'code';
      this.lastBuffered += ' + (' + src + ')';
      this.buf[this.lastBufferedIdx - 1] = 'buf.push(' + this.bufferStartChar + this.lastBuffered + ');'
    } else {
      this.buf.push('buf.push(' + src + ');');
      this.lastBufferedType = 'code';
      this.bufferStartChar = '';
      this.lastBuffered = '(' + src + ')';
      this.lastBufferedIdx = this.buf.length;
    }
  },

  /**
   * Buffer an indent based on the current `indent`
   * property and an additional `offset`.
   *
   * @param {Number} offset
   * @param {Boolean} newline
   * @api public
   */

  prettyIndent: function(offset, newline){
    offset = offset || 0;
    newline = newline ? '\n' : '';
    this.buffer(newline + Array(this.indents + offset).join('  '));
    if (this.parentIndents)
      this.buf.push("buf.push.apply(buf, jade_indent);");
  },

  /**
   * Visit `node`.
   *
   * @param {Node} node
   * @api public
   */

  visit: function(node){
    var debug = this.debug;

    if (debug) {
      this.buf.push('jade_debug.unshift({ lineno: ' + node.line
        + ', filename: ' + (node.filename
          ? JSON.stringify(node.filename)
          : 'jade_debug[0].filename')
        + ' });');
    }

    // Massive hack to fix our context
    // stack for - else[ if] etc
    if (false === node.debug && this.debug) {
      this.buf.pop();
      this.buf.pop();
    }

    this.visitNode(node);

    if (debug) this.buf.push('jade_debug.shift();');
  },

  /**
   * Visit `node`.
   *
   * @param {Node} node
   * @api public
   */

  visitNode: function(node){
    return this['visit' + node.type](node);
  },

  /**
   * Visit case `node`.
   *
   * @param {Literal} node
   * @api public
   */

  visitCase: function(node){
    var _ = this.withinCase;
    this.withinCase = true;
    this.buf.push('switch (' + node.expr + '){');
    this.visit(node.block);
    this.buf.push('}');
    this.withinCase = _;
  },

  /**
   * Visit when `node`.
   *
   * @param {Literal} node
   * @api public
   */

  visitWhen: function(node){
    if ('default' == node.expr) {
      this.buf.push('default:');
    } else {
      this.buf.push('case ' + node.expr + ':');
    }
    if (node.block) {
      this.visit(node.block);
      this.buf.push('  break;');
    }
  },

  /**
   * Visit literal `node`.
   *
   * @param {Literal} node
   * @api public
   */

  visitLiteral: function(node){
    this.buffer(node.str);
  },

  /**
   * Visit all nodes in `block`.
   *
   * @param {Block} block
   * @api public
   */

  visitBlock: function(block){
    var len = block.nodes.length
      , escape = this.escape
      , pp = this.pp

    // Pretty print multi-line text
    if (pp && len > 1 && !escape && block.nodes[0].isText && block.nodes[1].isText)
      this.prettyIndent(1, true);

    for (var i = 0; i < len; ++i) {
      // Pretty print text
      if (pp && i > 0 && !escape && block.nodes[i].isText && block.nodes[i-1].isText)
        this.prettyIndent(1, false);

      this.visit(block.nodes[i]);
      // Multiple text nodes are separated by newlines
      if (block.nodes[i+1] && block.nodes[i].isText && block.nodes[i+1].isText)
        this.buffer('\n');
    }
  },

  /**
   * Visit a mixin's `block` keyword.
   *
   * @param {MixinBlock} block
   * @api public
   */

  visitMixinBlock: function(block){
    if (this.pp) this.buf.push("jade_indent.push('" + Array(this.indents + 1).join('  ') + "');");
    this.buf.push('block && block();');
    if (this.pp) this.buf.push("jade_indent.pop();");
  },

  /**
   * Visit `doctype`. Sets terse mode to `true` when html 5
   * is used, causing self-closing tags to end with ">" vs "/>",
   * and boolean attributes are not mirrored.
   *
   * @param {Doctype} doctype
   * @api public
   */

  visitDoctype: function(doctype){
    if (doctype && (doctype.val || !this.doctype)) {
      this.setDoctype(doctype.val || 'default');
    }

    if (this.doctype) this.buffer(this.doctype);
    this.hasCompiledDoctype = true;
  },

  /**
   * Visit `mixin`, generating a function that
   * may be called within the template.
   *
   * @param {Mixin} mixin
   * @api public
   */

  visitMixin: function(mixin){
    var name = 'jade_mixins[';
    var args = mixin.args || '';
    var block = mixin.block;
    var attrs = mixin.attrs;
    var attrsBlocks = mixin.attributeBlocks;
    var pp = this.pp;
    var dynamic = mixin.name[0]==='#';
    var key = mixin.name;
    if (dynamic) this.dynamicMixins = true;
    name += (dynamic ? mixin.name.substr(2,mixin.name.length-3):'"'+mixin.name+'"')+']';

    this.mixins[key] = this.mixins[key] || {used: false, instances: []};
    if (mixin.call) {
      this.mixins[key].used = true;
      if (pp) this.buf.push("jade_indent.push('" + Array(this.indents + 1).join('  ') + "');")
      if (block || attrs.length || attrsBlocks.length) {

        this.buf.push(name + '.call({');

        if (block) {
          this.buf.push('block: function(){');

          // Render block with no indents, dynamically added when rendered
          this.parentIndents++;
          var _indents = this.indents;
          this.indents = 0;
          this.visit(mixin.block);
          this.indents = _indents;
          this.parentIndents--;

          if (attrs.length || attrsBlocks.length) {
            this.buf.push('},');
          } else {
            this.buf.push('}');
          }
        }

        if (attrsBlocks.length) {
          if (attrs.length) {
            var val = this.attrs(attrs);
            attrsBlocks.unshift(val);
          }
          this.buf.push('attributes: jade.merge([' + attrsBlocks.join(',') + '])');
        } else if (attrs.length) {
          var val = this.attrs(attrs);
          this.buf.push('attributes: ' + val);
        }

        if (args) {
          this.buf.push('}, ' + args + ');');
        } else {
          this.buf.push('});');
        }

      } else {
        this.buf.push(name + '(' + args + ');');
      }
      if (pp) this.buf.push("jade_indent.pop();")
    } else {
      var mixin_start = this.buf.length;
      this.buf.push(name + ' = function(' + args + '){');
      this.buf.push('var block = (this && this.block), attributes = (this && this.attributes) || {};');
      this.parentIndents++;
      this.visit(block);
      this.parentIndents--;
      this.buf.push('};');
      var mixin_end = this.buf.length;
      this.mixins[key].instances.push({start: mixin_start, end: mixin_end});
    }
  },

  /**
   * Visit `tag` buffering tag markup, generating
   * attributes, visiting the `tag`'s code and block.
   *
   * @param {Tag} tag
   * @api public
   */

  visitTag: function(tag){
    this.indents++;
    var name = tag.name
      , pp = this.pp
      , self = this;

    function bufferName() {
      if (tag.buffer) self.bufferExpression(name);
      else self.buffer(name);
    }

    if ('pre' == tag.name) this.escape = true;

    if (!this.hasCompiledTag) {
      if (!this.hasCompiledDoctype && 'html' == name) {
        this.visitDoctype();
      }
      this.hasCompiledTag = true;
    }

    // pretty print
    if (pp && !tag.isInline())
      this.prettyIndent(0, true);

    if (tag.selfClosing || (!this.xml && selfClosing.indexOf(tag.name) !== -1)) {
      this.buffer('<');
      bufferName();
      this.visitAttributes(tag.attrs, tag.attributeBlocks);
      this.terse
        ? this.buffer('>')
        : this.buffer('/>');
      // if it is non-empty throw an error
      if (tag.block &&
          !(tag.block.type === 'Block' && tag.block.nodes.length === 0) &&
          tag.block.nodes.some(function (tag) {
            return tag.type !== 'Text' || !/^\s*$/.test(tag.val)
          })) {
        throw errorAtNode(tag, new Error(name + ' is self closing and should not have content.'));
      }
    } else {
      // Optimize attributes buffering
      this.buffer('<');
      bufferName();
      this.visitAttributes(tag.attrs, tag.attributeBlocks);
      this.buffer('>');
      if (tag.code) this.visitCode(tag.code);
      this.visit(tag.block);

      // pretty print
      if (pp && !tag.isInline() && 'pre' != tag.name && !tag.canInline())
        this.prettyIndent(0, true);

      this.buffer('</');
      bufferName();
      this.buffer('>');
    }

    if ('pre' == tag.name) this.escape = false;

    this.indents--;
  },

  /**
   * Visit `filter`, throwing when the filter does not exist.
   *
   * @param {Filter} filter
   * @api public
   */

  visitFilter: function(filter){
    var text = filter.block.nodes.map(
      function(node){ return node.val; }
    ).join('\n');
    filter.attrs.filename = this.options.filename;
    try {
      this.buffer(filters(filter.name, text, filter.attrs), true);
    } catch (err) {
      throw errorAtNode(filter, err);
    }
  },

  /**
   * Visit `text` node.
   *
   * @param {Text} text
   * @api public
   */

  visitText: function(text){
    this.buffer(text.val, true);
  },

  /**
   * Visit a `comment`, only buffering when the buffer flag is set.
   *
   * @param {Comment} comment
   * @api public
   */

  visitComment: function(comment){
    if (!comment.buffer) return;
    if (this.pp) this.prettyIndent(1, true);
    this.buffer('<!--' + comment.val + '-->');
  },

  /**
   * Visit a `BlockComment`.
   *
   * @param {Comment} comment
   * @api public
   */

  visitBlockComment: function(comment){
    if (!comment.buffer) return;
    if (this.pp) this.prettyIndent(1, true);
    this.buffer('<!--' + comment.val);
    this.visit(comment.block);
    if (this.pp) this.prettyIndent(1, true);
    this.buffer('-->');
  },

  /**
   * Visit `code`, respecting buffer / escape flags.
   * If the code is followed by a block, wrap it in
   * a self-calling function.
   *
   * @param {Code} code
   * @api public
   */

  visitCode: function(code){
    // Wrap code blocks with {}.
    // we only wrap unbuffered code blocks ATM
    // since they are usually flow control

    // Buffer code
    if (code.buffer) {
      var val = code.val.trimLeft();
      val = 'null == (jade_interp = '+val+') ? "" : jade_interp';
      if (code.escape) val = 'jade.escape(' + val + ')';
      this.bufferExpression(val);
    } else {
      this.buf.push(code.val);
    }

    // Block support
    if (code.block) {
      if (!code.buffer) this.buf.push('{');
      this.visit(code.block);
      if (!code.buffer) this.buf.push('}');
    }
  },

  /**
   * Visit `each` block.
   *
   * @param {Each} each
   * @api public
   */

  visitEach: function(each){
    this.buf.push(''
      + '// iterate ' + each.obj + '\n'
      + ';(function(){\n'
      + '  var $$obj = ' + each.obj + ';\n'
      + '  if (\'number\' == typeof $$obj.length) {\n');

    if (each.alternative) {
      this.buf.push('  if ($$obj.length) {');
    }

    this.buf.push(''
      + '    for (var ' + each.key + ' = 0, $$l = $$obj.length; ' + each.key + ' < $$l; ' + each.key + '++) {\n'
      + '      var ' + each.val + ' = $$obj[' + each.key + '];\n');

    this.visit(each.block);

    this.buf.push('    }\n');

    if (each.alternative) {
      this.buf.push('  } else {');
      this.visit(each.alternative);
      this.buf.push('  }');
    }

    this.buf.push(''
      + '  } else {\n'
      + '    var $$l = 0;\n'
      + '    for (var ' + each.key + ' in $$obj) {\n'
      + '      $$l++;'
      + '      var ' + each.val + ' = $$obj[' + each.key + '];\n');

    this.visit(each.block);

    this.buf.push('    }\n');
    if (each.alternative) {
      this.buf.push('    if ($$l === 0) {');
      this.visit(each.alternative);
      this.buf.push('    }');
    }
    this.buf.push('  }\n}).call(this);\n');
  },

  /**
   * Visit `attrs`.
   *
   * @param {Array} attrs
   * @api public
   */

  visitAttributes: function(attrs, attributeBlocks){
    if (attributeBlocks.length) {
      if (attrs.length) {
        var val = this.attrs(attrs);
        attributeBlocks.unshift(val);
      }
      this.bufferExpression('jade.attrs(jade.merge([' + attributeBlocks.join(',') + ']), ' + JSON.stringify(this.terse) + ')');
    } else if (attrs.length) {
      this.attrs(attrs, true);
    }
  },

  /**
   * Compile attributes.
   */

  attrs: function(attrs, buffer){
    var buf = [];
    var classes = [];
    var classEscaping = [];

    attrs.forEach(function(attr){
      var key = attr.name;
      var escaped = attr.escaped;

      if (key === 'class') {
        classes.push(attr.val);
        classEscaping.push(attr.escaped);
      } else if (isConstant(attr.val)) {
        if (buffer) {
          this.buffer(runtime.attr(key, toConstant(attr.val), escaped, this.terse));
        } else {
          var val = toConstant(attr.val);
          if (escaped && !(key.indexOf('data') === 0 && typeof val !== 'string')) {
            val = runtime.escape(val);
          }
          buf.push(JSON.stringify(key) + ': ' + JSON.stringify(val));
        }
      } else {
        if (buffer) {
          this.bufferExpression('jade.attr("' + key + '", ' + attr.val + ', ' + JSON.stringify(escaped) + ', ' + JSON.stringify(this.terse) + ')');
        } else {
          var val = attr.val;
          if (escaped && !(key.indexOf('data') === 0)) {
            val = 'jade.escape(' + val + ')';
          } else if (escaped) {
            val = '(typeof (jade_interp = ' + val + ') == "string" ? jade.escape(jade_interp) : jade_interp)';
          }
          buf.push(JSON.stringify(key) + ': ' + val);
        }
      }
    }.bind(this));
    if (buffer) {
      if (classes.every(isConstant)) {
        this.buffer(runtime.cls(classes.map(toConstant), classEscaping));
      } else {
        this.bufferExpression('jade.cls([' + classes.join(',') + '], ' + JSON.stringify(classEscaping) + ')');
      }
    } else if (classes.length) {
      if (classes.every(isConstant)) {
        classes = JSON.stringify(runtime.joinClasses(classes.map(toConstant).map(runtime.joinClasses).map(function (cls, i) {
          return classEscaping[i] ? runtime.escape(cls) : cls;
        })));
      } else {
        classes = '(jade_interp = ' + JSON.stringify(classEscaping) + ',' +
          ' jade.joinClasses([' + classes.join(',') + '].map(jade.joinClasses).map(function (cls, i) {' +
          '   return jade_interp[i] ? jade.escape(cls) : cls' +
          ' }))' +
          ')';
      }
      if (classes.length)
        buf.push('"class": ' + classes);
    }
    return '{' + buf.join(',') + '}';
  }
};

},{"./doctypes":14,"./filters":15,"./nodes":28,"./runtime":36,"./self-closing":37,"./utils":38,"character-parser":39,"constantinople":40}],14:[function(require,module,exports){
'use strict';

module.exports = {
    'default': '<!DOCTYPE html>'
  , 'xml': '<?xml version="1.0" encoding="utf-8" ?>'
  , 'transitional': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'
  , 'strict': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">'
  , 'frameset': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Frameset//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-frameset.dtd">'
  , '1.1': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">'
  , 'basic': '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML Basic 1.1//EN" "http://www.w3.org/TR/xhtml-basic/xhtml-basic11.dtd">'
  , 'mobile': '<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.2//EN" "http://www.openmobilealliance.org/tech/DTD/xhtml-mobile12.dtd">'
};
},{}],15:[function(require,module,exports){
'use strict';

module.exports = filter;
function filter(name, str, options) {
  if (typeof filter[name] === 'function') {
    var res = filter[name](str, options);
  } else {
    throw new Error('unknown filter ":' + name + '"');
  }
  return res;
}

},{}],16:[function(require,module,exports){
'use strict';

module.exports = [
    'a'
  , 'abbr'
  , 'acronym'
  , 'b'
  , 'br'
  , 'code'
  , 'em'
  , 'font'
  , 'i'
  , 'img'
  , 'ins'
  , 'kbd'
  , 'map'
  , 'samp'
  , 'small'
  , 'span'
  , 'strong'
  , 'sub'
  , 'sup'
];
},{}],17:[function(require,module,exports){
'use strict';

/*!
 * Jade
 * Copyright(c) 2010 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var Parser = require('./parser')
  , Lexer = require('./lexer')
  , Compiler = require('./compiler')
  , runtime = require('./runtime')
  , addWith = require('with')
  , fs = require('fs');

/**
 * Expose self closing tags.
 */

exports.selfClosing = require('./self-closing');

/**
 * Default supported doctypes.
 */

exports.doctypes = require('./doctypes');

/**
 * Text filters.
 */

exports.filters = require('./filters');

/**
 * Utilities.
 */

exports.utils = require('./utils');

/**
 * Expose `Compiler`.
 */

exports.Compiler = Compiler;

/**
 * Expose `Parser`.
 */

exports.Parser = Parser;

/**
 * Expose `Lexer`.
 */

exports.Lexer = Lexer;

/**
 * Nodes.
 */

exports.nodes = require('./nodes');

/**
 * Jade runtime helpers.
 */

exports.runtime = runtime;

/**
 * Template function cache.
 */

exports.cache = {};

/**
 * Parse the given `str` of jade and return a function body.
 *
 * @param {String} str
 * @param {Object} options
 * @return {String}
 * @api private
 */

function parse(str, options){
  // Parse
  var parser = new (options.parser || Parser)(str, options.filename, options);
  var tokens;
  try {
    // Parse
    tokens = parser.parse();
  } catch (err) {
    parser = parser.context();
    runtime.rethrow(err, parser.filename, parser.lexer.lineno, parser.input);
  }

  // Compile
  var compiler = new (options.compiler || Compiler)(tokens, options);
  var js;
  try {
    js = compiler.compile();
  } catch (err) {
    if (err.line && (err.filename || !options.filename)) {
      runtime.rethrow(err, err.filename, err.line, parser.input);
    }
  }

  // Debug compiler
  if (options.debug) {
    console.error('\nCompiled Function:\n\n\u001b[90m%s\u001b[0m', js.replace(/^/gm, '  '));
  }

  var globals = [];

  globals.push('jade');
  globals.push('jade_mixins');
  globals.push('jade_interp');
  globals.push('jade_debug');
  globals.push('buf');

  return ''
    + 'var buf = [];\n'
    + 'var jade_mixins = {};\n'
    + 'var jade_interp;\n'
    + (options.self
      ? 'var self = locals || {};\n' + js
      : addWith('locals || {}', '\n' + js, globals)) + ';'
    + 'return buf.join("");';
}

/**
 * Compile a `Function` representation of the given jade `str`.
 *
 * Options:
 *
 *   - `compileDebug` when `false` debugging code is stripped from the compiled
       template, when it is explicitly `true`, the source code is included in
       the compiled template for better accuracy.
 *   - `filename` used to improve errors when `compileDebug` is not `false` and to resolve imports/extends
 *
 * @param {String} str
 * @param {Options} options
 * @return {Function}
 * @api public
 */

exports.compile = function(str, options){
  var options = options || {}
    , filename = options.filename
      ? JSON.stringify(options.filename)
      : 'undefined'
    , fn;

  str = String(str);

  if (options.compileDebug !== false) {
    fn = [
        'var jade_debug = [{ lineno: 1, filename: ' + filename + ' }];'
      , 'try {'
      , parse(str, options)
      , '} catch (err) {'
      , '  jade.rethrow(err, jade_debug[0].filename, jade_debug[0].lineno' + (options.compileDebug === true ? ',' + JSON.stringify(str) : '') + ');'
      , '}'
    ].join('\n');
  } else {
    fn = parse(str, options);
  }
  fn = new Function('locals, jade', fn)
  var res = function(locals){ return fn(locals, Object.create(runtime)) };
  if (options.client) {
    res.toString = function () {
      var err = new Error('The `client` option is deprecated, use `jade.compileClient`');
      console.error(err.stack || err.message);
      return exports.compileClient(str, options);
    };
  }
  return res;
};

/**
 * Compile a JavaScript source representation of the given jade `str`.
 *
 * Options:
 *
 *   - `compileDebug` When it is `true`, the source code is included in
       the compiled template for better error messages.
 *   - `filename` used to improve errors when `compileDebug` is not `true` and to resolve imports/extends
 *
 * @param {String} str
 * @param {Options} options
 * @return {String}
 * @api public
 */

exports.compileClient = function(str, options){
  var options = options || {}
    , filename = options.filename
      ? JSON.stringify(options.filename)
      : 'undefined'
    , fn;

  str = String(str);

  if (options.compileDebug) {
    options.compileDebug = true;
    fn = [
        'var jade_debug = [{ lineno: 1, filename: ' + filename + ' }];'
      , 'try {'
      , parse(str, options)
      , '} catch (err) {'
      , '  jade.rethrow(err, jade_debug[0].filename, jade_debug[0].lineno, ' + JSON.stringify(str) + ');'
      , '}'
    ].join('\n');
  } else {
    options.compileDebug = false;
    fn = parse(str, options);
  }

  return 'function template(locals) {\n' + fn + '\n}';
};



/**
 * Render the given `str` of jade.
 *
 * Options:
 *
 *   - `cache` enable template caching
 *   - `filename` filename required for `include` / `extends` and caching
 *
 * @param {String} str
 * @param {Object|Function} options or fn
 * @param {Function|undefined} fn
 * @returns {String}
 * @api public
 */

exports.render = function(str, options, fn){
  // support callback API
  if ('function' == typeof options) {
    fn = options, options = undefined;
  }
  if (typeof fn === 'function') {
    var res
    try {
      res = exports.render(str, options);
    } catch (ex) {
      return fn(ex);
    }
    return fn(null, res);
  }

  options = options || {};

  // cache requires .filename
  if (options.cache && !options.filename) {
    throw new Error('the "filename" option is required for caching');
  }

  var path = options.filename;
  var tmpl = options.cache
    ? exports.cache[path] || (exports.cache[path] = exports.compile(str, options))
    : exports.compile(str, options);
  return tmpl(options);
};

/**
 * Render a Jade file at the given `path`.
 *
 * @param {String} path
 * @param {Object|Function} options or callback
 * @param {Function|undefined} fn
 * @returns {String}
 * @api public
 */

exports.renderFile = function(path, options, fn){
  // support callback API
  if ('function' == typeof options) {
    fn = options, options = undefined;
  }
  if (typeof fn === 'function') {
    var res
    try {
      res = exports.renderFile(path, options);
    } catch (ex) {
      return fn(ex);
    }
    return fn(null, res);
  }

  options = options || {};

  var key = path + ':string';

  options.filename = path;
  var str = options.cache
    ? exports.cache[key] || (exports.cache[key] = fs.readFileSync(path, 'utf8'))
    : fs.readFileSync(path, 'utf8');
  return exports.render(str, options);
};


/**
 * Compile a Jade file at the given `path` for use on the client.
 *
 * @param {String} path
 * @param {Object} options
 * @returns {String}
 * @api public
 */

exports.compileFileClient = function(path, options){
  options = options || {};

  var key = path + ':string';

  options.filename = path;
  var str = options.cache
    ? exports.cache[key] || (exports.cache[key] = fs.readFileSync(path, 'utf8'))
    : fs.readFileSync(path, 'utf8');

  return exports.compileClient(str, options);
};

/**
 * Express support.
 */

exports.__express = exports.renderFile;

},{"./compiler":13,"./doctypes":14,"./filters":15,"./lexer":18,"./nodes":28,"./parser":35,"./runtime":36,"./self-closing":37,"./utils":38,"fs":71,"with":52}],18:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var characterParser = require('character-parser');


/**
 * Initialize `Lexer` with the given `str`.
 *
 * @param {String} str
 * @param {String} filename
 * @api private
 */

var Lexer = module.exports = function Lexer(str, filename) {
  this.input = str.replace(/\r\n|\r/g, '\n');
  this.filename = filename;
  this.deferredTokens = [];
  this.lastIndents = 0;
  this.lineno = 1;
  this.stash = [];
  this.indentStack = [];
  this.indentRe = null;
  this.pipeless = false;
};


function assertExpression(exp) {
  //this verifies that a JavaScript expression is valid
  Function('', 'return (' + exp + ')');
}
function assertNestingCorrect(exp) {
  //this verifies that code is properly nested, but allows
  //invalid JavaScript such as the contents of `attributes`
  var res = characterParser(exp)
  if (res.isNesting()) {
    throw new Error('Nesting must match on expression `' + exp + '`')
  }
}

/**
 * Lexer prototype.
 */

Lexer.prototype = {

  /**
   * Construct a token with the given `type` and `val`.
   *
   * @param {String} type
   * @param {String} val
   * @return {Object}
   * @api private
   */

  tok: function(type, val){
    return {
        type: type
      , line: this.lineno
      , val: val
    }
  },

  /**
   * Consume the given `len` of input.
   *
   * @param {Number} len
   * @api private
   */

  consume: function(len){
    this.input = this.input.substr(len);
  },

  /**
   * Scan for `type` with the given `regexp`.
   *
   * @param {String} type
   * @param {RegExp} regexp
   * @return {Object}
   * @api private
   */

  scan: function(regexp, type){
    var captures;
    if (captures = regexp.exec(this.input)) {
      this.consume(captures[0].length);
      return this.tok(type, captures[1]);
    }
  },

  /**
   * Defer the given `tok`.
   *
   * @param {Object} tok
   * @api private
   */

  defer: function(tok){
    this.deferredTokens.push(tok);
  },

  /**
   * Lookahead `n` tokens.
   *
   * @param {Number} n
   * @return {Object}
   * @api private
   */

  lookahead: function(n){
    var fetch = n - this.stash.length;
    while (fetch-- > 0) this.stash.push(this.next());
    return this.stash[--n];
  },

  /**
   * Return the indexOf `(` or `{` or `[` / `)` or `}` or `]` delimiters.
   *
   * @return {Number}
   * @api private
   */

  bracketExpression: function(skip){
    skip = skip || 0;
    var start = this.input[skip];
    if (start != '(' && start != '{' && start != '[') throw new Error('unrecognized start character');
    var end = ({'(': ')', '{': '}', '[': ']'})[start];
    var range = characterParser.parseMax(this.input, {start: skip + 1});
    if (this.input[range.end] !== end) throw new Error('start character ' + start + ' does not match end character ' + this.input[range.end]);
    return range;
  },

  /**
   * Stashed token.
   */

  stashed: function() {
    return this.stash.length
      && this.stash.shift();
  },

  /**
   * Deferred token.
   */

  deferred: function() {
    return this.deferredTokens.length
      && this.deferredTokens.shift();
  },

  /**
   * end-of-source.
   */

  eos: function() {
    if (this.input.length) return;
    if (this.indentStack.length) {
      this.indentStack.shift();
      return this.tok('outdent');
    } else {
      return this.tok('eos');
    }
  },

  /**
   * Blank line.
   */

  blank: function() {
    var captures;
    if (captures = /^\n *\n/.exec(this.input)) {
      this.consume(captures[0].length - 1);
      ++this.lineno;
      if (this.pipeless) return this.tok('text', '');
      return this.next();
    }
  },

  /**
   * Comment.
   */

  comment: function() {
    var captures;
    if (captures = /^\/\/(-)?([^\n]*)/.exec(this.input)) {
      this.consume(captures[0].length);
      var tok = this.tok('comment', captures[2]);
      tok.buffer = '-' != captures[1];
      return tok;
    }
  },

  /**
   * Interpolated tag.
   */

  interpolation: function() {
    if (/^#\{/.test(this.input)) {
      var match;
      try {
        match = this.bracketExpression(1);
      } catch (ex) {
        return;//not an interpolation expression, just an unmatched open interpolation
      }

      this.consume(match.end + 1);
      return this.tok('interpolation', match.src);
    }
  },

  /**
   * Tag.
   */

  tag: function() {
    var captures;
    if (captures = /^(\w[-:\w]*)(\/?)/.exec(this.input)) {
      this.consume(captures[0].length);
      var tok, name = captures[1];
      if (':' == name[name.length - 1]) {
        name = name.slice(0, -1);
        tok = this.tok('tag', name);
        this.defer(this.tok(':'));
        while (' ' == this.input[0]) this.input = this.input.substr(1);
      } else {
        tok = this.tok('tag', name);
      }
      tok.selfClosing = !!captures[2];
      return tok;
    }
  },

  /**
   * Filter.
   */

  filter: function() {
    return this.scan(/^:([\w\-]+)/, 'filter');
  },

  /**
   * Doctype.
   */

  doctype: function() {
    if (this.scan(/^!!! *([^\n]+)?/, 'doctype')) {
      throw new Error('`!!!` is deprecated, you must now use `doctype`');
    }
    var node = this.scan(/^(?:doctype) *([^\n]+)?/, 'doctype');
    if (node && node.val && node.val.trim() === '5') {
      throw new Error('`doctype 5` is deprecated, you must now use `doctype html`');
    }
    return node;
  },

  /**
   * Id.
   */

  id: function() {
    return this.scan(/^#([\w-]+)/, 'id');
  },

  /**
   * Class.
   */

  className: function() {
    return this.scan(/^\.([\w-]+)/, 'class');
  },

  /**
   * Text.
   */

  text: function() {
    return this.scan(/^(?:\| ?| )([^\n]+)/, 'text') || this.scan(/^(<[^\n]*)/, 'text');
  },

  textFail: function () {
    var tok;
    if (tok = this.scan(/^([^\.\n][^\n]+)/, 'text')) {
      console.warn('Warning: missing space before text for line ' + this.lineno +
          ' of jade file "' + this.filename + '"');
      return tok;
    }
  },

  /**
   * Dot.
   */

  dot: function() {
    return this.scan(/^\./, 'dot');
  },

  /**
   * Extends.
   */

  "extends": function() {
    return this.scan(/^extends? +([^\n]+)/, 'extends');
  },

  /**
   * Block prepend.
   */

  prepend: function() {
    var captures;
    if (captures = /^prepend +([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      var mode = 'prepend'
        , name = captures[1]
        , tok = this.tok('block', name);
      tok.mode = mode;
      return tok;
    }
  },

  /**
   * Block append.
   */

  append: function() {
    var captures;
    if (captures = /^append +([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      var mode = 'append'
        , name = captures[1]
        , tok = this.tok('block', name);
      tok.mode = mode;
      return tok;
    }
  },

  /**
   * Block.
   */

  block: function() {
    var captures;
    if (captures = /^block\b *(?:(prepend|append) +)?([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      var mode = captures[1] || 'replace'
        , name = captures[2]
        , tok = this.tok('block', name);

      tok.mode = mode;
      return tok;
    }
  },

  /**
   * Mixin Block.
   */

  mixinBlock: function() {
    var captures;
    if (captures = /^block\s*(\n|$)/.exec(this.input)) {
      this.consume(captures[0].length - 1);
      return this.tok('mixin-block');
    }
  },

  /**
   * Yield.
   */

  yield: function() {
    return this.scan(/^yield */, 'yield');
  },

  /**
   * Include.
   */

  include: function() {
    return this.scan(/^include +([^\n]+)/, 'include');
  },

  /**
   * Include with filter
   */

  includeFiltered: function() {
    var captures;
    if (captures = /^include:([\w\-]+) +([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      var filter = captures[1];
      var path = captures[2];
      var tok = this.tok('include', path);
      tok.filter = filter;
      return tok;
    }
  },

  /**
   * Case.
   */

  "case": function() {
    return this.scan(/^case +([^\n]+)/, 'case');
  },

  /**
   * When.
   */

  when: function() {
    return this.scan(/^when +([^:\n]+)/, 'when');
  },

  /**
   * Default.
   */

  "default": function() {
    return this.scan(/^default */, 'default');
  },

  /**
   * Call mixin.
   */

  call: function(){

    var tok, captures;
    if (captures = /^\+(([-\w]+)|(#\{))/.exec(this.input)) {
      // try to consume simple or interpolated call
      if (captures[2]) {
        // simple call
        this.consume(captures[0].length);
        tok = this.tok('call', captures[2]);
      } else {
        // interpolated call
        var match;
        try {
          match = this.bracketExpression(2);
        } catch (ex) {
          return;//not an interpolation expression, just an unmatched open interpolation
        }
        this.consume(match.end + 1);
        assertExpression(match.src);
        tok = this.tok('call', '#{'+match.src+'}');
      }

      // Check for args (not attributes)
      if (captures = /^ *\(/.exec(this.input)) {
        try {
          var range = this.bracketExpression(captures[0].length - 1);
          if (!/^ *[-\w]+ *=/.test(range.src)) { // not attributes
            this.consume(range.end + 1);
            tok.args = range.src;
          }
        } catch (ex) {
          //not a bracket expcetion, just unmatched open parens
        }
      }

      return tok;
    }
  },

  /**
   * Mixin.
   */

  mixin: function(){
    var captures;
    if (captures = /^mixin +([-\w]+)(?: *\((.*)\))? */.exec(this.input)) {
      this.consume(captures[0].length);
      var tok = this.tok('mixin', captures[1]);
      tok.args = captures[2];
      return tok;
    }
  },

  /**
   * Conditional.
   */

  conditional: function() {
    var captures;
    if (captures = /^(if|unless|else if|else)\b([^\n]*)/.exec(this.input)) {
      this.consume(captures[0].length);
      var type = captures[1]
      var js = captures[2];
      var isIf = false;
      var isElse = false;

      switch (type) {
        case 'if':
          assertExpression(js)
          js = 'if (' + js + ')';
          isIf = true;
          break;
        case 'unless':
          assertExpression(js)
          js = 'if (!(' + js + '))';
          isIf = true;
          break;
        case 'else if':
          assertExpression(js)
          js = 'else if (' + js + ')';
          isIf = true;
          isElse = true;
          break;
        case 'else':
          if (js && js.trim()) {
            throw new Error('`else` cannot have a condition, perhaps you meant `else if`');
          }
          js = 'else';
          isElse = true;
          break;
      }
      var tok = this.tok('code', js);
      tok.isElse = isElse;
      tok.isIf = isIf;
      tok.requiresBlock = true;
      return tok;
    }
  },

  /**
   * While.
   */

  "while": function() {
    var captures;
    if (captures = /^while +([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      assertExpression(captures[1])
      var tok = this.tok('code', 'while (' + captures[1] + ')');
      tok.requiresBlock = true;
      return tok;
    }
  },

  /**
   * Each.
   */

  each: function() {
    var captures;
    if (captures = /^(?:- *)?(?:each|for) +([a-zA-Z_$][\w$]*)(?: *, *([a-zA-Z_$][\w$]*))? * in *([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      var tok = this.tok('each', captures[1]);
      tok.key = captures[2] || '$index';
      assertExpression(captures[3])
      tok.code = captures[3];
      return tok;
    }
  },

  /**
   * Code.
   */

  code: function() {
    var captures;
    if (captures = /^(!?=|-)[ \t]*([^\n]+)/.exec(this.input)) {
      this.consume(captures[0].length);
      var flags = captures[1];
      captures[1] = captures[2];
      var tok = this.tok('code', captures[1]);
      tok.escape = flags.charAt(0) === '=';
      tok.buffer = flags.charAt(0) === '=' || flags.charAt(1) === '=';
      if (tok.buffer) assertExpression(captures[1])
      return tok;
    }
  },

  /**
   * Attributes.
   */

  attrs: function() {
    if ('(' == this.input.charAt(0)) {
      var index = this.bracketExpression().end
        , str = this.input.substr(1, index-1)
        , tok = this.tok('attrs');

      assertNestingCorrect(str);

      var quote = '';
      var interpolate = function (attr) {
        return attr.replace(/(\\)?#\{(.+)/g, function(_, escape, expr){
          if (escape) return _;
          try {
            var range = characterParser.parseMax(expr);
            if (expr[range.end] !== '}') return _.substr(0, 2) + interpolate(_.substr(2));
            assertExpression(range.src)
            return quote + " + (" + range.src + ") + " + quote + interpolate(expr.substr(range.end + 1));
          } catch (ex) {
            return _.substr(0, 2) + interpolate(_.substr(2));
          }
        });
      }

      this.consume(index + 1);
      tok.attrs = [];

      var escapedAttr = true
      var key = '';
      var val = '';
      var interpolatable = '';
      var state = characterParser.defaultState();
      var loc = 'key';
      var isEndOfAttribute = function (i) {
        if (key.trim() === '') return false;
        if (i === str.length) return true;
        if (loc === 'key') {
          if (str[i] === ' ' || str[i] === '\n') {
            for (var x = i; x < str.length; x++) {
              if (str[x] != ' ' && str[x] != '\n') {
                if (str[x] === '=' || str[x] === '!' || str[x] === ',') return false;
                else return true;
              }
            }
          }
          return str[i] === ','
        } else if (loc === 'value' && !state.isNesting()) {
          try {
            Function('', 'return (' + val + ');');
            if (str[i] === ' ' || str[i] === '\n') {
              for (var x = i; x < str.length; x++) {
                if (str[x] != ' ' && str[x] != '\n') {
                  if (characterParser.isPunctuator(str[x]) && str[x] != '"' && str[x] != "'") return false;
                  else return true;
                }
              }
            }
            return str[i] === ',';
          } catch (ex) {
            return false;
          }
        }
      }

      this.lineno += str.split("\n").length - 1;

      for (var i = 0; i <= str.length; i++) {
        if (isEndOfAttribute(i)) {
          val = val.trim();
          if (val) assertExpression(val)
          key = key.trim();
          key = key.replace(/^['"]|['"]$/g, '');
          tok.attrs.push({
            name: key,
            val: '' == val ? true : val,
            escaped: escapedAttr
          });
          key = val = '';
          loc = 'key';
          escapedAttr = false;
        } else {
          switch (loc) {
            case 'key-char':
              if (str[i] === quote) {
                loc = 'key';
                if (i + 1 < str.length && [' ', ',', '!', '=', '\n'].indexOf(str[i + 1]) === -1)
                  throw new Error('Unexpected character ' + str[i + 1] + ' expected ` `, `\\n`, `,`, `!` or `=`');
              } else {
                key += str[i];
              }
              break;
            case 'key':
              if (key === '' && (str[i] === '"' || str[i] === "'")) {
                loc = 'key-char';
                quote = str[i];
              } else if (str[i] === '!' || str[i] === '=') {
                escapedAttr = str[i] !== '!';
                if (str[i] === '!') i++;
                if (str[i] !== '=') throw new Error('Unexpected character ' + str[i] + ' expected `=`');
                loc = 'value';
                state = characterParser.defaultState();
              } else {
                key += str[i]
              }
              break;
            case 'value':
              state = characterParser.parseChar(str[i], state);
              if (state.isString()) {
                loc = 'string';
                quote = str[i];
                interpolatable = str[i];
              } else {
                val += str[i];
              }
              break;
            case 'string':
              state = characterParser.parseChar(str[i], state);
              interpolatable += str[i];
              if (!state.isString()) {
                loc = 'value';
                val += interpolate(interpolatable);
              }
              break;
          }
        }
      }

      if ('/' == this.input.charAt(0)) {
        this.consume(1);
        tok.selfClosing = true;
      }

      return tok;
    }
  },

  /**
   * &attributes block
   */
  attributesBlock: function () {
    var captures;
    if (/^&attributes\b/.test(this.input)) {
      this.consume(11);
      var args = this.bracketExpression();
      this.consume(args.end + 1);
      return this.tok('&attributes', args.src);
    }
  },

  /**
   * Indent | Outdent | Newline.
   */

  indent: function() {
    var captures, re;

    // established regexp
    if (this.indentRe) {
      captures = this.indentRe.exec(this.input);
    // determine regexp
    } else {
      // tabs
      re = /^\n(\t*) */;
      captures = re.exec(this.input);

      // spaces
      if (captures && !captures[1].length) {
        re = /^\n( *)/;
        captures = re.exec(this.input);
      }

      // established
      if (captures && captures[1].length) this.indentRe = re;
    }

    if (captures) {
      var tok
        , indents = captures[1].length;

      ++this.lineno;
      this.consume(indents + 1);

      if (' ' == this.input[0] || '\t' == this.input[0]) {
        throw new Error('Invalid indentation, you can use tabs or spaces but not both');
      }

      // blank line
      if ('\n' == this.input[0]) return this.tok('newline');

      // outdent
      if (this.indentStack.length && indents < this.indentStack[0]) {
        while (this.indentStack.length && this.indentStack[0] > indents) {
          this.stash.push(this.tok('outdent'));
          this.indentStack.shift();
        }
        tok = this.stash.pop();
      // indent
      } else if (indents && indents != this.indentStack[0]) {
        this.indentStack.unshift(indents);
        tok = this.tok('indent', indents);
      // newline
      } else {
        tok = this.tok('newline');
      }

      return tok;
    }
  },

  /**
   * Pipe-less text consumed only when
   * pipeless is true;
   */

  pipelessText: function() {
    if (this.pipeless) {
      if ('\n' == this.input[0]) return;
      var i = this.input.indexOf('\n');
      if (-1 == i) i = this.input.length;
      var str = this.input.substr(0, i);
      this.consume(str.length);
      return this.tok('text', str);
    }
  },

  /**
   * ':'
   */

  colon: function() {
    return this.scan(/^: */, ':');
  },

  fail: function () {
    if (/^ ($|\n)/.test(this.input)) {
      this.consume(1);
      return this.next();
    }
    throw new Error('unexpected text ' + this.input.substr(0, 5));
  },

  /**
   * Return the next token object, or those
   * previously stashed by lookahead.
   *
   * @return {Object}
   * @api private
   */

  advance: function(){
    return this.stashed()
      || this.next();
  },

  /**
   * Return the next token object.
   *
   * @return {Object}
   * @api private
   */

  next: function() {
    return this.deferred()
      || this.blank()
      || this.eos()
      || this.pipelessText()
      || this.yield()
      || this.doctype()
      || this.interpolation()
      || this["case"]()
      || this.when()
      || this["default"]()
      || this["extends"]()
      || this.append()
      || this.prepend()
      || this.block()
      || this.mixinBlock()
      || this.include()
      || this.includeFiltered()
      || this.mixin()
      || this.call()
      || this.conditional()
      || this.each()
      || this["while"]()
      || this.tag()
      || this.filter()
      || this.code()
      || this.id()
      || this.className()
      || this.attrs()
      || this.attributesBlock()
      || this.indent()
      || this.text()
      || this.comment()
      || this.colon()
      || this.dot()
      || this.textFail()
      || this.fail();
  }
};

},{"./utils":38,"character-parser":39}],19:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `Attrs` node.
 *
 * @api public
 */

var Attrs = module.exports = function Attrs() {
  this.attributeNames = [];
  this.attrs = [];
  this.attributeBlocks = [];
};

// Inherit from `Node`.
Attrs.prototype = Object.create(Node.prototype);
Attrs.prototype.constructor = Attrs;

Attrs.prototype.type = 'Attrs';

/**
 * Set attribute `name` to `val`, keep in mind these become
 * part of a raw js object literal, so to quote a value you must
 * '"quote me"', otherwise or example 'user.name' is literal JavaScript.
 *
 * @param {String} name
 * @param {String} val
 * @param {Boolean} escaped
 * @return {Tag} for chaining
 * @api public
 */

Attrs.prototype.setAttribute = function(name, val, escaped){
  if (name !== 'class' && this.attributeNames.indexOf(name) !== -1) {
    throw new Error('Duplicate attribute "' + name + '" is not allowed.');
  }
  this.attributeNames.push(name);
  this.attrs.push({ name: name, val: val, escaped: escaped });
  return this;
};

/**
 * Remove attribute `name` when present.
 *
 * @param {String} name
 * @api public
 */

Attrs.prototype.removeAttribute = function(name){
  var err = new Error('attrs.removeAttribute is deprecated and will be removed in v2.0.0');
  console.warn(err.stack);

  for (var i = 0, len = this.attrs.length; i < len; ++i) {
    if (this.attrs[i] && this.attrs[i].name == name) {
      delete this.attrs[i];
    }
  }
};

/**
 * Get attribute value by `name`.
 *
 * @param {String} name
 * @return {String}
 * @api public
 */

Attrs.prototype.getAttribute = function(name){
  var err = new Error('attrs.getAttribute is deprecated and will be removed in v2.0.0');
  console.warn(err.stack);

  for (var i = 0, len = this.attrs.length; i < len; ++i) {
    if (this.attrs[i] && this.attrs[i].name == name) {
      return this.attrs[i].val;
    }
  }
};

Attrs.prototype.addAttributes = function (src) {
  this.attributeBlocks.push(src);
};

},{"./node":32}],20:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `BlockComment` with the given `block`.
 *
 * @param {String} val
 * @param {Block} block
 * @param {Boolean} buffer
 * @api public
 */

var BlockComment = module.exports = function BlockComment(val, block, buffer) {
  this.block = block;
  this.val = val;
  this.buffer = buffer;
};

// Inherit from `Node`.
BlockComment.prototype = Object.create(Node.prototype);
BlockComment.prototype.constructor = BlockComment;

BlockComment.prototype.type = 'BlockComment';

},{"./node":32}],21:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a new `Block` with an optional `node`.
 *
 * @param {Node} node
 * @api public
 */

var Block = module.exports = function Block(node){
  this.nodes = [];
  if (node) this.push(node);
};

// Inherit from `Node`.
Block.prototype = Object.create(Node.prototype);
Block.prototype.constructor = Block;

Block.prototype.type = 'Block';

/**
 * Block flag.
 */

Block.prototype.isBlock = true;

/**
 * Replace the nodes in `other` with the nodes
 * in `this` block.
 *
 * @param {Block} other
 * @api private
 */

Block.prototype.replace = function(other){
  var err = new Error('block.replace is deprecated and will be removed in v2.0.0');
  console.warn(err.stack);

  other.nodes = this.nodes;
};

/**
 * Push the given `node`.
 *
 * @param {Node} node
 * @return {Number}
 * @api public
 */

Block.prototype.push = function(node){
  return this.nodes.push(node);
};

/**
 * Check if this block is empty.
 *
 * @return {Boolean}
 * @api public
 */

Block.prototype.isEmpty = function(){
  return 0 == this.nodes.length;
};

/**
 * Unshift the given `node`.
 *
 * @param {Node} node
 * @return {Number}
 * @api public
 */

Block.prototype.unshift = function(node){
  return this.nodes.unshift(node);
};

/**
 * Return the "last" block, or the first `yield` node.
 *
 * @return {Block}
 * @api private
 */

Block.prototype.includeBlock = function(){
  var ret = this
    , node;

  for (var i = 0, len = this.nodes.length; i < len; ++i) {
    node = this.nodes[i];
    if (node.yield) return node;
    else if (node.textOnly) continue;
    else if (node.includeBlock) ret = node.includeBlock();
    else if (node.block && !node.block.isEmpty()) ret = node.block.includeBlock();
    if (ret.yield) return ret;
  }

  return ret;
};

/**
 * Return a clone of this block.
 *
 * @return {Block}
 * @api private
 */

Block.prototype.clone = function(){
  var err = new Error('block.clone is deprecated and will be removed in v2.0.0');
  console.warn(err.stack);

  var clone = new Block;
  for (var i = 0, len = this.nodes.length; i < len; ++i) {
    clone.push(this.nodes[i].clone());
  }
  return clone;
};

},{"./node":32}],22:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a new `Case` with `expr`.
 *
 * @param {String} expr
 * @api public
 */

var Case = exports = module.exports = function Case(expr, block){
  this.expr = expr;
  this.block = block;
};

// Inherit from `Node`.
Case.prototype = Object.create(Node.prototype);
Case.prototype.constructor = Case;

Case.prototype.type = 'Case';

var When = exports.When = function When(expr, block){
  this.expr = expr;
  this.block = block;
  this.debug = false;
};

// Inherit from `Node`.
When.prototype = Object.create(Node.prototype);
When.prototype.constructor = When;

When.prototype.type = 'When';

},{"./node":32}],23:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `Code` node with the given code `val`.
 * Code may also be optionally buffered and escaped.
 *
 * @param {String} val
 * @param {Boolean} buffer
 * @param {Boolean} escape
 * @api public
 */

var Code = module.exports = function Code(val, buffer, escape) {
  this.val = val;
  this.buffer = buffer;
  this.escape = escape;
  if (val.match(/^ *else/)) this.debug = false;
};

// Inherit from `Node`.
Code.prototype = Object.create(Node.prototype);
Code.prototype.constructor = Code;

Code.prototype.type = 'Code'; // prevent the minifiers removing this
},{"./node":32}],24:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `Comment` with the given `val`, optionally `buffer`,
 * otherwise the comment may render in the output.
 *
 * @param {String} val
 * @param {Boolean} buffer
 * @api public
 */

var Comment = module.exports = function Comment(val, buffer) {
  this.val = val;
  this.buffer = buffer;
};

// Inherit from `Node`.
Comment.prototype = Object.create(Node.prototype);
Comment.prototype.constructor = Comment;

Comment.prototype.type = 'Comment';

},{"./node":32}],25:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `Doctype` with the given `val`. 
 *
 * @param {String} val
 * @api public
 */

var Doctype = module.exports = function Doctype(val) {
  this.val = val;
};

// Inherit from `Node`.
Doctype.prototype = Object.create(Node.prototype);
Doctype.prototype.constructor = Doctype;

Doctype.prototype.type = 'Doctype';

},{"./node":32}],26:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize an `Each` node, representing iteration
 *
 * @param {String} obj
 * @param {String} val
 * @param {String} key
 * @param {Block} block
 * @api public
 */

var Each = module.exports = function Each(obj, val, key, block) {
  this.obj = obj;
  this.val = val;
  this.key = key;
  this.block = block;
};

// Inherit from `Node`.
Each.prototype = Object.create(Node.prototype);
Each.prototype.constructor = Each;

Each.prototype.type = 'Each';

},{"./node":32}],27:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `Filter` node with the given
 * filter `name` and `block`.
 *
 * @param {String} name
 * @param {Block|Node} block
 * @api public
 */

var Filter = module.exports = function Filter(name, block, attrs) {
  this.name = name;
  this.block = block;
  this.attrs = attrs;
};

// Inherit from `Node`.
Filter.prototype = Object.create(Node.prototype);
Filter.prototype.constructor = Filter;

Filter.prototype.type = 'Filter';

},{"./node":32}],28:[function(require,module,exports){
'use strict';

exports.Node = require('./node');
exports.Tag = require('./tag');
exports.Code = require('./code');
exports.Each = require('./each');
exports.Case = require('./case');
exports.Text = require('./text');
exports.Block = require('./block');
exports.MixinBlock = require('./mixin-block');
exports.Mixin = require('./mixin');
exports.Filter = require('./filter');
exports.Comment = require('./comment');
exports.Literal = require('./literal');
exports.BlockComment = require('./block-comment');
exports.Doctype = require('./doctype');

},{"./block":21,"./block-comment":20,"./case":22,"./code":23,"./comment":24,"./doctype":25,"./each":26,"./filter":27,"./literal":29,"./mixin":31,"./mixin-block":30,"./node":32,"./tag":33,"./text":34}],29:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `Literal` node with the given `str.
 *
 * @param {String} str
 * @api public
 */

var Literal = module.exports = function Literal(str) {
  this.str = str;
};

// Inherit from `Node`.
Literal.prototype = Object.create(Node.prototype);
Literal.prototype.constructor = Literal;

Literal.prototype.type = 'Literal';

},{"./node":32}],30:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a new `Block` with an optional `node`.
 *
 * @param {Node} node
 * @api public
 */

var MixinBlock = module.exports = function MixinBlock(){};

// Inherit from `Node`.
MixinBlock.prototype = Object.create(Node.prototype);
MixinBlock.prototype.constructor = MixinBlock;

MixinBlock.prototype.type = 'MixinBlock';

},{"./node":32}],31:[function(require,module,exports){
'use strict';

var Attrs = require('./attrs');

/**
 * Initialize a new `Mixin` with `name` and `block`.
 *
 * @param {String} name
 * @param {String} args
 * @param {Block} block
 * @api public
 */

var Mixin = module.exports = function Mixin(name, args, block, call){
  Attrs.call(this);
  this.name = name;
  this.args = args;
  this.block = block;
  this.call = call;
};

// Inherit from `Attrs`.
Mixin.prototype = Object.create(Attrs.prototype);
Mixin.prototype.constructor = Mixin;

Mixin.prototype.type = 'Mixin';

},{"./attrs":19}],32:[function(require,module,exports){
'use strict';

var Node = module.exports = function Node(){};

/**
 * Clone this node (return itself)
 *
 * @return {Node}
 * @api private
 */

Node.prototype.clone = function(){
  var err = new Error('node.clone is deprecated and will be removed in v2.0.0');
  console.warn(err.stack);
  return this;
};

Node.prototype.type = '';

},{}],33:[function(require,module,exports){
'use strict';

var Attrs = require('./attrs');
var Block = require('./block');
var inlineTags = require('../inline-tags');

/**
 * Initialize a `Tag` node with the given tag `name` and optional `block`.
 *
 * @param {String} name
 * @param {Block} block
 * @api public
 */

var Tag = module.exports = function Tag(name, block) {
  Attrs.call(this);
  this.name = name;
  this.block = block || new Block;
};

// Inherit from `Attrs`.
Tag.prototype = Object.create(Attrs.prototype);
Tag.prototype.constructor = Tag;

Tag.prototype.type = 'Tag';

/**
 * Clone this tag.
 *
 * @return {Tag}
 * @api private
 */

Tag.prototype.clone = function(){
  var err = new Error('tag.clone is deprecated and will be removed in v2.0.0');
  console.warn(err.stack);

  var clone = new Tag(this.name, this.block.clone());
  clone.line = this.line;
  clone.attrs = this.attrs;
  clone.textOnly = this.textOnly;
  return clone;
};

/**
 * Check if this tag is an inline tag.
 *
 * @return {Boolean}
 * @api private
 */

Tag.prototype.isInline = function(){
  return ~inlineTags.indexOf(this.name);
};

/**
 * Check if this tag's contents can be inlined.  Used for pretty printing.
 *
 * @return {Boolean}
 * @api private
 */

Tag.prototype.canInline = function(){
  var nodes = this.block.nodes;

  function isInline(node){
    // Recurse if the node is a block
    if (node.isBlock) return node.nodes.every(isInline);
    return node.isText || (node.isInline && node.isInline());
  }

  // Empty tag
  if (!nodes.length) return true;

  // Text-only or inline-only tag
  if (1 == nodes.length) return isInline(nodes[0]);

  // Multi-line inline-only tag
  if (this.block.nodes.every(isInline)) {
    for (var i = 1, len = nodes.length; i < len; ++i) {
      if (nodes[i-1].isText && nodes[i].isText)
        return false;
    }
    return true;
  }

  // Mixed tag
  return false;
};

},{"../inline-tags":16,"./attrs":19,"./block":21}],34:[function(require,module,exports){
'use strict';

var Node = require('./node');

/**
 * Initialize a `Text` node with optional `line`.
 *
 * @param {String} line
 * @api public
 */

var Text = module.exports = function Text(line) {
  this.val = line;
};

// Inherit from `Node`.
Text.prototype = Object.create(Node.prototype);
Text.prototype.constructor = Text;

Text.prototype.type = 'Text';

/**
 * Flag as text.
 */

Text.prototype.isText = true;
},{"./node":32}],35:[function(require,module,exports){
'use strict';

var Lexer = require('./lexer');
var nodes = require('./nodes');
var utils = require('./utils');
var filters = require('./filters');
var path = require('path');
var constantinople = require('constantinople');
var parseJSExpression = require('character-parser').parseMax;
var extname = path.extname;

/**
 * Initialize `Parser` with the given input `str` and `filename`.
 *
 * @param {String} str
 * @param {String} filename
 * @param {Object} options
 * @api public
 */

var Parser = exports = module.exports = function Parser(str, filename, options){
  //Strip any UTF-8 BOM off of the start of `str`, if it exists.
  this.input = str.replace(/^\uFEFF/, '');
  this.lexer = new Lexer(this.input, filename);
  this.filename = filename;
  this.blocks = {};
  this.mixins = {};
  this.options = options;
  this.contexts = [this];
  this.inMixin = false;
};

/**
 * Parser prototype.
 */

Parser.prototype = {

  /**
   * Save original constructor
   */

  constructor: Parser,

  /**
   * Push `parser` onto the context stack,
   * or pop and return a `Parser`.
   */

  context: function(parser){
    if (parser) {
      this.contexts.push(parser);
    } else {
      return this.contexts.pop();
    }
  },

  /**
   * Return the next token object.
   *
   * @return {Object}
   * @api private
   */

  advance: function(){
    return this.lexer.advance();
  },

  /**
   * Single token lookahead.
   *
   * @return {Object}
   * @api private
   */

  peek: function() {
    return this.lookahead(1);
  },

  /**
   * Return lexer lineno.
   *
   * @return {Number}
   * @api private
   */

  line: function() {
    return this.lexer.lineno;
  },

  /**
   * `n` token lookahead.
   *
   * @param {Number} n
   * @return {Object}
   * @api private
   */

  lookahead: function(n){
    return this.lexer.lookahead(n);
  },

  /**
   * Parse input returning a string of js for evaluation.
   *
   * @return {String}
   * @api public
   */

  parse: function(){
    var block = new nodes.Block, parser;
    block.line = 0;
    block.filename = this.filename;

    while ('eos' != this.peek().type) {
      if ('newline' == this.peek().type) {
        this.advance();
      } else {
        var next = this.peek();
        var expr = this.parseExpr();
        expr.filename = expr.filename || this.filename;
        expr.line = next.line;
        block.push(expr);
      }
    }

    if (parser = this.extending) {
      this.context(parser);
      var ast = parser.parse();
      this.context();

      // hoist mixins
      for (var name in this.mixins)
        ast.unshift(this.mixins[name]);
      return ast;
    }

    return block;
  },

  /**
   * Expect the given type, or throw an exception.
   *
   * @param {String} type
   * @api private
   */

  expect: function(type){
    if (this.peek().type === type) {
      return this.advance();
    } else {
      throw new Error('expected "' + type + '", but got "' + this.peek().type + '"');
    }
  },

  /**
   * Accept the given `type`.
   *
   * @param {String} type
   * @api private
   */

  accept: function(type){
    if (this.peek().type === type) {
      return this.advance();
    }
  },

  /**
   *   tag
   * | doctype
   * | mixin
   * | include
   * | filter
   * | comment
   * | text
   * | each
   * | code
   * | yield
   * | id
   * | class
   * | interpolation
   */

  parseExpr: function(){
    switch (this.peek().type) {
      case 'tag':
        return this.parseTag();
      case 'mixin':
        return this.parseMixin();
      case 'block':
        return this.parseBlock();
      case 'mixin-block':
        return this.parseMixinBlock();
      case 'case':
        return this.parseCase();
      case 'extends':
        return this.parseExtends();
      case 'include':
        return this.parseInclude();
      case 'doctype':
        return this.parseDoctype();
      case 'filter':
        return this.parseFilter();
      case 'comment':
        return this.parseComment();
      case 'text':
        return this.parseText();
      case 'each':
        return this.parseEach();
      case 'code':
        return this.parseCode();
      case 'call':
        return this.parseCall();
      case 'interpolation':
        return this.parseInterpolation();
      case 'yield':
        this.advance();
        var block = new nodes.Block;
        block.yield = true;
        return block;
      case 'id':
      case 'class':
        var tok = this.advance();
        this.lexer.defer(this.lexer.tok('tag', 'div'));
        this.lexer.defer(tok);
        return this.parseExpr();
      default:
        throw new Error('unexpected token "' + this.peek().type + '"');
    }
  },

  /**
   * Text
   */

  parseText: function(){
    var tok = this.expect('text');
    var tokens = this.parseTextWithInlineTags(tok.val);
    if (tokens.length === 1) return tokens[0];
    var node = new nodes.Block;
    for (var i = 0; i < tokens.length; i++) {
      node.push(tokens[i]);
    };
    return node;
  },

  /**
   *   ':' expr
   * | block
   */

  parseBlockExpansion: function(){
    if (':' == this.peek().type) {
      this.advance();
      return new nodes.Block(this.parseExpr());
    } else {
      return this.block();
    }
  },

  /**
   * case
   */

  parseCase: function(){
    var val = this.expect('case').val;
    var node = new nodes.Case(val);
    node.line = this.line();

    var block = new nodes.Block;
    block.line = this.line();
    block.filename = this.filename;
    this.expect('indent');
    while ('outdent' != this.peek().type) {
      switch (this.peek().type) {
        case 'newline':
          this.advance();
          break;
        case 'when':
          block.push(this.parseWhen());
          break;
        case 'default':
          block.push(this.parseDefault());
          break;
        default:
          throw new Error('Unexpected token "' + this.peek().type
                          + '", expected "when", "default" or "newline"');
      }
    }
    this.expect('outdent');

    node.block = block;

    return node;
  },

  /**
   * when
   */

  parseWhen: function(){
    var val = this.expect('when').val;
    if (this.peek().type !== 'newline')
      return new nodes.Case.When(val, this.parseBlockExpansion());
    else
      return new nodes.Case.When(val);
  },

  /**
   * default
   */

  parseDefault: function(){
    this.expect('default');
    return new nodes.Case.When('default', this.parseBlockExpansion());
  },

  /**
   * code
   */

  parseCode: function(afterIf){
    var tok = this.expect('code');
    var node = new nodes.Code(tok.val, tok.buffer, tok.escape);
    var block;
    node.line = this.line();

    // throw an error if an else does not have an if
    if (tok.isElse && !tok.hasIf) {
      throw new Error('Unexpected else without if');
    }

    // handle block
    block = 'indent' == this.peek().type;
    if (block) {
      node.block = this.block();
    }

    // handle missing block
    if (tok.requiresBlock && !block) {
      node.block = new nodes.Block();
    }

    // mark presense of if for future elses
    if (tok.isIf && this.peek().isElse) {
      this.peek().hasIf = true;
    } else if (tok.isIf && this.peek().type === 'newline' && this.lookahead(2).isElse) {
      this.lookahead(2).hasIf = true;
    }

    return node;
  },

  /**
   * comment
   */

  parseComment: function(){
    var tok = this.expect('comment');
    var node;

    if ('indent' == this.peek().type) {
      this.lexer.pipeless = true;
      node = new nodes.BlockComment(tok.val, this.parseTextBlock(), tok.buffer);
      this.lexer.pipeless = false;
    } else {
      node = new nodes.Comment(tok.val, tok.buffer);
    }

    node.line = this.line();
    return node;
  },

  /**
   * doctype
   */

  parseDoctype: function(){
    var tok = this.expect('doctype');
    var node = new nodes.Doctype(tok.val);
    node.line = this.line();
    return node;
  },

  /**
   * filter attrs? text-block
   */

  parseFilter: function(){
    var tok = this.expect('filter');
    var attrs = this.accept('attrs');
    var block;

    if ('indent' == this.peek().type) {
      this.lexer.pipeless = true;
      block = this.parseTextBlock();
      this.lexer.pipeless = false;
    } else {
      block = new nodes.Block;
    }

    var options = {};
    if (attrs) {
      attrs.attrs.forEach(function (attribute) {
        options[attribute.name] = constantinople.toConstant(attribute.val);
      });
    }

    var node = new nodes.Filter(tok.val, block, options);
    node.line = this.line();
    return node;
  },

  /**
   * each block
   */

  parseEach: function(){
    var tok = this.expect('each');
    var node = new nodes.Each(tok.code, tok.val, tok.key);
    node.line = this.line();
    node.block = this.block();
    if (this.peek().type == 'code' && this.peek().val == 'else') {
      this.advance();
      node.alternative = this.block();
    }
    return node;
  },

  /**
   * Resolves a path relative to the template for use in
   * includes and extends
   *
   * @param {String}  path
   * @param {String}  purpose  Used in error messages.
   * @return {String}
   * @api private
   */

  resolvePath: function (path, purpose) {
    var p = require('path');
    var dirname = p.dirname;
    var basename = p.basename;
    var join = p.join;

    if (path[0] !== '/' && !this.filename)
      throw new Error('the "filename" option is required to use "' + purpose + '" with "relative" paths');

    if (path[0] === '/' && !this.options.basedir)
      throw new Error('the "basedir" option is required to use "' + purpose + '" with "absolute" paths');

    path = join(path[0] === '/' ? this.options.basedir : dirname(this.filename), path);

    if (basename(path).indexOf('.') === -1) path += '.jade';

    return path;
  },

  /**
   * 'extends' name
   */

  parseExtends: function(){
    var fs = require('fs');

    var path = this.resolvePath(this.expect('extends').val.trim(), 'extends');
    if ('.jade' != path.substr(-5)) path += '.jade';

    var str = fs.readFileSync(path, 'utf8');
    var parser = new this.constructor(str, path, this.options);

    parser.blocks = this.blocks;
    parser.contexts = this.contexts;
    this.extending = parser;

    // TODO: null node
    return new nodes.Literal('');
  },

  /**
   * 'block' name block
   */

  parseBlock: function(){
    var block = this.expect('block');
    var mode = block.mode;
    var name = block.val.trim();

    block = 'indent' == this.peek().type
      ? this.block()
      : new nodes.Block(new nodes.Literal(''));

    var prev = this.blocks[name] || {prepended: [], appended: []}
    if (prev.mode === 'replace') return this.blocks[name] = prev;

    var allNodes = prev.prepended.concat(block.nodes).concat(prev.appended);

    switch (mode) {
      case 'append':
        prev.appended = prev.parser === this ?
                        prev.appended.concat(block.nodes) :
                        block.nodes.concat(prev.appended);
        break;
      case 'prepend':
        prev.prepended = prev.parser === this ?
                         block.nodes.concat(prev.prepended) :
                         prev.prepended.concat(block.nodes);
        break;
    }
    block.nodes = allNodes;
    block.appended = prev.appended;
    block.prepended = prev.prepended;
    block.mode = mode;
    block.parser = this;

    return this.blocks[name] = block;
  },

  parseMixinBlock: function () {
    var block = this.expect('mixin-block');
    if (!this.inMixin) {
      throw new Error('Anonymous blocks are not allowed unless they are part of a mixin.');
    }
    return new nodes.MixinBlock();
  },

  /**
   * include block?
   */

  parseInclude: function(){
    var fs = require('fs');
    var tok = this.expect('include');

    var path = this.resolvePath(tok.val.trim(), 'include');

    // has-filter
    if (tok.filter) {
      var str = fs.readFileSync(path, 'utf8').replace(/\r/g, '');
      str = filters(tok.filter, str, { filename: path });
      return new nodes.Literal(str);
    }

    // non-jade
    if ('.jade' != path.substr(-5)) {
      var str = fs.readFileSync(path, 'utf8').replace(/\r/g, '');
      return new nodes.Literal(str);
    }

    var str = fs.readFileSync(path, 'utf8');
    var parser = new this.constructor(str, path, this.options);
    parser.blocks = utils.merge({}, this.blocks);

    parser.mixins = this.mixins;

    this.context(parser);
    var ast = parser.parse();
    this.context();
    ast.filename = path;

    if ('indent' == this.peek().type) {
      ast.includeBlock().push(this.block());
    }

    return ast;
  },

  /**
   * call ident block
   */

  parseCall: function(){
    var tok = this.expect('call');
    var name = tok.val;
    var args = tok.args;
    var mixin = new nodes.Mixin(name, args, new nodes.Block, true);

    this.tag(mixin);
    if (mixin.code) {
      mixin.block.push(mixin.code);
      mixin.code = null;
    }
    if (mixin.block.isEmpty()) mixin.block = null;
    return mixin;
  },

  /**
   * mixin block
   */

  parseMixin: function(){
    var tok = this.expect('mixin');
    var name = tok.val;
    var args = tok.args;
    var mixin;

    // definition
    if ('indent' == this.peek().type) {
      this.inMixin = true;
      mixin = new nodes.Mixin(name, args, this.block(), false);
      this.mixins[name] = mixin;
      this.inMixin = false;
      return mixin;
    // call
    } else {
      return new nodes.Mixin(name, args, null, true);
    }
  },

  parseTextWithInlineTags: function (str) {
    var line = this.line();

    var match = /(\\)?#\[((?:.|\n)*)$/.exec(str);
    if (match) {
      if (match[1]) { // escape
        var text = new nodes.Text(str.substr(0, match.index) + '#[');
        text.line = line;
        var rest = this.parseTextWithInlineTags(match[2]);
        if (rest[0].type === 'Text') {
          text.val += rest[0].val;
          rest.shift();
        }
        return [text].concat(rest);
      } else {
        var text = new nodes.Text(str.substr(0, match.index));
        text.line = line;
        var buffer = [text];
        var rest = match[2];
        var range = parseJSExpression(rest);
        var inner = new Parser(range.src, this.filename, this.options);
        buffer.push(inner.parse());
        return buffer.concat(this.parseTextWithInlineTags(rest.substr(range.end + 1)));
      }
    } else {
      var text = new nodes.Text(str);
      text.line = line;
      return [text];
    }
  },

  /**
   * indent (text | newline)* outdent
   */

  parseTextBlock: function(){
    var block = new nodes.Block;
    block.line = this.line();
    var spaces = this.expect('indent').val;
    if (null == this._spaces) this._spaces = spaces;
    var indent = Array(spaces - this._spaces + 1).join(' ');
    while ('outdent' != this.peek().type) {
      switch (this.peek().type) {
        case 'newline':
          this.advance();
          break;
        case 'indent':
          this.parseTextBlock(true).nodes.forEach(function(node){
            block.push(node);
          });
          break;
        default:
          var texts = this.parseTextWithInlineTags(indent + this.advance().val);
          texts.forEach(function (text) {
            block.push(text);
          });
      }
    }

    if (spaces == this._spaces) this._spaces = null;
    this.expect('outdent');

    return block;
  },

  /**
   * indent expr* outdent
   */

  block: function(){
    var block = new nodes.Block;
    block.line = this.line();
    block.filename = this.filename;
    this.expect('indent');
    while ('outdent' != this.peek().type) {
      if ('newline' == this.peek().type) {
        this.advance();
      } else {
        var expr = this.parseExpr();
        expr.filename = this.filename;
        block.push(expr);
      }
    }
    this.expect('outdent');
    return block;
  },

  /**
   * interpolation (attrs | class | id)* (text | code | ':')? newline* block?
   */

  parseInterpolation: function(){
    var tok = this.advance();
    var tag = new nodes.Tag(tok.val);
    tag.buffer = true;
    return this.tag(tag);
  },

  /**
   * tag (attrs | class | id)* (text | code | ':')? newline* block?
   */

  parseTag: function(){
    var tok = this.advance();
    var tag = new nodes.Tag(tok.val);

    tag.selfClosing = tok.selfClosing;

    return this.tag(tag);
  },

  /**
   * Parse tag.
   */

  tag: function(tag){
    tag.line = this.line();

    var seenAttrs = false;
    // (attrs | class | id)*
    out:
      while (true) {
        switch (this.peek().type) {
          case 'id':
          case 'class':
            var tok = this.advance();
            tag.setAttribute(tok.type, "'" + tok.val + "'");
            continue;
          case 'attrs':
            if (seenAttrs) {
              console.warn(this.filename + ', line ' + this.peek().line + ':\nYou should not have jade tags with multiple attributes.');
            }
            seenAttrs = true;
            var tok = this.advance();
            var attrs = tok.attrs;

            if (tok.selfClosing) tag.selfClosing = true;

            for (var i = 0; i < attrs.length; i++) {
              tag.setAttribute(attrs[i].name, attrs[i].val, attrs[i].escaped);
            }
            continue;
          case '&attributes':
            var tok = this.advance();
            tag.addAttributes(tok.val);
            break;
          default:
            break out;
        }
      }

    // check immediate '.'
    if ('dot' == this.peek().type) {
      tag.textOnly = true;
      this.advance();
    }

    // (text | code | ':')?
    switch (this.peek().type) {
      case 'text':
        tag.block.push(this.parseText());
        break;
      case 'code':
        tag.code = this.parseCode();
        break;
      case ':':
        this.advance();
        tag.block = new nodes.Block;
        tag.block.push(this.parseExpr());
        break;
      case 'newline':
      case 'indent':
      case 'outdent':
      case 'eos':
        break;
      default:
        throw new Error('Unexpected token `' + this.peek().type + '` expected `text`, `code`, `:`, `newline` or `eos`')
    }

    // newline*
    while ('newline' == this.peek().type) this.advance();

    // block?
    if ('indent' == this.peek().type) {
      if (tag.textOnly) {
        this.lexer.pipeless = true;
        tag.block = this.parseTextBlock();
        this.lexer.pipeless = false;
      } else {
        var block = this.block();
        for (var i = 0, len = block.nodes.length; i < len; ++i) {
          tag.block.push(block.nodes[i]);
        }
      }
    }

    return tag;
  }
};

},{"./filters":15,"./lexer":18,"./nodes":28,"./utils":38,"character-parser":39,"constantinople":40,"fs":71,"path":84}],36:[function(require,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(' ') : val;
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};

/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str =  str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":71}],37:[function(require,module,exports){
'use strict';

// source: http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements

module.exports = [
    'area'
  , 'base'
  , 'br'
  , 'col'
  , 'embed'
  , 'hr'
  , 'img'
  , 'input'
  , 'keygen'
  , 'link'
  , 'menuitem'
  , 'meta'
  , 'param'
  , 'source'
  , 'track'
  , 'wbr'
];

},{}],38:[function(require,module,exports){
'use strict';

/**
 * Merge `b` into `a`.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 * @api public
 */

exports.merge = function(a, b) {
  for (var key in b) a[key] = b[key];
  return a;
};


},{}],39:[function(require,module,exports){
exports = (module.exports = parse);
exports.parse = parse;
function parse(src, state, options) {
  options = options || {};
  state = state || exports.defaultState();
  var start = options.start || 0;
  var end = options.end || src.length;
  var index = start;
  while (index < end) {
    if (state.roundDepth < 0 || state.curlyDepth < 0 || state.squareDepth < 0) {
      throw new SyntaxError('Mismatched Bracket: ' + src[index - 1]);
    }
    exports.parseChar(src[index++], state);
  }
  return state;
}

exports.parseMax = parseMax;
function parseMax(src, options) {
  options = options || {};
  var start = options.start || 0;
  var index = start;
  var state = exports.defaultState();
  while (state.roundDepth >= 0 && state.curlyDepth >= 0 && state.squareDepth >= 0) {
    if (index >= src.length) {
      throw new Error('The end of the string was reached with no closing bracket found.');
    }
    exports.parseChar(src[index++], state);
  }
  var end = index - 1;
  return {
    start: start,
    end: end,
    src: src.substring(start, end)
  };
}

exports.parseUntil = parseUntil;
function parseUntil(src, delimiter, options) {
  options = options || {};
  var includeLineComment = options.includeLineComment || false;
  var start = options.start || 0;
  var index = start;
  var state = exports.defaultState();
  while (state.isString() || state.regexp || state.blockComment ||
         (!includeLineComment && state.lineComment) || !startsWith(src, delimiter, index)) {
    exports.parseChar(src[index++], state);
  }
  var end = index;
  return {
    start: start,
    end: end,
    src: src.substring(start, end)
  };
}


exports.parseChar = parseChar;
function parseChar(character, state) {
  if (character.length !== 1) throw new Error('Character must be a string of length 1');
  state = state || exports.defaultState();
  var wasComment = state.blockComment || state.lineComment;
  var lastChar = state.history ? state.history[0] : '';
  if (state.lineComment) {
    if (character === '\n') {
      state.lineComment = false;
    }
  } else if (state.blockComment) {
    if (state.lastChar === '*' && character === '/') {
      state.blockComment = false;
    }
  } else if (state.singleQuote) {
    if (character === '\'' && !state.escaped) {
      state.singleQuote = false;
    } else if (character === '\\' && !state.escaped) {
      state.escaped = true;
    } else {
      state.escaped = false;
    }
  } else if (state.doubleQuote) {
    if (character === '"' && !state.escaped) {
      state.doubleQuote = false;
    } else if (character === '\\' && !state.escaped) {
      state.escaped = true;
    } else {
      state.escaped = false;
    }
  } else if (state.regexp) {
    if (character === '/' && !state.escaped) {
      state.regexp = false;
    } else if (character === '\\' && !state.escaped) {
      state.escaped = true;
    } else {
      state.escaped = false;
    }
  } else if (lastChar === '/' && character === '/') {
    state.history = state.history.substr(1);
    state.lineComment = true;
  } else if (lastChar === '/' && character === '*') {
    state.history = state.history.substr(1);
    state.blockComment = true;
  } else if (character === '/' && isRegexp(state.history)) {
    state.regexp = true;
  } else if (character === '\'') {
    state.singleQuote = true;
  } else if (character === '"') {
    state.doubleQuote = true;
  } else if (character === '(') {
    state.roundDepth++;
  } else if (character === ')') {
    state.roundDepth--;
  } else if (character === '{') {
    state.curlyDepth++;
  } else if (character === '}') {
    state.curlyDepth--;
  } else if (character === '[') {
    state.squareDepth++;
  } else if (character === ']') {
    state.squareDepth--;
  }
  if (!state.blockComment && !state.lineComment && !wasComment) state.history = character + state.history;
  return state;
}

exports.defaultState = function () { return new State() };
function State() {
  this.lineComment = false;
  this.blockComment = false;

  this.singleQuote = false;
  this.doubleQuote = false;
  this.regexp = false;
  this.escaped = false;

  this.roundDepth = 0;
  this.curlyDepth = 0;
  this.squareDepth = 0;

  this.history = ''
}
State.prototype.isString = function () {
  return this.singleQuote || this.doubleQuote;
}
State.prototype.isComment = function () {
  return this.lineComment || this.blockComment;
}
State.prototype.isNesting = function () {
  return this.isString() || this.isComment() || this.regexp || this.roundDepth > 0 || this.curlyDepth > 0 || this.squareDepth > 0
}

function startsWith(str, start, i) {
  return str.substr(i || 0, start.length) === start;
}

exports.isPunctuator = isPunctuator
function isPunctuator(c) {
  var code = c.charCodeAt(0)

  switch (code) {
    case 46:   // . dot
    case 40:   // ( open bracket
    case 41:   // ) close bracket
    case 59:   // ; semicolon
    case 44:   // , comma
    case 123:  // { open curly brace
    case 125:  // } close curly brace
    case 91:   // [
    case 93:   // ]
    case 58:   // :
    case 63:   // ?
    case 126:  // ~
    case 37:   // %
    case 38:   // &
    case 42:   // *:
    case 43:   // +
    case 45:   // -
    case 47:   // /
    case 60:   // <
    case 62:   // >
    case 94:   // ^
    case 124:  // |
    case 33:   // !
    case 61:   // =
      return true;
    default:
      return false;
  }
}
exports.isKeyword = isKeyword
function isKeyword(id) {
  return (id === 'if') || (id === 'in') || (id === 'do') || (id === 'var') || (id === 'for') || (id === 'new') ||
         (id === 'try') || (id === 'let') || (id === 'this') || (id === 'else') || (id === 'case') ||
         (id === 'void') || (id === 'with') || (id === 'enum') || (id === 'while') || (id === 'break') || (id === 'catch') ||
         (id === 'throw') || (id === 'const') || (id === 'yield') || (id === 'class') || (id === 'super') ||
         (id === 'return') || (id === 'typeof') || (id === 'delete') || (id === 'switch') || (id === 'export') ||
         (id === 'import') || (id === 'default') || (id === 'finally') || (id === 'extends') || (id === 'function') ||
         (id === 'continue') || (id === 'debugger') || (id === 'package') || (id === 'private') || (id === 'interface') ||
         (id === 'instanceof') || (id === 'implements') || (id === 'protected') || (id === 'public') || (id === 'static') ||
         (id === 'yield') || (id === 'let');
}

function isRegexp(history) {
  //could be start of regexp or divide sign

  history = history.replace(/^\s*/, '');

  //unless its an `if`, `while`, `for` or `with` it's a divide, so we assume it's a divide
  if (history[0] === ')') return false;
  //unless it's a function expression, it's a regexp, so we assume it's a regexp
  if (history[0] === '}') return true;
  //any punctuation means it's a regexp
  if (isPunctuator(history[0])) return true;
  //if the last thing was a keyword then it must be a regexp (e.g. `typeof /foo/`)
  if (/^\w+\b/.test(history) && isKeyword(/^\w+\b/.exec(history)[0].split('').reverse().join(''))) return true;

  return false;
}

},{}],40:[function(require,module,exports){
'use strict'

var uglify = require('uglify-js')

var lastSRC = '(null)'
var lastRes = true
var lastConstants = undefined;

module.exports = isConstant
function isConstant(src, constants) {
  src = '(' + src + ')'
  if (lastSRC === src && lastConstants === constants) return lastRes
  lastSRC = src
  try {
    return lastRes = (detect(src).filter(function (key) {
      return !constants || !(key in constants)
    }).length === 0)
  } catch (ex) {
    return lastRes = false
  }
}
isConstant.isConstant = isConstant

isConstant.toConstant = toConstant
function toConstant(src, constants) {
  if (!isConstant(src, constants)) throw new Error(JSON.stringify(src) + ' is not constant.')
  return Function(Object.keys(constants || {}).join(','), 'return (' + src + ')').apply(null, Object.keys(constants || {}).map(function (key) {
    return constants[key];
  }));
}

function detect(src) {
  var ast = uglify.parse(src.toString())
  ast.figure_out_scope()
  var globals = ast.globals
    .map(function (node, name) {
      return name
    })
  return globals
}
},{"uglify-js":51}],41:[function(require,module,exports){
/*
 * Copyright 2009-2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE.txt or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
exports.SourceMapGenerator = require('./source-map/source-map-generator').SourceMapGenerator;
exports.SourceMapConsumer = require('./source-map/source-map-consumer').SourceMapConsumer;
exports.SourceNode = require('./source-map/source-node').SourceNode;

},{"./source-map/source-map-consumer":46,"./source-map/source-map-generator":47,"./source-map/source-node":48}],42:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');

  /**
   * A data structure which is a combination of an array and a set. Adding a new
   * member is O(1), testing for membership is O(1), and finding the index of an
   * element is O(1). Removing elements from the set is not supported. Only
   * strings are supported for membership.
   */
  function ArraySet() {
    this._array = [];
    this._set = {};
  }

  /**
   * Static method for creating ArraySet instances from an existing array.
   */
  ArraySet.fromArray = function ArraySet_fromArray(aArray, aAllowDuplicates) {
    var set = new ArraySet();
    for (var i = 0, len = aArray.length; i < len; i++) {
      set.add(aArray[i], aAllowDuplicates);
    }
    return set;
  };

  /**
   * Add the given string to this set.
   *
   * @param String aStr
   */
  ArraySet.prototype.add = function ArraySet_add(aStr, aAllowDuplicates) {
    var isDuplicate = this.has(aStr);
    var idx = this._array.length;
    if (!isDuplicate || aAllowDuplicates) {
      this._array.push(aStr);
    }
    if (!isDuplicate) {
      this._set[util.toSetString(aStr)] = idx;
    }
  };

  /**
   * Is the given string a member of this set?
   *
   * @param String aStr
   */
  ArraySet.prototype.has = function ArraySet_has(aStr) {
    return Object.prototype.hasOwnProperty.call(this._set,
                                                util.toSetString(aStr));
  };

  /**
   * What is the index of the given string in the array?
   *
   * @param String aStr
   */
  ArraySet.prototype.indexOf = function ArraySet_indexOf(aStr) {
    if (this.has(aStr)) {
      return this._set[util.toSetString(aStr)];
    }
    throw new Error('"' + aStr + '" is not in the set.');
  };

  /**
   * What is the element at the given index?
   *
   * @param Number aIdx
   */
  ArraySet.prototype.at = function ArraySet_at(aIdx) {
    if (aIdx >= 0 && aIdx < this._array.length) {
      return this._array[aIdx];
    }
    throw new Error('No element indexed by ' + aIdx);
  };

  /**
   * Returns the array representation of this set (which has the proper indices
   * indicated by indexOf). Note that this is a copy of the internal array used
   * for storing the members so that no one can mess with internal state.
   */
  ArraySet.prototype.toArray = function ArraySet_toArray() {
    return this._array.slice();
  };

  exports.ArraySet = ArraySet;

});

},{"./util":49,"amdefine":50}],43:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 *
 * Based on the Base 64 VLQ implementation in Closure Compiler:
 * https://code.google.com/p/closure-compiler/source/browse/trunk/src/com/google/debugging/sourcemap/Base64VLQ.java
 *
 * Copyright 2011 The Closure Compiler Authors. All rights reserved.
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above
 *    copyright notice, this list of conditions and the following
 *    disclaimer in the documentation and/or other materials provided
 *    with the distribution.
 *  * Neither the name of Google Inc. nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64 = require('./base64');

  // A single base 64 digit can contain 6 bits of data. For the base 64 variable
  // length quantities we use in the source map spec, the first bit is the sign,
  // the next four bits are the actual value, and the 6th bit is the
  // continuation bit. The continuation bit tells us whether there are more
  // digits in this value following this digit.
  //
  //   Continuation
  //   |    Sign
  //   |    |
  //   V    V
  //   101011

  var VLQ_BASE_SHIFT = 5;

  // binary: 100000
  var VLQ_BASE = 1 << VLQ_BASE_SHIFT;

  // binary: 011111
  var VLQ_BASE_MASK = VLQ_BASE - 1;

  // binary: 100000
  var VLQ_CONTINUATION_BIT = VLQ_BASE;

  /**
   * Converts from a two-complement value to a value where the sign bit is
   * is placed in the least significant bit.  For example, as decimals:
   *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
   *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
   */
  function toVLQSigned(aValue) {
    return aValue < 0
      ? ((-aValue) << 1) + 1
      : (aValue << 1) + 0;
  }

  /**
   * Converts to a two-complement value from a value where the sign bit is
   * is placed in the least significant bit.  For example, as decimals:
   *   2 (10 binary) becomes 1, 3 (11 binary) becomes -1
   *   4 (100 binary) becomes 2, 5 (101 binary) becomes -2
   */
  function fromVLQSigned(aValue) {
    var isNegative = (aValue & 1) === 1;
    var shifted = aValue >> 1;
    return isNegative
      ? -shifted
      : shifted;
  }

  /**
   * Returns the base 64 VLQ encoded value.
   */
  exports.encode = function base64VLQ_encode(aValue) {
    var encoded = "";
    var digit;

    var vlq = toVLQSigned(aValue);

    do {
      digit = vlq & VLQ_BASE_MASK;
      vlq >>>= VLQ_BASE_SHIFT;
      if (vlq > 0) {
        // There are still more digits in this value, so we must make sure the
        // continuation bit is marked.
        digit |= VLQ_CONTINUATION_BIT;
      }
      encoded += base64.encode(digit);
    } while (vlq > 0);

    return encoded;
  };

  /**
   * Decodes the next base 64 VLQ value from the given string and returns the
   * value and the rest of the string.
   */
  exports.decode = function base64VLQ_decode(aStr) {
    var i = 0;
    var strLen = aStr.length;
    var result = 0;
    var shift = 0;
    var continuation, digit;

    do {
      if (i >= strLen) {
        throw new Error("Expected more digits in base 64 VLQ value.");
      }
      digit = base64.decode(aStr.charAt(i++));
      continuation = !!(digit & VLQ_CONTINUATION_BIT);
      digit &= VLQ_BASE_MASK;
      result = result + (digit << shift);
      shift += VLQ_BASE_SHIFT;
    } while (continuation);

    return {
      value: fromVLQSigned(result),
      rest: aStr.slice(i)
    };
  };

});

},{"./base64":44,"amdefine":50}],44:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var charToIntMap = {};
  var intToCharMap = {};

  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    .split('')
    .forEach(function (ch, index) {
      charToIntMap[ch] = index;
      intToCharMap[index] = ch;
    });

  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  exports.encode = function base64_encode(aNumber) {
    if (aNumber in intToCharMap) {
      return intToCharMap[aNumber];
    }
    throw new TypeError("Must be between 0 and 63: " + aNumber);
  };

  /**
   * Decode a single base 64 digit to an integer.
   */
  exports.decode = function base64_decode(aChar) {
    if (aChar in charToIntMap) {
      return charToIntMap[aChar];
    }
    throw new TypeError("Not a valid base 64 digit: " + aChar);
  };

});

},{"amdefine":50}],45:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * Recursive implementation of binary search.
   *
   * @param aLow Indices here and lower do not contain the needle.
   * @param aHigh Indices here and higher do not contain the needle.
   * @param aNeedle The element being searched for.
   * @param aHaystack The non-empty array being searched.
   * @param aCompare Function which takes two elements and returns -1, 0, or 1.
   */
  function recursiveSearch(aLow, aHigh, aNeedle, aHaystack, aCompare) {
    // This function terminates when one of the following is true:
    //
    //   1. We find the exact element we are looking for.
    //
    //   2. We did not find the exact element, but we can return the next
    //      closest element that is less than that element.
    //
    //   3. We did not find the exact element, and there is no next-closest
    //      element which is less than the one we are searching for, so we
    //      return null.
    var mid = Math.floor((aHigh - aLow) / 2) + aLow;
    var cmp = aCompare(aNeedle, aHaystack[mid], true);
    if (cmp === 0) {
      // Found the element we are looking for.
      return aHaystack[mid];
    }
    else if (cmp > 0) {
      // aHaystack[mid] is greater than our needle.
      if (aHigh - mid > 1) {
        // The element is in the upper half.
        return recursiveSearch(mid, aHigh, aNeedle, aHaystack, aCompare);
      }
      // We did not find an exact match, return the next closest one
      // (termination case 2).
      return aHaystack[mid];
    }
    else {
      // aHaystack[mid] is less than our needle.
      if (mid - aLow > 1) {
        // The element is in the lower half.
        return recursiveSearch(aLow, mid, aNeedle, aHaystack, aCompare);
      }
      // The exact needle element was not found in this haystack. Determine if
      // we are in termination case (2) or (3) and return the appropriate thing.
      return aLow < 0
        ? null
        : aHaystack[aLow];
    }
  }

  /**
   * This is an implementation of binary search which will always try and return
   * the next lowest value checked if there is no exact hit. This is because
   * mappings between original and generated line/col pairs are single points,
   * and there is an implicit region between each of them, so a miss just means
   * that you aren't on the very start of a region.
   *
   * @param aNeedle The element you are looking for.
   * @param aHaystack The array that is being searched.
   * @param aCompare A function which takes the needle and an element in the
   *     array and returns -1, 0, or 1 depending on whether the needle is less
   *     than, equal to, or greater than the element, respectively.
   */
  exports.search = function search(aNeedle, aHaystack, aCompare) {
    return aHaystack.length > 0
      ? recursiveSearch(-1, aHaystack.length, aNeedle, aHaystack, aCompare)
      : null;
  };

});

},{"amdefine":50}],46:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var util = require('./util');
  var binarySearch = require('./binary-search');
  var ArraySet = require('./array-set').ArraySet;
  var base64VLQ = require('./base64-vlq');

  /**
   * A SourceMapConsumer instance represents a parsed source map which we can
   * query for information about the original file positions by giving it a file
   * position in the generated source.
   *
   * The only parameter is the raw source map (either as a JSON string, or
   * already parsed to an object). According to the spec, source maps have the
   * following attributes:
   *
   *   - version: Which version of the source map spec this map is following.
   *   - sources: An array of URLs to the original source files.
   *   - names: An array of identifiers which can be referrenced by individual mappings.
   *   - sourceRoot: Optional. The URL root from which all sources are relative.
   *   - sourcesContent: Optional. An array of contents of the original source files.
   *   - mappings: A string of base64 VLQs which contain the actual mappings.
   *   - file: Optional. The generated file this source map is associated with.
   *
   * Here is an example source map, taken from the source map spec[0]:
   *
   *     {
   *       version : 3,
   *       file: "out.js",
   *       sourceRoot : "",
   *       sources: ["foo.js", "bar.js"],
   *       names: ["src", "maps", "are", "fun"],
   *       mappings: "AA,AB;;ABCDE;"
   *     }
   *
   * [0]: https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit?pli=1#
   */
  function SourceMapConsumer(aSourceMap) {
    var sourceMap = aSourceMap;
    if (typeof aSourceMap === 'string') {
      sourceMap = JSON.parse(aSourceMap.replace(/^\)\]\}'/, ''));
    }

    var version = util.getArg(sourceMap, 'version');
    var sources = util.getArg(sourceMap, 'sources');
    // Sass 3.3 leaves out the 'names' array, so we deviate from the spec (which
    // requires the array) to play nice here.
    var names = util.getArg(sourceMap, 'names', []);
    var sourceRoot = util.getArg(sourceMap, 'sourceRoot', null);
    var sourcesContent = util.getArg(sourceMap, 'sourcesContent', null);
    var mappings = util.getArg(sourceMap, 'mappings');
    var file = util.getArg(sourceMap, 'file', null);

    // Once again, Sass deviates from the spec and supplies the version as a
    // string rather than a number, so we use loose equality checking here.
    if (version != this._version) {
      throw new Error('Unsupported version: ' + version);
    }

    // Pass `true` below to allow duplicate names and sources. While source maps
    // are intended to be compressed and deduplicated, the TypeScript compiler
    // sometimes generates source maps with duplicates in them. See Github issue
    // #72 and bugzil.la/889492.
    this._names = ArraySet.fromArray(names, true);
    this._sources = ArraySet.fromArray(sources, true);

    this.sourceRoot = sourceRoot;
    this.sourcesContent = sourcesContent;
    this._mappings = mappings;
    this.file = file;
  }

  /**
   * Create a SourceMapConsumer from a SourceMapGenerator.
   *
   * @param SourceMapGenerator aSourceMap
   *        The source map that will be consumed.
   * @returns SourceMapConsumer
   */
  SourceMapConsumer.fromSourceMap =
    function SourceMapConsumer_fromSourceMap(aSourceMap) {
      var smc = Object.create(SourceMapConsumer.prototype);

      smc._names = ArraySet.fromArray(aSourceMap._names.toArray(), true);
      smc._sources = ArraySet.fromArray(aSourceMap._sources.toArray(), true);
      smc.sourceRoot = aSourceMap._sourceRoot;
      smc.sourcesContent = aSourceMap._generateSourcesContent(smc._sources.toArray(),
                                                              smc.sourceRoot);
      smc.file = aSourceMap._file;

      smc.__generatedMappings = aSourceMap._mappings.slice()
        .sort(util.compareByGeneratedPositions);
      smc.__originalMappings = aSourceMap._mappings.slice()
        .sort(util.compareByOriginalPositions);

      return smc;
    };

  /**
   * The version of the source mapping spec that we are consuming.
   */
  SourceMapConsumer.prototype._version = 3;

  /**
   * The list of original sources.
   */
  Object.defineProperty(SourceMapConsumer.prototype, 'sources', {
    get: function () {
      return this._sources.toArray().map(function (s) {
        return this.sourceRoot ? util.join(this.sourceRoot, s) : s;
      }, this);
    }
  });

  // `__generatedMappings` and `__originalMappings` are arrays that hold the
  // parsed mapping coordinates from the source map's "mappings" attribute. They
  // are lazily instantiated, accessed via the `_generatedMappings` and
  // `_originalMappings` getters respectively, and we only parse the mappings
  // and create these arrays once queried for a source location. We jump through
  // these hoops because there can be many thousands of mappings, and parsing
  // them is expensive, so we only want to do it if we must.
  //
  // Each object in the arrays is of the form:
  //
  //     {
  //       generatedLine: The line number in the generated code,
  //       generatedColumn: The column number in the generated code,
  //       source: The path to the original source file that generated this
  //               chunk of code,
  //       originalLine: The line number in the original source that
  //                     corresponds to this chunk of generated code,
  //       originalColumn: The column number in the original source that
  //                       corresponds to this chunk of generated code,
  //       name: The name of the original symbol which generated this chunk of
  //             code.
  //     }
  //
  // All properties except for `generatedLine` and `generatedColumn` can be
  // `null`.
  //
  // `_generatedMappings` is ordered by the generated positions.
  //
  // `_originalMappings` is ordered by the original positions.

  SourceMapConsumer.prototype.__generatedMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_generatedMappings', {
    get: function () {
      if (!this.__generatedMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__generatedMappings;
    }
  });

  SourceMapConsumer.prototype.__originalMappings = null;
  Object.defineProperty(SourceMapConsumer.prototype, '_originalMappings', {
    get: function () {
      if (!this.__originalMappings) {
        this.__generatedMappings = [];
        this.__originalMappings = [];
        this._parseMappings(this._mappings, this.sourceRoot);
      }

      return this.__originalMappings;
    }
  });

  /**
   * Parse the mappings in a string in to a data structure which we can easily
   * query (the ordered arrays in the `this.__generatedMappings` and
   * `this.__originalMappings` properties).
   */
  SourceMapConsumer.prototype._parseMappings =
    function SourceMapConsumer_parseMappings(aStr, aSourceRoot) {
      var generatedLine = 1;
      var previousGeneratedColumn = 0;
      var previousOriginalLine = 0;
      var previousOriginalColumn = 0;
      var previousSource = 0;
      var previousName = 0;
      var mappingSeparator = /^[,;]/;
      var str = aStr;
      var mapping;
      var temp;

      while (str.length > 0) {
        if (str.charAt(0) === ';') {
          generatedLine++;
          str = str.slice(1);
          previousGeneratedColumn = 0;
        }
        else if (str.charAt(0) === ',') {
          str = str.slice(1);
        }
        else {
          mapping = {};
          mapping.generatedLine = generatedLine;

          // Generated column.
          temp = base64VLQ.decode(str);
          mapping.generatedColumn = previousGeneratedColumn + temp.value;
          previousGeneratedColumn = mapping.generatedColumn;
          str = temp.rest;

          if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
            // Original source.
            temp = base64VLQ.decode(str);
            mapping.source = this._sources.at(previousSource + temp.value);
            previousSource += temp.value;
            str = temp.rest;
            if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
              throw new Error('Found a source, but no line and column');
            }

            // Original line.
            temp = base64VLQ.decode(str);
            mapping.originalLine = previousOriginalLine + temp.value;
            previousOriginalLine = mapping.originalLine;
            // Lines are stored 0-based
            mapping.originalLine += 1;
            str = temp.rest;
            if (str.length === 0 || mappingSeparator.test(str.charAt(0))) {
              throw new Error('Found a source and line, but no column');
            }

            // Original column.
            temp = base64VLQ.decode(str);
            mapping.originalColumn = previousOriginalColumn + temp.value;
            previousOriginalColumn = mapping.originalColumn;
            str = temp.rest;

            if (str.length > 0 && !mappingSeparator.test(str.charAt(0))) {
              // Original name.
              temp = base64VLQ.decode(str);
              mapping.name = this._names.at(previousName + temp.value);
              previousName += temp.value;
              str = temp.rest;
            }
          }

          this.__generatedMappings.push(mapping);
          if (typeof mapping.originalLine === 'number') {
            this.__originalMappings.push(mapping);
          }
        }
      }

      this.__generatedMappings.sort(util.compareByGeneratedPositions);
      this.__originalMappings.sort(util.compareByOriginalPositions);
    };

  /**
   * Find the mapping that best matches the hypothetical "needle" mapping that
   * we are searching for in the given "haystack" of mappings.
   */
  SourceMapConsumer.prototype._findMapping =
    function SourceMapConsumer_findMapping(aNeedle, aMappings, aLineName,
                                           aColumnName, aComparator) {
      // To return the position we are searching for, we must first find the
      // mapping for the given position and then return the opposite position it
      // points to. Because the mappings are sorted, we can use binary search to
      // find the best mapping.

      if (aNeedle[aLineName] <= 0) {
        throw new TypeError('Line must be greater than or equal to 1, got '
                            + aNeedle[aLineName]);
      }
      if (aNeedle[aColumnName] < 0) {
        throw new TypeError('Column must be greater than or equal to 0, got '
                            + aNeedle[aColumnName]);
      }

      return binarySearch.search(aNeedle, aMappings, aComparator);
    };

  /**
   * Returns the original source, line, and column information for the generated
   * source's line and column positions provided. The only argument is an object
   * with the following properties:
   *
   *   - line: The line number in the generated source.
   *   - column: The column number in the generated source.
   *
   * and an object is returned with the following properties:
   *
   *   - source: The original source file, or null.
   *   - line: The line number in the original source, or null.
   *   - column: The column number in the original source, or null.
   *   - name: The original identifier, or null.
   */
  SourceMapConsumer.prototype.originalPositionFor =
    function SourceMapConsumer_originalPositionFor(aArgs) {
      var needle = {
        generatedLine: util.getArg(aArgs, 'line'),
        generatedColumn: util.getArg(aArgs, 'column')
      };

      var mapping = this._findMapping(needle,
                                      this._generatedMappings,
                                      "generatedLine",
                                      "generatedColumn",
                                      util.compareByGeneratedPositions);

      if (mapping && mapping.generatedLine === needle.generatedLine) {
        var source = util.getArg(mapping, 'source', null);
        if (source && this.sourceRoot) {
          source = util.join(this.sourceRoot, source);
        }
        return {
          source: source,
          line: util.getArg(mapping, 'originalLine', null),
          column: util.getArg(mapping, 'originalColumn', null),
          name: util.getArg(mapping, 'name', null)
        };
      }

      return {
        source: null,
        line: null,
        column: null,
        name: null
      };
    };

  /**
   * Returns the original source content. The only argument is the url of the
   * original source file. Returns null if no original source content is
   * availible.
   */
  SourceMapConsumer.prototype.sourceContentFor =
    function SourceMapConsumer_sourceContentFor(aSource) {
      if (!this.sourcesContent) {
        return null;
      }

      if (this.sourceRoot) {
        aSource = util.relative(this.sourceRoot, aSource);
      }

      if (this._sources.has(aSource)) {
        return this.sourcesContent[this._sources.indexOf(aSource)];
      }

      var url;
      if (this.sourceRoot
          && (url = util.urlParse(this.sourceRoot))) {
        // XXX: file:// URIs and absolute paths lead to unexpected behavior for
        // many users. We can help them out when they expect file:// URIs to
        // behave like it would if they were running a local HTTP server. See
        // https://bugzilla.mozilla.org/show_bug.cgi?id=885597.
        var fileUriAbsPath = aSource.replace(/^file:\/\//, "");
        if (url.scheme == "file"
            && this._sources.has(fileUriAbsPath)) {
          return this.sourcesContent[this._sources.indexOf(fileUriAbsPath)]
        }

        if ((!url.path || url.path == "/")
            && this._sources.has("/" + aSource)) {
          return this.sourcesContent[this._sources.indexOf("/" + aSource)];
        }
      }

      throw new Error('"' + aSource + '" is not in the SourceMap.');
    };

  /**
   * Returns the generated line and column information for the original source,
   * line, and column positions provided. The only argument is an object with
   * the following properties:
   *
   *   - source: The filename of the original source.
   *   - line: The line number in the original source.
   *   - column: The column number in the original source.
   *
   * and an object is returned with the following properties:
   *
   *   - line: The line number in the generated source, or null.
   *   - column: The column number in the generated source, or null.
   */
  SourceMapConsumer.prototype.generatedPositionFor =
    function SourceMapConsumer_generatedPositionFor(aArgs) {
      var needle = {
        source: util.getArg(aArgs, 'source'),
        originalLine: util.getArg(aArgs, 'line'),
        originalColumn: util.getArg(aArgs, 'column')
      };

      if (this.sourceRoot) {
        needle.source = util.relative(this.sourceRoot, needle.source);
      }

      var mapping = this._findMapping(needle,
                                      this._originalMappings,
                                      "originalLine",
                                      "originalColumn",
                                      util.compareByOriginalPositions);

      if (mapping) {
        return {
          line: util.getArg(mapping, 'generatedLine', null),
          column: util.getArg(mapping, 'generatedColumn', null)
        };
      }

      return {
        line: null,
        column: null
      };
    };

  SourceMapConsumer.GENERATED_ORDER = 1;
  SourceMapConsumer.ORIGINAL_ORDER = 2;

  /**
   * Iterate over each mapping between an original source/line/column and a
   * generated line/column in this source map.
   *
   * @param Function aCallback
   *        The function that is called with each mapping.
   * @param Object aContext
   *        Optional. If specified, this object will be the value of `this` every
   *        time that `aCallback` is called.
   * @param aOrder
   *        Either `SourceMapConsumer.GENERATED_ORDER` or
   *        `SourceMapConsumer.ORIGINAL_ORDER`. Specifies whether you want to
   *        iterate over the mappings sorted by the generated file's line/column
   *        order or the original's source/line/column order, respectively. Defaults to
   *        `SourceMapConsumer.GENERATED_ORDER`.
   */
  SourceMapConsumer.prototype.eachMapping =
    function SourceMapConsumer_eachMapping(aCallback, aContext, aOrder) {
      var context = aContext || null;
      var order = aOrder || SourceMapConsumer.GENERATED_ORDER;

      var mappings;
      switch (order) {
      case SourceMapConsumer.GENERATED_ORDER:
        mappings = this._generatedMappings;
        break;
      case SourceMapConsumer.ORIGINAL_ORDER:
        mappings = this._originalMappings;
        break;
      default:
        throw new Error("Unknown order of iteration.");
      }

      var sourceRoot = this.sourceRoot;
      mappings.map(function (mapping) {
        var source = mapping.source;
        if (source && sourceRoot) {
          source = util.join(sourceRoot, source);
        }
        return {
          source: source,
          generatedLine: mapping.generatedLine,
          generatedColumn: mapping.generatedColumn,
          originalLine: mapping.originalLine,
          originalColumn: mapping.originalColumn,
          name: mapping.name
        };
      }).forEach(aCallback, context);
    };

  exports.SourceMapConsumer = SourceMapConsumer;

});

},{"./array-set":42,"./base64-vlq":43,"./binary-search":45,"./util":49,"amdefine":50}],47:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var base64VLQ = require('./base64-vlq');
  var util = require('./util');
  var ArraySet = require('./array-set').ArraySet;

  /**
   * An instance of the SourceMapGenerator represents a source map which is
   * being built incrementally. You may pass an object with the following
   * properties:
   *
   *   - file: The filename of the generated source.
   *   - sourceRoot: A root for all relative URLs in this source map.
   */
  function SourceMapGenerator(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = util.getArg(aArgs, 'file', null);
    this._sourceRoot = util.getArg(aArgs, 'sourceRoot', null);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = [];
    this._sourcesContents = null;
  }

  SourceMapGenerator.prototype._version = 3;

  /**
   * Creates a new SourceMapGenerator based on a SourceMapConsumer
   *
   * @param aSourceMapConsumer The SourceMap.
   */
  SourceMapGenerator.fromSourceMap =
    function SourceMapGenerator_fromSourceMap(aSourceMapConsumer) {
      var sourceRoot = aSourceMapConsumer.sourceRoot;
      var generator = new SourceMapGenerator({
        file: aSourceMapConsumer.file,
        sourceRoot: sourceRoot
      });
      aSourceMapConsumer.eachMapping(function (mapping) {
        var newMapping = {
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn
          }
        };

        if (mapping.source) {
          newMapping.source = mapping.source;
          if (sourceRoot) {
            newMapping.source = util.relative(sourceRoot, newMapping.source);
          }

          newMapping.original = {
            line: mapping.originalLine,
            column: mapping.originalColumn
          };

          if (mapping.name) {
            newMapping.name = mapping.name;
          }
        }

        generator.addMapping(newMapping);
      });
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content) {
          generator.setSourceContent(sourceFile, content);
        }
      });
      return generator;
    };

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  SourceMapGenerator.prototype.addMapping =
    function SourceMapGenerator_addMapping(aArgs) {
      var generated = util.getArg(aArgs, 'generated');
      var original = util.getArg(aArgs, 'original', null);
      var source = util.getArg(aArgs, 'source', null);
      var name = util.getArg(aArgs, 'name', null);

      this._validateMapping(generated, original, source, name);

      if (source && !this._sources.has(source)) {
        this._sources.add(source);
      }

      if (name && !this._names.has(name)) {
        this._names.add(name);
      }

      this._mappings.push({
        generatedLine: generated.line,
        generatedColumn: generated.column,
        originalLine: original != null && original.line,
        originalColumn: original != null && original.column,
        source: source,
        name: name
      });
    };

  /**
   * Set the source content for a source file.
   */
  SourceMapGenerator.prototype.setSourceContent =
    function SourceMapGenerator_setSourceContent(aSourceFile, aSourceContent) {
      var source = aSourceFile;
      if (this._sourceRoot) {
        source = util.relative(this._sourceRoot, source);
      }

      if (aSourceContent !== null) {
        // Add the source content to the _sourcesContents map.
        // Create a new _sourcesContents map if the property is null.
        if (!this._sourcesContents) {
          this._sourcesContents = {};
        }
        this._sourcesContents[util.toSetString(source)] = aSourceContent;
      } else {
        // Remove the source file from the _sourcesContents map.
        // If the _sourcesContents map is empty, set the property to null.
        delete this._sourcesContents[util.toSetString(source)];
        if (Object.keys(this._sourcesContents).length === 0) {
          this._sourcesContents = null;
        }
      }
    };

  /**
   * Applies the mappings of a sub-source-map for a specific source file to the
   * source map being generated. Each mapping to the supplied source file is
   * rewritten using the supplied source map. Note: The resolution for the
   * resulting mappings is the minimium of this map and the supplied map.
   *
   * @param aSourceMapConsumer The source map to be applied.
   * @param aSourceFile Optional. The filename of the source file.
   *        If omitted, SourceMapConsumer's file property will be used.
   * @param aSourceMapPath Optional. The dirname of the path to the source map
   *        to be applied. If relative, it is relative to the SourceMapConsumer.
   *        This parameter is needed when the two source maps aren't in the same
   *        directory, and the source map to be applied contains relative source
   *        paths. If so, those relative source paths need to be rewritten
   *        relative to the SourceMapGenerator.
   */
  SourceMapGenerator.prototype.applySourceMap =
    function SourceMapGenerator_applySourceMap(aSourceMapConsumer, aSourceFile, aSourceMapPath) {
      // If aSourceFile is omitted, we will use the file property of the SourceMap
      if (!aSourceFile) {
        if (!aSourceMapConsumer.file) {
          throw new Error(
            'SourceMapGenerator.prototype.applySourceMap requires either an explicit source file, ' +
            'or the source map\'s "file" property. Both were omitted.'
          );
        }
        aSourceFile = aSourceMapConsumer.file;
      }
      var sourceRoot = this._sourceRoot;
      // Make "aSourceFile" relative if an absolute Url is passed.
      if (sourceRoot) {
        aSourceFile = util.relative(sourceRoot, aSourceFile);
      }
      // Applying the SourceMap can add and remove items from the sources and
      // the names array.
      var newSources = new ArraySet();
      var newNames = new ArraySet();

      // Find mappings for the "aSourceFile"
      this._mappings.forEach(function (mapping) {
        if (mapping.source === aSourceFile && mapping.originalLine) {
          // Check if it can be mapped by the source map, then update the mapping.
          var original = aSourceMapConsumer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn
          });
          if (original.source !== null) {
            // Copy mapping
            mapping.source = original.source;
            if (aSourceMapPath) {
              mapping.source = util.join(aSourceMapPath, mapping.source)
            }
            if (sourceRoot) {
              mapping.source = util.relative(sourceRoot, mapping.source);
            }
            mapping.originalLine = original.line;
            mapping.originalColumn = original.column;
            if (original.name !== null && mapping.name !== null) {
              // Only use the identifier name if it's an identifier
              // in both SourceMaps
              mapping.name = original.name;
            }
          }
        }

        var source = mapping.source;
        if (source && !newSources.has(source)) {
          newSources.add(source);
        }

        var name = mapping.name;
        if (name && !newNames.has(name)) {
          newNames.add(name);
        }

      }, this);
      this._sources = newSources;
      this._names = newNames;

      // Copy sourcesContents of applied map.
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content) {
          if (sourceRoot) {
            sourceFile = util.relative(sourceRoot, sourceFile);
          }
          this.setSourceContent(sourceFile, content);
        }
      }, this);
    };

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  SourceMapGenerator.prototype._validateMapping =
    function SourceMapGenerator_validateMapping(aGenerated, aOriginal, aSource,
                                                aName) {
      if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
          && aGenerated.line > 0 && aGenerated.column >= 0
          && !aOriginal && !aSource && !aName) {
        // Case 1.
        return;
      }
      else if (aGenerated && 'line' in aGenerated && 'column' in aGenerated
               && aOriginal && 'line' in aOriginal && 'column' in aOriginal
               && aGenerated.line > 0 && aGenerated.column >= 0
               && aOriginal.line > 0 && aOriginal.column >= 0
               && aSource) {
        // Cases 2 and 3.
        return;
      }
      else {
        throw new Error('Invalid mapping: ' + JSON.stringify({
          generated: aGenerated,
          source: aSource,
          original: aOriginal,
          name: aName
        }));
      }
    };

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  SourceMapGenerator.prototype._serializeMappings =
    function SourceMapGenerator_serializeMappings() {
      var previousGeneratedColumn = 0;
      var previousGeneratedLine = 1;
      var previousOriginalColumn = 0;
      var previousOriginalLine = 0;
      var previousName = 0;
      var previousSource = 0;
      var result = '';
      var mapping;

      // The mappings must be guaranteed to be in sorted order before we start
      // serializing them or else the generated line numbers (which are defined
      // via the ';' separators) will be all messed up. Note: it might be more
      // performant to maintain the sorting as we insert them, rather than as we
      // serialize them, but the big O is the same either way.
      this._mappings.sort(util.compareByGeneratedPositions);

      for (var i = 0, len = this._mappings.length; i < len; i++) {
        mapping = this._mappings[i];

        if (mapping.generatedLine !== previousGeneratedLine) {
          previousGeneratedColumn = 0;
          while (mapping.generatedLine !== previousGeneratedLine) {
            result += ';';
            previousGeneratedLine++;
          }
        }
        else {
          if (i > 0) {
            if (!util.compareByGeneratedPositions(mapping, this._mappings[i - 1])) {
              continue;
            }
            result += ',';
          }
        }

        result += base64VLQ.encode(mapping.generatedColumn
                                   - previousGeneratedColumn);
        previousGeneratedColumn = mapping.generatedColumn;

        if (mapping.source) {
          result += base64VLQ.encode(this._sources.indexOf(mapping.source)
                                     - previousSource);
          previousSource = this._sources.indexOf(mapping.source);

          // lines are stored 0-based in SourceMap spec version 3
          result += base64VLQ.encode(mapping.originalLine - 1
                                     - previousOriginalLine);
          previousOriginalLine = mapping.originalLine - 1;

          result += base64VLQ.encode(mapping.originalColumn
                                     - previousOriginalColumn);
          previousOriginalColumn = mapping.originalColumn;

          if (mapping.name) {
            result += base64VLQ.encode(this._names.indexOf(mapping.name)
                                       - previousName);
            previousName = this._names.indexOf(mapping.name);
          }
        }
      }

      return result;
    };

  SourceMapGenerator.prototype._generateSourcesContent =
    function SourceMapGenerator_generateSourcesContent(aSources, aSourceRoot) {
      return aSources.map(function (source) {
        if (!this._sourcesContents) {
          return null;
        }
        if (aSourceRoot) {
          source = util.relative(aSourceRoot, source);
        }
        var key = util.toSetString(source);
        return Object.prototype.hasOwnProperty.call(this._sourcesContents,
                                                    key)
          ? this._sourcesContents[key]
          : null;
      }, this);
    };

  /**
   * Externalize the source map.
   */
  SourceMapGenerator.prototype.toJSON =
    function SourceMapGenerator_toJSON() {
      var map = {
        version: this._version,
        file: this._file,
        sources: this._sources.toArray(),
        names: this._names.toArray(),
        mappings: this._serializeMappings()
      };
      if (this._sourceRoot) {
        map.sourceRoot = this._sourceRoot;
      }
      if (this._sourcesContents) {
        map.sourcesContent = this._generateSourcesContent(map.sources, map.sourceRoot);
      }

      return map;
    };

  /**
   * Render the source map being generated to a string.
   */
  SourceMapGenerator.prototype.toString =
    function SourceMapGenerator_toString() {
      return JSON.stringify(this);
    };

  exports.SourceMapGenerator = SourceMapGenerator;

});

},{"./array-set":42,"./base64-vlq":43,"./util":49,"amdefine":50}],48:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  var SourceMapGenerator = require('./source-map-generator').SourceMapGenerator;
  var util = require('./util');

  /**
   * SourceNodes provide a way to abstract over interpolating/concatenating
   * snippets of generated JavaScript source code while maintaining the line and
   * column information associated with the original source code.
   *
   * @param aLine The original line number.
   * @param aColumn The original column number.
   * @param aSource The original source's filename.
   * @param aChunks Optional. An array of strings which are snippets of
   *        generated JS, or other SourceNodes.
   * @param aName The original identifier.
   */
  function SourceNode(aLine, aColumn, aSource, aChunks, aName) {
    this.children = [];
    this.sourceContents = {};
    this.line = aLine === undefined ? null : aLine;
    this.column = aColumn === undefined ? null : aColumn;
    this.source = aSource === undefined ? null : aSource;
    this.name = aName === undefined ? null : aName;
    if (aChunks != null) this.add(aChunks);
  }

  /**
   * Creates a SourceNode from generated code and a SourceMapConsumer.
   *
   * @param aGeneratedCode The generated code
   * @param aSourceMapConsumer The SourceMap for the generated code
   */
  SourceNode.fromStringWithSourceMap =
    function SourceNode_fromStringWithSourceMap(aGeneratedCode, aSourceMapConsumer) {
      // The SourceNode we want to fill with the generated code
      // and the SourceMap
      var node = new SourceNode();

      // The generated code
      // Processed fragments are removed from this array.
      var remainingLines = aGeneratedCode.split('\n');

      // We need to remember the position of "remainingLines"
      var lastGeneratedLine = 1, lastGeneratedColumn = 0;

      // The generate SourceNodes we need a code range.
      // To extract it current and last mapping is used.
      // Here we store the last mapping.
      var lastMapping = null;

      aSourceMapConsumer.eachMapping(function (mapping) {
        if (lastMapping !== null) {
          // We add the code from "lastMapping" to "mapping":
          // First check if there is a new line in between.
          if (lastGeneratedLine < mapping.generatedLine) {
            var code = "";
            // Associate first line with "lastMapping"
            addMappingWithCode(lastMapping, remainingLines.shift() + "\n");
            lastGeneratedLine++;
            lastGeneratedColumn = 0;
            // The remaining code is added without mapping
          } else {
            // There is no new line in between.
            // Associate the code between "lastGeneratedColumn" and
            // "mapping.generatedColumn" with "lastMapping"
            var nextLine = remainingLines[0];
            var code = nextLine.substr(0, mapping.generatedColumn -
                                          lastGeneratedColumn);
            remainingLines[0] = nextLine.substr(mapping.generatedColumn -
                                                lastGeneratedColumn);
            lastGeneratedColumn = mapping.generatedColumn;
            addMappingWithCode(lastMapping, code);
            // No more remaining code, continue
            lastMapping = mapping;
            return;
          }
        }
        // We add the generated code until the first mapping
        // to the SourceNode without any mapping.
        // Each line is added as separate string.
        while (lastGeneratedLine < mapping.generatedLine) {
          node.add(remainingLines.shift() + "\n");
          lastGeneratedLine++;
        }
        if (lastGeneratedColumn < mapping.generatedColumn) {
          var nextLine = remainingLines[0];
          node.add(nextLine.substr(0, mapping.generatedColumn));
          remainingLines[0] = nextLine.substr(mapping.generatedColumn);
          lastGeneratedColumn = mapping.generatedColumn;
        }
        lastMapping = mapping;
      }, this);
      // We have processed all mappings.
      if (remainingLines.length > 0) {
        if (lastMapping) {
          // Associate the remaining code in the current line with "lastMapping"
          var lastLine = remainingLines.shift();
          if (remainingLines.length > 0) lastLine += "\n";
          addMappingWithCode(lastMapping, lastLine);
        }
        // and add the remaining lines without any mapping
        node.add(remainingLines.join("\n"));
      }

      // Copy sourcesContent into SourceNode
      aSourceMapConsumer.sources.forEach(function (sourceFile) {
        var content = aSourceMapConsumer.sourceContentFor(sourceFile);
        if (content) {
          node.setSourceContent(sourceFile, content);
        }
      });

      return node;

      function addMappingWithCode(mapping, code) {
        if (mapping === null || mapping.source === undefined) {
          node.add(code);
        } else {
          node.add(new SourceNode(mapping.originalLine,
                                  mapping.originalColumn,
                                  mapping.source,
                                  code,
                                  mapping.name));
        }
      }
    };

  /**
   * Add a chunk of generated JS to this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.add = function SourceNode_add(aChunk) {
    if (Array.isArray(aChunk)) {
      aChunk.forEach(function (chunk) {
        this.add(chunk);
      }, this);
    }
    else if (aChunk instanceof SourceNode || typeof aChunk === "string") {
      if (aChunk) {
        this.children.push(aChunk);
      }
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Add a chunk of generated JS to the beginning of this source node.
   *
   * @param aChunk A string snippet of generated JS code, another instance of
   *        SourceNode, or an array where each member is one of those things.
   */
  SourceNode.prototype.prepend = function SourceNode_prepend(aChunk) {
    if (Array.isArray(aChunk)) {
      for (var i = aChunk.length-1; i >= 0; i--) {
        this.prepend(aChunk[i]);
      }
    }
    else if (aChunk instanceof SourceNode || typeof aChunk === "string") {
      this.children.unshift(aChunk);
    }
    else {
      throw new TypeError(
        "Expected a SourceNode, string, or an array of SourceNodes and strings. Got " + aChunk
      );
    }
    return this;
  };

  /**
   * Walk over the tree of JS snippets in this node and its children. The
   * walking function is called once for each snippet of JS and is passed that
   * snippet and the its original associated source's line/column location.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walk = function SourceNode_walk(aFn) {
    var chunk;
    for (var i = 0, len = this.children.length; i < len; i++) {
      chunk = this.children[i];
      if (chunk instanceof SourceNode) {
        chunk.walk(aFn);
      }
      else {
        if (chunk !== '') {
          aFn(chunk, { source: this.source,
                       line: this.line,
                       column: this.column,
                       name: this.name });
        }
      }
    }
  };

  /**
   * Like `String.prototype.join` except for SourceNodes. Inserts `aStr` between
   * each of `this.children`.
   *
   * @param aSep The separator.
   */
  SourceNode.prototype.join = function SourceNode_join(aSep) {
    var newChildren;
    var i;
    var len = this.children.length;
    if (len > 0) {
      newChildren = [];
      for (i = 0; i < len-1; i++) {
        newChildren.push(this.children[i]);
        newChildren.push(aSep);
      }
      newChildren.push(this.children[i]);
      this.children = newChildren;
    }
    return this;
  };

  /**
   * Call String.prototype.replace on the very right-most source snippet. Useful
   * for trimming whitespace from the end of a source node, etc.
   *
   * @param aPattern The pattern to replace.
   * @param aReplacement The thing to replace the pattern with.
   */
  SourceNode.prototype.replaceRight = function SourceNode_replaceRight(aPattern, aReplacement) {
    var lastChild = this.children[this.children.length - 1];
    if (lastChild instanceof SourceNode) {
      lastChild.replaceRight(aPattern, aReplacement);
    }
    else if (typeof lastChild === 'string') {
      this.children[this.children.length - 1] = lastChild.replace(aPattern, aReplacement);
    }
    else {
      this.children.push(''.replace(aPattern, aReplacement));
    }
    return this;
  };

  /**
   * Set the source content for a source file. This will be added to the SourceMapGenerator
   * in the sourcesContent field.
   *
   * @param aSourceFile The filename of the source file
   * @param aSourceContent The content of the source file
   */
  SourceNode.prototype.setSourceContent =
    function SourceNode_setSourceContent(aSourceFile, aSourceContent) {
      this.sourceContents[util.toSetString(aSourceFile)] = aSourceContent;
    };

  /**
   * Walk over the tree of SourceNodes. The walking function is called for each
   * source file content and is passed the filename and source content.
   *
   * @param aFn The traversal function.
   */
  SourceNode.prototype.walkSourceContents =
    function SourceNode_walkSourceContents(aFn) {
      for (var i = 0, len = this.children.length; i < len; i++) {
        if (this.children[i] instanceof SourceNode) {
          this.children[i].walkSourceContents(aFn);
        }
      }

      var sources = Object.keys(this.sourceContents);
      for (var i = 0, len = sources.length; i < len; i++) {
        aFn(util.fromSetString(sources[i]), this.sourceContents[sources[i]]);
      }
    };

  /**
   * Return the string representation of this source node. Walks over the tree
   * and concatenates all the various snippets together to one string.
   */
  SourceNode.prototype.toString = function SourceNode_toString() {
    var str = "";
    this.walk(function (chunk) {
      str += chunk;
    });
    return str;
  };

  /**
   * Returns the string representation of this source node along with a source
   * map.
   */
  SourceNode.prototype.toStringWithSourceMap = function SourceNode_toStringWithSourceMap(aArgs) {
    var generated = {
      code: "",
      line: 1,
      column: 0
    };
    var map = new SourceMapGenerator(aArgs);
    var sourceMappingActive = false;
    var lastOriginalSource = null;
    var lastOriginalLine = null;
    var lastOriginalColumn = null;
    var lastOriginalName = null;
    this.walk(function (chunk, original) {
      generated.code += chunk;
      if (original.source !== null
          && original.line !== null
          && original.column !== null) {
        if(lastOriginalSource !== original.source
           || lastOriginalLine !== original.line
           || lastOriginalColumn !== original.column
           || lastOriginalName !== original.name) {
          map.addMapping({
            source: original.source,
            original: {
              line: original.line,
              column: original.column
            },
            generated: {
              line: generated.line,
              column: generated.column
            },
            name: original.name
          });
        }
        lastOriginalSource = original.source;
        lastOriginalLine = original.line;
        lastOriginalColumn = original.column;
        lastOriginalName = original.name;
        sourceMappingActive = true;
      } else if (sourceMappingActive) {
        map.addMapping({
          generated: {
            line: generated.line,
            column: generated.column
          }
        });
        lastOriginalSource = null;
        sourceMappingActive = false;
      }
      chunk.split('').forEach(function (ch, idx, array) {
        if (ch === '\n') {
          generated.line++;
          generated.column = 0;
          // Mappings end at eol
          if (idx + 1 === array.length) {
            lastOriginalSource = null;
            sourceMappingActive = false;
          } else if (sourceMappingActive) {
            map.addMapping({
              source: original.source,
              original: {
                line: original.line,
                column: original.column
              },
              generated: {
                line: generated.line,
                column: generated.column
              },
              name: original.name
            });
          }
        } else {
          generated.column++;
        }
      });
    });
    this.walkSourceContents(function (sourceFile, sourceContent) {
      map.setSourceContent(sourceFile, sourceContent);
    });

    return { code: generated.code, map: map };
  };

  exports.SourceNode = SourceNode;

});

},{"./source-map-generator":47,"./util":49,"amdefine":50}],49:[function(require,module,exports){
/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */
if (typeof define !== 'function') {
    var define = require('amdefine')(module, require);
}
define(function (require, exports, module) {

  /**
   * This is a helper function for getting values from parameter/options
   * objects.
   *
   * @param args The object we are extracting values from
   * @param name The name of the property we are getting.
   * @param defaultValue An optional value to return if the property is missing
   * from the object. If this is not specified and the property is missing, an
   * error will be thrown.
   */
  function getArg(aArgs, aName, aDefaultValue) {
    if (aName in aArgs) {
      return aArgs[aName];
    } else if (arguments.length === 3) {
      return aDefaultValue;
    } else {
      throw new Error('"' + aName + '" is a required argument.');
    }
  }
  exports.getArg = getArg;

  var urlRegexp = /^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/;
  var dataUrlRegexp = /^data:.+\,.+$/;

  function urlParse(aUrl) {
    var match = aUrl.match(urlRegexp);
    if (!match) {
      return null;
    }
    return {
      scheme: match[1],
      auth: match[2],
      host: match[3],
      port: match[4],
      path: match[5]
    };
  }
  exports.urlParse = urlParse;

  function urlGenerate(aParsedUrl) {
    var url = '';
    if (aParsedUrl.scheme) {
      url += aParsedUrl.scheme + ':';
    }
    url += '//';
    if (aParsedUrl.auth) {
      url += aParsedUrl.auth + '@';
    }
    if (aParsedUrl.host) {
      url += aParsedUrl.host;
    }
    if (aParsedUrl.port) {
      url += ":" + aParsedUrl.port
    }
    if (aParsedUrl.path) {
      url += aParsedUrl.path;
    }
    return url;
  }
  exports.urlGenerate = urlGenerate;

  /**
   * Normalizes a path, or the path portion of a URL:
   *
   * - Replaces consequtive slashes with one slash.
   * - Removes unnecessary '.' parts.
   * - Removes unnecessary '<dir>/..' parts.
   *
   * Based on code in the Node.js 'path' core module.
   *
   * @param aPath The path or url to normalize.
   */
  function normalize(aPath) {
    var path = aPath;
    var url = urlParse(aPath);
    if (url) {
      if (!url.path) {
        return aPath;
      }
      path = url.path;
    }
    var isAbsolute = (path.charAt(0) === '/');

    var parts = path.split(/\/+/);
    for (var part, up = 0, i = parts.length - 1; i >= 0; i--) {
      part = parts[i];
      if (part === '.') {
        parts.splice(i, 1);
      } else if (part === '..') {
        up++;
      } else if (up > 0) {
        if (part === '') {
          // The first part is blank if the path is absolute. Trying to go
          // above the root is a no-op. Therefore we can remove all '..' parts
          // directly after the root.
          parts.splice(i + 1, up);
          up = 0;
        } else {
          parts.splice(i, 2);
          up--;
        }
      }
    }
    path = parts.join('/');

    if (path === '') {
      path = isAbsolute ? '/' : '.';
    }

    if (url) {
      url.path = path;
      return urlGenerate(url);
    }
    return path;
  }
  exports.normalize = normalize;

  /**
   * Joins two paths/URLs.
   *
   * @param aRoot The root path or URL.
   * @param aPath The path or URL to be joined with the root.
   *
   * - If aPath is a URL or a data URI, aPath is returned, unless aPath is a
   *   scheme-relative URL: Then the scheme of aRoot, if any, is prepended
   *   first.
   * - Otherwise aPath is a path. If aRoot is a URL, then its path portion
   *   is updated with the result and aRoot is returned. Otherwise the result
   *   is returned.
   *   - If aPath is absolute, the result is aPath.
   *   - Otherwise the two paths are joined with a slash.
   * - Joining for example 'http://' and 'www.example.com' is also supported.
   */
  function join(aRoot, aPath) {
    var aPathUrl = urlParse(aPath);
    var aRootUrl = urlParse(aRoot);
    if (aRootUrl) {
      aRoot = aRootUrl.path || '/';
    }

    // `join(foo, '//www.example.org')`
    if (aPathUrl && !aPathUrl.scheme) {
      if (aRootUrl) {
        aPathUrl.scheme = aRootUrl.scheme;
      }
      return urlGenerate(aPathUrl);
    }

    if (aPathUrl || aPath.match(dataUrlRegexp)) {
      return aPath;
    }

    // `join('http://', 'www.example.com')`
    if (aRootUrl && !aRootUrl.host && !aRootUrl.path) {
      aRootUrl.host = aPath;
      return urlGenerate(aRootUrl);
    }

    var joined = aPath.charAt(0) === '/'
      ? aPath
      : normalize(aRoot.replace(/\/+$/, '') + '/' + aPath);

    if (aRootUrl) {
      aRootUrl.path = joined;
      return urlGenerate(aRootUrl);
    }
    return joined;
  }
  exports.join = join;

  /**
   * Because behavior goes wacky when you set `__proto__` on objects, we
   * have to prefix all the strings in our set with an arbitrary character.
   *
   * See https://github.com/mozilla/source-map/pull/31 and
   * https://github.com/mozilla/source-map/issues/30
   *
   * @param String aStr
   */
  function toSetString(aStr) {
    return '$' + aStr;
  }
  exports.toSetString = toSetString;

  function fromSetString(aStr) {
    return aStr.substr(1);
  }
  exports.fromSetString = fromSetString;

  function relative(aRoot, aPath) {
    aRoot = aRoot.replace(/\/$/, '');

    var url = urlParse(aRoot);
    if (aPath.charAt(0) == "/" && url && url.path == "/") {
      return aPath.slice(1);
    }

    return aPath.indexOf(aRoot + '/') === 0
      ? aPath.substr(aRoot.length + 1)
      : aPath;
  }
  exports.relative = relative;

  function strcmp(aStr1, aStr2) {
    var s1 = aStr1 || "";
    var s2 = aStr2 || "";
    return (s1 > s2) - (s1 < s2);
  }

  /**
   * Comparator between two mappings where the original positions are compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same original source/line/column, but different generated
   * line and column the same. Useful when searching for a mapping with a
   * stubbed out mapping.
   */
  function compareByOriginalPositions(mappingA, mappingB, onlyCompareOriginal) {
    var cmp;

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp || onlyCompareOriginal) {
      return cmp;
    }

    cmp = strcmp(mappingA.name, mappingB.name);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    return mappingA.generatedColumn - mappingB.generatedColumn;
  };
  exports.compareByOriginalPositions = compareByOriginalPositions;

  /**
   * Comparator between two mappings where the generated positions are
   * compared.
   *
   * Optionally pass in `true` as `onlyCompareGenerated` to consider two
   * mappings with the same generated line and column, but different
   * source/name/original line and column the same. Useful when searching for a
   * mapping with a stubbed out mapping.
   */
  function compareByGeneratedPositions(mappingA, mappingB, onlyCompareGenerated) {
    var cmp;

    cmp = mappingA.generatedLine - mappingB.generatedLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.generatedColumn - mappingB.generatedColumn;
    if (cmp || onlyCompareGenerated) {
      return cmp;
    }

    cmp = strcmp(mappingA.source, mappingB.source);
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalLine - mappingB.originalLine;
    if (cmp) {
      return cmp;
    }

    cmp = mappingA.originalColumn - mappingB.originalColumn;
    if (cmp) {
      return cmp;
    }

    return strcmp(mappingA.name, mappingB.name);
  };
  exports.compareByGeneratedPositions = compareByGeneratedPositions;

});

},{"amdefine":50}],50:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 0.1.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                process.nextTick(function () {
                    callback.apply(null, deps);
                });
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require("xeDTxS"),"/node_modules/jade/node_modules/constantinople/node_modules/uglify-js/node_modules/source-map/node_modules/amdefine/amdefine.js")
},{"path":84,"xeDTxS":85}],51:[function(require,module,exports){
var sys = require("util");
var MOZ_SourceMap = require("source-map");
var UglifyJS = exports;
/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

function array_to_hash(a) {
    var ret = Object.create(null);
    for (var i = 0; i < a.length; ++i)
        ret[a[i]] = true;
    return ret;
};

function slice(a, start) {
    return Array.prototype.slice.call(a, start || 0);
};

function characters(str) {
    return str.split("");
};

function member(name, array) {
    for (var i = array.length; --i >= 0;)
        if (array[i] == name)
            return true;
    return false;
};

function find_if(func, array) {
    for (var i = 0, n = array.length; i < n; ++i) {
        if (func(array[i]))
            return array[i];
    }
};

function repeat_string(str, i) {
    if (i <= 0) return "";
    if (i == 1) return str;
    var d = repeat_string(str, i >> 1);
    d += d;
    if (i & 1) d += str;
    return d;
};

function DefaultsError(msg, defs) {
    Error.call(this, msg);
    this.msg = msg;
    this.defs = defs;
};
DefaultsError.prototype = Object.create(Error.prototype);
DefaultsError.prototype.constructor = DefaultsError;

DefaultsError.croak = function(msg, defs) {
    throw new DefaultsError(msg, defs);
};

function defaults(args, defs, croak) {
    if (args === true)
        args = {};
    var ret = args || {};
    if (croak) for (var i in ret) if (ret.hasOwnProperty(i) && !defs.hasOwnProperty(i))
        DefaultsError.croak("`" + i + "` is not a supported option", defs);
    for (var i in defs) if (defs.hasOwnProperty(i)) {
        ret[i] = (args && args.hasOwnProperty(i)) ? args[i] : defs[i];
    }
    return ret;
};

function merge(obj, ext) {
    for (var i in ext) if (ext.hasOwnProperty(i)) {
        obj[i] = ext[i];
    }
    return obj;
};

function noop() {};

var MAP = (function(){
    function MAP(a, f, backwards) {
        var ret = [], top = [], i;
        function doit() {
            var val = f(a[i], i);
            var is_last = val instanceof Last;
            if (is_last) val = val.v;
            if (val instanceof AtTop) {
                val = val.v;
                if (val instanceof Splice) {
                    top.push.apply(top, backwards ? val.v.slice().reverse() : val.v);
                } else {
                    top.push(val);
                }
            }
            else if (val !== skip) {
                if (val instanceof Splice) {
                    ret.push.apply(ret, backwards ? val.v.slice().reverse() : val.v);
                } else {
                    ret.push(val);
                }
            }
            return is_last;
        };
        if (a instanceof Array) {
            if (backwards) {
                for (i = a.length; --i >= 0;) if (doit()) break;
                ret.reverse();
                top.reverse();
            } else {
                for (i = 0; i < a.length; ++i) if (doit()) break;
            }
        }
        else {
            for (i in a) if (a.hasOwnProperty(i)) if (doit()) break;
        }
        return top.concat(ret);
    };
    MAP.at_top = function(val) { return new AtTop(val) };
    MAP.splice = function(val) { return new Splice(val) };
    MAP.last = function(val) { return new Last(val) };
    var skip = MAP.skip = {};
    function AtTop(val) { this.v = val };
    function Splice(val) { this.v = val };
    function Last(val) { this.v = val };
    return MAP;
})();

function push_uniq(array, el) {
    if (array.indexOf(el) < 0)
        array.push(el);
};

function string_template(text, props) {
    return text.replace(/\{(.+?)\}/g, function(str, p){
        return props[p];
    });
};

function remove(array, el) {
    for (var i = array.length; --i >= 0;) {
        if (array[i] === el) array.splice(i, 1);
    }
};

function mergeSort(array, cmp) {
    if (array.length < 2) return array.slice();
    function merge(a, b) {
        var r = [], ai = 0, bi = 0, i = 0;
        while (ai < a.length && bi < b.length) {
            cmp(a[ai], b[bi]) <= 0
                ? r[i++] = a[ai++]
                : r[i++] = b[bi++];
        }
        if (ai < a.length) r.push.apply(r, a.slice(ai));
        if (bi < b.length) r.push.apply(r, b.slice(bi));
        return r;
    };
    function _ms(a) {
        if (a.length <= 1)
            return a;
        var m = Math.floor(a.length / 2), left = a.slice(0, m), right = a.slice(m);
        left = _ms(left);
        right = _ms(right);
        return merge(left, right);
    };
    return _ms(array);
};

function set_difference(a, b) {
    return a.filter(function(el){
        return b.indexOf(el) < 0;
    });
};

function set_intersection(a, b) {
    return a.filter(function(el){
        return b.indexOf(el) >= 0;
    });
};

// this function is taken from Acorn [1], written by Marijn Haverbeke
// [1] https://github.com/marijnh/acorn
function makePredicate(words) {
    if (!(words instanceof Array)) words = words.split(" ");
    var f = "", cats = [];
    out: for (var i = 0; i < words.length; ++i) {
        for (var j = 0; j < cats.length; ++j)
            if (cats[j][0].length == words[i].length) {
                cats[j].push(words[i]);
                continue out;
            }
        cats.push([words[i]]);
    }
    function compareTo(arr) {
        if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
        f += "switch(str){";
        for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
        f += "return true}return false;";
    }
    // When there are more than three length categories, an outer
    // switch first dispatches on the lengths, to save on comparisons.
    if (cats.length > 3) {
        cats.sort(function(a, b) {return b.length - a.length;});
        f += "switch(str.length){";
        for (var i = 0; i < cats.length; ++i) {
            var cat = cats[i];
            f += "case " + cat[0].length + ":";
            compareTo(cat);
        }
        f += "}";
        // Otherwise, simply generate a flat `switch` statement.
    } else {
        compareTo(words);
    }
    return new Function("str", f);
};

function all(array, predicate) {
    for (var i = array.length; --i >= 0;)
        if (!predicate(array[i]))
            return false;
    return true;
};

function Dictionary() {
    this._values = Object.create(null);
    this._size = 0;
};
Dictionary.prototype = {
    set: function(key, val) {
        if (!this.has(key)) ++this._size;
        this._values["$" + key] = val;
        return this;
    },
    add: function(key, val) {
        if (this.has(key)) {
            this.get(key).push(val);
        } else {
            this.set(key, [ val ]);
        }
        return this;
    },
    get: function(key) { return this._values["$" + key] },
    del: function(key) {
        if (this.has(key)) {
            --this._size;
            delete this._values["$" + key];
        }
        return this;
    },
    has: function(key) { return ("$" + key) in this._values },
    each: function(f) {
        for (var i in this._values)
            f(this._values[i], i.substr(1));
    },
    size: function() {
        return this._size;
    },
    map: function(f) {
        var ret = [];
        for (var i in this._values)
            ret.push(f(this._values[i], i.substr(1)));
        return ret;
    }
};

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

function DEFNODE(type, props, methods, base) {
    if (arguments.length < 4) base = AST_Node;
    if (!props) props = [];
    else props = props.split(/\s+/);
    var self_props = props;
    if (base && base.PROPS)
        props = props.concat(base.PROPS);
    var code = "return function AST_" + type + "(props){ if (props) { ";
    for (var i = props.length; --i >= 0;) {
        code += "this." + props[i] + " = props." + props[i] + ";";
    }
    var proto = base && new base;
    if (proto && proto.initialize || (methods && methods.initialize))
        code += "this.initialize();";
    code += "}}";
    var ctor = new Function(code)();
    if (proto) {
        ctor.prototype = proto;
        ctor.BASE = base;
    }
    if (base) base.SUBCLASSES.push(ctor);
    ctor.prototype.CTOR = ctor;
    ctor.PROPS = props || null;
    ctor.SELF_PROPS = self_props;
    ctor.SUBCLASSES = [];
    if (type) {
        ctor.prototype.TYPE = ctor.TYPE = type;
    }
    if (methods) for (i in methods) if (methods.hasOwnProperty(i)) {
        if (/^\$/.test(i)) {
            ctor[i.substr(1)] = methods[i];
        } else {
            ctor.prototype[i] = methods[i];
        }
    }
    ctor.DEFMETHOD = function(name, method) {
        this.prototype[name] = method;
    };
    return ctor;
};

var AST_Token = DEFNODE("Token", "type value line col pos endpos nlb comments_before file", {
}, null);

var AST_Node = DEFNODE("Node", "start end", {
    clone: function() {
        return new this.CTOR(this);
    },
    $documentation: "Base class of all AST nodes",
    $propdoc: {
        start: "[AST_Token] The first token of this node",
        end: "[AST_Token] The last token of this node"
    },
    _walk: function(visitor) {
        return visitor._visit(this);
    },
    walk: function(visitor) {
        return this._walk(visitor); // not sure the indirection will be any help
    }
}, null);

AST_Node.warn_function = null;
AST_Node.warn = function(txt, props) {
    if (AST_Node.warn_function)
        AST_Node.warn_function(string_template(txt, props));
};

/* -----[ statements ]----- */

var AST_Statement = DEFNODE("Statement", null, {
    $documentation: "Base class of all statements",
});

var AST_Debugger = DEFNODE("Debugger", null, {
    $documentation: "Represents a debugger statement",
}, AST_Statement);

var AST_Directive = DEFNODE("Directive", "value scope", {
    $documentation: "Represents a directive, like \"use strict\";",
    $propdoc: {
        value: "[string] The value of this directive as a plain string (it's not an AST_String!)",
        scope: "[AST_Scope/S] The scope that this directive affects"
    },
}, AST_Statement);

var AST_SimpleStatement = DEFNODE("SimpleStatement", "body", {
    $documentation: "A statement consisting of an expression, i.e. a = 1 + 2",
    $propdoc: {
        body: "[AST_Node] an expression node (should not be instanceof AST_Statement)"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.body._walk(visitor);
        });
    }
}, AST_Statement);

function walk_body(node, visitor) {
    if (node.body instanceof AST_Statement) {
        node.body._walk(visitor);
    }
    else node.body.forEach(function(stat){
        stat._walk(visitor);
    });
};

var AST_Block = DEFNODE("Block", "body", {
    $documentation: "A body of statements (usually bracketed)",
    $propdoc: {
        body: "[AST_Statement*] an array of statements"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            walk_body(this, visitor);
        });
    }
}, AST_Statement);

var AST_BlockStatement = DEFNODE("BlockStatement", null, {
    $documentation: "A block statement",
}, AST_Block);

var AST_EmptyStatement = DEFNODE("EmptyStatement", null, {
    $documentation: "The empty statement (empty block or simply a semicolon)",
    _walk: function(visitor) {
        return visitor._visit(this);
    }
}, AST_Statement);

var AST_StatementWithBody = DEFNODE("StatementWithBody", "body", {
    $documentation: "Base class for all statements that contain one nested body: `For`, `ForIn`, `Do`, `While`, `With`",
    $propdoc: {
        body: "[AST_Statement] the body; this should always be present, even if it's an AST_EmptyStatement"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.body._walk(visitor);
        });
    }
}, AST_Statement);

var AST_LabeledStatement = DEFNODE("LabeledStatement", "label", {
    $documentation: "Statement with a label",
    $propdoc: {
        label: "[AST_Label] a label definition"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.label._walk(visitor);
            this.body._walk(visitor);
        });
    }
}, AST_StatementWithBody);

var AST_IterationStatement = DEFNODE("IterationStatement", null, {
    $documentation: "Internal class.  All loops inherit from it."
}, AST_StatementWithBody);

var AST_DWLoop = DEFNODE("DWLoop", "condition", {
    $documentation: "Base class for do/while statements",
    $propdoc: {
        condition: "[AST_Node] the loop condition.  Should not be instanceof AST_Statement"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.condition._walk(visitor);
            this.body._walk(visitor);
        });
    }
}, AST_IterationStatement);

var AST_Do = DEFNODE("Do", null, {
    $documentation: "A `do` statement",
}, AST_DWLoop);

var AST_While = DEFNODE("While", null, {
    $documentation: "A `while` statement",
}, AST_DWLoop);

var AST_For = DEFNODE("For", "init condition step", {
    $documentation: "A `for` statement",
    $propdoc: {
        init: "[AST_Node?] the `for` initialization code, or null if empty",
        condition: "[AST_Node?] the `for` termination clause, or null if empty",
        step: "[AST_Node?] the `for` update clause, or null if empty"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            if (this.init) this.init._walk(visitor);
            if (this.condition) this.condition._walk(visitor);
            if (this.step) this.step._walk(visitor);
            this.body._walk(visitor);
        });
    }
}, AST_IterationStatement);

var AST_ForIn = DEFNODE("ForIn", "init name object", {
    $documentation: "A `for ... in` statement",
    $propdoc: {
        init: "[AST_Node] the `for/in` initialization code",
        name: "[AST_SymbolRef?] the loop variable, only if `init` is AST_Var",
        object: "[AST_Node] the object that we're looping through"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.init._walk(visitor);
            this.object._walk(visitor);
            this.body._walk(visitor);
        });
    }
}, AST_IterationStatement);

var AST_With = DEFNODE("With", "expression", {
    $documentation: "A `with` statement",
    $propdoc: {
        expression: "[AST_Node] the `with` expression"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.expression._walk(visitor);
            this.body._walk(visitor);
        });
    }
}, AST_StatementWithBody);

/* -----[ scope and functions ]----- */

var AST_Scope = DEFNODE("Scope", "directives variables functions uses_with uses_eval parent_scope enclosed cname", {
    $documentation: "Base class for all statements introducing a lexical scope",
    $propdoc: {
        directives: "[string*/S] an array of directives declared in this scope",
        variables: "[Object/S] a map of name -> SymbolDef for all variables/functions defined in this scope",
        functions: "[Object/S] like `variables`, but only lists function declarations",
        uses_with: "[boolean/S] tells whether this scope uses the `with` statement",
        uses_eval: "[boolean/S] tells whether this scope contains a direct call to the global `eval`",
        parent_scope: "[AST_Scope?/S] link to the parent scope",
        enclosed: "[SymbolDef*/S] a list of all symbol definitions that are accessed from this scope or any subscopes",
        cname: "[integer/S] current index for mangling variables (used internally by the mangler)",
    },
}, AST_Block);

var AST_Toplevel = DEFNODE("Toplevel", "globals", {
    $documentation: "The toplevel scope",
    $propdoc: {
        globals: "[Object/S] a map of name -> SymbolDef for all undeclared names",
    },
    wrap_enclose: function(arg_parameter_pairs) {
        var self = this;
        var args = [];
        var parameters = [];

        arg_parameter_pairs.forEach(function(pair) {
            var split = pair.split(":");

            args.push(split[0]);
            parameters.push(split[1]);
        });

        var wrapped_tl = "(function(" + parameters.join(",") + "){ '$ORIG'; })(" + args.join(",") + ")";
        wrapped_tl = parse(wrapped_tl);
        wrapped_tl = wrapped_tl.transform(new TreeTransformer(function before(node){
            if (node instanceof AST_Directive && node.value == "$ORIG") {
                return MAP.splice(self.body);
            }
        }));
        return wrapped_tl;
    },
    wrap_commonjs: function(name, export_all) {
        var self = this;
        var to_export = [];
        if (export_all) {
            self.figure_out_scope();
            self.walk(new TreeWalker(function(node){
                if (node instanceof AST_SymbolDeclaration && node.definition().global) {
                    if (!find_if(function(n){ return n.name == node.name }, to_export))
                        to_export.push(node);
                }
            }));
        }
        var wrapped_tl = "(function(exports, global){ global['" + name + "'] = exports; '$ORIG'; '$EXPORTS'; }({}, (function(){return this}())))";
        wrapped_tl = parse(wrapped_tl);
        wrapped_tl = wrapped_tl.transform(new TreeTransformer(function before(node){
            if (node instanceof AST_SimpleStatement) {
                node = node.body;
                if (node instanceof AST_String) switch (node.getValue()) {
                  case "$ORIG":
                    return MAP.splice(self.body);
                  case "$EXPORTS":
                    var body = [];
                    to_export.forEach(function(sym){
                        body.push(new AST_SimpleStatement({
                            body: new AST_Assign({
                                left: new AST_Sub({
                                    expression: new AST_SymbolRef({ name: "exports" }),
                                    property: new AST_String({ value: sym.name }),
                                }),
                                operator: "=",
                                right: new AST_SymbolRef(sym),
                            }),
                        }));
                    });
                    return MAP.splice(body);
                }
            }
        }));
        return wrapped_tl;
    }
}, AST_Scope);

var AST_Lambda = DEFNODE("Lambda", "name argnames uses_arguments", {
    $documentation: "Base class for functions",
    $propdoc: {
        name: "[AST_SymbolDeclaration?] the name of this function",
        argnames: "[AST_SymbolFunarg*] array of function arguments",
        uses_arguments: "[boolean/S] tells whether this function accesses the arguments array"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            if (this.name) this.name._walk(visitor);
            this.argnames.forEach(function(arg){
                arg._walk(visitor);
            });
            walk_body(this, visitor);
        });
    }
}, AST_Scope);

var AST_Accessor = DEFNODE("Accessor", null, {
    $documentation: "A setter/getter function.  The `name` property is always null."
}, AST_Lambda);

var AST_Function = DEFNODE("Function", null, {
    $documentation: "A function expression"
}, AST_Lambda);

var AST_Defun = DEFNODE("Defun", null, {
    $documentation: "A function definition"
}, AST_Lambda);

/* -----[ JUMPS ]----- */

var AST_Jump = DEFNODE("Jump", null, {
    $documentation: "Base class for “jumps” (for now that's `return`, `throw`, `break` and `continue`)"
}, AST_Statement);

var AST_Exit = DEFNODE("Exit", "value", {
    $documentation: "Base class for “exits” (`return` and `throw`)",
    $propdoc: {
        value: "[AST_Node?] the value returned or thrown by this statement; could be null for AST_Return"
    },
    _walk: function(visitor) {
        return visitor._visit(this, this.value && function(){
            this.value._walk(visitor);
        });
    }
}, AST_Jump);

var AST_Return = DEFNODE("Return", null, {
    $documentation: "A `return` statement"
}, AST_Exit);

var AST_Throw = DEFNODE("Throw", null, {
    $documentation: "A `throw` statement"
}, AST_Exit);

var AST_LoopControl = DEFNODE("LoopControl", "label", {
    $documentation: "Base class for loop control statements (`break` and `continue`)",
    $propdoc: {
        label: "[AST_LabelRef?] the label, or null if none",
    },
    _walk: function(visitor) {
        return visitor._visit(this, this.label && function(){
            this.label._walk(visitor);
        });
    }
}, AST_Jump);

var AST_Break = DEFNODE("Break", null, {
    $documentation: "A `break` statement"
}, AST_LoopControl);

var AST_Continue = DEFNODE("Continue", null, {
    $documentation: "A `continue` statement"
}, AST_LoopControl);

/* -----[ IF ]----- */

var AST_If = DEFNODE("If", "condition alternative", {
    $documentation: "A `if` statement",
    $propdoc: {
        condition: "[AST_Node] the `if` condition",
        alternative: "[AST_Statement?] the `else` part, or null if not present"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.condition._walk(visitor);
            this.body._walk(visitor);
            if (this.alternative) this.alternative._walk(visitor);
        });
    }
}, AST_StatementWithBody);

/* -----[ SWITCH ]----- */

var AST_Switch = DEFNODE("Switch", "expression", {
    $documentation: "A `switch` statement",
    $propdoc: {
        expression: "[AST_Node] the `switch` “discriminant”"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.expression._walk(visitor);
            walk_body(this, visitor);
        });
    }
}, AST_Block);

var AST_SwitchBranch = DEFNODE("SwitchBranch", null, {
    $documentation: "Base class for `switch` branches",
}, AST_Block);

var AST_Default = DEFNODE("Default", null, {
    $documentation: "A `default` switch branch",
}, AST_SwitchBranch);

var AST_Case = DEFNODE("Case", "expression", {
    $documentation: "A `case` switch branch",
    $propdoc: {
        expression: "[AST_Node] the `case` expression"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.expression._walk(visitor);
            walk_body(this, visitor);
        });
    }
}, AST_SwitchBranch);

/* -----[ EXCEPTIONS ]----- */

var AST_Try = DEFNODE("Try", "bcatch bfinally", {
    $documentation: "A `try` statement",
    $propdoc: {
        bcatch: "[AST_Catch?] the catch block, or null if not present",
        bfinally: "[AST_Finally?] the finally block, or null if not present"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            walk_body(this, visitor);
            if (this.bcatch) this.bcatch._walk(visitor);
            if (this.bfinally) this.bfinally._walk(visitor);
        });
    }
}, AST_Block);

var AST_Catch = DEFNODE("Catch", "argname", {
    $documentation: "A `catch` node; only makes sense as part of a `try` statement",
    $propdoc: {
        argname: "[AST_SymbolCatch] symbol for the exception"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.argname._walk(visitor);
            walk_body(this, visitor);
        });
    }
}, AST_Block);

var AST_Finally = DEFNODE("Finally", null, {
    $documentation: "A `finally` node; only makes sense as part of a `try` statement"
}, AST_Block);

/* -----[ VAR/CONST ]----- */

var AST_Definitions = DEFNODE("Definitions", "definitions", {
    $documentation: "Base class for `var` or `const` nodes (variable declarations/initializations)",
    $propdoc: {
        definitions: "[AST_VarDef*] array of variable definitions"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.definitions.forEach(function(def){
                def._walk(visitor);
            });
        });
    }
}, AST_Statement);

var AST_Var = DEFNODE("Var", null, {
    $documentation: "A `var` statement"
}, AST_Definitions);

var AST_Const = DEFNODE("Const", null, {
    $documentation: "A `const` statement"
}, AST_Definitions);

var AST_VarDef = DEFNODE("VarDef", "name value", {
    $documentation: "A variable declaration; only appears in a AST_Definitions node",
    $propdoc: {
        name: "[AST_SymbolVar|AST_SymbolConst] name of the variable",
        value: "[AST_Node?] initializer, or null of there's no initializer"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.name._walk(visitor);
            if (this.value) this.value._walk(visitor);
        });
    }
});

/* -----[ OTHER ]----- */

var AST_Call = DEFNODE("Call", "expression args", {
    $documentation: "A function call expression",
    $propdoc: {
        expression: "[AST_Node] expression to invoke as function",
        args: "[AST_Node*] array of arguments"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.expression._walk(visitor);
            this.args.forEach(function(arg){
                arg._walk(visitor);
            });
        });
    }
});

var AST_New = DEFNODE("New", null, {
    $documentation: "An object instantiation.  Derives from a function call since it has exactly the same properties"
}, AST_Call);

var AST_Seq = DEFNODE("Seq", "car cdr", {
    $documentation: "A sequence expression (two comma-separated expressions)",
    $propdoc: {
        car: "[AST_Node] first element in sequence",
        cdr: "[AST_Node] second element in sequence"
    },
    $cons: function(x, y) {
        var seq = new AST_Seq(x);
        seq.car = x;
        seq.cdr = y;
        return seq;
    },
    $from_array: function(array) {
        if (array.length == 0) return null;
        if (array.length == 1) return array[0].clone();
        var list = null;
        for (var i = array.length; --i >= 0;) {
            list = AST_Seq.cons(array[i], list);
        }
        var p = list;
        while (p) {
            if (p.cdr && !p.cdr.cdr) {
                p.cdr = p.cdr.car;
                break;
            }
            p = p.cdr;
        }
        return list;
    },
    to_array: function() {
        var p = this, a = [];
        while (p) {
            a.push(p.car);
            if (p.cdr && !(p.cdr instanceof AST_Seq)) {
                a.push(p.cdr);
                break;
            }
            p = p.cdr;
        }
        return a;
    },
    add: function(node) {
        var p = this;
        while (p) {
            if (!(p.cdr instanceof AST_Seq)) {
                var cell = AST_Seq.cons(p.cdr, node);
                return p.cdr = cell;
            }
            p = p.cdr;
        }
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.car._walk(visitor);
            if (this.cdr) this.cdr._walk(visitor);
        });
    }
});

var AST_PropAccess = DEFNODE("PropAccess", "expression property", {
    $documentation: "Base class for property access expressions, i.e. `a.foo` or `a[\"foo\"]`",
    $propdoc: {
        expression: "[AST_Node] the “container” expression",
        property: "[AST_Node|string] the property to access.  For AST_Dot this is always a plain string, while for AST_Sub it's an arbitrary AST_Node"
    }
});

var AST_Dot = DEFNODE("Dot", null, {
    $documentation: "A dotted property access expression",
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.expression._walk(visitor);
        });
    }
}, AST_PropAccess);

var AST_Sub = DEFNODE("Sub", null, {
    $documentation: "Index-style property access, i.e. `a[\"foo\"]`",
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.expression._walk(visitor);
            this.property._walk(visitor);
        });
    }
}, AST_PropAccess);

var AST_Unary = DEFNODE("Unary", "operator expression", {
    $documentation: "Base class for unary expressions",
    $propdoc: {
        operator: "[string] the operator",
        expression: "[AST_Node] expression that this unary operator applies to"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.expression._walk(visitor);
        });
    }
});

var AST_UnaryPrefix = DEFNODE("UnaryPrefix", null, {
    $documentation: "Unary prefix expression, i.e. `typeof i` or `++i`"
}, AST_Unary);

var AST_UnaryPostfix = DEFNODE("UnaryPostfix", null, {
    $documentation: "Unary postfix expression, i.e. `i++`"
}, AST_Unary);

var AST_Binary = DEFNODE("Binary", "left operator right", {
    $documentation: "Binary expression, i.e. `a + b`",
    $propdoc: {
        left: "[AST_Node] left-hand side expression",
        operator: "[string] the operator",
        right: "[AST_Node] right-hand side expression"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.left._walk(visitor);
            this.right._walk(visitor);
        });
    }
});

var AST_Conditional = DEFNODE("Conditional", "condition consequent alternative", {
    $documentation: "Conditional expression using the ternary operator, i.e. `a ? b : c`",
    $propdoc: {
        condition: "[AST_Node]",
        consequent: "[AST_Node]",
        alternative: "[AST_Node]"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.condition._walk(visitor);
            this.consequent._walk(visitor);
            this.alternative._walk(visitor);
        });
    }
});

var AST_Assign = DEFNODE("Assign", null, {
    $documentation: "An assignment expression — `a = b + 5`",
}, AST_Binary);

/* -----[ LITERALS ]----- */

var AST_Array = DEFNODE("Array", "elements", {
    $documentation: "An array literal",
    $propdoc: {
        elements: "[AST_Node*] array of elements"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.elements.forEach(function(el){
                el._walk(visitor);
            });
        });
    }
});

var AST_Object = DEFNODE("Object", "properties", {
    $documentation: "An object literal",
    $propdoc: {
        properties: "[AST_ObjectProperty*] array of properties"
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.properties.forEach(function(prop){
                prop._walk(visitor);
            });
        });
    }
});

var AST_ObjectProperty = DEFNODE("ObjectProperty", "key value", {
    $documentation: "Base class for literal object properties",
    $propdoc: {
        key: "[string] the property name converted to a string for ObjectKeyVal.  For setters and getters this is an arbitrary AST_Node.",
        value: "[AST_Node] property value.  For setters and getters this is an AST_Function."
    },
    _walk: function(visitor) {
        return visitor._visit(this, function(){
            this.value._walk(visitor);
        });
    }
});

var AST_ObjectKeyVal = DEFNODE("ObjectKeyVal", null, {
    $documentation: "A key: value object property",
}, AST_ObjectProperty);

var AST_ObjectSetter = DEFNODE("ObjectSetter", null, {
    $documentation: "An object setter property",
}, AST_ObjectProperty);

var AST_ObjectGetter = DEFNODE("ObjectGetter", null, {
    $documentation: "An object getter property",
}, AST_ObjectProperty);

var AST_Symbol = DEFNODE("Symbol", "scope name thedef", {
    $propdoc: {
        name: "[string] name of this symbol",
        scope: "[AST_Scope/S] the current scope (not necessarily the definition scope)",
        thedef: "[SymbolDef/S] the definition of this symbol"
    },
    $documentation: "Base class for all symbols",
});

var AST_SymbolAccessor = DEFNODE("SymbolAccessor", null, {
    $documentation: "The name of a property accessor (setter/getter function)"
}, AST_Symbol);

var AST_SymbolDeclaration = DEFNODE("SymbolDeclaration", "init", {
    $documentation: "A declaration symbol (symbol in var/const, function name or argument, symbol in catch)",
    $propdoc: {
        init: "[AST_Node*/S] array of initializers for this declaration."
    }
}, AST_Symbol);

var AST_SymbolVar = DEFNODE("SymbolVar", null, {
    $documentation: "Symbol defining a variable",
}, AST_SymbolDeclaration);

var AST_SymbolConst = DEFNODE("SymbolConst", null, {
    $documentation: "A constant declaration"
}, AST_SymbolDeclaration);

var AST_SymbolFunarg = DEFNODE("SymbolFunarg", null, {
    $documentation: "Symbol naming a function argument",
}, AST_SymbolVar);

var AST_SymbolDefun = DEFNODE("SymbolDefun", null, {
    $documentation: "Symbol defining a function",
}, AST_SymbolDeclaration);

var AST_SymbolLambda = DEFNODE("SymbolLambda", null, {
    $documentation: "Symbol naming a function expression",
}, AST_SymbolDeclaration);

var AST_SymbolCatch = DEFNODE("SymbolCatch", null, {
    $documentation: "Symbol naming the exception in catch",
}, AST_SymbolDeclaration);

var AST_Label = DEFNODE("Label", "references", {
    $documentation: "Symbol naming a label (declaration)",
    $propdoc: {
        references: "[AST_LoopControl*] a list of nodes referring to this label"
    },
    initialize: function() {
        this.references = [];
        this.thedef = this;
    }
}, AST_Symbol);

var AST_SymbolRef = DEFNODE("SymbolRef", null, {
    $documentation: "Reference to some symbol (not definition/declaration)",
}, AST_Symbol);

var AST_LabelRef = DEFNODE("LabelRef", null, {
    $documentation: "Reference to a label symbol",
}, AST_Symbol);

var AST_This = DEFNODE("This", null, {
    $documentation: "The `this` symbol",
}, AST_Symbol);

var AST_Constant = DEFNODE("Constant", null, {
    $documentation: "Base class for all constants",
    getValue: function() {
        return this.value;
    }
});

var AST_String = DEFNODE("String", "value", {
    $documentation: "A string literal",
    $propdoc: {
        value: "[string] the contents of this string"
    }
}, AST_Constant);

var AST_Number = DEFNODE("Number", "value", {
    $documentation: "A number literal",
    $propdoc: {
        value: "[number] the numeric value"
    }
}, AST_Constant);

var AST_RegExp = DEFNODE("RegExp", "value", {
    $documentation: "A regexp literal",
    $propdoc: {
        value: "[RegExp] the actual regexp"
    }
}, AST_Constant);

var AST_Atom = DEFNODE("Atom", null, {
    $documentation: "Base class for atoms",
}, AST_Constant);

var AST_Null = DEFNODE("Null", null, {
    $documentation: "The `null` atom",
    value: null
}, AST_Atom);

var AST_NaN = DEFNODE("NaN", null, {
    $documentation: "The impossible value",
    value: 0/0
}, AST_Atom);

var AST_Undefined = DEFNODE("Undefined", null, {
    $documentation: "The `undefined` value",
    value: (function(){}())
}, AST_Atom);

var AST_Hole = DEFNODE("Hole", null, {
    $documentation: "A hole in an array",
    value: (function(){}())
}, AST_Atom);

var AST_Infinity = DEFNODE("Infinity", null, {
    $documentation: "The `Infinity` value",
    value: 1/0
}, AST_Atom);

var AST_Boolean = DEFNODE("Boolean", null, {
    $documentation: "Base class for booleans",
}, AST_Atom);

var AST_False = DEFNODE("False", null, {
    $documentation: "The `false` atom",
    value: false
}, AST_Boolean);

var AST_True = DEFNODE("True", null, {
    $documentation: "The `true` atom",
    value: true
}, AST_Boolean);

/* -----[ TreeWalker ]----- */

function TreeWalker(callback) {
    this.visit = callback;
    this.stack = [];
};
TreeWalker.prototype = {
    _visit: function(node, descend) {
        this.stack.push(node);
        var ret = this.visit(node, descend ? function(){
            descend.call(node);
        } : noop);
        if (!ret && descend) {
            descend.call(node);
        }
        this.stack.pop();
        return ret;
    },
    parent: function(n) {
        return this.stack[this.stack.length - 2 - (n || 0)];
    },
    push: function (node) {
        this.stack.push(node);
    },
    pop: function() {
        return this.stack.pop();
    },
    self: function() {
        return this.stack[this.stack.length - 1];
    },
    find_parent: function(type) {
        var stack = this.stack;
        for (var i = stack.length; --i >= 0;) {
            var x = stack[i];
            if (x instanceof type) return x;
        }
    },
    has_directive: function(type) {
        return this.find_parent(AST_Scope).has_directive(type);
    },
    in_boolean_context: function() {
        var stack = this.stack;
        var i = stack.length, self = stack[--i];
        while (i > 0) {
            var p = stack[--i];
            if ((p instanceof AST_If           && p.condition === self) ||
                (p instanceof AST_Conditional  && p.condition === self) ||
                (p instanceof AST_DWLoop       && p.condition === self) ||
                (p instanceof AST_For          && p.condition === self) ||
                (p instanceof AST_UnaryPrefix  && p.operator == "!" && p.expression === self))
            {
                return true;
            }
            if (!(p instanceof AST_Binary && (p.operator == "&&" || p.operator == "||")))
                return false;
            self = p;
        }
    },
    loopcontrol_target: function(label) {
        var stack = this.stack;
        if (label) for (var i = stack.length; --i >= 0;) {
            var x = stack[i];
            if (x instanceof AST_LabeledStatement && x.label.name == label.name) {
                return x.body;
            }
        } else for (var i = stack.length; --i >= 0;) {
            var x = stack[i];
            if (x instanceof AST_Switch || x instanceof AST_IterationStatement)
                return x;
        }
    }
};

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>
    Parser based on parse-js (http://marijn.haverbeke.nl/parse-js/).

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

var KEYWORDS = 'break case catch const continue debugger default delete do else finally for function if in instanceof new return switch throw try typeof var void while with';
var KEYWORDS_ATOM = 'false null true';
var RESERVED_WORDS = 'abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized this throws transient volatile yield'
    + " " + KEYWORDS_ATOM + " " + KEYWORDS;
var KEYWORDS_BEFORE_EXPRESSION = 'return new delete throw else case';

KEYWORDS = makePredicate(KEYWORDS);
RESERVED_WORDS = makePredicate(RESERVED_WORDS);
KEYWORDS_BEFORE_EXPRESSION = makePredicate(KEYWORDS_BEFORE_EXPRESSION);
KEYWORDS_ATOM = makePredicate(KEYWORDS_ATOM);

var OPERATOR_CHARS = makePredicate(characters("+-*&%=<>!?|~^"));

var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
var RE_OCT_NUMBER = /^0[0-7]+$/;
var RE_DEC_NUMBER = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i;

var OPERATORS = makePredicate([
    "in",
    "instanceof",
    "typeof",
    "new",
    "void",
    "delete",
    "++",
    "--",
    "+",
    "-",
    "!",
    "~",
    "&",
    "|",
    "^",
    "*",
    "/",
    "%",
    ">>",
    "<<",
    ">>>",
    "<",
    ">",
    "<=",
    ">=",
    "==",
    "===",
    "!=",
    "!==",
    "?",
    "=",
    "+=",
    "-=",
    "/=",
    "*=",
    "%=",
    ">>=",
    "<<=",
    ">>>=",
    "|=",
    "^=",
    "&=",
    "&&",
    "||"
]);

var WHITESPACE_CHARS = makePredicate(characters(" \u00a0\n\r\t\f\u000b\u200b\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000"));

var PUNC_BEFORE_EXPRESSION = makePredicate(characters("[{(,.;:"));

var PUNC_CHARS = makePredicate(characters("[]{}(),;:"));

var REGEXP_MODIFIERS = makePredicate(characters("gmsiy"));

/* -----[ Tokenizer ]----- */

// regexps adapted from http://xregexp.com/plugins/#unicode
var UNICODE = {
    letter: new RegExp("[\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0523\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0621-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971\\u0972\\u097B-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D28\\u0D2A-\\u0D39\\u0D3D\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC\\u0EDD\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8B\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10D0-\\u10FA\\u10FC\\u1100-\\u1159\\u115F-\\u11A2\\u11A8-\\u11F9\\u1200-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u1676\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19A9\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u2094\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2C6F\\u2C71-\\u2C7D\\u2C80-\\u2CE4\\u2D00-\\u2D25\\u2D30-\\u2D65\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31B7\\u31F0-\\u31FF\\u3400\\u4DB5\\u4E00\\u9FC3\\uA000-\\uA48C\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA65F\\uA662-\\uA66E\\uA67F-\\uA697\\uA717-\\uA71F\\uA722-\\uA788\\uA78B\\uA78C\\uA7FB-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA90A-\\uA925\\uA930-\\uA946\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAC00\\uD7A3\\uF900-\\uFA2D\\uFA30-\\uFA6A\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC]"),
    non_spacing_mark: new RegExp("[\\u0300-\\u036F\\u0483-\\u0487\\u0591-\\u05BD\\u05BF\\u05C1\\u05C2\\u05C4\\u05C5\\u05C7\\u0610-\\u061A\\u064B-\\u065E\\u0670\\u06D6-\\u06DC\\u06DF-\\u06E4\\u06E7\\u06E8\\u06EA-\\u06ED\\u0711\\u0730-\\u074A\\u07A6-\\u07B0\\u07EB-\\u07F3\\u0816-\\u0819\\u081B-\\u0823\\u0825-\\u0827\\u0829-\\u082D\\u0900-\\u0902\\u093C\\u0941-\\u0948\\u094D\\u0951-\\u0955\\u0962\\u0963\\u0981\\u09BC\\u09C1-\\u09C4\\u09CD\\u09E2\\u09E3\\u0A01\\u0A02\\u0A3C\\u0A41\\u0A42\\u0A47\\u0A48\\u0A4B-\\u0A4D\\u0A51\\u0A70\\u0A71\\u0A75\\u0A81\\u0A82\\u0ABC\\u0AC1-\\u0AC5\\u0AC7\\u0AC8\\u0ACD\\u0AE2\\u0AE3\\u0B01\\u0B3C\\u0B3F\\u0B41-\\u0B44\\u0B4D\\u0B56\\u0B62\\u0B63\\u0B82\\u0BC0\\u0BCD\\u0C3E-\\u0C40\\u0C46-\\u0C48\\u0C4A-\\u0C4D\\u0C55\\u0C56\\u0C62\\u0C63\\u0CBC\\u0CBF\\u0CC6\\u0CCC\\u0CCD\\u0CE2\\u0CE3\\u0D41-\\u0D44\\u0D4D\\u0D62\\u0D63\\u0DCA\\u0DD2-\\u0DD4\\u0DD6\\u0E31\\u0E34-\\u0E3A\\u0E47-\\u0E4E\\u0EB1\\u0EB4-\\u0EB9\\u0EBB\\u0EBC\\u0EC8-\\u0ECD\\u0F18\\u0F19\\u0F35\\u0F37\\u0F39\\u0F71-\\u0F7E\\u0F80-\\u0F84\\u0F86\\u0F87\\u0F90-\\u0F97\\u0F99-\\u0FBC\\u0FC6\\u102D-\\u1030\\u1032-\\u1037\\u1039\\u103A\\u103D\\u103E\\u1058\\u1059\\u105E-\\u1060\\u1071-\\u1074\\u1082\\u1085\\u1086\\u108D\\u109D\\u135F\\u1712-\\u1714\\u1732-\\u1734\\u1752\\u1753\\u1772\\u1773\\u17B7-\\u17BD\\u17C6\\u17C9-\\u17D3\\u17DD\\u180B-\\u180D\\u18A9\\u1920-\\u1922\\u1927\\u1928\\u1932\\u1939-\\u193B\\u1A17\\u1A18\\u1A56\\u1A58-\\u1A5E\\u1A60\\u1A62\\u1A65-\\u1A6C\\u1A73-\\u1A7C\\u1A7F\\u1B00-\\u1B03\\u1B34\\u1B36-\\u1B3A\\u1B3C\\u1B42\\u1B6B-\\u1B73\\u1B80\\u1B81\\u1BA2-\\u1BA5\\u1BA8\\u1BA9\\u1C2C-\\u1C33\\u1C36\\u1C37\\u1CD0-\\u1CD2\\u1CD4-\\u1CE0\\u1CE2-\\u1CE8\\u1CED\\u1DC0-\\u1DE6\\u1DFD-\\u1DFF\\u20D0-\\u20DC\\u20E1\\u20E5-\\u20F0\\u2CEF-\\u2CF1\\u2DE0-\\u2DFF\\u302A-\\u302F\\u3099\\u309A\\uA66F\\uA67C\\uA67D\\uA6F0\\uA6F1\\uA802\\uA806\\uA80B\\uA825\\uA826\\uA8C4\\uA8E0-\\uA8F1\\uA926-\\uA92D\\uA947-\\uA951\\uA980-\\uA982\\uA9B3\\uA9B6-\\uA9B9\\uA9BC\\uAA29-\\uAA2E\\uAA31\\uAA32\\uAA35\\uAA36\\uAA43\\uAA4C\\uAAB0\\uAAB2-\\uAAB4\\uAAB7\\uAAB8\\uAABE\\uAABF\\uAAC1\\uABE5\\uABE8\\uABED\\uFB1E\\uFE00-\\uFE0F\\uFE20-\\uFE26]"),
    space_combining_mark: new RegExp("[\\u0903\\u093E-\\u0940\\u0949-\\u094C\\u094E\\u0982\\u0983\\u09BE-\\u09C0\\u09C7\\u09C8\\u09CB\\u09CC\\u09D7\\u0A03\\u0A3E-\\u0A40\\u0A83\\u0ABE-\\u0AC0\\u0AC9\\u0ACB\\u0ACC\\u0B02\\u0B03\\u0B3E\\u0B40\\u0B47\\u0B48\\u0B4B\\u0B4C\\u0B57\\u0BBE\\u0BBF\\u0BC1\\u0BC2\\u0BC6-\\u0BC8\\u0BCA-\\u0BCC\\u0BD7\\u0C01-\\u0C03\\u0C41-\\u0C44\\u0C82\\u0C83\\u0CBE\\u0CC0-\\u0CC4\\u0CC7\\u0CC8\\u0CCA\\u0CCB\\u0CD5\\u0CD6\\u0D02\\u0D03\\u0D3E-\\u0D40\\u0D46-\\u0D48\\u0D4A-\\u0D4C\\u0D57\\u0D82\\u0D83\\u0DCF-\\u0DD1\\u0DD8-\\u0DDF\\u0DF2\\u0DF3\\u0F3E\\u0F3F\\u0F7F\\u102B\\u102C\\u1031\\u1038\\u103B\\u103C\\u1056\\u1057\\u1062-\\u1064\\u1067-\\u106D\\u1083\\u1084\\u1087-\\u108C\\u108F\\u109A-\\u109C\\u17B6\\u17BE-\\u17C5\\u17C7\\u17C8\\u1923-\\u1926\\u1929-\\u192B\\u1930\\u1931\\u1933-\\u1938\\u19B0-\\u19C0\\u19C8\\u19C9\\u1A19-\\u1A1B\\u1A55\\u1A57\\u1A61\\u1A63\\u1A64\\u1A6D-\\u1A72\\u1B04\\u1B35\\u1B3B\\u1B3D-\\u1B41\\u1B43\\u1B44\\u1B82\\u1BA1\\u1BA6\\u1BA7\\u1BAA\\u1C24-\\u1C2B\\u1C34\\u1C35\\u1CE1\\u1CF2\\uA823\\uA824\\uA827\\uA880\\uA881\\uA8B4-\\uA8C3\\uA952\\uA953\\uA983\\uA9B4\\uA9B5\\uA9BA\\uA9BB\\uA9BD-\\uA9C0\\uAA2F\\uAA30\\uAA33\\uAA34\\uAA4D\\uAA7B\\uABE3\\uABE4\\uABE6\\uABE7\\uABE9\\uABEA\\uABEC]"),
    connector_punctuation: new RegExp("[\\u005F\\u203F\\u2040\\u2054\\uFE33\\uFE34\\uFE4D-\\uFE4F\\uFF3F]")
};

function is_letter(code) {
    return (code >= 97 && code <= 122)
        || (code >= 65 && code <= 90)
        || (code >= 0xaa && UNICODE.letter.test(String.fromCharCode(code)));
};

function is_digit(code) {
    return code >= 48 && code <= 57; //XXX: find out if "UnicodeDigit" means something else than 0..9
};

function is_alphanumeric_char(code) {
    return is_digit(code) || is_letter(code);
};

function is_unicode_combining_mark(ch) {
    return UNICODE.non_spacing_mark.test(ch) || UNICODE.space_combining_mark.test(ch);
};

function is_unicode_connector_punctuation(ch) {
    return UNICODE.connector_punctuation.test(ch);
};

function is_identifier(name) {
    return !RESERVED_WORDS(name) && /^[a-z_$][a-z0-9_$]*$/i.test(name);
};

function is_identifier_start(code) {
    return code == 36 || code == 95 || is_letter(code);
};

function is_identifier_char(ch) {
    var code = ch.charCodeAt(0);
    return is_identifier_start(code)
        || is_digit(code)
        || code == 8204 // \u200c: zero-width non-joiner <ZWNJ>
        || code == 8205 // \u200d: zero-width joiner <ZWJ> (in my ECMA-262 PDF, this is also 200c)
        || is_unicode_combining_mark(ch)
        || is_unicode_connector_punctuation(ch)
    ;
};

function is_identifier_string(str){
    var i = str.length;
    if (i == 0) return false;
    if (!is_identifier_start(str.charCodeAt(0))) return false;
    while (--i >= 0) {
        if (!is_identifier_char(str.charAt(i)))
            return false;
    }
    return true;
};

function parse_js_number(num) {
    if (RE_HEX_NUMBER.test(num)) {
        return parseInt(num.substr(2), 16);
    } else if (RE_OCT_NUMBER.test(num)) {
        return parseInt(num.substr(1), 8);
    } else if (RE_DEC_NUMBER.test(num)) {
        return parseFloat(num);
    }
};

function JS_Parse_Error(message, line, col, pos) {
    this.message = message;
    this.line = line;
    this.col = col;
    this.pos = pos;
    this.stack = new Error().stack;
};

JS_Parse_Error.prototype.toString = function() {
    return this.message + " (line: " + this.line + ", col: " + this.col + ", pos: " + this.pos + ")" + "\n\n" + this.stack;
};

function js_error(message, filename, line, col, pos) {
    throw new JS_Parse_Error(message, line, col, pos);
};

function is_token(token, type, val) {
    return token.type == type && (val == null || token.value == val);
};

var EX_EOF = {};

function tokenizer($TEXT, filename, html5_comments) {

    var S = {
        text            : $TEXT.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/\uFEFF/g, ''),
        filename        : filename,
        pos             : 0,
        tokpos          : 0,
        line            : 1,
        tokline         : 0,
        col             : 0,
        tokcol          : 0,
        newline_before  : false,
        regex_allowed   : false,
        comments_before : []
    };

    function peek() { return S.text.charAt(S.pos); };

    function next(signal_eof, in_string) {
        var ch = S.text.charAt(S.pos++);
        if (signal_eof && !ch)
            throw EX_EOF;
        if (ch == "\n") {
            S.newline_before = S.newline_before || !in_string;
            ++S.line;
            S.col = 0;
        } else {
            ++S.col;
        }
        return ch;
    };

    function forward(i) {
        while (i-- > 0) next();
    };

    function looking_at(str) {
        return S.text.substr(S.pos, str.length) == str;
    };

    function find(what, signal_eof) {
        var pos = S.text.indexOf(what, S.pos);
        if (signal_eof && pos == -1) throw EX_EOF;
        return pos;
    };

    function start_token() {
        S.tokline = S.line;
        S.tokcol = S.col;
        S.tokpos = S.pos;
    };

    var prev_was_dot = false;
    function token(type, value, is_comment) {
        S.regex_allowed = ((type == "operator" && !UNARY_POSTFIX(value)) ||
                           (type == "keyword" && KEYWORDS_BEFORE_EXPRESSION(value)) ||
                           (type == "punc" && PUNC_BEFORE_EXPRESSION(value)));
        prev_was_dot = (type == "punc" && value == ".");
        var ret = {
            type   : type,
            value  : value,
            line   : S.tokline,
            col    : S.tokcol,
            pos    : S.tokpos,
            endpos : S.pos,
            nlb    : S.newline_before,
            file   : filename
        };
        if (!is_comment) {
            ret.comments_before = S.comments_before;
            S.comments_before = [];
            // make note of any newlines in the comments that came before
            for (var i = 0, len = ret.comments_before.length; i < len; i++) {
                ret.nlb = ret.nlb || ret.comments_before[i].nlb;
            }
        }
        S.newline_before = false;
        return new AST_Token(ret);
    };

    function skip_whitespace() {
        while (WHITESPACE_CHARS(peek()))
            next();
    };

    function read_while(pred) {
        var ret = "", ch, i = 0;
        while ((ch = peek()) && pred(ch, i++))
            ret += next();
        return ret;
    };

    function parse_error(err) {
        js_error(err, filename, S.tokline, S.tokcol, S.tokpos);
    };

    function read_num(prefix) {
        var has_e = false, after_e = false, has_x = false, has_dot = prefix == ".";
        var num = read_while(function(ch, i){
            var code = ch.charCodeAt(0);
            switch (code) {
              case 120: case 88: // xX
                return has_x ? false : (has_x = true);
              case 101: case 69: // eE
                return has_x ? true : has_e ? false : (has_e = after_e = true);
              case 45: // -
                return after_e || (i == 0 && !prefix);
              case 43: // +
                return after_e;
              case (after_e = false, 46): // .
                return (!has_dot && !has_x && !has_e) ? (has_dot = true) : false;
            }
            return is_alphanumeric_char(code);
        });
        if (prefix) num = prefix + num;
        var valid = parse_js_number(num);
        if (!isNaN(valid)) {
            return token("num", valid);
        } else {
            parse_error("Invalid syntax: " + num);
        }
    };

    function read_escaped_char(in_string) {
        var ch = next(true, in_string);
        switch (ch.charCodeAt(0)) {
          case 110 : return "\n";
          case 114 : return "\r";
          case 116 : return "\t";
          case 98  : return "\b";
          case 118 : return "\u000b"; // \v
          case 102 : return "\f";
          case 48  : return "\0";
          case 120 : return String.fromCharCode(hex_bytes(2)); // \x
          case 117 : return String.fromCharCode(hex_bytes(4)); // \u
          case 10  : return ""; // newline
          default  : return ch;
        }
    };

    function hex_bytes(n) {
        var num = 0;
        for (; n > 0; --n) {
            var digit = parseInt(next(true), 16);
            if (isNaN(digit))
                parse_error("Invalid hex-character pattern in string");
            num = (num << 4) | digit;
        }
        return num;
    };

    var read_string = with_eof_error("Unterminated string constant", function(){
        var quote = next(), ret = "";
        for (;;) {
            var ch = next(true);
            if (ch == "\\") {
                // read OctalEscapeSequence (XXX: deprecated if "strict mode")
                // https://github.com/mishoo/UglifyJS/issues/178
                var octal_len = 0, first = null;
                ch = read_while(function(ch){
                    if (ch >= "0" && ch <= "7") {
                        if (!first) {
                            first = ch;
                            return ++octal_len;
                        }
                        else if (first <= "3" && octal_len <= 2) return ++octal_len;
                        else if (first >= "4" && octal_len <= 1) return ++octal_len;
                    }
                    return false;
                });
                if (octal_len > 0) ch = String.fromCharCode(parseInt(ch, 8));
                else ch = read_escaped_char(true);
            }
            else if (ch == quote) break;
            ret += ch;
        }
        return token("string", ret);
    });

    function skip_line_comment(type) {
        var regex_allowed = S.regex_allowed;
        var i = find("\n"), ret;
        if (i == -1) {
            ret = S.text.substr(S.pos);
            S.pos = S.text.length;
        } else {
            ret = S.text.substring(S.pos, i);
            S.pos = i;
        }
        S.comments_before.push(token(type, ret, true));
        S.regex_allowed = regex_allowed;
        return next_token();
    };

    var skip_multiline_comment = with_eof_error("Unterminated multiline comment", function(){
        var regex_allowed = S.regex_allowed;
        var i = find("*/", true);
        var text = S.text.substring(S.pos, i);
        var a = text.split("\n"), n = a.length;
        // update stream position
        S.pos = i + 2;
        S.line += n - 1;
        if (n > 1) S.col = a[n - 1].length;
        else S.col += a[n - 1].length;
        S.col += 2;
        var nlb = S.newline_before = S.newline_before || text.indexOf("\n") >= 0;
        S.comments_before.push(token("comment2", text, true));
        S.regex_allowed = regex_allowed;
        S.newline_before = nlb;
        return next_token();
    });

    function read_name() {
        var backslash = false, name = "", ch, escaped = false, hex;
        while ((ch = peek()) != null) {
            if (!backslash) {
                if (ch == "\\") escaped = backslash = true, next();
                else if (is_identifier_char(ch)) name += next();
                else break;
            }
            else {
                if (ch != "u") parse_error("Expecting UnicodeEscapeSequence -- uXXXX");
                ch = read_escaped_char();
                if (!is_identifier_char(ch)) parse_error("Unicode char: " + ch.charCodeAt(0) + " is not valid in identifier");
                name += ch;
                backslash = false;
            }
        }
        if (KEYWORDS(name) && escaped) {
            hex = name.charCodeAt(0).toString(16).toUpperCase();
            name = "\\u" + "0000".substr(hex.length) + hex + name.slice(1);
        }
        return name;
    };

    var read_regexp = with_eof_error("Unterminated regular expression", function(regexp){
        var prev_backslash = false, ch, in_class = false;
        while ((ch = next(true))) if (prev_backslash) {
            regexp += "\\" + ch;
            prev_backslash = false;
        } else if (ch == "[") {
            in_class = true;
            regexp += ch;
        } else if (ch == "]" && in_class) {
            in_class = false;
            regexp += ch;
        } else if (ch == "/" && !in_class) {
            break;
        } else if (ch == "\\") {
            prev_backslash = true;
        } else {
            regexp += ch;
        }
        var mods = read_name();
        return token("regexp", new RegExp(regexp, mods));
    });

    function read_operator(prefix) {
        function grow(op) {
            if (!peek()) return op;
            var bigger = op + peek();
            if (OPERATORS(bigger)) {
                next();
                return grow(bigger);
            } else {
                return op;
            }
        };
        return token("operator", grow(prefix || next()));
    };

    function handle_slash() {
        next();
        switch (peek()) {
          case "/":
            next();
            return skip_line_comment("comment1");
          case "*":
            next();
            return skip_multiline_comment();
        }
        return S.regex_allowed ? read_regexp("") : read_operator("/");
    };

    function handle_dot() {
        next();
        return is_digit(peek().charCodeAt(0))
            ? read_num(".")
            : token("punc", ".");
    };

    function read_word() {
        var word = read_name();
        if (prev_was_dot) return token("name", word);
        return KEYWORDS_ATOM(word) ? token("atom", word)
            : !KEYWORDS(word) ? token("name", word)
            : OPERATORS(word) ? token("operator", word)
            : token("keyword", word);
    };

    function with_eof_error(eof_error, cont) {
        return function(x) {
            try {
                return cont(x);
            } catch(ex) {
                if (ex === EX_EOF) parse_error(eof_error);
                else throw ex;
            }
        };
    };

    function next_token(force_regexp) {
        if (force_regexp != null)
            return read_regexp(force_regexp);
        skip_whitespace();
        start_token();
        if (html5_comments) {
            if (looking_at("<!--")) {
                forward(4);
                return skip_line_comment("comment3");
            }
            if (looking_at("-->") && S.newline_before) {
                forward(3);
                return skip_line_comment("comment4");
            }
        }
        var ch = peek();
        if (!ch) return token("eof");
        var code = ch.charCodeAt(0);
        switch (code) {
          case 34: case 39: return read_string();
          case 46: return handle_dot();
          case 47: return handle_slash();
        }
        if (is_digit(code)) return read_num();
        if (PUNC_CHARS(ch)) return token("punc", next());
        if (OPERATOR_CHARS(ch)) return read_operator();
        if (code == 92 || is_identifier_start(code)) return read_word();
        parse_error("Unexpected character '" + ch + "'");
    };

    next_token.context = function(nc) {
        if (nc) S = nc;
        return S;
    };

    return next_token;

};

/* -----[ Parser (constants) ]----- */

var UNARY_PREFIX = makePredicate([
    "typeof",
    "void",
    "delete",
    "--",
    "++",
    "!",
    "~",
    "-",
    "+"
]);

var UNARY_POSTFIX = makePredicate([ "--", "++" ]);

var ASSIGNMENT = makePredicate([ "=", "+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&=" ]);

var PRECEDENCE = (function(a, ret){
    for (var i = 0; i < a.length; ++i) {
        var b = a[i];
        for (var j = 0; j < b.length; ++j) {
            ret[b[j]] = i + 1;
        }
    }
    return ret;
})(
    [
        ["||"],
        ["&&"],
        ["|"],
        ["^"],
        ["&"],
        ["==", "===", "!=", "!=="],
        ["<", ">", "<=", ">=", "in", "instanceof"],
        [">>", "<<", ">>>"],
        ["+", "-"],
        ["*", "/", "%"]
    ],
    {}
);

var STATEMENTS_WITH_LABELS = array_to_hash([ "fo" + "r", "do", "while", "switch" ]);

var ATOMIC_START_TOKEN = array_to_hash([ "atom", "num", "string", "regexp", "name" ]);

/* -----[ Parser ]----- */

function parse($TEXT, options) {

    options = defaults(options, {
        strict         : false,
        filename       : null,
        toplevel       : null,
        expression     : false,
        html5_comments : true,
    });

    var S = {
        input         : (typeof $TEXT == "string"
                         ? tokenizer($TEXT, options.filename,
                                     options.html5_comments)
                         : $TEXT),
        token         : null,
        prev          : null,
        peeked        : null,
        in_function   : 0,
        in_directives : true,
        in_loop       : 0,
        labels        : []
    };

    S.token = next();

    function is(type, value) {
        return is_token(S.token, type, value);
    };

    function peek() { return S.peeked || (S.peeked = S.input()); };

    function next() {
        S.prev = S.token;
        if (S.peeked) {
            S.token = S.peeked;
            S.peeked = null;
        } else {
            S.token = S.input();
        }
        S.in_directives = S.in_directives && (
            S.token.type == "string" || is("punc", ";")
        );
        return S.token;
    };

    function prev() {
        return S.prev;
    };

    function croak(msg, line, col, pos) {
        var ctx = S.input.context();
        js_error(msg,
                 ctx.filename,
                 line != null ? line : ctx.tokline,
                 col != null ? col : ctx.tokcol,
                 pos != null ? pos : ctx.tokpos);
    };

    function token_error(token, msg) {
        croak(msg, token.line, token.col);
    };

    function unexpected(token) {
        if (token == null)
            token = S.token;
        token_error(token, "Unexpected token: " + token.type + " (" + token.value + ")");
    };

    function expect_token(type, val) {
        if (is(type, val)) {
            return next();
        }
        token_error(S.token, "Unexpected token " + S.token.type + " «" + S.token.value + "»" + ", expected " + type + " «" + val + "»");
    };

    function expect(punc) { return expect_token("punc", punc); };

    function can_insert_semicolon() {
        return !options.strict && (
            S.token.nlb || is("eof") || is("punc", "}")
        );
    };

    function semicolon() {
        if (is("punc", ";")) next();
        else if (!can_insert_semicolon()) unexpected();
    };

    function parenthesised() {
        expect("(");
        var exp = expression(true);
        expect(")");
        return exp;
    };

    function embed_tokens(parser) {
        return function() {
            var start = S.token;
            var expr = parser();
            var end = prev();
            expr.start = start;
            expr.end = end;
            return expr;
        };
    };

    function handle_regexp() {
        if (is("operator", "/") || is("operator", "/=")) {
            S.peeked = null;
            S.token = S.input(S.token.value.substr(1)); // force regexp
        }
    };

    var statement = embed_tokens(function() {
        var tmp;
        handle_regexp();
        switch (S.token.type) {
          case "string":
            var dir = S.in_directives, stat = simple_statement();
            // XXXv2: decide how to fix directives
            if (dir && stat.body instanceof AST_String && !is("punc", ","))
                return new AST_Directive({ value: stat.body.value });
            return stat;
          case "num":
          case "regexp":
          case "operator":
          case "atom":
            return simple_statement();

          case "name":
            return is_token(peek(), "punc", ":")
                ? labeled_statement()
                : simple_statement();

          case "punc":
            switch (S.token.value) {
              case "{":
                return new AST_BlockStatement({
                    start : S.token,
                    body  : block_(),
                    end   : prev()
                });
              case "[":
              case "(":
                return simple_statement();
              case ";":
                next();
                return new AST_EmptyStatement();
              default:
                unexpected();
            }

          case "keyword":
            switch (tmp = S.token.value, next(), tmp) {
              case "break":
                return break_cont(AST_Break);

              case "continue":
                return break_cont(AST_Continue);

              case "debugger":
                semicolon();
                return new AST_Debugger();

              case "do":
                return new AST_Do({
                    body      : in_loop(statement),
                    condition : (expect_token("keyword", "while"), tmp = parenthesised(), semicolon(), tmp)
                });

              case "while":
                return new AST_While({
                    condition : parenthesised(),
                    body      : in_loop(statement)
                });

              case "fo" + "r":
                return for_();

              case "function":
                return function_(AST_Defun);

              case "if":
                return if_();

              case "return":
                if (S.in_function == 0)
                    croak("'return' outside of function");
                return new AST_Return({
                    value: ( is("punc", ";")
                             ? (next(), null)
                             : can_insert_semicolon()
                             ? null
                             : (tmp = expression(true), semicolon(), tmp) )
                });

              case "switch":
                return new AST_Switch({
                    expression : parenthesised(),
                    body       : in_loop(switch_body_)
                });

              case "throw":
                if (S.token.nlb)
                    croak("Illegal newline after 'throw'");
                return new AST_Throw({
                    value: (tmp = expression(true), semicolon(), tmp)
                });

              case "try":
                return try_();

              case "var":
                return tmp = var_(), semicolon(), tmp;

              case "const":
                return tmp = const_(), semicolon(), tmp;

              case "with":
                return new AST_With({
                    expression : parenthesised(),
                    body       : statement()
                });

              default:
                unexpected();
            }
        }
    });

    function labeled_statement() {
        var label = as_symbol(AST_Label);
        if (find_if(function(l){ return l.name == label.name }, S.labels)) {
            // ECMA-262, 12.12: An ECMAScript program is considered
            // syntactically incorrect if it contains a
            // LabelledStatement that is enclosed by a
            // LabelledStatement with the same Identifier as label.
            croak("Label " + label.name + " defined twice");
        }
        expect(":");
        S.labels.push(label);
        var stat = statement();
        S.labels.pop();
        if (!(stat instanceof AST_IterationStatement)) {
            // check for `continue` that refers to this label.
            // those should be reported as syntax errors.
            // https://github.com/mishoo/UglifyJS2/issues/287
            label.references.forEach(function(ref){
                if (ref instanceof AST_Continue) {
                    ref = ref.label.start;
                    croak("Continue label `" + label.name + "` refers to non-IterationStatement.",
                          ref.line, ref.col, ref.pos);
                }
            });
        }
        return new AST_LabeledStatement({ body: stat, label: label });
    };

    function simple_statement(tmp) {
        return new AST_SimpleStatement({ body: (tmp = expression(true), semicolon(), tmp) });
    };

    function break_cont(type) {
        var label = null, ldef;
        if (!can_insert_semicolon()) {
            label = as_symbol(AST_LabelRef, true);
        }
        if (label != null) {
            ldef = find_if(function(l){ return l.name == label.name }, S.labels);
            if (!ldef)
                croak("Undefined label " + label.name);
            label.thedef = ldef;
        }
        else if (S.in_loop == 0)
            croak(type.TYPE + " not inside a loop or switch");
        semicolon();
        var stat = new type({ label: label });
        if (ldef) ldef.references.push(stat);
        return stat;
    };

    function for_() {
        expect("(");
        var init = null;
        if (!is("punc", ";")) {
            init = is("keyword", "var")
                ? (next(), var_(true))
                : expression(true, true);
            if (is("operator", "in")) {
                if (init instanceof AST_Var && init.definitions.length > 1)
                    croak("Only one variable declaration allowed in for..in loop");
                next();
                return for_in(init);
            }
        }
        return regular_for(init);
    };

    function regular_for(init) {
        expect(";");
        var test = is("punc", ";") ? null : expression(true);
        expect(";");
        var step = is("punc", ")") ? null : expression(true);
        expect(")");
        return new AST_For({
            init      : init,
            condition : test,
            step      : step,
            body      : in_loop(statement)
        });
    };

    function for_in(init) {
        var lhs = init instanceof AST_Var ? init.definitions[0].name : null;
        var obj = expression(true);
        expect(")");
        return new AST_ForIn({
            init   : init,
            name   : lhs,
            object : obj,
            body   : in_loop(statement)
        });
    };

    var function_ = function(ctor) {
        var in_statement = ctor === AST_Defun;
        var name = is("name") ? as_symbol(in_statement ? AST_SymbolDefun : AST_SymbolLambda) : null;
        if (in_statement && !name)
            unexpected();
        expect("(");
        return new ctor({
            name: name,
            argnames: (function(first, a){
                while (!is("punc", ")")) {
                    if (first) first = false; else expect(",");
                    a.push(as_symbol(AST_SymbolFunarg));
                }
                next();
                return a;
            })(true, []),
            body: (function(loop, labels){
                ++S.in_function;
                S.in_directives = true;
                S.in_loop = 0;
                S.labels = [];
                var a = block_();
                --S.in_function;
                S.in_loop = loop;
                S.labels = labels;
                return a;
            })(S.in_loop, S.labels)
        });
    };

    function if_() {
        var cond = parenthesised(), body = statement(), belse = null;
        if (is("keyword", "else")) {
            next();
            belse = statement();
        }
        return new AST_If({
            condition   : cond,
            body        : body,
            alternative : belse
        });
    };

    function block_() {
        expect("{");
        var a = [];
        while (!is("punc", "}")) {
            if (is("eof")) unexpected();
            a.push(statement());
        }
        next();
        return a;
    };

    function switch_body_() {
        expect("{");
        var a = [], cur = null, branch = null, tmp;
        while (!is("punc", "}")) {
            if (is("eof")) unexpected();
            if (is("keyword", "case")) {
                if (branch) branch.end = prev();
                cur = [];
                branch = new AST_Case({
                    start      : (tmp = S.token, next(), tmp),
                    expression : expression(true),
                    body       : cur
                });
                a.push(branch);
                expect(":");
            }
            else if (is("keyword", "default")) {
                if (branch) branch.end = prev();
                cur = [];
                branch = new AST_Default({
                    start : (tmp = S.token, next(), expect(":"), tmp),
                    body  : cur
                });
                a.push(branch);
            }
            else {
                if (!cur) unexpected();
                cur.push(statement());
            }
        }
        if (branch) branch.end = prev();
        next();
        return a;
    };

    function try_() {
        var body = block_(), bcatch = null, bfinally = null;
        if (is("keyword", "catch")) {
            var start = S.token;
            next();
            expect("(");
            var name = as_symbol(AST_SymbolCatch);
            expect(")");
            bcatch = new AST_Catch({
                start   : start,
                argname : name,
                body    : block_(),
                end     : prev()
            });
        }
        if (is("keyword", "finally")) {
            var start = S.token;
            next();
            bfinally = new AST_Finally({
                start : start,
                body  : block_(),
                end   : prev()
            });
        }
        if (!bcatch && !bfinally)
            croak("Missing catch/finally blocks");
        return new AST_Try({
            body     : body,
            bcatch   : bcatch,
            bfinally : bfinally
        });
    };

    function vardefs(no_in, in_const) {
        var a = [];
        for (;;) {
            a.push(new AST_VarDef({
                start : S.token,
                name  : as_symbol(in_const ? AST_SymbolConst : AST_SymbolVar),
                value : is("operator", "=") ? (next(), expression(false, no_in)) : null,
                end   : prev()
            }));
            if (!is("punc", ","))
                break;
            next();
        }
        return a;
    };

    var var_ = function(no_in) {
        return new AST_Var({
            start       : prev(),
            definitions : vardefs(no_in, false),
            end         : prev()
        });
    };

    var const_ = function() {
        return new AST_Const({
            start       : prev(),
            definitions : vardefs(false, true),
            end         : prev()
        });
    };

    var new_ = function() {
        var start = S.token;
        expect_token("operator", "new");
        var newexp = expr_atom(false), args;
        if (is("punc", "(")) {
            next();
            args = expr_list(")");
        } else {
            args = [];
        }
        return subscripts(new AST_New({
            start      : start,
            expression : newexp,
            args       : args,
            end        : prev()
        }), true);
    };

    function as_atom_node() {
        var tok = S.token, ret;
        switch (tok.type) {
          case "name":
          case "keyword":
            ret = _make_symbol(AST_SymbolRef);
            break;
          case "num":
            ret = new AST_Number({ start: tok, end: tok, value: tok.value });
            break;
          case "string":
            ret = new AST_String({ start: tok, end: tok, value: tok.value });
            break;
          case "regexp":
            ret = new AST_RegExp({ start: tok, end: tok, value: tok.value });
            break;
          case "atom":
            switch (tok.value) {
              case "false":
                ret = new AST_False({ start: tok, end: tok });
                break;
              case "true":
                ret = new AST_True({ start: tok, end: tok });
                break;
              case "null":
                ret = new AST_Null({ start: tok, end: tok });
                break;
            }
            break;
        }
        next();
        return ret;
    };

    var expr_atom = function(allow_calls) {
        if (is("operator", "new")) {
            return new_();
        }
        var start = S.token;
        if (is("punc")) {
            switch (start.value) {
              case "(":
                next();
                var ex = expression(true);
                ex.start = start;
                ex.end = S.token;
                expect(")");
                return subscripts(ex, allow_calls);
              case "[":
                return subscripts(array_(), allow_calls);
              case "{":
                return subscripts(object_(), allow_calls);
            }
            unexpected();
        }
        if (is("keyword", "function")) {
            next();
            var func = function_(AST_Function);
            func.start = start;
            func.end = prev();
            return subscripts(func, allow_calls);
        }
        if (ATOMIC_START_TOKEN[S.token.type]) {
            return subscripts(as_atom_node(), allow_calls);
        }
        unexpected();
    };

    function expr_list(closing, allow_trailing_comma, allow_empty) {
        var first = true, a = [];
        while (!is("punc", closing)) {
            if (first) first = false; else expect(",");
            if (allow_trailing_comma && is("punc", closing)) break;
            if (is("punc", ",") && allow_empty) {
                a.push(new AST_Hole({ start: S.token, end: S.token }));
            } else {
                a.push(expression(false));
            }
        }
        next();
        return a;
    };

    var array_ = embed_tokens(function() {
        expect("[");
        return new AST_Array({
            elements: expr_list("]", !options.strict, true)
        });
    });

    var object_ = embed_tokens(function() {
        expect("{");
        var first = true, a = [];
        while (!is("punc", "}")) {
            if (first) first = false; else expect(",");
            if (!options.strict && is("punc", "}"))
                // allow trailing comma
                break;
            var start = S.token;
            var type = start.type;
            var name = as_property_name();
            if (type == "name" && !is("punc", ":")) {
                if (name == "get") {
                    a.push(new AST_ObjectGetter({
                        start : start,
                        key   : as_atom_node(),
                        value : function_(AST_Accessor),
                        end   : prev()
                    }));
                    continue;
                }
                if (name == "set") {
                    a.push(new AST_ObjectSetter({
                        start : start,
                        key   : as_atom_node(),
                        value : function_(AST_Accessor),
                        end   : prev()
                    }));
                    continue;
                }
            }
            expect(":");
            a.push(new AST_ObjectKeyVal({
                start : start,
                key   : name,
                value : expression(false),
                end   : prev()
            }));
        }
        next();
        return new AST_Object({ properties: a });
    });

    function as_property_name() {
        var tmp = S.token;
        next();
        switch (tmp.type) {
          case "num":
          case "string":
          case "name":
          case "operator":
          case "keyword":
          case "atom":
            return tmp.value;
          default:
            unexpected();
        }
    };

    function as_name() {
        var tmp = S.token;
        next();
        switch (tmp.type) {
          case "name":
          case "operator":
          case "keyword":
          case "atom":
            return tmp.value;
          default:
            unexpected();
        }
    };

    function _make_symbol(type) {
        var name = S.token.value;
        return new (name == "this" ? AST_This : type)({
            name  : String(name),
            start : S.token,
            end   : S.token
        });
    };

    function as_symbol(type, noerror) {
        if (!is("name")) {
            if (!noerror) croak("Name expected");
            return null;
        }
        var sym = _make_symbol(type);
        next();
        return sym;
    };

    var subscripts = function(expr, allow_calls) {
        var start = expr.start;
        if (is("punc", ".")) {
            next();
            return subscripts(new AST_Dot({
                start      : start,
                expression : expr,
                property   : as_name(),
                end        : prev()
            }), allow_calls);
        }
        if (is("punc", "[")) {
            next();
            var prop = expression(true);
            expect("]");
            return subscripts(new AST_Sub({
                start      : start,
                expression : expr,
                property   : prop,
                end        : prev()
            }), allow_calls);
        }
        if (allow_calls && is("punc", "(")) {
            next();
            return subscripts(new AST_Call({
                start      : start,
                expression : expr,
                args       : expr_list(")"),
                end        : prev()
            }), true);
        }
        return expr;
    };

    var maybe_unary = function(allow_calls) {
        var start = S.token;
        if (is("operator") && UNARY_PREFIX(start.value)) {
            next();
            handle_regexp();
            var ex = make_unary(AST_UnaryPrefix, start.value, maybe_unary(allow_calls));
            ex.start = start;
            ex.end = prev();
            return ex;
        }
        var val = expr_atom(allow_calls);
        while (is("operator") && UNARY_POSTFIX(S.token.value) && !S.token.nlb) {
            val = make_unary(AST_UnaryPostfix, S.token.value, val);
            val.start = start;
            val.end = S.token;
            next();
        }
        return val;
    };

    function make_unary(ctor, op, expr) {
        if ((op == "++" || op == "--") && !is_assignable(expr))
            croak("Invalid use of " + op + " operator");
        return new ctor({ operator: op, expression: expr });
    };

    var expr_op = function(left, min_prec, no_in) {
        var op = is("operator") ? S.token.value : null;
        if (op == "in" && no_in) op = null;
        var prec = op != null ? PRECEDENCE[op] : null;
        if (prec != null && prec > min_prec) {
            next();
            var right = expr_op(maybe_unary(true), prec, no_in);
            return expr_op(new AST_Binary({
                start    : left.start,
                left     : left,
                operator : op,
                right    : right,
                end      : right.end
            }), min_prec, no_in);
        }
        return left;
    };

    function expr_ops(no_in) {
        return expr_op(maybe_unary(true), 0, no_in);
    };

    var maybe_conditional = function(no_in) {
        var start = S.token;
        var expr = expr_ops(no_in);
        if (is("operator", "?")) {
            next();
            var yes = expression(false);
            expect(":");
            return new AST_Conditional({
                start       : start,
                condition   : expr,
                consequent  : yes,
                alternative : expression(false, no_in),
                end         : prev()
            });
        }
        return expr;
    };

    function is_assignable(expr) {
        if (!options.strict) return true;
        if (expr instanceof AST_This) return false;
        return (expr instanceof AST_PropAccess || expr instanceof AST_Symbol);
    };

    var maybe_assign = function(no_in) {
        var start = S.token;
        var left = maybe_conditional(no_in), val = S.token.value;
        if (is("operator") && ASSIGNMENT(val)) {
            if (is_assignable(left)) {
                next();
                return new AST_Assign({
                    start    : start,
                    left     : left,
                    operator : val,
                    right    : maybe_assign(no_in),
                    end      : prev()
                });
            }
            croak("Invalid assignment");
        }
        return left;
    };

    var expression = function(commas, no_in) {
        var start = S.token;
        var expr = maybe_assign(no_in);
        if (commas && is("punc", ",")) {
            next();
            return new AST_Seq({
                start  : start,
                car    : expr,
                cdr    : expression(true, no_in),
                end    : peek()
            });
        }
        return expr;
    };

    function in_loop(cont) {
        ++S.in_loop;
        var ret = cont();
        --S.in_loop;
        return ret;
    };

    if (options.expression) {
        return expression(true);
    }

    return (function(){
        var start = S.token;
        var body = [];
        while (!is("eof"))
            body.push(statement());
        var end = prev();
        var toplevel = options.toplevel;
        if (toplevel) {
            toplevel.body = toplevel.body.concat(body);
            toplevel.end = end;
        } else {
            toplevel = new AST_Toplevel({ start: start, body: body, end: end });
        }
        return toplevel;
    })();

};

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

// Tree transformer helpers.

function TreeTransformer(before, after) {
    TreeWalker.call(this);
    this.before = before;
    this.after = after;
}
TreeTransformer.prototype = new TreeWalker;

(function(undefined){

    function _(node, descend) {
        node.DEFMETHOD("transform", function(tw, in_list){
            var x, y;
            tw.push(this);
            if (tw.before) x = tw.before(this, descend, in_list);
            if (x === undefined) {
                if (!tw.after) {
                    x = this;
                    descend(x, tw);
                } else {
                    tw.stack[tw.stack.length - 1] = x = this.clone();
                    descend(x, tw);
                    y = tw.after(x, in_list);
                    if (y !== undefined) x = y;
                }
            }
            tw.pop();
            return x;
        });
    };

    function do_list(list, tw) {
        return MAP(list, function(node){
            return node.transform(tw, true);
        });
    };

    _(AST_Node, noop);

    _(AST_LabeledStatement, function(self, tw){
        self.label = self.label.transform(tw);
        self.body = self.body.transform(tw);
    });

    _(AST_SimpleStatement, function(self, tw){
        self.body = self.body.transform(tw);
    });

    _(AST_Block, function(self, tw){
        self.body = do_list(self.body, tw);
    });

    _(AST_DWLoop, function(self, tw){
        self.condition = self.condition.transform(tw);
        self.body = self.body.transform(tw);
    });

    _(AST_For, function(self, tw){
        if (self.init) self.init = self.init.transform(tw);
        if (self.condition) self.condition = self.condition.transform(tw);
        if (self.step) self.step = self.step.transform(tw);
        self.body = self.body.transform(tw);
    });

    _(AST_ForIn, function(self, tw){
        self.init = self.init.transform(tw);
        self.object = self.object.transform(tw);
        self.body = self.body.transform(tw);
    });

    _(AST_With, function(self, tw){
        self.expression = self.expression.transform(tw);
        self.body = self.body.transform(tw);
    });

    _(AST_Exit, function(self, tw){
        if (self.value) self.value = self.value.transform(tw);
    });

    _(AST_LoopControl, function(self, tw){
        if (self.label) self.label = self.label.transform(tw);
    });

    _(AST_If, function(self, tw){
        self.condition = self.condition.transform(tw);
        self.body = self.body.transform(tw);
        if (self.alternative) self.alternative = self.alternative.transform(tw);
    });

    _(AST_Switch, function(self, tw){
        self.expression = self.expression.transform(tw);
        self.body = do_list(self.body, tw);
    });

    _(AST_Case, function(self, tw){
        self.expression = self.expression.transform(tw);
        self.body = do_list(self.body, tw);
    });

    _(AST_Try, function(self, tw){
        self.body = do_list(self.body, tw);
        if (self.bcatch) self.bcatch = self.bcatch.transform(tw);
        if (self.bfinally) self.bfinally = self.bfinally.transform(tw);
    });

    _(AST_Catch, function(self, tw){
        self.argname = self.argname.transform(tw);
        self.body = do_list(self.body, tw);
    });

    _(AST_Definitions, function(self, tw){
        self.definitions = do_list(self.definitions, tw);
    });

    _(AST_VarDef, function(self, tw){
        self.name = self.name.transform(tw);
        if (self.value) self.value = self.value.transform(tw);
    });

    _(AST_Lambda, function(self, tw){
        if (self.name) self.name = self.name.transform(tw);
        self.argnames = do_list(self.argnames, tw);
        self.body = do_list(self.body, tw);
    });

    _(AST_Call, function(self, tw){
        self.expression = self.expression.transform(tw);
        self.args = do_list(self.args, tw);
    });

    _(AST_Seq, function(self, tw){
        self.car = self.car.transform(tw);
        self.cdr = self.cdr.transform(tw);
    });

    _(AST_Dot, function(self, tw){
        self.expression = self.expression.transform(tw);
    });

    _(AST_Sub, function(self, tw){
        self.expression = self.expression.transform(tw);
        self.property = self.property.transform(tw);
    });

    _(AST_Unary, function(self, tw){
        self.expression = self.expression.transform(tw);
    });

    _(AST_Binary, function(self, tw){
        self.left = self.left.transform(tw);
        self.right = self.right.transform(tw);
    });

    _(AST_Conditional, function(self, tw){
        self.condition = self.condition.transform(tw);
        self.consequent = self.consequent.transform(tw);
        self.alternative = self.alternative.transform(tw);
    });

    _(AST_Array, function(self, tw){
        self.elements = do_list(self.elements, tw);
    });

    _(AST_Object, function(self, tw){
        self.properties = do_list(self.properties, tw);
    });

    _(AST_ObjectProperty, function(self, tw){
        self.value = self.value.transform(tw);
    });

})();

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

function SymbolDef(scope, index, orig) {
    this.name = orig.name;
    this.orig = [ orig ];
    this.scope = scope;
    this.references = [];
    this.global = false;
    this.mangled_name = null;
    this.undeclared = false;
    this.constant = false;
    this.index = index;
};

SymbolDef.prototype = {
    unmangleable: function(options) {
        return (this.global && !(options && options.toplevel))
            || this.undeclared
            || (!(options && options.eval) && (this.scope.uses_eval || this.scope.uses_with));
    },
    mangle: function(options) {
        if (!this.mangled_name && !this.unmangleable(options)) {
            var s = this.scope;
            if (!options.screw_ie8 && this.orig[0] instanceof AST_SymbolLambda)
                s = s.parent_scope;
            this.mangled_name = s.next_mangled(options, this);
        }
    }
};

AST_Toplevel.DEFMETHOD("figure_out_scope", function(options){
    options = defaults(options, {
        screw_ie8: false
    });

    // pass 1: setup scope chaining and handle definitions
    var self = this;
    var scope = self.parent_scope = null;
    var defun = null;
    var nesting = 0;
    var tw = new TreeWalker(function(node, descend){
        if (options.screw_ie8 && node instanceof AST_Catch) {
            var save_scope = scope;
            scope = new AST_Scope(node);
            scope.init_scope_vars(nesting);
            scope.parent_scope = save_scope;
            descend();
            scope = save_scope;
            return true;
        }
        if (node instanceof AST_Scope) {
            node.init_scope_vars(nesting);
            var save_scope = node.parent_scope = scope;
            var save_defun = defun;
            defun = scope = node;
            ++nesting; descend(); --nesting;
            scope = save_scope;
            defun = save_defun;
            return true;        // don't descend again in TreeWalker
        }
        if (node instanceof AST_Directive) {
            node.scope = scope;
            push_uniq(scope.directives, node.value);
            return true;
        }
        if (node instanceof AST_With) {
            for (var s = scope; s; s = s.parent_scope)
                s.uses_with = true;
            return;
        }
        if (node instanceof AST_Symbol) {
            node.scope = scope;
        }
        if (node instanceof AST_SymbolLambda) {
            defun.def_function(node);
        }
        else if (node instanceof AST_SymbolDefun) {
            // Careful here, the scope where this should be defined is
            // the parent scope.  The reason is that we enter a new
            // scope when we encounter the AST_Defun node (which is
            // instanceof AST_Scope) but we get to the symbol a bit
            // later.
            (node.scope = defun.parent_scope).def_function(node);
        }
        else if (node instanceof AST_SymbolVar
                 || node instanceof AST_SymbolConst) {
            var def = defun.def_variable(node);
            def.constant = node instanceof AST_SymbolConst;
            def.init = tw.parent().value;
        }
        else if (node instanceof AST_SymbolCatch) {
            (options.screw_ie8 ? scope : defun)
                .def_variable(node);
        }
    });
    self.walk(tw);

    // pass 2: find back references and eval
    var func = null;
    var globals = self.globals = new Dictionary();
    var tw = new TreeWalker(function(node, descend){
        if (node instanceof AST_Lambda) {
            var prev_func = func;
            func = node;
            descend();
            func = prev_func;
            return true;
        }
        if (node instanceof AST_SymbolRef) {
            var name = node.name;
            var sym = node.scope.find_variable(name);
            if (!sym) {
                var g;
                if (globals.has(name)) {
                    g = globals.get(name);
                } else {
                    g = new SymbolDef(self, globals.size(), node);
                    g.undeclared = true;
                    g.global = true;
                    globals.set(name, g);
                }
                node.thedef = g;
                if (name == "eval" && tw.parent() instanceof AST_Call) {
                    for (var s = node.scope; s && !s.uses_eval; s = s.parent_scope)
                        s.uses_eval = true;
                }
                if (func && name == "arguments") {
                    func.uses_arguments = true;
                }
            } else {
                node.thedef = sym;
            }
            node.reference();
            return true;
        }
    });
    self.walk(tw);
});

AST_Scope.DEFMETHOD("init_scope_vars", function(nesting){
    this.directives = [];     // contains the directives defined in this scope, i.e. "use strict"
    this.variables = new Dictionary(); // map name to AST_SymbolVar (variables defined in this scope; includes functions)
    this.functions = new Dictionary(); // map name to AST_SymbolDefun (functions defined in this scope)
    this.uses_with = false;   // will be set to true if this or some nested scope uses the `with` statement
    this.uses_eval = false;   // will be set to true if this or nested scope uses the global `eval`
    this.parent_scope = null; // the parent scope
    this.enclosed = [];       // a list of variables from this or outer scope(s) that are referenced from this or inner scopes
    this.cname = -1;          // the current index for mangling functions/variables
    this.nesting = nesting;   // the nesting level of this scope (0 means toplevel)
});

AST_Scope.DEFMETHOD("strict", function(){
    return this.has_directive("use strict");
});

AST_Lambda.DEFMETHOD("init_scope_vars", function(){
    AST_Scope.prototype.init_scope_vars.apply(this, arguments);
    this.uses_arguments = false;
});

AST_SymbolRef.DEFMETHOD("reference", function() {
    var def = this.definition();
    def.references.push(this);
    var s = this.scope;
    while (s) {
        push_uniq(s.enclosed, def);
        if (s === def.scope) break;
        s = s.parent_scope;
    }
    this.frame = this.scope.nesting - def.scope.nesting;
});

AST_Scope.DEFMETHOD("find_variable", function(name){
    if (name instanceof AST_Symbol) name = name.name;
    return this.variables.get(name)
        || (this.parent_scope && this.parent_scope.find_variable(name));
});

AST_Scope.DEFMETHOD("has_directive", function(value){
    return this.parent_scope && this.parent_scope.has_directive(value)
        || (this.directives.indexOf(value) >= 0 ? this : null);
});

AST_Scope.DEFMETHOD("def_function", function(symbol){
    this.functions.set(symbol.name, this.def_variable(symbol));
});

AST_Scope.DEFMETHOD("def_variable", function(symbol){
    var def;
    if (!this.variables.has(symbol.name)) {
        def = new SymbolDef(this, this.variables.size(), symbol);
        this.variables.set(symbol.name, def);
        def.global = !this.parent_scope;
    } else {
        def = this.variables.get(symbol.name);
        def.orig.push(symbol);
    }
    return symbol.thedef = def;
});

AST_Scope.DEFMETHOD("next_mangled", function(options){
    var ext = this.enclosed;
    out: while (true) {
        var m = base54(++this.cname);
        if (!is_identifier(m)) continue; // skip over "do"

        // https://github.com/mishoo/UglifyJS2/issues/242 -- do not
        // shadow a name excepted from mangling.
        if (options.except.indexOf(m) >= 0) continue;

        // we must ensure that the mangled name does not shadow a name
        // from some parent scope that is referenced in this or in
        // inner scopes.
        for (var i = ext.length; --i >= 0;) {
            var sym = ext[i];
            var name = sym.mangled_name || (sym.unmangleable(options) && sym.name);
            if (m == name) continue out;
        }
        return m;
    }
});

AST_Function.DEFMETHOD("next_mangled", function(options, def){
    // #179, #326
    // in Safari strict mode, something like (function x(x){...}) is a syntax error;
    // a function expression's argument cannot shadow the function expression's name

    var tricky_def = def.orig[0] instanceof AST_SymbolFunarg && this.name && this.name.definition();
    while (true) {
        var name = AST_Lambda.prototype.next_mangled.call(this, options, def);
        if (!(tricky_def && tricky_def.mangled_name == name))
            return name;
    }
});

AST_Scope.DEFMETHOD("references", function(sym){
    if (sym instanceof AST_Symbol) sym = sym.definition();
    return this.enclosed.indexOf(sym) < 0 ? null : sym;
});

AST_Symbol.DEFMETHOD("unmangleable", function(options){
    return this.definition().unmangleable(options);
});

// property accessors are not mangleable
AST_SymbolAccessor.DEFMETHOD("unmangleable", function(){
    return true;
});

// labels are always mangleable
AST_Label.DEFMETHOD("unmangleable", function(){
    return false;
});

AST_Symbol.DEFMETHOD("unreferenced", function(){
    return this.definition().references.length == 0
        && !(this.scope.uses_eval || this.scope.uses_with);
});

AST_Symbol.DEFMETHOD("undeclared", function(){
    return this.definition().undeclared;
});

AST_LabelRef.DEFMETHOD("undeclared", function(){
    return false;
});

AST_Label.DEFMETHOD("undeclared", function(){
    return false;
});

AST_Symbol.DEFMETHOD("definition", function(){
    return this.thedef;
});

AST_Symbol.DEFMETHOD("global", function(){
    return this.definition().global;
});

AST_Toplevel.DEFMETHOD("_default_mangler_options", function(options){
    return defaults(options, {
        except   : [],
        eval     : false,
        sort     : false,
        toplevel : false,
        screw_ie8 : false
    });
});

AST_Toplevel.DEFMETHOD("mangle_names", function(options){
    options = this._default_mangler_options(options);
    // We only need to mangle declaration nodes.  Special logic wired
    // into the code generator will display the mangled name if it's
    // present (and for AST_SymbolRef-s it'll use the mangled name of
    // the AST_SymbolDeclaration that it points to).
    var lname = -1;
    var to_mangle = [];
    var tw = new TreeWalker(function(node, descend){
        if (node instanceof AST_LabeledStatement) {
            // lname is incremented when we get to the AST_Label
            var save_nesting = lname;
            descend();
            lname = save_nesting;
            return true;        // don't descend again in TreeWalker
        }
        if (node instanceof AST_Scope) {
            var p = tw.parent(), a = [];
            node.variables.each(function(symbol){
                if (options.except.indexOf(symbol.name) < 0) {
                    a.push(symbol);
                }
            });
            if (options.sort) a.sort(function(a, b){
                return b.references.length - a.references.length;
            });
            to_mangle.push.apply(to_mangle, a);
            return;
        }
        if (node instanceof AST_Label) {
            var name;
            do name = base54(++lname); while (!is_identifier(name));
            node.mangled_name = name;
            return true;
        }
        if (options.screw_ie8 && node instanceof AST_SymbolCatch) {
            to_mangle.push(node.definition());
            return;
        }
    });
    this.walk(tw);
    to_mangle.forEach(function(def){ def.mangle(options) });
});

AST_Toplevel.DEFMETHOD("compute_char_frequency", function(options){
    options = this._default_mangler_options(options);
    var tw = new TreeWalker(function(node){
        if (node instanceof AST_Constant)
            base54.consider(node.print_to_string());
        else if (node instanceof AST_Return)
            base54.consider("return");
        else if (node instanceof AST_Throw)
            base54.consider("throw");
        else if (node instanceof AST_Continue)
            base54.consider("continue");
        else if (node instanceof AST_Break)
            base54.consider("break");
        else if (node instanceof AST_Debugger)
            base54.consider("debugger");
        else if (node instanceof AST_Directive)
            base54.consider(node.value);
        else if (node instanceof AST_While)
            base54.consider("while");
        else if (node instanceof AST_Do)
            base54.consider("do while");
        else if (node instanceof AST_If) {
            base54.consider("if");
            if (node.alternative) base54.consider("else");
        }
        else if (node instanceof AST_Var)
            base54.consider("var");
        else if (node instanceof AST_Const)
            base54.consider("const");
        else if (node instanceof AST_Lambda)
            base54.consider("function");
        else if (node instanceof AST_For)
            base54.consider("fo" + "r");
        else if (node instanceof AST_ForIn)
            base54.consider("for in");
        else if (node instanceof AST_Switch)
            base54.consider("switch");
        else if (node instanceof AST_Case)
            base54.consider("case");
        else if (node instanceof AST_Default)
            base54.consider("default");
        else if (node instanceof AST_With)
            base54.consider("with");
        else if (node instanceof AST_ObjectSetter)
            base54.consider("set" + node.key);
        else if (node instanceof AST_ObjectGetter)
            base54.consider("get" + node.key);
        else if (node instanceof AST_ObjectKeyVal)
            base54.consider(node.key);
        else if (node instanceof AST_New)
            base54.consider("new");
        else if (node instanceof AST_This)
            base54.consider("this");
        else if (node instanceof AST_Try)
            base54.consider("try");
        else if (node instanceof AST_Catch)
            base54.consider("catch");
        else if (node instanceof AST_Finally)
            base54.consider("finally");
        else if (node instanceof AST_Symbol && node.unmangleable(options))
            base54.consider(node.name);
        else if (node instanceof AST_Unary || node instanceof AST_Binary)
            base54.consider(node.operator);
        else if (node instanceof AST_Dot)
            base54.consider(node.property);
    });
    this.walk(tw);
    base54.sort();
});

var base54 = (function() {
    var string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_0123456789";
    var chars, frequency;
    function reset() {
        frequency = Object.create(null);
        chars = string.split("").map(function(ch){ return ch.charCodeAt(0) });
        chars.forEach(function(ch){ frequency[ch] = 0 });
    }
    base54.consider = function(str){
        for (var i = str.length; --i >= 0;) {
            var code = str.charCodeAt(i);
            if (code in frequency) ++frequency[code];
        }
    };
    base54.sort = function() {
        chars = mergeSort(chars, function(a, b){
            if (is_digit(a) && !is_digit(b)) return 1;
            if (is_digit(b) && !is_digit(a)) return -1;
            return frequency[b] - frequency[a];
        });
    };
    base54.reset = reset;
    reset();
    base54.get = function(){ return chars };
    base54.freq = function(){ return frequency };
    function base54(num) {
        var ret = "", base = 54;
        do {
            ret += String.fromCharCode(chars[num % base]);
            num = Math.floor(num / base);
            base = 64;
        } while (num > 0);
        return ret;
    };
    return base54;
})();

AST_Toplevel.DEFMETHOD("scope_warnings", function(options){
    options = defaults(options, {
        undeclared       : false, // this makes a lot of noise
        unreferenced     : true,
        assign_to_global : true,
        func_arguments   : true,
        nested_defuns    : true,
        eval             : true
    });
    var tw = new TreeWalker(function(node){
        if (options.undeclared
            && node instanceof AST_SymbolRef
            && node.undeclared())
        {
            // XXX: this also warns about JS standard names,
            // i.e. Object, Array, parseInt etc.  Should add a list of
            // exceptions.
            AST_Node.warn("Undeclared symbol: {name} [{file}:{line},{col}]", {
                name: node.name,
                file: node.start.file,
                line: node.start.line,
                col: node.start.col
            });
        }
        if (options.assign_to_global)
        {
            var sym = null;
            if (node instanceof AST_Assign && node.left instanceof AST_SymbolRef)
                sym = node.left;
            else if (node instanceof AST_ForIn && node.init instanceof AST_SymbolRef)
                sym = node.init;
            if (sym
                && (sym.undeclared()
                    || (sym.global() && sym.scope !== sym.definition().scope))) {
                AST_Node.warn("{msg}: {name} [{file}:{line},{col}]", {
                    msg: sym.undeclared() ? "Accidental global?" : "Assignment to global",
                    name: sym.name,
                    file: sym.start.file,
                    line: sym.start.line,
                    col: sym.start.col
                });
            }
        }
        if (options.eval
            && node instanceof AST_SymbolRef
            && node.undeclared()
            && node.name == "eval") {
            AST_Node.warn("Eval is used [{file}:{line},{col}]", node.start);
        }
        if (options.unreferenced
            && (node instanceof AST_SymbolDeclaration || node instanceof AST_Label)
            && node.unreferenced()) {
            AST_Node.warn("{type} {name} is declared but not referenced [{file}:{line},{col}]", {
                type: node instanceof AST_Label ? "Label" : "Symbol",
                name: node.name,
                file: node.start.file,
                line: node.start.line,
                col: node.start.col
            });
        }
        if (options.func_arguments
            && node instanceof AST_Lambda
            && node.uses_arguments) {
            AST_Node.warn("arguments used in function {name} [{file}:{line},{col}]", {
                name: node.name ? node.name.name : "anonymous",
                file: node.start.file,
                line: node.start.line,
                col: node.start.col
            });
        }
        if (options.nested_defuns
            && node instanceof AST_Defun
            && !(tw.parent() instanceof AST_Scope)) {
            AST_Node.warn("Function {name} declared in nested statement \"{type}\" [{file}:{line},{col}]", {
                name: node.name.name,
                type: tw.parent().TYPE,
                file: node.start.file,
                line: node.start.line,
                col: node.start.col
            });
        }
    });
    this.walk(tw);
});

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

function OutputStream(options) {

    options = defaults(options, {
        indent_start     : 0,
        indent_level     : 4,
        quote_keys       : false,
        space_colon      : true,
        ascii_only       : false,
        unescape_regexps : false,
        inline_script    : false,
        width            : 80,
        max_line_len     : 32000,
        beautify         : false,
        source_map       : null,
        bracketize       : false,
        semicolons       : true,
        comments         : false,
        preserve_line    : false,
        screw_ie8        : false,
        preamble         : null,
    }, true);

    var indentation = 0;
    var current_col = 0;
    var current_line = 1;
    var current_pos = 0;
    var OUTPUT = "";

    function to_ascii(str, identifier) {
        return str.replace(/[\u0080-\uffff]/g, function(ch) {
            var code = ch.charCodeAt(0).toString(16);
            if (code.length <= 2 && !identifier) {
                while (code.length < 2) code = "0" + code;
                return "\\x" + code;
            } else {
                while (code.length < 4) code = "0" + code;
                return "\\u" + code;
            }
        });
    };

    function make_string(str) {
        var dq = 0, sq = 0;
        str = str.replace(/[\\\b\f\n\r\t\x22\x27\u2028\u2029\0]/g, function(s){
            switch (s) {
              case "\\": return "\\\\";
              case "\b": return "\\b";
              case "\f": return "\\f";
              case "\n": return "\\n";
              case "\r": return "\\r";
              case "\u2028": return "\\u2028";
              case "\u2029": return "\\u2029";
              case '"': ++dq; return '"';
              case "'": ++sq; return "'";
              case "\0": return "\\x00";
            }
            return s;
        });
        if (options.ascii_only) str = to_ascii(str);
        if (dq > sq) return "'" + str.replace(/\x27/g, "\\'") + "'";
        else return '"' + str.replace(/\x22/g, '\\"') + '"';
    };

    function encode_string(str) {
        var ret = make_string(str);
        if (options.inline_script)
            ret = ret.replace(/<\x2fscript([>\/\t\n\f\r ])/gi, "<\\/script$1");
        return ret;
    };

    function make_name(name) {
        name = name.toString();
        if (options.ascii_only)
            name = to_ascii(name, true);
        return name;
    };

    function make_indent(back) {
        return repeat_string(" ", options.indent_start + indentation - back * options.indent_level);
    };

    /* -----[ beautification/minification ]----- */

    var might_need_space = false;
    var might_need_semicolon = false;
    var last = null;

    function last_char() {
        return last.charAt(last.length - 1);
    };

    function maybe_newline() {
        if (options.max_line_len && current_col > options.max_line_len)
            print("\n");
    };

    var requireSemicolonChars = makePredicate("( [ + * / - , .");

    function print(str) {
        str = String(str);
        var ch = str.charAt(0);
        if (might_need_semicolon) {
            if ((!ch || ";}".indexOf(ch) < 0) && !/[;]$/.test(last)) {
                if (options.semicolons || requireSemicolonChars(ch)) {
                    OUTPUT += ";";
                    current_col++;
                    current_pos++;
                } else {
                    OUTPUT += "\n";
                    current_pos++;
                    current_line++;
                    current_col = 0;
                }
                if (!options.beautify)
                    might_need_space = false;
            }
            might_need_semicolon = false;
            maybe_newline();
        }

        if (!options.beautify && options.preserve_line && stack[stack.length - 1]) {
            var target_line = stack[stack.length - 1].start.line;
            while (current_line < target_line) {
                OUTPUT += "\n";
                current_pos++;
                current_line++;
                current_col = 0;
                might_need_space = false;
            }
        }

        if (might_need_space) {
            var prev = last_char();
            if ((is_identifier_char(prev)
                 && (is_identifier_char(ch) || ch == "\\"))
                || (/^[\+\-\/]$/.test(ch) && ch == prev))
            {
                OUTPUT += " ";
                current_col++;
                current_pos++;
            }
            might_need_space = false;
        }
        var a = str.split(/\r?\n/), n = a.length - 1;
        current_line += n;
        if (n == 0) {
            current_col += a[n].length;
        } else {
            current_col = a[n].length;
        }
        current_pos += str.length;
        last = str;
        OUTPUT += str;
    };

    var space = options.beautify ? function() {
        print(" ");
    } : function() {
        might_need_space = true;
    };

    var indent = options.beautify ? function(half) {
        if (options.beautify) {
            print(make_indent(half ? 0.5 : 0));
        }
    } : noop;

    var with_indent = options.beautify ? function(col, cont) {
        if (col === true) col = next_indent();
        var save_indentation = indentation;
        indentation = col;
        var ret = cont();
        indentation = save_indentation;
        return ret;
    } : function(col, cont) { return cont() };

    var newline = options.beautify ? function() {
        print("\n");
    } : noop;

    var semicolon = options.beautify ? function() {
        print(";");
    } : function() {
        might_need_semicolon = true;
    };

    function force_semicolon() {
        might_need_semicolon = false;
        print(";");
    };

    function next_indent() {
        return indentation + options.indent_level;
    };

    function with_block(cont) {
        var ret;
        print("{");
        newline();
        with_indent(next_indent(), function(){
            ret = cont();
        });
        indent();
        print("}");
        return ret;
    };

    function with_parens(cont) {
        print("(");
        //XXX: still nice to have that for argument lists
        //var ret = with_indent(current_col, cont);
        var ret = cont();
        print(")");
        return ret;
    };

    function with_square(cont) {
        print("[");
        //var ret = with_indent(current_col, cont);
        var ret = cont();
        print("]");
        return ret;
    };

    function comma() {
        print(",");
        space();
    };

    function colon() {
        print(":");
        if (options.space_colon) space();
    };

    var add_mapping = options.source_map ? function(token, name) {
        try {
            if (token) options.source_map.add(
                token.file || "?",
                current_line, current_col,
                token.line, token.col,
                (!name && token.type == "name") ? token.value : name
            );
        } catch(ex) {
            AST_Node.warn("Couldn't figure out mapping for {file}:{line},{col} → {cline},{ccol} [{name}]", {
                file: token.file,
                line: token.line,
                col: token.col,
                cline: current_line,
                ccol: current_col,
                name: name || ""
            })
        }
    } : noop;

    function get() {
        return OUTPUT;
    };

    if (options.preamble) {
        print(options.preamble.replace(/\r\n?|[\n\u2028\u2029]|\s*$/g, "\n"));
    }

    var stack = [];
    return {
        get             : get,
        toString        : get,
        indent          : indent,
        indentation     : function() { return indentation },
        current_width   : function() { return current_col - indentation },
        should_break    : function() { return options.width && this.current_width() >= options.width },
        newline         : newline,
        print           : print,
        space           : space,
        comma           : comma,
        colon           : colon,
        last            : function() { return last },
        semicolon       : semicolon,
        force_semicolon : force_semicolon,
        to_ascii        : to_ascii,
        print_name      : function(name) { print(make_name(name)) },
        print_string    : function(str) { print(encode_string(str)) },
        next_indent     : next_indent,
        with_indent     : with_indent,
        with_block      : with_block,
        with_parens     : with_parens,
        with_square     : with_square,
        add_mapping     : add_mapping,
        option          : function(opt) { return options[opt] },
        line            : function() { return current_line },
        col             : function() { return current_col },
        pos             : function() { return current_pos },
        push_node       : function(node) { stack.push(node) },
        pop_node        : function() { return stack.pop() },
        stack           : function() { return stack },
        parent          : function(n) {
            return stack[stack.length - 2 - (n || 0)];
        }
    };

};

/* -----[ code generators ]----- */

(function(){

    /* -----[ utils ]----- */

    function DEFPRINT(nodetype, generator) {
        nodetype.DEFMETHOD("_codegen", generator);
    };

    AST_Node.DEFMETHOD("print", function(stream, force_parens){
        var self = this, generator = self._codegen;
        function doit() {
            self.add_comments(stream);
            self.add_source_map(stream);
            generator(self, stream);
        }
        stream.push_node(self);
        if (force_parens || self.needs_parens(stream)) {
            stream.with_parens(doit);
        } else {
            doit();
        }
        stream.pop_node();
    });

    AST_Node.DEFMETHOD("print_to_string", function(options){
        var s = OutputStream(options);
        this.print(s);
        return s.get();
    });

    /* -----[ comments ]----- */

    AST_Node.DEFMETHOD("add_comments", function(output){
        var c = output.option("comments"), self = this;
        if (c) {
            var start = self.start;
            if (start && !start._comments_dumped) {
                start._comments_dumped = true;
                var comments = start.comments_before || [];

                // XXX: ugly fix for https://github.com/mishoo/UglifyJS2/issues/112
                //               and https://github.com/mishoo/UglifyJS2/issues/372
                if (self instanceof AST_Exit && self.value) {
                    self.value.walk(new TreeWalker(function(node){
                        if (node.start && node.start.comments_before) {
                            comments = comments.concat(node.start.comments_before);
                            node.start.comments_before = [];
                        }
                        if (node instanceof AST_Function ||
                            node instanceof AST_Array ||
                            node instanceof AST_Object)
                        {
                            return true; // don't go inside.
                        }
                    }));
                }

                if (c.test) {
                    comments = comments.filter(function(comment){
                        return c.test(comment.value);
                    });
                } else if (typeof c == "function") {
                    comments = comments.filter(function(comment){
                        return c(self, comment);
                    });
                }
                comments.forEach(function(c){
                    if (/comment[134]/.test(c.type)) {
                        output.print("//" + c.value + "\n");
                        output.indent();
                    }
                    else if (c.type == "comment2") {
                        output.print("/*" + c.value + "*/");
                        if (start.nlb) {
                            output.print("\n");
                            output.indent();
                        } else {
                            output.space();
                        }
                    }
                });
            }
        }
    });

    /* -----[ PARENTHESES ]----- */

    function PARENS(nodetype, func) {
        nodetype.DEFMETHOD("needs_parens", func);
    };

    PARENS(AST_Node, function(){
        return false;
    });

    // a function expression needs parens around it when it's provably
    // the first token to appear in a statement.
    PARENS(AST_Function, function(output){
        return first_in_statement(output);
    });

    // same goes for an object literal, because otherwise it would be
    // interpreted as a block of code.
    PARENS(AST_Object, function(output){
        return first_in_statement(output);
    });

    PARENS(AST_Unary, function(output){
        var p = output.parent();
        return p instanceof AST_PropAccess && p.expression === this;
    });

    PARENS(AST_Seq, function(output){
        var p = output.parent();
        return p instanceof AST_Call             // (foo, bar)() or foo(1, (2, 3), 4)
            || p instanceof AST_Unary            // !(foo, bar, baz)
            || p instanceof AST_Binary           // 1 + (2, 3) + 4 ==> 8
            || p instanceof AST_VarDef           // var a = (1, 2), b = a + a; ==> b == 4
            || p instanceof AST_PropAccess       // (1, {foo:2}).foo or (1, {foo:2})["foo"] ==> 2
            || p instanceof AST_Array            // [ 1, (2, 3), 4 ] ==> [ 1, 3, 4 ]
            || p instanceof AST_ObjectProperty   // { foo: (1, 2) }.foo ==> 2
            || p instanceof AST_Conditional      /* (false, true) ? (a = 10, b = 20) : (c = 30)
                                                  * ==> 20 (side effect, set a := 10 and b := 20) */
        ;
    });

    PARENS(AST_Binary, function(output){
        var p = output.parent();
        // (foo && bar)()
        if (p instanceof AST_Call && p.expression === this)
            return true;
        // typeof (foo && bar)
        if (p instanceof AST_Unary)
            return true;
        // (foo && bar)["prop"], (foo && bar).prop
        if (p instanceof AST_PropAccess && p.expression === this)
            return true;
        // this deals with precedence: 3 * (2 + 1)
        if (p instanceof AST_Binary) {
            var po = p.operator, pp = PRECEDENCE[po];
            var so = this.operator, sp = PRECEDENCE[so];
            if (pp > sp
                || (pp == sp
                    && this === p.right)) {
                return true;
            }
        }
    });

    PARENS(AST_PropAccess, function(output){
        var p = output.parent();
        if (p instanceof AST_New && p.expression === this) {
            // i.e. new (foo.bar().baz)
            //
            // if there's one call into this subtree, then we need
            // parens around it too, otherwise the call will be
            // interpreted as passing the arguments to the upper New
            // expression.
            try {
                this.walk(new TreeWalker(function(node){
                    if (node instanceof AST_Call) throw p;
                }));
            } catch(ex) {
                if (ex !== p) throw ex;
                return true;
            }
        }
    });

    PARENS(AST_Call, function(output){
        var p = output.parent(), p1;
        if (p instanceof AST_New && p.expression === this)
            return true;

        // workaround for Safari bug.
        // https://bugs.webkit.org/show_bug.cgi?id=123506
        return this.expression instanceof AST_Function
            && p instanceof AST_PropAccess
            && p.expression === this
            && (p1 = output.parent(1)) instanceof AST_Assign
            && p1.left === p;
    });

    PARENS(AST_New, function(output){
        var p = output.parent();
        if (no_constructor_parens(this, output)
            && (p instanceof AST_PropAccess // (new Date).getTime(), (new Date)["getTime"]()
                || p instanceof AST_Call && p.expression === this)) // (new foo)(bar)
            return true;
    });

    PARENS(AST_Number, function(output){
        var p = output.parent();
        if (this.getValue() < 0 && p instanceof AST_PropAccess && p.expression === this)
            return true;
    });

    PARENS(AST_NaN, function(output){
        var p = output.parent();
        if (p instanceof AST_PropAccess && p.expression === this)
            return true;
    });

    function assign_and_conditional_paren_rules(output) {
        var p = output.parent();
        // !(a = false) → true
        if (p instanceof AST_Unary)
            return true;
        // 1 + (a = 2) + 3 → 6, side effect setting a = 2
        if (p instanceof AST_Binary && !(p instanceof AST_Assign))
            return true;
        // (a = func)() —or— new (a = Object)()
        if (p instanceof AST_Call && p.expression === this)
            return true;
        // (a = foo) ? bar : baz
        if (p instanceof AST_Conditional && p.condition === this)
            return true;
        // (a = foo)["prop"] —or— (a = foo).prop
        if (p instanceof AST_PropAccess && p.expression === this)
            return true;
    };

    PARENS(AST_Assign, assign_and_conditional_paren_rules);
    PARENS(AST_Conditional, assign_and_conditional_paren_rules);

    /* -----[ PRINTERS ]----- */

    DEFPRINT(AST_Directive, function(self, output){
        output.print_string(self.value);
        output.semicolon();
    });
    DEFPRINT(AST_Debugger, function(self, output){
        output.print("debugger");
        output.semicolon();
    });

    /* -----[ statements ]----- */

    function display_body(body, is_toplevel, output) {
        var last = body.length - 1;
        body.forEach(function(stmt, i){
            if (!(stmt instanceof AST_EmptyStatement)) {
                output.indent();
                stmt.print(output);
                if (!(i == last && is_toplevel)) {
                    output.newline();
                    if (is_toplevel) output.newline();
                }
            }
        });
    };

    AST_StatementWithBody.DEFMETHOD("_do_print_body", function(output){
        force_statement(this.body, output);
    });

    DEFPRINT(AST_Statement, function(self, output){
        self.body.print(output);
        output.semicolon();
    });
    DEFPRINT(AST_Toplevel, function(self, output){
        display_body(self.body, true, output);
        output.print("");
    });
    DEFPRINT(AST_LabeledStatement, function(self, output){
        self.label.print(output);
        output.colon();
        self.body.print(output);
    });
    DEFPRINT(AST_SimpleStatement, function(self, output){
        self.body.print(output);
        output.semicolon();
    });
    function print_bracketed(body, output) {
        if (body.length > 0) output.with_block(function(){
            display_body(body, false, output);
        });
        else output.print("{}");
    };
    DEFPRINT(AST_BlockStatement, function(self, output){
        print_bracketed(self.body, output);
    });
    DEFPRINT(AST_EmptyStatement, function(self, output){
        output.semicolon();
    });
    DEFPRINT(AST_Do, function(self, output){
        output.print("do");
        output.space();
        self._do_print_body(output);
        output.space();
        output.print("while");
        output.space();
        output.with_parens(function(){
            self.condition.print(output);
        });
        output.semicolon();
    });
    DEFPRINT(AST_While, function(self, output){
        output.print("while");
        output.space();
        output.with_parens(function(){
            self.condition.print(output);
        });
        output.space();
        self._do_print_body(output);
    });
    DEFPRINT(AST_For, function(self, output){
        output.print("fo" + "r");
        output.space();
        output.with_parens(function(){
            if (self.init) {
                if (self.init instanceof AST_Definitions) {
                    self.init.print(output);
                } else {
                    parenthesize_for_noin(self.init, output, true);
                }
                output.print(";");
                output.space();
            } else {
                output.print(";");
            }
            if (self.condition) {
                self.condition.print(output);
                output.print(";");
                output.space();
            } else {
                output.print(";");
            }
            if (self.step) {
                self.step.print(output);
            }
        });
        output.space();
        self._do_print_body(output);
    });
    DEFPRINT(AST_ForIn, function(self, output){
        output.print("fo" + "r");
        output.space();
        output.with_parens(function(){
            self.init.print(output);
            output.space();
            output.print("in");
            output.space();
            self.object.print(output);
        });
        output.space();
        self._do_print_body(output);
    });
    DEFPRINT(AST_With, function(self, output){
        output.print("with");
        output.space();
        output.with_parens(function(){
            self.expression.print(output);
        });
        output.space();
        self._do_print_body(output);
    });

    /* -----[ functions ]----- */
    AST_Lambda.DEFMETHOD("_do_print", function(output, nokeyword){
        var self = this;
        if (!nokeyword) {
            output.print("function");
        }
        if (self.name) {
            output.space();
            self.name.print(output);
        }
        output.with_parens(function(){
            self.argnames.forEach(function(arg, i){
                if (i) output.comma();
                arg.print(output);
            });
        });
        output.space();
        print_bracketed(self.body, output);
    });
    DEFPRINT(AST_Lambda, function(self, output){
        self._do_print(output);
    });

    /* -----[ exits ]----- */
    AST_Exit.DEFMETHOD("_do_print", function(output, kind){
        output.print(kind);
        if (this.value) {
            output.space();
            this.value.print(output);
        }
        output.semicolon();
    });
    DEFPRINT(AST_Return, function(self, output){
        self._do_print(output, "return");
    });
    DEFPRINT(AST_Throw, function(self, output){
        self._do_print(output, "throw");
    });

    /* -----[ loop control ]----- */
    AST_LoopControl.DEFMETHOD("_do_print", function(output, kind){
        output.print(kind);
        if (this.label) {
            output.space();
            this.label.print(output);
        }
        output.semicolon();
    });
    DEFPRINT(AST_Break, function(self, output){
        self._do_print(output, "break");
    });
    DEFPRINT(AST_Continue, function(self, output){
        self._do_print(output, "continue");
    });

    /* -----[ if ]----- */
    function make_then(self, output) {
        if (output.option("bracketize")) {
            make_block(self.body, output);
            return;
        }
        // The squeezer replaces "block"-s that contain only a single
        // statement with the statement itself; technically, the AST
        // is correct, but this can create problems when we output an
        // IF having an ELSE clause where the THEN clause ends in an
        // IF *without* an ELSE block (then the outer ELSE would refer
        // to the inner IF).  This function checks for this case and
        // adds the block brackets if needed.
        if (!self.body)
            return output.force_semicolon();
        if (self.body instanceof AST_Do
            && !output.option("screw_ie8")) {
            // https://github.com/mishoo/UglifyJS/issues/#issue/57 IE
            // croaks with "syntax error" on code like this: if (foo)
            // do ... while(cond); else ...  we need block brackets
            // around do/while
            make_block(self.body, output);
            return;
        }
        var b = self.body;
        while (true) {
            if (b instanceof AST_If) {
                if (!b.alternative) {
                    make_block(self.body, output);
                    return;
                }
                b = b.alternative;
            }
            else if (b instanceof AST_StatementWithBody) {
                b = b.body;
            }
            else break;
        }
        force_statement(self.body, output);
    };
    DEFPRINT(AST_If, function(self, output){
        output.print("if");
        output.space();
        output.with_parens(function(){
            self.condition.print(output);
        });
        output.space();
        if (self.alternative) {
            make_then(self, output);
            output.space();
            output.print("else");
            output.space();
            force_statement(self.alternative, output);
        } else {
            self._do_print_body(output);
        }
    });

    /* -----[ switch ]----- */
    DEFPRINT(AST_Switch, function(self, output){
        output.print("switch");
        output.space();
        output.with_parens(function(){
            self.expression.print(output);
        });
        output.space();
        if (self.body.length > 0) output.with_block(function(){
            self.body.forEach(function(stmt, i){
                if (i) output.newline();
                output.indent(true);
                stmt.print(output);
            });
        });
        else output.print("{}");
    });
    AST_SwitchBranch.DEFMETHOD("_do_print_body", function(output){
        if (this.body.length > 0) {
            output.newline();
            this.body.forEach(function(stmt){
                output.indent();
                stmt.print(output);
                output.newline();
            });
        }
    });
    DEFPRINT(AST_Default, function(self, output){
        output.print("default:");
        self._do_print_body(output);
    });
    DEFPRINT(AST_Case, function(self, output){
        output.print("case");
        output.space();
        self.expression.print(output);
        output.print(":");
        self._do_print_body(output);
    });

    /* -----[ exceptions ]----- */
    DEFPRINT(AST_Try, function(self, output){
        output.print("try");
        output.space();
        print_bracketed(self.body, output);
        if (self.bcatch) {
            output.space();
            self.bcatch.print(output);
        }
        if (self.bfinally) {
            output.space();
            self.bfinally.print(output);
        }
    });
    DEFPRINT(AST_Catch, function(self, output){
        output.print("catch");
        output.space();
        output.with_parens(function(){
            self.argname.print(output);
        });
        output.space();
        print_bracketed(self.body, output);
    });
    DEFPRINT(AST_Finally, function(self, output){
        output.print("finally");
        output.space();
        print_bracketed(self.body, output);
    });

    /* -----[ var/const ]----- */
    AST_Definitions.DEFMETHOD("_do_print", function(output, kind){
        output.print(kind);
        output.space();
        this.definitions.forEach(function(def, i){
            if (i) output.comma();
            def.print(output);
        });
        var p = output.parent();
        var in_for = p instanceof AST_For || p instanceof AST_ForIn;
        var avoid_semicolon = in_for && p.init === this;
        if (!avoid_semicolon)
            output.semicolon();
    });
    DEFPRINT(AST_Var, function(self, output){
        self._do_print(output, "var");
    });
    DEFPRINT(AST_Const, function(self, output){
        self._do_print(output, "const");
    });

    function parenthesize_for_noin(node, output, noin) {
        if (!noin) node.print(output);
        else try {
            // need to take some precautions here:
            //    https://github.com/mishoo/UglifyJS2/issues/60
            node.walk(new TreeWalker(function(node){
                if (node instanceof AST_Binary && node.operator == "in")
                    throw output;
            }));
            node.print(output);
        } catch(ex) {
            if (ex !== output) throw ex;
            node.print(output, true);
        }
    };

    DEFPRINT(AST_VarDef, function(self, output){
        self.name.print(output);
        if (self.value) {
            output.space();
            output.print("=");
            output.space();
            var p = output.parent(1);
            var noin = p instanceof AST_For || p instanceof AST_ForIn;
            parenthesize_for_noin(self.value, output, noin);
        }
    });

    /* -----[ other expressions ]----- */
    DEFPRINT(AST_Call, function(self, output){
        self.expression.print(output);
        if (self instanceof AST_New && no_constructor_parens(self, output))
            return;
        output.with_parens(function(){
            self.args.forEach(function(expr, i){
                if (i) output.comma();
                expr.print(output);
            });
        });
    });
    DEFPRINT(AST_New, function(self, output){
        output.print("new");
        output.space();
        AST_Call.prototype._codegen(self, output);
    });

    AST_Seq.DEFMETHOD("_do_print", function(output){
        this.car.print(output);
        if (this.cdr) {
            output.comma();
            if (output.should_break()) {
                output.newline();
                output.indent();
            }
            this.cdr.print(output);
        }
    });
    DEFPRINT(AST_Seq, function(self, output){
        self._do_print(output);
        // var p = output.parent();
        // if (p instanceof AST_Statement) {
        //     output.with_indent(output.next_indent(), function(){
        //         self._do_print(output);
        //     });
        // } else {
        //     self._do_print(output);
        // }
    });
    DEFPRINT(AST_Dot, function(self, output){
        var expr = self.expression;
        expr.print(output);
        if (expr instanceof AST_Number && expr.getValue() >= 0) {
            if (!/[xa-f.]/i.test(output.last())) {
                output.print(".");
            }
        }
        output.print(".");
        // the name after dot would be mapped about here.
        output.add_mapping(self.end);
        output.print_name(self.property);
    });
    DEFPRINT(AST_Sub, function(self, output){
        self.expression.print(output);
        output.print("[");
        self.property.print(output);
        output.print("]");
    });
    DEFPRINT(AST_UnaryPrefix, function(self, output){
        var op = self.operator;
        output.print(op);
        if (/^[a-z]/i.test(op))
            output.space();
        self.expression.print(output);
    });
    DEFPRINT(AST_UnaryPostfix, function(self, output){
        self.expression.print(output);
        output.print(self.operator);
    });
    DEFPRINT(AST_Binary, function(self, output){
        self.left.print(output);
        output.space();
        output.print(self.operator);
        if (self.operator == "<"
            && self.right instanceof AST_UnaryPrefix
            && self.right.operator == "!"
            && self.right.expression instanceof AST_UnaryPrefix
            && self.right.expression.operator == "--") {
            // space is mandatory to avoid outputting <!--
            // http://javascript.spec.whatwg.org/#comment-syntax
            output.print(" ");
        } else {
            // the space is optional depending on "beautify"
            output.space();
        }
        self.right.print(output);
    });
    DEFPRINT(AST_Conditional, function(self, output){
        self.condition.print(output);
        output.space();
        output.print("?");
        output.space();
        self.consequent.print(output);
        output.space();
        output.colon();
        self.alternative.print(output);
    });

    /* -----[ literals ]----- */
    DEFPRINT(AST_Array, function(self, output){
        output.with_square(function(){
            var a = self.elements, len = a.length;
            if (len > 0) output.space();
            a.forEach(function(exp, i){
                if (i) output.comma();
                exp.print(output);
                // If the final element is a hole, we need to make sure it
                // doesn't look like a trailing comma, by inserting an actual
                // trailing comma.
                if (i === len - 1 && exp instanceof AST_Hole)
                  output.comma();
            });
            if (len > 0) output.space();
        });
    });
    DEFPRINT(AST_Object, function(self, output){
        if (self.properties.length > 0) output.with_block(function(){
            self.properties.forEach(function(prop, i){
                if (i) {
                    output.print(",");
                    output.newline();
                }
                output.indent();
                prop.print(output);
            });
            output.newline();
        });
        else output.print("{}");
    });
    DEFPRINT(AST_ObjectKeyVal, function(self, output){
        var key = self.key;
        if (output.option("quote_keys")) {
            output.print_string(key + "");
        } else if ((typeof key == "number"
                    || !output.option("beautify")
                    && +key + "" == key)
                   && parseFloat(key) >= 0) {
            output.print(make_num(key));
        } else if (RESERVED_WORDS(key) ? output.option("screw_ie8") : is_identifier_string(key)) {
            output.print_name(key);
        } else {
            output.print_string(key);
        }
        output.colon();
        self.value.print(output);
    });
    DEFPRINT(AST_ObjectSetter, function(self, output){
        output.print("set");
        output.space();
        self.key.print(output);
        self.value._do_print(output, true);
    });
    DEFPRINT(AST_ObjectGetter, function(self, output){
        output.print("get");
        output.space();
        self.key.print(output);
        self.value._do_print(output, true);
    });
    DEFPRINT(AST_Symbol, function(self, output){
        var def = self.definition();
        output.print_name(def ? def.mangled_name || def.name : self.name);
    });
    DEFPRINT(AST_Undefined, function(self, output){
        output.print("void 0");
    });
    DEFPRINT(AST_Hole, noop);
    DEFPRINT(AST_Infinity, function(self, output){
        output.print("1/0");
    });
    DEFPRINT(AST_NaN, function(self, output){
        output.print("0/0");
    });
    DEFPRINT(AST_This, function(self, output){
        output.print("this");
    });
    DEFPRINT(AST_Constant, function(self, output){
        output.print(self.getValue());
    });
    DEFPRINT(AST_String, function(self, output){
        output.print_string(self.getValue());
    });
    DEFPRINT(AST_Number, function(self, output){
        output.print(make_num(self.getValue()));
    });

    function regexp_safe_literal(code) {
        return [
            0x5c   , // \
            0x2f   , // /
            0x2e   , // .
            0x2b   , // +
            0x2a   , // *
            0x3f   , // ?
            0x28   , // (
            0x29   , // )
            0x5b   , // [
            0x5d   , // ]
            0x7b   , // {
            0x7d   , // }
            0x24   , // $
            0x5e   , // ^
            0x3a   , // :
            0x7c   , // |
            0x21   , // !
            0x0a   , // \n
            0x0d   , // \r
            0x00   , // \0
            0xfeff , // Unicode BOM
            0x2028 , // unicode "line separator"
            0x2029 , // unicode "paragraph separator"
        ].indexOf(code) < 0;
    };

    DEFPRINT(AST_RegExp, function(self, output){
        var str = self.getValue().toString();
        if (output.option("ascii_only")) {
            str = output.to_ascii(str);
        } else if (output.option("unescape_regexps")) {
            str = str.split("\\\\").map(function(str){
                return str.replace(/\\u[0-9a-fA-F]{4}|\\x[0-9a-fA-F]{2}/g, function(s){
                    var code = parseInt(s.substr(2), 16);
                    return regexp_safe_literal(code) ? String.fromCharCode(code) : s;
                });
            }).join("\\\\");
        }
        output.print(str);
        var p = output.parent();
        if (p instanceof AST_Binary && /^in/.test(p.operator) && p.left === self)
            output.print(" ");
    });

    function force_statement(stat, output) {
        if (output.option("bracketize")) {
            if (!stat || stat instanceof AST_EmptyStatement)
                output.print("{}");
            else if (stat instanceof AST_BlockStatement)
                stat.print(output);
            else output.with_block(function(){
                output.indent();
                stat.print(output);
                output.newline();
            });
        } else {
            if (!stat || stat instanceof AST_EmptyStatement)
                output.force_semicolon();
            else
                stat.print(output);
        }
    };

    // return true if the node at the top of the stack (that means the
    // innermost node in the current output) is lexically the first in
    // a statement.
    function first_in_statement(output) {
        var a = output.stack(), i = a.length, node = a[--i], p = a[--i];
        while (i > 0) {
            if (p instanceof AST_Statement && p.body === node)
                return true;
            if ((p instanceof AST_Seq           && p.car === node        ) ||
                (p instanceof AST_Call          && p.expression === node && !(p instanceof AST_New) ) ||
                (p instanceof AST_Dot           && p.expression === node ) ||
                (p instanceof AST_Sub           && p.expression === node ) ||
                (p instanceof AST_Conditional   && p.condition === node  ) ||
                (p instanceof AST_Binary        && p.left === node       ) ||
                (p instanceof AST_UnaryPostfix  && p.expression === node ))
            {
                node = p;
                p = a[--i];
            } else {
                return false;
            }
        }
    };

    // self should be AST_New.  decide if we want to show parens or not.
    function no_constructor_parens(self, output) {
        return self.args.length == 0 && !output.option("beautify");
    };

    function best_of(a) {
        var best = a[0], len = best.length;
        for (var i = 1; i < a.length; ++i) {
            if (a[i].length < len) {
                best = a[i];
                len = best.length;
            }
        }
        return best;
    };

    function make_num(num) {
        var str = num.toString(10), a = [ str.replace(/^0\./, ".").replace('e+', 'e') ], m;
        if (Math.floor(num) === num) {
            if (num >= 0) {
                a.push("0x" + num.toString(16).toLowerCase(), // probably pointless
                       "0" + num.toString(8)); // same.
            } else {
                a.push("-0x" + (-num).toString(16).toLowerCase(), // probably pointless
                       "-0" + (-num).toString(8)); // same.
            }
            if ((m = /^(.*?)(0+)$/.exec(num))) {
                a.push(m[1] + "e" + m[2].length);
            }
        } else if ((m = /^0?\.(0+)(.*)$/.exec(num))) {
            a.push(m[2] + "e-" + (m[1].length + m[2].length),
                   str.substr(str.indexOf(".")));
        }
        return best_of(a);
    };

    function make_block(stmt, output) {
        if (stmt instanceof AST_BlockStatement) {
            stmt.print(output);
            return;
        }
        output.with_block(function(){
            output.indent();
            stmt.print(output);
            output.newline();
        });
    };

    /* -----[ source map generators ]----- */

    function DEFMAP(nodetype, generator) {
        nodetype.DEFMETHOD("add_source_map", function(stream){
            generator(this, stream);
        });
    };

    // We could easily add info for ALL nodes, but it seems to me that
    // would be quite wasteful, hence this noop in the base class.
    DEFMAP(AST_Node, noop);

    function basic_sourcemap_gen(self, output) {
        output.add_mapping(self.start);
    };

    // XXX: I'm not exactly sure if we need it for all of these nodes,
    // or if we should add even more.

    DEFMAP(AST_Directive, basic_sourcemap_gen);
    DEFMAP(AST_Debugger, basic_sourcemap_gen);
    DEFMAP(AST_Symbol, basic_sourcemap_gen);
    DEFMAP(AST_Jump, basic_sourcemap_gen);
    DEFMAP(AST_StatementWithBody, basic_sourcemap_gen);
    DEFMAP(AST_LabeledStatement, noop); // since the label symbol will mark it
    DEFMAP(AST_Lambda, basic_sourcemap_gen);
    DEFMAP(AST_Switch, basic_sourcemap_gen);
    DEFMAP(AST_SwitchBranch, basic_sourcemap_gen);
    DEFMAP(AST_BlockStatement, basic_sourcemap_gen);
    DEFMAP(AST_Toplevel, noop);
    DEFMAP(AST_New, basic_sourcemap_gen);
    DEFMAP(AST_Try, basic_sourcemap_gen);
    DEFMAP(AST_Catch, basic_sourcemap_gen);
    DEFMAP(AST_Finally, basic_sourcemap_gen);
    DEFMAP(AST_Definitions, basic_sourcemap_gen);
    DEFMAP(AST_Constant, basic_sourcemap_gen);
    DEFMAP(AST_ObjectProperty, function(self, output){
        output.add_mapping(self.start, self.key);
    });

})();

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

function Compressor(options, false_by_default) {
    if (!(this instanceof Compressor))
        return new Compressor(options, false_by_default);
    TreeTransformer.call(this, this.before, this.after);
    this.options = defaults(options, {
        sequences     : !false_by_default,
        properties    : !false_by_default,
        dead_code     : !false_by_default,
        drop_debugger : !false_by_default,
        unsafe        : false,
        unsafe_comps  : false,
        conditionals  : !false_by_default,
        comparisons   : !false_by_default,
        evaluate      : !false_by_default,
        booleans      : !false_by_default,
        loops         : !false_by_default,
        unused        : !false_by_default,
        hoist_funs    : !false_by_default,
        keep_fargs    : false,
        hoist_vars    : false,
        if_return     : !false_by_default,
        join_vars     : !false_by_default,
        cascade       : !false_by_default,
        side_effects  : !false_by_default,
        pure_getters  : false,
        pure_funcs    : null,
        negate_iife   : !false_by_default,
        screw_ie8     : false,
        drop_console  : false,
        angular       : false,

        warnings      : true,
        global_defs   : {}
    }, true);
};

Compressor.prototype = new TreeTransformer;
merge(Compressor.prototype, {
    option: function(key) { return this.options[key] },
    warn: function() {
        if (this.options.warnings)
            AST_Node.warn.apply(AST_Node, arguments);
    },
    before: function(node, descend, in_list) {
        if (node._squeezed) return node;
        var was_scope = false;
        if (node instanceof AST_Scope) {
            node = node.hoist_declarations(this);
            was_scope = true;
        }
        descend(node, this);
        node = node.optimize(this);
        if (was_scope && node instanceof AST_Scope) {
            node.drop_unused(this);
            descend(node, this);
        }
        node._squeezed = true;
        return node;
    }
});

(function(){

    function OPT(node, optimizer) {
        node.DEFMETHOD("optimize", function(compressor){
            var self = this;
            if (self._optimized) return self;
            var opt = optimizer(self, compressor);
            opt._optimized = true;
            if (opt === self) return opt;
            return opt.transform(compressor);
        });
    };

    OPT(AST_Node, function(self, compressor){
        return self;
    });

    AST_Node.DEFMETHOD("equivalent_to", function(node){
        // XXX: this is a rather expensive way to test two node's equivalence:
        return this.print_to_string() == node.print_to_string();
    });

    function make_node(ctor, orig, props) {
        if (!props) props = {};
        if (orig) {
            if (!props.start) props.start = orig.start;
            if (!props.end) props.end = orig.end;
        }
        return new ctor(props);
    };

    function make_node_from_constant(compressor, val, orig) {
        // XXX: WIP.
        // if (val instanceof AST_Node) return val.transform(new TreeTransformer(null, function(node){
        //     if (node instanceof AST_SymbolRef) {
        //         var scope = compressor.find_parent(AST_Scope);
        //         var def = scope.find_variable(node);
        //         node.thedef = def;
        //         return node;
        //     }
        // })).transform(compressor);

        if (val instanceof AST_Node) return val.transform(compressor);
        switch (typeof val) {
          case "string":
            return make_node(AST_String, orig, {
                value: val
            }).optimize(compressor);
          case "number":
            return make_node(isNaN(val) ? AST_NaN : AST_Number, orig, {
                value: val
            }).optimize(compressor);
          case "boolean":
            return make_node(val ? AST_True : AST_False, orig).optimize(compressor);
          case "undefined":
            return make_node(AST_Undefined, orig).optimize(compressor);
          default:
            if (val === null) {
                return make_node(AST_Null, orig).optimize(compressor);
            }
            if (val instanceof RegExp) {
                return make_node(AST_RegExp, orig).optimize(compressor);
            }
            throw new Error(string_template("Can't handle constant of type: {type}", {
                type: typeof val
            }));
        }
    };

    function as_statement_array(thing) {
        if (thing === null) return [];
        if (thing instanceof AST_BlockStatement) return thing.body;
        if (thing instanceof AST_EmptyStatement) return [];
        if (thing instanceof AST_Statement) return [ thing ];
        throw new Error("Can't convert thing to statement array");
    };

    function is_empty(thing) {
        if (thing === null) return true;
        if (thing instanceof AST_EmptyStatement) return true;
        if (thing instanceof AST_BlockStatement) return thing.body.length == 0;
        return false;
    };

    function loop_body(x) {
        if (x instanceof AST_Switch) return x;
        if (x instanceof AST_For || x instanceof AST_ForIn || x instanceof AST_DWLoop) {
            return (x.body instanceof AST_BlockStatement ? x.body : x);
        }
        return x;
    };

    function tighten_body(statements, compressor) {
        var CHANGED;
        do {
            CHANGED = false;
            if (compressor.option("angular")) {
                statements = process_for_angular(statements);
            }
            statements = eliminate_spurious_blocks(statements);
            if (compressor.option("dead_code")) {
                statements = eliminate_dead_code(statements, compressor);
            }
            if (compressor.option("if_return")) {
                statements = handle_if_return(statements, compressor);
            }
            if (compressor.option("sequences")) {
                statements = sequencesize(statements, compressor);
            }
            if (compressor.option("join_vars")) {
                statements = join_consecutive_vars(statements, compressor);
            }
        } while (CHANGED);

        if (compressor.option("negate_iife")) {
            negate_iifes(statements, compressor);
        }

        return statements;

        function process_for_angular(statements) {
            function make_injector(func, name) {
                return make_node(AST_SimpleStatement, func, {
                    body: make_node(AST_Assign, func, {
                        operator: "=",
                        left: make_node(AST_Dot, name, {
                            expression: make_node(AST_SymbolRef, name, name),
                            property: "$inject"
                        }),
                        right: make_node(AST_Array, func, {
                            elements: func.argnames.map(function(sym){
                                return make_node(AST_String, sym, { value: sym.name });
                            })
                        })
                    })
                });
            }
            return statements.reduce(function(a, stat){
                a.push(stat);
                var token = stat.start;
                var comments = token.comments_before;
                if (comments && comments.length > 0) {
                    var last = comments.pop();
                    if (/@ngInject/.test(last.value)) {
                        // case 1: defun
                        if (stat instanceof AST_Defun) {
                            a.push(make_injector(stat, stat.name));
                        }
                        else if (stat instanceof AST_Definitions) {
                            stat.definitions.forEach(function(def){
                                if (def.value && def.value instanceof AST_Lambda) {
                                    a.push(make_injector(def.value, def.name));
                                }
                            });
                        }
                        else {
                            compressor.warn("Unknown statement marked with @ngInject [{file}:{line},{col}]", token);
                        }
                    }
                }
                return a;
            }, []);
        }

        function eliminate_spurious_blocks(statements) {
            var seen_dirs = [];
            return statements.reduce(function(a, stat){
                if (stat instanceof AST_BlockStatement) {
                    CHANGED = true;
                    a.push.apply(a, eliminate_spurious_blocks(stat.body));
                } else if (stat instanceof AST_EmptyStatement) {
                    CHANGED = true;
                } else if (stat instanceof AST_Directive) {
                    if (seen_dirs.indexOf(stat.value) < 0) {
                        a.push(stat);
                        seen_dirs.push(stat.value);
                    } else {
                        CHANGED = true;
                    }
                } else {
                    a.push(stat);
                }
                return a;
            }, []);
        };

        function handle_if_return(statements, compressor) {
            var self = compressor.self();
            var in_lambda = self instanceof AST_Lambda;
            var ret = [];
            loop: for (var i = statements.length; --i >= 0;) {
                var stat = statements[i];
                switch (true) {
                  case (in_lambda && stat instanceof AST_Return && !stat.value && ret.length == 0):
                    CHANGED = true;
                    // note, ret.length is probably always zero
                    // because we drop unreachable code before this
                    // step.  nevertheless, it's good to check.
                    continue loop;
                  case stat instanceof AST_If:
                    if (stat.body instanceof AST_Return) {
                        //---
                        // pretty silly case, but:
                        // if (foo()) return; return; ==> foo(); return;
                        if (((in_lambda && ret.length == 0)
                             || (ret[0] instanceof AST_Return && !ret[0].value))
                            && !stat.body.value && !stat.alternative) {
                            CHANGED = true;
                            var cond = make_node(AST_SimpleStatement, stat.condition, {
                                body: stat.condition
                            });
                            ret.unshift(cond);
                            continue loop;
                        }
                        //---
                        // if (foo()) return x; return y; ==> return foo() ? x : y;
                        if (ret[0] instanceof AST_Return && stat.body.value && ret[0].value && !stat.alternative) {
                            CHANGED = true;
                            stat = stat.clone();
                            stat.alternative = ret[0];
                            ret[0] = stat.transform(compressor);
                            continue loop;
                        }
                        //---
                        // if (foo()) return x; [ return ; ] ==> return foo() ? x : undefined;
                        if ((ret.length == 0 || ret[0] instanceof AST_Return) && stat.body.value && !stat.alternative && in_lambda) {
                            CHANGED = true;
                            stat = stat.clone();
                            stat.alternative = ret[0] || make_node(AST_Return, stat, {
                                value: make_node(AST_Undefined, stat)
                            });
                            ret[0] = stat.transform(compressor);
                            continue loop;
                        }
                        //---
                        // if (foo()) return; [ else x... ]; y... ==> if (!foo()) { x...; y... }
                        if (!stat.body.value && in_lambda) {
                            CHANGED = true;
                            stat = stat.clone();
                            stat.condition = stat.condition.negate(compressor);
                            stat.body = make_node(AST_BlockStatement, stat, {
                                body: as_statement_array(stat.alternative).concat(ret)
                            });
                            stat.alternative = null;
                            ret = [ stat.transform(compressor) ];
                            continue loop;
                        }
                        //---
                        if (ret.length == 1 && in_lambda && ret[0] instanceof AST_SimpleStatement
                            && (!stat.alternative || stat.alternative instanceof AST_SimpleStatement)) {
                            CHANGED = true;
                            ret.push(make_node(AST_Return, ret[0], {
                                value: make_node(AST_Undefined, ret[0])
                            }).transform(compressor));
                            ret = as_statement_array(stat.alternative).concat(ret);
                            ret.unshift(stat);
                            continue loop;
                        }
                    }

                    var ab = aborts(stat.body);
                    var lct = ab instanceof AST_LoopControl ? compressor.loopcontrol_target(ab.label) : null;
                    if (ab && ((ab instanceof AST_Return && !ab.value && in_lambda)
                               || (ab instanceof AST_Continue && self === loop_body(lct))
                               || (ab instanceof AST_Break && lct instanceof AST_BlockStatement && self === lct))) {
                        if (ab.label) {
                            remove(ab.label.thedef.references, ab);
                        }
                        CHANGED = true;
                        var body = as_statement_array(stat.body).slice(0, -1);
                        stat = stat.clone();
                        stat.condition = stat.condition.negate(compressor);
                        stat.body = make_node(AST_BlockStatement, stat, {
                            body: as_statement_array(stat.alternative).concat(ret)
                        });
                        stat.alternative = make_node(AST_BlockStatement, stat, {
                            body: body
                        });
                        ret = [ stat.transform(compressor) ];
                        continue loop;
                    }

                    var ab = aborts(stat.alternative);
                    var lct = ab instanceof AST_LoopControl ? compressor.loopcontrol_target(ab.label) : null;
                    if (ab && ((ab instanceof AST_Return && !ab.value && in_lambda)
                               || (ab instanceof AST_Continue && self === loop_body(lct))
                               || (ab instanceof AST_Break && lct instanceof AST_BlockStatement && self === lct))) {
                        if (ab.label) {
                            remove(ab.label.thedef.references, ab);
                        }
                        CHANGED = true;
                        stat = stat.clone();
                        stat.body = make_node(AST_BlockStatement, stat.body, {
                            body: as_statement_array(stat.body).concat(ret)
                        });
                        stat.alternative = make_node(AST_BlockStatement, stat.alternative, {
                            body: as_statement_array(stat.alternative).slice(0, -1)
                        });
                        ret = [ stat.transform(compressor) ];
                        continue loop;
                    }

                    ret.unshift(stat);
                    break;
                  default:
                    ret.unshift(stat);
                    break;
                }
            }
            return ret;
        };

        function eliminate_dead_code(statements, compressor) {
            var has_quit = false;
            var orig = statements.length;
            var self = compressor.self();
            statements = statements.reduce(function(a, stat){
                if (has_quit) {
                    extract_declarations_from_unreachable_code(compressor, stat, a);
                } else {
                    if (stat instanceof AST_LoopControl) {
                        var lct = compressor.loopcontrol_target(stat.label);
                        if ((stat instanceof AST_Break
                             && lct instanceof AST_BlockStatement
                             && loop_body(lct) === self) || (stat instanceof AST_Continue
                                                             && loop_body(lct) === self)) {
                            if (stat.label) {
                                remove(stat.label.thedef.references, stat);
                            }
                        } else {
                            a.push(stat);
                        }
                    } else {
                        a.push(stat);
                    }
                    if (aborts(stat)) has_quit = true;
                }
                return a;
            }, []);
            CHANGED = statements.length != orig;
            return statements;
        };

        function sequencesize(statements, compressor) {
            if (statements.length < 2) return statements;
            var seq = [], ret = [];
            function push_seq() {
                seq = AST_Seq.from_array(seq);
                if (seq) ret.push(make_node(AST_SimpleStatement, seq, {
                    body: seq
                }));
                seq = [];
            };
            statements.forEach(function(stat){
                if (stat instanceof AST_SimpleStatement) seq.push(stat.body);
                else push_seq(), ret.push(stat);
            });
            push_seq();
            ret = sequencesize_2(ret, compressor);
            CHANGED = ret.length != statements.length;
            return ret;
        };

        function sequencesize_2(statements, compressor) {
            function cons_seq(right) {
                ret.pop();
                var left = prev.body;
                if (left instanceof AST_Seq) {
                    left.add(right);
                } else {
                    left = AST_Seq.cons(left, right);
                }
                return left.transform(compressor);
            };
            var ret = [], prev = null;
            statements.forEach(function(stat){
                if (prev) {
                    if (stat instanceof AST_For) {
                        var opera = {};
                        try {
                            prev.body.walk(new TreeWalker(function(node){
                                if (node instanceof AST_Binary && node.operator == "in")
                                    throw opera;
                            }));
                            if (stat.init && !(stat.init instanceof AST_Definitions)) {
                                stat.init = cons_seq(stat.init);
                            }
                            else if (!stat.init) {
                                stat.init = prev.body;
                                ret.pop();
                            }
                        } catch(ex) {
                            if (ex !== opera) throw ex;
                        }
                    }
                    else if (stat instanceof AST_If) {
                        stat.condition = cons_seq(stat.condition);
                    }
                    else if (stat instanceof AST_With) {
                        stat.expression = cons_seq(stat.expression);
                    }
                    else if (stat instanceof AST_Exit && stat.value) {
                        stat.value = cons_seq(stat.value);
                    }
                    else if (stat instanceof AST_Exit) {
                        stat.value = cons_seq(make_node(AST_Undefined, stat));
                    }
                    else if (stat instanceof AST_Switch) {
                        stat.expression = cons_seq(stat.expression);
                    }
                }
                ret.push(stat);
                prev = stat instanceof AST_SimpleStatement ? stat : null;
            });
            return ret;
        };

        function join_consecutive_vars(statements, compressor) {
            var prev = null;
            return statements.reduce(function(a, stat){
                if (stat instanceof AST_Definitions && prev && prev.TYPE == stat.TYPE) {
                    prev.definitions = prev.definitions.concat(stat.definitions);
                    CHANGED = true;
                }
                else if (stat instanceof AST_For
                         && prev instanceof AST_Definitions
                         && (!stat.init || stat.init.TYPE == prev.TYPE)) {
                    CHANGED = true;
                    a.pop();
                    if (stat.init) {
                        stat.init.definitions = prev.definitions.concat(stat.init.definitions);
                    } else {
                        stat.init = prev;
                    }
                    a.push(stat);
                    prev = stat;
                }
                else {
                    prev = stat;
                    a.push(stat);
                }
                return a;
            }, []);
        };

        function negate_iifes(statements, compressor) {
            statements.forEach(function(stat){
                if (stat instanceof AST_SimpleStatement) {
                    stat.body = (function transform(thing) {
                        return thing.transform(new TreeTransformer(function(node){
                            if (node instanceof AST_Call && node.expression instanceof AST_Function) {
                                return make_node(AST_UnaryPrefix, node, {
                                    operator: "!",
                                    expression: node
                                });
                            }
                            else if (node instanceof AST_Call) {
                                node.expression = transform(node.expression);
                            }
                            else if (node instanceof AST_Seq) {
                                node.car = transform(node.car);
                            }
                            else if (node instanceof AST_Conditional) {
                                var expr = transform(node.condition);
                                if (expr !== node.condition) {
                                    // it has been negated, reverse
                                    node.condition = expr;
                                    var tmp = node.consequent;
                                    node.consequent = node.alternative;
                                    node.alternative = tmp;
                                }
                            }
                            return node;
                        }));
                    })(stat.body);
                }
            });
        };

    };

    function extract_declarations_from_unreachable_code(compressor, stat, target) {
        compressor.warn("Dropping unreachable code [{file}:{line},{col}]", stat.start);
        stat.walk(new TreeWalker(function(node){
            if (node instanceof AST_Definitions) {
                compressor.warn("Declarations in unreachable code! [{file}:{line},{col}]", node.start);
                node.remove_initializers();
                target.push(node);
                return true;
            }
            if (node instanceof AST_Defun) {
                target.push(node);
                return true;
            }
            if (node instanceof AST_Scope) {
                return true;
            }
        }));
    };

    /* -----[ boolean/negation helpers ]----- */

    // methods to determine whether an expression has a boolean result type
    (function (def){
        var unary_bool = [ "!", "delete" ];
        var binary_bool = [ "in", "instanceof", "==", "!=", "===", "!==", "<", "<=", ">=", ">" ];
        def(AST_Node, function(){ return false });
        def(AST_UnaryPrefix, function(){
            return member(this.operator, unary_bool);
        });
        def(AST_Binary, function(){
            return member(this.operator, binary_bool) ||
                ( (this.operator == "&&" || this.operator == "||") &&
                  this.left.is_boolean() && this.right.is_boolean() );
        });
        def(AST_Conditional, function(){
            return this.consequent.is_boolean() && this.alternative.is_boolean();
        });
        def(AST_Assign, function(){
            return this.operator == "=" && this.right.is_boolean();
        });
        def(AST_Seq, function(){
            return this.cdr.is_boolean();
        });
        def(AST_True, function(){ return true });
        def(AST_False, function(){ return true });
    })(function(node, func){
        node.DEFMETHOD("is_boolean", func);
    });

    // methods to determine if an expression has a string result type
    (function (def){
        def(AST_Node, function(){ return false });
        def(AST_String, function(){ return true });
        def(AST_UnaryPrefix, function(){
            return this.operator == "typeof";
        });
        def(AST_Binary, function(compressor){
            return this.operator == "+" &&
                (this.left.is_string(compressor) || this.right.is_string(compressor));
        });
        def(AST_Assign, function(compressor){
            return (this.operator == "=" || this.operator == "+=") && this.right.is_string(compressor);
        });
        def(AST_Seq, function(compressor){
            return this.cdr.is_string(compressor);
        });
        def(AST_Conditional, function(compressor){
            return this.consequent.is_string(compressor) && this.alternative.is_string(compressor);
        });
        def(AST_Call, function(compressor){
            return compressor.option("unsafe")
                && this.expression instanceof AST_SymbolRef
                && this.expression.name == "String"
                && this.expression.undeclared();
        });
    })(function(node, func){
        node.DEFMETHOD("is_string", func);
    });

    function best_of(ast1, ast2) {
        return ast1.print_to_string().length >
            ast2.print_to_string().length
            ? ast2 : ast1;
    };

    // methods to evaluate a constant expression
    (function (def){
        // The evaluate method returns an array with one or two
        // elements.  If the node has been successfully reduced to a
        // constant, then the second element tells us the value;
        // otherwise the second element is missing.  The first element
        // of the array is always an AST_Node descendant; if
        // evaluation was successful it's a node that represents the
        // constant; otherwise it's the original or a replacement node.
        AST_Node.DEFMETHOD("evaluate", function(compressor){
            if (!compressor.option("evaluate")) return [ this ];
            try {
                var val = this._eval(compressor);
                return [ best_of(make_node_from_constant(compressor, val, this), this), val ];
            } catch(ex) {
                if (ex !== def) throw ex;
                return [ this ];
            }
        });
        def(AST_Statement, function(){
            throw new Error(string_template("Cannot evaluate a statement [{file}:{line},{col}]", this.start));
        });
        def(AST_Function, function(){
            // XXX: AST_Function inherits from AST_Scope, which itself
            // inherits from AST_Statement; however, an AST_Function
            // isn't really a statement.  This could byte in other
            // places too. :-( Wish JS had multiple inheritance.
            throw def;
        });
        function ev(node, compressor) {
            if (!compressor) throw new Error("Compressor must be passed");

            return node._eval(compressor);
        };
        def(AST_Node, function(){
            throw def;          // not constant
        });
        def(AST_Constant, function(){
            return this.getValue();
        });
        def(AST_UnaryPrefix, function(compressor){
            var e = this.expression;
            switch (this.operator) {
              case "!": return !ev(e, compressor);
              case "typeof":
                // Function would be evaluated to an array and so typeof would
                // incorrectly return 'object'. Hence making is a special case.
                if (e instanceof AST_Function) return typeof function(){};

                e = ev(e, compressor);

                // typeof <RegExp> returns "object" or "function" on different platforms
                // so cannot evaluate reliably
                if (e instanceof RegExp) throw def;

                return typeof e;
              case "void": return void ev(e, compressor);
              case "~": return ~ev(e, compressor);
              case "-":
                e = ev(e, compressor);
                if (e === 0) throw def;
                return -e;
              case "+": return +ev(e, compressor);
            }
            throw def;
        });
        def(AST_Binary, function(c){
            var left = this.left, right = this.right;
            switch (this.operator) {
              case "&&"         : return ev(left, c) &&         ev(right, c);
              case "||"         : return ev(left, c) ||         ev(right, c);
              case "|"          : return ev(left, c) |          ev(right, c);
              case "&"          : return ev(left, c) &          ev(right, c);
              case "^"          : return ev(left, c) ^          ev(right, c);
              case "+"          : return ev(left, c) +          ev(right, c);
              case "*"          : return ev(left, c) *          ev(right, c);
              case "/"          : return ev(left, c) /          ev(right, c);
              case "%"          : return ev(left, c) %          ev(right, c);
              case "-"          : return ev(left, c) -          ev(right, c);
              case "<<"         : return ev(left, c) <<         ev(right, c);
              case ">>"         : return ev(left, c) >>         ev(right, c);
              case ">>>"        : return ev(left, c) >>>        ev(right, c);
              case "=="         : return ev(left, c) ==         ev(right, c);
              case "==="        : return ev(left, c) ===        ev(right, c);
              case "!="         : return ev(left, c) !=         ev(right, c);
              case "!=="        : return ev(left, c) !==        ev(right, c);
              case "<"          : return ev(left, c) <          ev(right, c);
              case "<="         : return ev(left, c) <=         ev(right, c);
              case ">"          : return ev(left, c) >          ev(right, c);
              case ">="         : return ev(left, c) >=         ev(right, c);
              case "in"         : return ev(left, c) in         ev(right, c);
              case "instanceof" : return ev(left, c) instanceof ev(right, c);
            }
            throw def;
        });
        def(AST_Conditional, function(compressor){
            return ev(this.condition, compressor)
                ? ev(this.consequent, compressor)
                : ev(this.alternative, compressor);
        });
        def(AST_SymbolRef, function(compressor){
            var d = this.definition();
            if (d && d.constant && d.init) return ev(d.init, compressor);
            throw def;
        });
    })(function(node, func){
        node.DEFMETHOD("_eval", func);
    });

    // method to negate an expression
    (function(def){
        function basic_negation(exp) {
            return make_node(AST_UnaryPrefix, exp, {
                operator: "!",
                expression: exp
            });
        };
        def(AST_Node, function(){
            return basic_negation(this);
        });
        def(AST_Statement, function(){
            throw new Error("Cannot negate a statement");
        });
        def(AST_Function, function(){
            return basic_negation(this);
        });
        def(AST_UnaryPrefix, function(){
            if (this.operator == "!")
                return this.expression;
            return basic_negation(this);
        });
        def(AST_Seq, function(compressor){
            var self = this.clone();
            self.cdr = self.cdr.negate(compressor);
            return self;
        });
        def(AST_Conditional, function(compressor){
            var self = this.clone();
            self.consequent = self.consequent.negate(compressor);
            self.alternative = self.alternative.negate(compressor);
            return best_of(basic_negation(this), self);
        });
        def(AST_Binary, function(compressor){
            var self = this.clone(), op = this.operator;
            if (compressor.option("unsafe_comps")) {
                switch (op) {
                  case "<=" : self.operator = ">"  ; return self;
                  case "<"  : self.operator = ">=" ; return self;
                  case ">=" : self.operator = "<"  ; return self;
                  case ">"  : self.operator = "<=" ; return self;
                }
            }
            switch (op) {
              case "==" : self.operator = "!="; return self;
              case "!=" : self.operator = "=="; return self;
              case "===": self.operator = "!=="; return self;
              case "!==": self.operator = "==="; return self;
              case "&&":
                self.operator = "||";
                self.left = self.left.negate(compressor);
                self.right = self.right.negate(compressor);
                return best_of(basic_negation(this), self);
              case "||":
                self.operator = "&&";
                self.left = self.left.negate(compressor);
                self.right = self.right.negate(compressor);
                return best_of(basic_negation(this), self);
            }
            return basic_negation(this);
        });
    })(function(node, func){
        node.DEFMETHOD("negate", function(compressor){
            return func.call(this, compressor);
        });
    });

    // determine if expression has side effects
    (function(def){
        def(AST_Node, function(compressor){ return true });

        def(AST_EmptyStatement, function(compressor){ return false });
        def(AST_Constant, function(compressor){ return false });
        def(AST_This, function(compressor){ return false });

        def(AST_Call, function(compressor){
            var pure = compressor.option("pure_funcs");
            if (!pure) return true;
            return pure.indexOf(this.expression.print_to_string()) < 0;
        });

        def(AST_Block, function(compressor){
            for (var i = this.body.length; --i >= 0;) {
                if (this.body[i].has_side_effects(compressor))
                    return true;
            }
            return false;
        });

        def(AST_SimpleStatement, function(compressor){
            return this.body.has_side_effects(compressor);
        });
        def(AST_Defun, function(compressor){ return true });
        def(AST_Function, function(compressor){ return false });
        def(AST_Binary, function(compressor){
            return this.left.has_side_effects(compressor)
                || this.right.has_side_effects(compressor);
        });
        def(AST_Assign, function(compressor){ return true });
        def(AST_Conditional, function(compressor){
            return this.condition.has_side_effects(compressor)
                || this.consequent.has_side_effects(compressor)
                || this.alternative.has_side_effects(compressor);
        });
        def(AST_Unary, function(compressor){
            return this.operator == "delete"
                || this.operator == "++"
                || this.operator == "--"
                || this.expression.has_side_effects(compressor);
        });
        def(AST_SymbolRef, function(compressor){ return false });
        def(AST_Object, function(compressor){
            for (var i = this.properties.length; --i >= 0;)
                if (this.properties[i].has_side_effects(compressor))
                    return true;
            return false;
        });
        def(AST_ObjectProperty, function(compressor){
            return this.value.has_side_effects(compressor);
        });
        def(AST_Array, function(compressor){
            for (var i = this.elements.length; --i >= 0;)
                if (this.elements[i].has_side_effects(compressor))
                    return true;
            return false;
        });
        def(AST_Dot, function(compressor){
            if (!compressor.option("pure_getters")) return true;
            return this.expression.has_side_effects(compressor);
        });
        def(AST_Sub, function(compressor){
            if (!compressor.option("pure_getters")) return true;
            return this.expression.has_side_effects(compressor)
                || this.property.has_side_effects(compressor);
        });
        def(AST_PropAccess, function(compressor){
            return !compressor.option("pure_getters");
        });
        def(AST_Seq, function(compressor){
            return this.car.has_side_effects(compressor)
                || this.cdr.has_side_effects(compressor);
        });
    })(function(node, func){
        node.DEFMETHOD("has_side_effects", func);
    });

    // tell me if a statement aborts
    function aborts(thing) {
        return thing && thing.aborts();
    };
    (function(def){
        def(AST_Statement, function(){ return null });
        def(AST_Jump, function(){ return this });
        function block_aborts(){
            var n = this.body.length;
            return n > 0 && aborts(this.body[n - 1]);
        };
        def(AST_BlockStatement, block_aborts);
        def(AST_SwitchBranch, block_aborts);
        def(AST_If, function(){
            return this.alternative && aborts(this.body) && aborts(this.alternative);
        });
    })(function(node, func){
        node.DEFMETHOD("aborts", func);
    });

    /* -----[ optimizers ]----- */

    OPT(AST_Directive, function(self, compressor){
        if (self.scope.has_directive(self.value) !== self.scope) {
            return make_node(AST_EmptyStatement, self);
        }
        return self;
    });

    OPT(AST_Debugger, function(self, compressor){
        if (compressor.option("drop_debugger"))
            return make_node(AST_EmptyStatement, self);
        return self;
    });

    OPT(AST_LabeledStatement, function(self, compressor){
        if (self.body instanceof AST_Break
            && compressor.loopcontrol_target(self.body.label) === self.body) {
            return make_node(AST_EmptyStatement, self);
        }
        return self.label.references.length == 0 ? self.body : self;
    });

    OPT(AST_Block, function(self, compressor){
        self.body = tighten_body(self.body, compressor);
        return self;
    });

    OPT(AST_BlockStatement, function(self, compressor){
        self.body = tighten_body(self.body, compressor);
        switch (self.body.length) {
          case 1: return self.body[0];
          case 0: return make_node(AST_EmptyStatement, self);
        }
        return self;
    });

    AST_Scope.DEFMETHOD("drop_unused", function(compressor){
        var self = this;
        if (compressor.option("unused")
            && !(self instanceof AST_Toplevel)
            && !self.uses_eval
           ) {
            var in_use = [];
            var initializations = new Dictionary();
            // pass 1: find out which symbols are directly used in
            // this scope (not in nested scopes).
            var scope = this;
            var tw = new TreeWalker(function(node, descend){
                if (node !== self) {
                    if (node instanceof AST_Defun) {
                        initializations.add(node.name.name, node);
                        return true; // don't go in nested scopes
                    }
                    if (node instanceof AST_Definitions && scope === self) {
                        node.definitions.forEach(function(def){
                            if (def.value) {
                                initializations.add(def.name.name, def.value);
                                if (def.value.has_side_effects(compressor)) {
                                    def.value.walk(tw);
                                }
                            }
                        });
                        return true;
                    }
                    if (node instanceof AST_SymbolRef) {
                        push_uniq(in_use, node.definition());
                        return true;
                    }
                    if (node instanceof AST_Scope) {
                        var save_scope = scope;
                        scope = node;
                        descend();
                        scope = save_scope;
                        return true;
                    }
                }
            });
            self.walk(tw);
            // pass 2: for every used symbol we need to walk its
            // initialization code to figure out if it uses other
            // symbols (that may not be in_use).
            for (var i = 0; i < in_use.length; ++i) {
                in_use[i].orig.forEach(function(decl){
                    // undeclared globals will be instanceof AST_SymbolRef
                    var init = initializations.get(decl.name);
                    if (init) init.forEach(function(init){
                        var tw = new TreeWalker(function(node){
                            if (node instanceof AST_SymbolRef) {
                                push_uniq(in_use, node.definition());
                            }
                        });
                        init.walk(tw);
                    });
                });
            }
            // pass 3: we should drop declarations not in_use
            var tt = new TreeTransformer(
                function before(node, descend, in_list) {
                    if (node instanceof AST_Lambda && !(node instanceof AST_Accessor)) {
                        if (!compressor.option("keep_fargs")) {
                            for (var a = node.argnames, i = a.length; --i >= 0;) {
                                var sym = a[i];
                                if (sym.unreferenced()) {
                                    a.pop();
                                    compressor.warn("Dropping unused function argument {name} [{file}:{line},{col}]", {
                                        name : sym.name,
                                        file : sym.start.file,
                                        line : sym.start.line,
                                        col  : sym.start.col
                                    });
                                }
                                else break;
                            }
                        }
                    }
                    if (node instanceof AST_Defun && node !== self) {
                        if (!member(node.name.definition(), in_use)) {
                            compressor.warn("Dropping unused function {name} [{file}:{line},{col}]", {
                                name : node.name.name,
                                file : node.name.start.file,
                                line : node.name.start.line,
                                col  : node.name.start.col
                            });
                            return make_node(AST_EmptyStatement, node);
                        }
                        return node;
                    }
                    if (node instanceof AST_Definitions && !(tt.parent() instanceof AST_ForIn)) {
                        var def = node.definitions.filter(function(def){
                            if (member(def.name.definition(), in_use)) return true;
                            var w = {
                                name : def.name.name,
                                file : def.name.start.file,
                                line : def.name.start.line,
                                col  : def.name.start.col
                            };
                            if (def.value && def.value.has_side_effects(compressor)) {
                                def._unused_side_effects = true;
                                compressor.warn("Side effects in initialization of unused variable {name} [{file}:{line},{col}]", w);
                                return true;
                            }
                            compressor.warn("Dropping unused variable {name} [{file}:{line},{col}]", w);
                            return false;
                        });
                        // place uninitialized names at the start
                        def = mergeSort(def, function(a, b){
                            if (!a.value && b.value) return -1;
                            if (!b.value && a.value) return 1;
                            return 0;
                        });
                        // for unused names whose initialization has
                        // side effects, we can cascade the init. code
                        // into the next one, or next statement.
                        var side_effects = [];
                        for (var i = 0; i < def.length;) {
                            var x = def[i];
                            if (x._unused_side_effects) {
                                side_effects.push(x.value);
                                def.splice(i, 1);
                            } else {
                                if (side_effects.length > 0) {
                                    side_effects.push(x.value);
                                    x.value = AST_Seq.from_array(side_effects);
                                    side_effects = [];
                                }
                                ++i;
                            }
                        }
                        if (side_effects.length > 0) {
                            side_effects = make_node(AST_BlockStatement, node, {
                                body: [ make_node(AST_SimpleStatement, node, {
                                    body: AST_Seq.from_array(side_effects)
                                }) ]
                            });
                        } else {
                            side_effects = null;
                        }
                        if (def.length == 0 && !side_effects) {
                            return make_node(AST_EmptyStatement, node);
                        }
                        if (def.length == 0) {
                            return side_effects;
                        }
                        node.definitions = def;
                        if (side_effects) {
                            side_effects.body.unshift(node);
                            node = side_effects;
                        }
                        return node;
                    }
                    if (node instanceof AST_For) {
                        descend(node, this);

                        if (node.init instanceof AST_BlockStatement) {
                            // certain combination of unused name + side effect leads to:
                            //    https://github.com/mishoo/UglifyJS2/issues/44
                            // that's an invalid AST.
                            // We fix it at this stage by moving the `var` outside the `for`.

                            var body = node.init.body.slice(0, -1);
                            node.init = node.init.body.slice(-1)[0].body;
                            body.push(node);

                            return in_list ? MAP.splice(body) : make_node(AST_BlockStatement, node, {
                                body: body
                            });
                        }
                    }
                    if (node instanceof AST_Scope && node !== self)
                        return node;
                }
            );
            self.transform(tt);
        }
    });

    AST_Scope.DEFMETHOD("hoist_declarations", function(compressor){
        var hoist_funs = compressor.option("hoist_funs");
        var hoist_vars = compressor.option("hoist_vars");
        var self = this;
        if (hoist_funs || hoist_vars) {
            var dirs = [];
            var hoisted = [];
            var vars = new Dictionary(), vars_found = 0, var_decl = 0;
            // let's count var_decl first, we seem to waste a lot of
            // space if we hoist `var` when there's only one.
            self.walk(new TreeWalker(function(node){
                if (node instanceof AST_Scope && node !== self)
                    return true;
                if (node instanceof AST_Var) {
                    ++var_decl;
                    return true;
                }
            }));
            hoist_vars = hoist_vars && var_decl > 1;
            var tt = new TreeTransformer(
                function before(node) {
                    if (node !== self) {
                        if (node instanceof AST_Directive) {
                            dirs.push(node);
                            return make_node(AST_EmptyStatement, node);
                        }
                        if (node instanceof AST_Defun && hoist_funs) {
                            hoisted.push(node);
                            return make_node(AST_EmptyStatement, node);
                        }
                        if (node instanceof AST_Var && hoist_vars) {
                            node.definitions.forEach(function(def){
                                vars.set(def.name.name, def);
                                ++vars_found;
                            });
                            var seq = node.to_assignments();
                            var p = tt.parent();
                            if (p instanceof AST_ForIn && p.init === node) {
                                if (seq == null) return node.definitions[0].name;
                                return seq;
                            }
                            if (p instanceof AST_For && p.init === node) {
                                return seq;
                            }
                            if (!seq) return make_node(AST_EmptyStatement, node);
                            return make_node(AST_SimpleStatement, node, {
                                body: seq
                            });
                        }
                        if (node instanceof AST_Scope)
                            return node; // to avoid descending in nested scopes
                    }
                }
            );
            self = self.transform(tt);
            if (vars_found > 0) {
                // collect only vars which don't show up in self's arguments list
                var defs = [];
                vars.each(function(def, name){
                    if (self instanceof AST_Lambda
                        && find_if(function(x){ return x.name == def.name.name },
                                   self.argnames)) {
                        vars.del(name);
                    } else {
                        def = def.clone();
                        def.value = null;
                        defs.push(def);
                        vars.set(name, def);
                    }
                });
                if (defs.length > 0) {
                    // try to merge in assignments
                    for (var i = 0; i < self.body.length;) {
                        if (self.body[i] instanceof AST_SimpleStatement) {
                            var expr = self.body[i].body, sym, assign;
                            if (expr instanceof AST_Assign
                                && expr.operator == "="
                                && (sym = expr.left) instanceof AST_Symbol
                                && vars.has(sym.name))
                            {
                                var def = vars.get(sym.name);
                                if (def.value) break;
                                def.value = expr.right;
                                remove(defs, def);
                                defs.push(def);
                                self.body.splice(i, 1);
                                continue;
                            }
                            if (expr instanceof AST_Seq
                                && (assign = expr.car) instanceof AST_Assign
                                && assign.operator == "="
                                && (sym = assign.left) instanceof AST_Symbol
                                && vars.has(sym.name))
                            {
                                var def = vars.get(sym.name);
                                if (def.value) break;
                                def.value = assign.right;
                                remove(defs, def);
                                defs.push(def);
                                self.body[i].body = expr.cdr;
                                continue;
                            }
                        }
                        if (self.body[i] instanceof AST_EmptyStatement) {
                            self.body.splice(i, 1);
                            continue;
                        }
                        if (self.body[i] instanceof AST_BlockStatement) {
                            var tmp = [ i, 1 ].concat(self.body[i].body);
                            self.body.splice.apply(self.body, tmp);
                            continue;
                        }
                        break;
                    }
                    defs = make_node(AST_Var, self, {
                        definitions: defs
                    });
                    hoisted.push(defs);
                };
            }
            self.body = dirs.concat(hoisted, self.body);
        }
        return self;
    });

    OPT(AST_SimpleStatement, function(self, compressor){
        if (compressor.option("side_effects")) {
            if (!self.body.has_side_effects(compressor)) {
                compressor.warn("Dropping side-effect-free statement [{file}:{line},{col}]", self.start);
                return make_node(AST_EmptyStatement, self);
            }
        }
        return self;
    });

    OPT(AST_DWLoop, function(self, compressor){
        var cond = self.condition.evaluate(compressor);
        self.condition = cond[0];
        if (!compressor.option("loops")) return self;
        if (cond.length > 1) {
            if (cond[1]) {
                return make_node(AST_For, self, {
                    body: self.body
                });
            } else if (self instanceof AST_While) {
                if (compressor.option("dead_code")) {
                    var a = [];
                    extract_declarations_from_unreachable_code(compressor, self.body, a);
                    return make_node(AST_BlockStatement, self, { body: a });
                }
            }
        }
        return self;
    });

    function if_break_in_loop(self, compressor) {
        function drop_it(rest) {
            rest = as_statement_array(rest);
            if (self.body instanceof AST_BlockStatement) {
                self.body = self.body.clone();
                self.body.body = rest.concat(self.body.body.slice(1));
                self.body = self.body.transform(compressor);
            } else {
                self.body = make_node(AST_BlockStatement, self.body, {
                    body: rest
                }).transform(compressor);
            }
            if_break_in_loop(self, compressor);
        }
        var first = self.body instanceof AST_BlockStatement ? self.body.body[0] : self.body;
        if (first instanceof AST_If) {
            if (first.body instanceof AST_Break
                && compressor.loopcontrol_target(first.body.label) === self) {
                if (self.condition) {
                    self.condition = make_node(AST_Binary, self.condition, {
                        left: self.condition,
                        operator: "&&",
                        right: first.condition.negate(compressor),
                    });
                } else {
                    self.condition = first.condition.negate(compressor);
                }
                drop_it(first.alternative);
            }
            else if (first.alternative instanceof AST_Break
                     && compressor.loopcontrol_target(first.alternative.label) === self) {
                if (self.condition) {
                    self.condition = make_node(AST_Binary, self.condition, {
                        left: self.condition,
                        operator: "&&",
                        right: first.condition,
                    });
                } else {
                    self.condition = first.condition;
                }
                drop_it(first.body);
            }
        }
    };

    OPT(AST_While, function(self, compressor) {
        if (!compressor.option("loops")) return self;
        self = AST_DWLoop.prototype.optimize.call(self, compressor);
        if (self instanceof AST_While) {
            if_break_in_loop(self, compressor);
            self = make_node(AST_For, self, self).transform(compressor);
        }
        return self;
    });

    OPT(AST_For, function(self, compressor){
        var cond = self.condition;
        if (cond) {
            cond = cond.evaluate(compressor);
            self.condition = cond[0];
        }
        if (!compressor.option("loops")) return self;
        if (cond) {
            if (cond.length > 1 && !cond[1]) {
                if (compressor.option("dead_code")) {
                    var a = [];
                    if (self.init instanceof AST_Statement) {
                        a.push(self.init);
                    }
                    else if (self.init) {
                        a.push(make_node(AST_SimpleStatement, self.init, {
                            body: self.init
                        }));
                    }
                    extract_declarations_from_unreachable_code(compressor, self.body, a);
                    return make_node(AST_BlockStatement, self, { body: a });
                }
            }
        }
        if_break_in_loop(self, compressor);
        return self;
    });

    OPT(AST_If, function(self, compressor){
        if (!compressor.option("conditionals")) return self;
        // if condition can be statically determined, warn and drop
        // one of the blocks.  note, statically determined implies
        // “has no side effects”; also it doesn't work for cases like
        // `x && true`, though it probably should.
        var cond = self.condition.evaluate(compressor);
        self.condition = cond[0];
        if (cond.length > 1) {
            if (cond[1]) {
                compressor.warn("Condition always true [{file}:{line},{col}]", self.condition.start);
                if (compressor.option("dead_code")) {
                    var a = [];
                    if (self.alternative) {
                        extract_declarations_from_unreachable_code(compressor, self.alternative, a);
                    }
                    a.push(self.body);
                    return make_node(AST_BlockStatement, self, { body: a }).transform(compressor);
                }
            } else {
                compressor.warn("Condition always false [{file}:{line},{col}]", self.condition.start);
                if (compressor.option("dead_code")) {
                    var a = [];
                    extract_declarations_from_unreachable_code(compressor, self.body, a);
                    if (self.alternative) a.push(self.alternative);
                    return make_node(AST_BlockStatement, self, { body: a }).transform(compressor);
                }
            }
        }
        if (is_empty(self.alternative)) self.alternative = null;
        var negated = self.condition.negate(compressor);
        var negated_is_best = best_of(self.condition, negated) === negated;
        if (self.alternative && negated_is_best) {
            negated_is_best = false; // because we already do the switch here.
            self.condition = negated;
            var tmp = self.body;
            self.body = self.alternative || make_node(AST_EmptyStatement);
            self.alternative = tmp;
        }
        if (is_empty(self.body) && is_empty(self.alternative)) {
            return make_node(AST_SimpleStatement, self.condition, {
                body: self.condition
            }).transform(compressor);
        }
        if (self.body instanceof AST_SimpleStatement
            && self.alternative instanceof AST_SimpleStatement) {
            return make_node(AST_SimpleStatement, self, {
                body: make_node(AST_Conditional, self, {
                    condition   : self.condition,
                    consequent  : self.body.body,
                    alternative : self.alternative.body
                })
            }).transform(compressor);
        }
        if (is_empty(self.alternative) && self.body instanceof AST_SimpleStatement) {
            if (negated_is_best) return make_node(AST_SimpleStatement, self, {
                body: make_node(AST_Binary, self, {
                    operator : "||",
                    left     : negated,
                    right    : self.body.body
                })
            }).transform(compressor);
            return make_node(AST_SimpleStatement, self, {
                body: make_node(AST_Binary, self, {
                    operator : "&&",
                    left     : self.condition,
                    right    : self.body.body
                })
            }).transform(compressor);
        }
        if (self.body instanceof AST_EmptyStatement
            && self.alternative
            && self.alternative instanceof AST_SimpleStatement) {
            return make_node(AST_SimpleStatement, self, {
                body: make_node(AST_Binary, self, {
                    operator : "||",
                    left     : self.condition,
                    right    : self.alternative.body
                })
            }).transform(compressor);
        }
        if (self.body instanceof AST_Exit
            && self.alternative instanceof AST_Exit
            && self.body.TYPE == self.alternative.TYPE) {
            return make_node(self.body.CTOR, self, {
                value: make_node(AST_Conditional, self, {
                    condition   : self.condition,
                    consequent  : self.body.value || make_node(AST_Undefined, self.body).optimize(compressor),
                    alternative : self.alternative.value || make_node(AST_Undefined, self.alternative).optimize(compressor)
                })
            }).transform(compressor);
        }
        if (self.body instanceof AST_If
            && !self.body.alternative
            && !self.alternative) {
            self.condition = make_node(AST_Binary, self.condition, {
                operator: "&&",
                left: self.condition,
                right: self.body.condition
            }).transform(compressor);
            self.body = self.body.body;
        }
        if (aborts(self.body)) {
            if (self.alternative) {
                var alt = self.alternative;
                self.alternative = null;
                return make_node(AST_BlockStatement, self, {
                    body: [ self, alt ]
                }).transform(compressor);
            }
        }
        if (aborts(self.alternative)) {
            var body = self.body;
            self.body = self.alternative;
            self.condition = negated_is_best ? negated : self.condition.negate(compressor);
            self.alternative = null;
            return make_node(AST_BlockStatement, self, {
                body: [ self, body ]
            }).transform(compressor);
        }
        return self;
    });

    OPT(AST_Switch, function(self, compressor){
        if (self.body.length == 0 && compressor.option("conditionals")) {
            return make_node(AST_SimpleStatement, self, {
                body: self.expression
            }).transform(compressor);
        }
        for(;;) {
            var last_branch = self.body[self.body.length - 1];
            if (last_branch) {
                var stat = last_branch.body[last_branch.body.length - 1]; // last statement
                if (stat instanceof AST_Break && loop_body(compressor.loopcontrol_target(stat.label)) === self)
                    last_branch.body.pop();
                if (last_branch instanceof AST_Default && last_branch.body.length == 0) {
                    self.body.pop();
                    continue;
                }
            }
            break;
        }
        var exp = self.expression.evaluate(compressor);
        out: if (exp.length == 2) try {
            // constant expression
            self.expression = exp[0];
            if (!compressor.option("dead_code")) break out;
            var value = exp[1];
            var in_if = false;
            var in_block = false;
            var started = false;
            var stopped = false;
            var ruined = false;
            var tt = new TreeTransformer(function(node, descend, in_list){
                if (node instanceof AST_Lambda || node instanceof AST_SimpleStatement) {
                    // no need to descend these node types
                    return node;
                }
                else if (node instanceof AST_Switch && node === self) {
                    node = node.clone();
                    descend(node, this);
                    return ruined ? node : make_node(AST_BlockStatement, node, {
                        body: node.body.reduce(function(a, branch){
                            return a.concat(branch.body);
                        }, [])
                    }).transform(compressor);
                }
                else if (node instanceof AST_If || node instanceof AST_Try) {
                    var save = in_if;
                    in_if = !in_block;
                    descend(node, this);
                    in_if = save;
                    return node;
                }
                else if (node instanceof AST_StatementWithBody || node instanceof AST_Switch) {
                    var save = in_block;
                    in_block = true;
                    descend(node, this);
                    in_block = save;
                    return node;
                }
                else if (node instanceof AST_Break && this.loopcontrol_target(node.label) === self) {
                    if (in_if) {
                        ruined = true;
                        return node;
                    }
                    if (in_block) return node;
                    stopped = true;
                    return in_list ? MAP.skip : make_node(AST_EmptyStatement, node);
                }
                else if (node instanceof AST_SwitchBranch && this.parent() === self) {
                    if (stopped) return MAP.skip;
                    if (node instanceof AST_Case) {
                        var exp = node.expression.evaluate(compressor);
                        if (exp.length < 2) {
                            // got a case with non-constant expression, baling out
                            throw self;
                        }
                        if (exp[1] === value || started) {
                            started = true;
                            if (aborts(node)) stopped = true;
                            descend(node, this);
                            return node;
                        }
                        return MAP.skip;
                    }
                    descend(node, this);
                    return node;
                }
            });
            tt.stack = compressor.stack.slice(); // so that's able to see parent nodes
            self = self.transform(tt);
        } catch(ex) {
            if (ex !== self) throw ex;
        }
        return self;
    });

    OPT(AST_Case, function(self, compressor){
        self.body = tighten_body(self.body, compressor);
        return self;
    });

    OPT(AST_Try, function(self, compressor){
        self.body = tighten_body(self.body, compressor);
        return self;
    });

    AST_Definitions.DEFMETHOD("remove_initializers", function(){
        this.definitions.forEach(function(def){ def.value = null });
    });

    AST_Definitions.DEFMETHOD("to_assignments", function(){
        var assignments = this.definitions.reduce(function(a, def){
            if (def.value) {
                var name = make_node(AST_SymbolRef, def.name, def.name);
                a.push(make_node(AST_Assign, def, {
                    operator : "=",
                    left     : name,
                    right    : def.value
                }));
            }
            return a;
        }, []);
        if (assignments.length == 0) return null;
        return AST_Seq.from_array(assignments);
    });

    OPT(AST_Definitions, function(self, compressor){
        if (self.definitions.length == 0)
            return make_node(AST_EmptyStatement, self);
        return self;
    });

    OPT(AST_Function, function(self, compressor){
        self = AST_Lambda.prototype.optimize.call(self, compressor);
        if (compressor.option("unused")) {
            if (self.name && self.name.unreferenced()) {
                self.name = null;
            }
        }
        return self;
    });

    OPT(AST_Call, function(self, compressor){
        if (compressor.option("unsafe")) {
            var exp = self.expression;
            if (exp instanceof AST_SymbolRef && exp.undeclared()) {
                switch (exp.name) {
                  case "Array":
                    if (self.args.length != 1) {
                        return make_node(AST_Array, self, {
                            elements: self.args
                        }).transform(compressor);
                    }
                    break;
                  case "Object":
                    if (self.args.length == 0) {
                        return make_node(AST_Object, self, {
                            properties: []
                        });
                    }
                    break;
                  case "String":
                    if (self.args.length == 0) return make_node(AST_String, self, {
                        value: ""
                    });
                    if (self.args.length <= 1) return make_node(AST_Binary, self, {
                        left: self.args[0],
                        operator: "+",
                        right: make_node(AST_String, self, { value: "" })
                    }).transform(compressor);
                    break;
                  case "Number":
                    if (self.args.length == 0) return make_node(AST_Number, self, {
                        value: 0
                    });
                    if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
                        expression: self.args[0],
                        operator: "+"
                    }).transform(compressor);
                  case "Boolean":
                    if (self.args.length == 0) return make_node(AST_False, self);
                    if (self.args.length == 1) return make_node(AST_UnaryPrefix, self, {
                        expression: make_node(AST_UnaryPrefix, null, {
                            expression: self.args[0],
                            operator: "!"
                        }),
                        operator: "!"
                    }).transform(compressor);
                    break;
                  case "Function":
                    if (all(self.args, function(x){ return x instanceof AST_String })) {
                        // quite a corner-case, but we can handle it:
                        //   https://github.com/mishoo/UglifyJS2/issues/203
                        // if the code argument is a constant, then we can minify it.
                        try {
                            var code = "(function(" + self.args.slice(0, -1).map(function(arg){
                                return arg.value;
                            }).join(",") + "){" + self.args[self.args.length - 1].value + "})()";
                            var ast = parse(code);
                            ast.figure_out_scope({ screw_ie8: compressor.option("screw_ie8") });
                            var comp = new Compressor(compressor.options);
                            ast = ast.transform(comp);
                            ast.figure_out_scope({ screw_ie8: compressor.option("screw_ie8") });
                            ast.mangle_names();
                            var fun;
                            try {
                                ast.walk(new TreeWalker(function(node){
                                    if (node instanceof AST_Lambda) {
                                        fun = node;
                                        throw ast;
                                    }
                                }));
                            } catch(ex) {
                                if (ex !== ast) throw ex;
                            };
                            var args = fun.argnames.map(function(arg, i){
                                return make_node(AST_String, self.args[i], {
                                    value: arg.print_to_string()
                                });
                            });
                            var code = OutputStream();
                            AST_BlockStatement.prototype._codegen.call(fun, fun, code);
                            code = code.toString().replace(/^\{|\}$/g, "");
                            args.push(make_node(AST_String, self.args[self.args.length - 1], {
                                value: code
                            }));
                            self.args = args;
                            return self;
                        } catch(ex) {
                            if (ex instanceof JS_Parse_Error) {
                                compressor.warn("Error parsing code passed to new Function [{file}:{line},{col}]", self.args[self.args.length - 1].start);
                                compressor.warn(ex.toString());
                            } else {
                                console.log(ex);
                                throw ex;
                            }
                        }
                    }
                    break;
                }
            }
            else if (exp instanceof AST_Dot && exp.property == "toString" && self.args.length == 0) {
                return make_node(AST_Binary, self, {
                    left: make_node(AST_String, self, { value: "" }),
                    operator: "+",
                    right: exp.expression
                }).transform(compressor);
            }
            else if (exp instanceof AST_Dot && exp.expression instanceof AST_Array && exp.property == "join") EXIT: {
                var separator = self.args.length == 0 ? "," : self.args[0].evaluate(compressor)[1];
                if (separator == null) break EXIT; // not a constant
                var elements = exp.expression.elements.reduce(function(a, el){
                    el = el.evaluate(compressor);
                    if (a.length == 0 || el.length == 1) {
                        a.push(el);
                    } else {
                        var last = a[a.length - 1];
                        if (last.length == 2) {
                            // it's a constant
                            var val = "" + last[1] + separator + el[1];
                            a[a.length - 1] = [ make_node_from_constant(compressor, val, last[0]), val ];
                        } else {
                            a.push(el);
                        }
                    }
                    return a;
                }, []);
                if (elements.length == 0) return make_node(AST_String, self, { value: "" });
                if (elements.length == 1) return elements[0][0];
                if (separator == "") {
                    var first;
                    if (elements[0][0] instanceof AST_String
                        || elements[1][0] instanceof AST_String) {
                        first = elements.shift()[0];
                    } else {
                        first = make_node(AST_String, self, { value: "" });
                    }
                    return elements.reduce(function(prev, el){
                        return make_node(AST_Binary, el[0], {
                            operator : "+",
                            left     : prev,
                            right    : el[0],
                        });
                    }, first).transform(compressor);
                }
                // need this awkward cloning to not affect original element
                // best_of will decide which one to get through.
                var node = self.clone();
                node.expression = node.expression.clone();
                node.expression.expression = node.expression.expression.clone();
                node.expression.expression.elements = elements.map(function(el){
                    return el[0];
                });
                return best_of(self, node);
            }
        }
        if (compressor.option("side_effects")) {
            if (self.expression instanceof AST_Function
                && self.args.length == 0
                && !AST_Block.prototype.has_side_effects.call(self.expression, compressor)) {
                return make_node(AST_Undefined, self).transform(compressor);
            }
        }
        if (compressor.option("drop_console")) {
            if (self.expression instanceof AST_PropAccess &&
                self.expression.expression instanceof AST_SymbolRef &&
                self.expression.expression.name == "console" &&
                self.expression.expression.undeclared()) {
                return make_node(AST_Undefined, self).transform(compressor);
            }
        }
        return self.evaluate(compressor)[0];
    });

    OPT(AST_New, function(self, compressor){
        if (compressor.option("unsafe")) {
            var exp = self.expression;
            if (exp instanceof AST_SymbolRef && exp.undeclared()) {
                switch (exp.name) {
                  case "Object":
                  case "RegExp":
                  case "Function":
                  case "Error":
                  case "Array":
                    return make_node(AST_Call, self, self).transform(compressor);
                }
            }
        }
        return self;
    });

    OPT(AST_Seq, function(self, compressor){
        if (!compressor.option("side_effects"))
            return self;
        if (!self.car.has_side_effects(compressor)) {
            // we shouldn't compress (1,eval)(something) to
            // eval(something) because that changes the meaning of
            // eval (becomes lexical instead of global).
            var p;
            if (!(self.cdr instanceof AST_SymbolRef
                  && self.cdr.name == "eval"
                  && self.cdr.undeclared()
                  && (p = compressor.parent()) instanceof AST_Call
                  && p.expression === self)) {
                return self.cdr;
            }
        }
        if (compressor.option("cascade")) {
            if (self.car instanceof AST_Assign
                && !self.car.left.has_side_effects(compressor)) {
                if (self.car.left.equivalent_to(self.cdr)) {
                    return self.car;
                }
                if (self.cdr instanceof AST_Call
                    && self.cdr.expression.equivalent_to(self.car.left)) {
                    self.cdr.expression = self.car;
                    return self.cdr;
                }
            }
            if (!self.car.has_side_effects(compressor)
                && !self.cdr.has_side_effects(compressor)
                && self.car.equivalent_to(self.cdr)) {
                return self.car;
            }
        }
        if (self.cdr instanceof AST_UnaryPrefix
            && self.cdr.operator == "void"
            && !self.cdr.expression.has_side_effects(compressor)) {
            self.cdr.operator = self.car;
            return self.cdr;
        }
        if (self.cdr instanceof AST_Undefined) {
            return make_node(AST_UnaryPrefix, self, {
                operator   : "void",
                expression : self.car
            });
        }
        return self;
    });

    AST_Unary.DEFMETHOD("lift_sequences", function(compressor){
        if (compressor.option("sequences")) {
            if (this.expression instanceof AST_Seq) {
                var seq = this.expression;
                var x = seq.to_array();
                this.expression = x.pop();
                x.push(this);
                seq = AST_Seq.from_array(x).transform(compressor);
                return seq;
            }
        }
        return this;
    });

    OPT(AST_UnaryPostfix, function(self, compressor){
        return self.lift_sequences(compressor);
    });

    OPT(AST_UnaryPrefix, function(self, compressor){
        self = self.lift_sequences(compressor);
        var e = self.expression;
        if (compressor.option("booleans") && compressor.in_boolean_context()) {
            switch (self.operator) {
              case "!":
                if (e instanceof AST_UnaryPrefix && e.operator == "!") {
                    // !!foo ==> foo, if we're in boolean context
                    return e.expression;
                }
                break;
              case "typeof":
                // typeof always returns a non-empty string, thus it's
                // always true in booleans
                compressor.warn("Boolean expression always true [{file}:{line},{col}]", self.start);
                return make_node(AST_True, self);
            }
            if (e instanceof AST_Binary && self.operator == "!") {
                self = best_of(self, e.negate(compressor));
            }
        }
        return self.evaluate(compressor)[0];
    });

    function has_side_effects_or_prop_access(node, compressor) {
        var save_pure_getters = compressor.option("pure_getters");
        compressor.options.pure_getters = false;
        var ret = node.has_side_effects(compressor);
        compressor.options.pure_getters = save_pure_getters;
        return ret;
    }

    AST_Binary.DEFMETHOD("lift_sequences", function(compressor){
        if (compressor.option("sequences")) {
            if (this.left instanceof AST_Seq) {
                var seq = this.left;
                var x = seq.to_array();
                this.left = x.pop();
                x.push(this);
                seq = AST_Seq.from_array(x).transform(compressor);
                return seq;
            }
            if (this.right instanceof AST_Seq
                && this instanceof AST_Assign
                && !has_side_effects_or_prop_access(this.left, compressor)) {
                var seq = this.right;
                var x = seq.to_array();
                this.right = x.pop();
                x.push(this);
                seq = AST_Seq.from_array(x).transform(compressor);
                return seq;
            }
        }
        return this;
    });

    var commutativeOperators = makePredicate("== === != !== * & | ^");

    OPT(AST_Binary, function(self, compressor){
        var reverse = compressor.has_directive("use asm") ? noop
            : function(op, force) {
                if (force || !(self.left.has_side_effects(compressor) || self.right.has_side_effects(compressor))) {
                    if (op) self.operator = op;
                    var tmp = self.left;
                    self.left = self.right;
                    self.right = tmp;
                }
            };
        if (commutativeOperators(self.operator)) {
            if (self.right instanceof AST_Constant
                && !(self.left instanceof AST_Constant)) {
                // if right is a constant, whatever side effects the
                // left side might have could not influence the
                // result.  hence, force switch.

                if (!(self.left instanceof AST_Binary
                      && PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator])) {
                    reverse(null, true);
                }
            }
            if (/^[!=]==?$/.test(self.operator)) {
                if (self.left instanceof AST_SymbolRef && self.right instanceof AST_Conditional) {
                    if (self.right.consequent instanceof AST_SymbolRef
                        && self.right.consequent.definition() === self.left.definition()) {
                        if (/^==/.test(self.operator)) return self.right.condition;
                        if (/^!=/.test(self.operator)) return self.right.condition.negate(compressor);
                    }
                    if (self.right.alternative instanceof AST_SymbolRef
                        && self.right.alternative.definition() === self.left.definition()) {
                        if (/^==/.test(self.operator)) return self.right.condition.negate(compressor);
                        if (/^!=/.test(self.operator)) return self.right.condition;
                    }
                }
                if (self.right instanceof AST_SymbolRef && self.left instanceof AST_Conditional) {
                    if (self.left.consequent instanceof AST_SymbolRef
                        && self.left.consequent.definition() === self.right.definition()) {
                        if (/^==/.test(self.operator)) return self.left.condition;
                        if (/^!=/.test(self.operator)) return self.left.condition.negate(compressor);
                    }
                    if (self.left.alternative instanceof AST_SymbolRef
                        && self.left.alternative.definition() === self.right.definition()) {
                        if (/^==/.test(self.operator)) return self.left.condition.negate(compressor);
                        if (/^!=/.test(self.operator)) return self.left.condition;
                    }
                }
            }
        }
        self = self.lift_sequences(compressor);
        if (compressor.option("comparisons")) switch (self.operator) {
          case "===":
          case "!==":
            if ((self.left.is_string(compressor) && self.right.is_string(compressor)) ||
                (self.left.is_boolean() && self.right.is_boolean())) {
                self.operator = self.operator.substr(0, 2);
            }
            // XXX: intentionally falling down to the next case
          case "==":
          case "!=":
            if (self.left instanceof AST_String
                && self.left.value == "undefined"
                && self.right instanceof AST_UnaryPrefix
                && self.right.operator == "typeof"
                && compressor.option("unsafe")) {
                if (!(self.right.expression instanceof AST_SymbolRef)
                    || !self.right.expression.undeclared()) {
                    self.right = self.right.expression;
                    self.left = make_node(AST_Undefined, self.left).optimize(compressor);
                    if (self.operator.length == 2) self.operator += "=";
                }
            }
            break;
        }
        if (compressor.option("booleans") && compressor.in_boolean_context()) switch (self.operator) {
          case "&&":
            var ll = self.left.evaluate(compressor);
            var rr = self.right.evaluate(compressor);
            if ((ll.length > 1 && !ll[1]) || (rr.length > 1 && !rr[1])) {
                compressor.warn("Boolean && always false [{file}:{line},{col}]", self.start);
                return make_node(AST_False, self);
            }
            if (ll.length > 1 && ll[1]) {
                return rr[0];
            }
            if (rr.length > 1 && rr[1]) {
                return ll[0];
            }
            break;
          case "||":
            var ll = self.left.evaluate(compressor);
            var rr = self.right.evaluate(compressor);
            if ((ll.length > 1 && ll[1]) || (rr.length > 1 && rr[1])) {
                compressor.warn("Boolean || always true [{file}:{line},{col}]", self.start);
                return make_node(AST_True, self);
            }
            if (ll.length > 1 && !ll[1]) {
                return rr[0];
            }
            if (rr.length > 1 && !rr[1]) {
                return ll[0];
            }
            break;
          case "+":
            var ll = self.left.evaluate(compressor);
            var rr = self.right.evaluate(compressor);
            if ((ll.length > 1 && ll[0] instanceof AST_String && ll[1]) ||
                (rr.length > 1 && rr[0] instanceof AST_String && rr[1])) {
                compressor.warn("+ in boolean context always true [{file}:{line},{col}]", self.start);
                return make_node(AST_True, self);
            }
            break;
        }
        if (compressor.option("comparisons")) {
            if (!(compressor.parent() instanceof AST_Binary)
                || compressor.parent() instanceof AST_Assign) {
                var negated = make_node(AST_UnaryPrefix, self, {
                    operator: "!",
                    expression: self.negate(compressor)
                });
                self = best_of(self, negated);
            }
            switch (self.operator) {
              case "<": reverse(">"); break;
              case "<=": reverse(">="); break;
            }
        }
        if (self.operator == "+" && self.right instanceof AST_String
            && self.right.getValue() === "" && self.left instanceof AST_Binary
            && self.left.operator == "+" && self.left.is_string(compressor)) {
            return self.left;
        }
        if (compressor.option("evaluate")) {
            if (self.operator == "+") {
                if (self.left instanceof AST_Constant
                    && self.right instanceof AST_Binary
                    && self.right.operator == "+"
                    && self.right.left instanceof AST_Constant
                    && self.right.is_string(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "+",
                        left: make_node(AST_String, null, {
                            value: "" + self.left.getValue() + self.right.left.getValue(),
                            start: self.left.start,
                            end: self.right.left.end
                        }),
                        right: self.right.right
                    });
                }
                if (self.right instanceof AST_Constant
                    && self.left instanceof AST_Binary
                    && self.left.operator == "+"
                    && self.left.right instanceof AST_Constant
                    && self.left.is_string(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "+",
                        left: self.left.left,
                        right: make_node(AST_String, null, {
                            value: "" + self.left.right.getValue() + self.right.getValue(),
                            start: self.left.right.start,
                            end: self.right.end
                        })
                    });
                }
                if (self.left instanceof AST_Binary
                    && self.left.operator == "+"
                    && self.left.is_string(compressor)
                    && self.left.right instanceof AST_Constant
                    && self.right instanceof AST_Binary
                    && self.right.operator == "+"
                    && self.right.left instanceof AST_Constant
                    && self.right.is_string(compressor)) {
                    self = make_node(AST_Binary, self, {
                        operator: "+",
                        left: make_node(AST_Binary, self.left, {
                            operator: "+",
                            left: self.left.left,
                            right: make_node(AST_String, null, {
                                value: "" + self.left.right.getValue() + self.right.left.getValue(),
                                start: self.left.right.start,
                                end: self.right.left.end
                            })
                        }),
                        right: self.right.right
                    });
                }
            }
        }
        // x * (y * z)  ==>  x * y * z
        if (self.right instanceof AST_Binary
            && self.right.operator == self.operator
            && (self.operator == "*" || self.operator == "&&" || self.operator == "||"))
        {
            self.left = make_node(AST_Binary, self.left, {
                operator : self.operator,
                left     : self.left,
                right    : self.right.left
            });
            self.right = self.right.right;
            return self.transform(compressor);
        }
        return self.evaluate(compressor)[0];
    });

    OPT(AST_SymbolRef, function(self, compressor){
        if (self.undeclared()) {
            var defines = compressor.option("global_defs");
            if (defines && defines.hasOwnProperty(self.name)) {
                return make_node_from_constant(compressor, defines[self.name], self);
            }
            switch (self.name) {
              case "undefined":
                return make_node(AST_Undefined, self);
              case "NaN":
                return make_node(AST_NaN, self);
              case "Infinity":
                return make_node(AST_Infinity, self);
            }
        }
        return self;
    });

    OPT(AST_Undefined, function(self, compressor){
        if (compressor.option("unsafe")) {
            var scope = compressor.find_parent(AST_Scope);
            var undef = scope.find_variable("undefined");
            if (undef) {
                var ref = make_node(AST_SymbolRef, self, {
                    name   : "undefined",
                    scope  : scope,
                    thedef : undef
                });
                ref.reference();
                return ref;
            }
        }
        return self;
    });

    var ASSIGN_OPS = [ '+', '-', '/', '*', '%', '>>', '<<', '>>>', '|', '^', '&' ];
    OPT(AST_Assign, function(self, compressor){
        self = self.lift_sequences(compressor);
        if (self.operator == "="
            && self.left instanceof AST_SymbolRef
            && self.right instanceof AST_Binary
            && self.right.left instanceof AST_SymbolRef
            && self.right.left.name == self.left.name
            && member(self.right.operator, ASSIGN_OPS)) {
            self.operator = self.right.operator + "=";
            self.right = self.right.right;
        }
        return self;
    });

    OPT(AST_Conditional, function(self, compressor){
        if (!compressor.option("conditionals")) return self;
        if (self.condition instanceof AST_Seq) {
            var car = self.condition.car;
            self.condition = self.condition.cdr;
            return AST_Seq.cons(car, self);
        }
        var cond = self.condition.evaluate(compressor);
        if (cond.length > 1) {
            if (cond[1]) {
                compressor.warn("Condition always true [{file}:{line},{col}]", self.start);
                return self.consequent;
            } else {
                compressor.warn("Condition always false [{file}:{line},{col}]", self.start);
                return self.alternative;
            }
        }
        var negated = cond[0].negate(compressor);
        if (best_of(cond[0], negated) === negated) {
            self = make_node(AST_Conditional, self, {
                condition: negated,
                consequent: self.alternative,
                alternative: self.consequent
            });
        }
        var consequent = self.consequent;
        var alternative = self.alternative;
        if (consequent instanceof AST_Assign
            && alternative instanceof AST_Assign
            && consequent.operator == alternative.operator
            && consequent.left.equivalent_to(alternative.left)
           ) {
            /*
             * Stuff like this:
             * if (foo) exp = something; else exp = something_else;
             * ==>
             * exp = foo ? something : something_else;
             */
            return make_node(AST_Assign, self, {
                operator: consequent.operator,
                left: consequent.left,
                right: make_node(AST_Conditional, self, {
                    condition: self.condition,
                    consequent: consequent.right,
                    alternative: alternative.right
                })
            });
        }
        if (consequent instanceof AST_Call
            && alternative.TYPE === consequent.TYPE
            && consequent.args.length == alternative.args.length
            && consequent.expression.equivalent_to(alternative.expression)) {
            if (consequent.args.length == 0) {
                return make_node(AST_Seq, self, {
                    car: self.condition,
                    cdr: consequent
                });
            }
            if (consequent.args.length == 1) {
                consequent.args[0] = make_node(AST_Conditional, self, {
                    condition: self.condition,
                    consequent: consequent.args[0],
                    alternative: alternative.args[0]
                });
                return consequent;
            }
        }
        // x?y?z:a:a --> x&&y?z:a
        if (consequent instanceof AST_Conditional
            && consequent.alternative.equivalent_to(alternative)) {
            return make_node(AST_Conditional, self, {
                condition: make_node(AST_Binary, self, {
                    left: self.condition,
                    operator: "&&",
                    right: consequent.condition
                }),
                consequent: consequent.consequent,
                alternative: alternative
            });
        }
        return self;
    });

    OPT(AST_Boolean, function(self, compressor){
        if (compressor.option("booleans")) {
            var p = compressor.parent();
            if (p instanceof AST_Binary && (p.operator == "=="
                                            || p.operator == "!=")) {
                compressor.warn("Non-strict equality against boolean: {operator} {value} [{file}:{line},{col}]", {
                    operator : p.operator,
                    value    : self.value,
                    file     : p.start.file,
                    line     : p.start.line,
                    col      : p.start.col,
                });
                return make_node(AST_Number, self, {
                    value: +self.value
                });
            }
            return make_node(AST_UnaryPrefix, self, {
                operator: "!",
                expression: make_node(AST_Number, self, {
                    value: 1 - self.value
                })
            });
        }
        return self;
    });

    OPT(AST_Sub, function(self, compressor){
        var prop = self.property;
        if (prop instanceof AST_String && compressor.option("properties")) {
            prop = prop.getValue();
            if (RESERVED_WORDS(prop) ? compressor.option("screw_ie8") : is_identifier_string(prop)) {
                return make_node(AST_Dot, self, {
                    expression : self.expression,
                    property   : prop
                });
            }
            var v = parseFloat(prop);
            if (!isNaN(v) && v.toString() == prop) {
                self.property = make_node(AST_Number, self.property, {
                    value: v
                });
            }
        }
        return self;
    });

    function literals_in_boolean_context(self, compressor) {
        if (compressor.option("booleans") && compressor.in_boolean_context()) {
            return make_node(AST_True, self);
        }
        return self;
    };
    OPT(AST_Array, literals_in_boolean_context);
    OPT(AST_Object, literals_in_boolean_context);
    OPT(AST_RegExp, literals_in_boolean_context);

})();

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

// a small wrapper around fitzgen's source-map library
function SourceMap(options) {
    options = defaults(options, {
        file : null,
        root : null,
        orig : null,

        orig_line_diff : 0,
        dest_line_diff : 0,
    });
    var generator = new MOZ_SourceMap.SourceMapGenerator({
        file       : options.file,
        sourceRoot : options.root
    });
    var orig_map = options.orig && new MOZ_SourceMap.SourceMapConsumer(options.orig);
    function add(source, gen_line, gen_col, orig_line, orig_col, name) {
        if (orig_map) {
            var info = orig_map.originalPositionFor({
                line: orig_line,
                column: orig_col
            });
            if (info.source === null) {
                return;
            }
            source = info.source;
            orig_line = info.line;
            orig_col = info.column;
            name = info.name;
        }
        generator.addMapping({
            generated : { line: gen_line + options.dest_line_diff, column: gen_col },
            original  : { line: orig_line + options.orig_line_diff, column: orig_col },
            source    : source,
            name      : name
        });
    };
    return {
        add        : add,
        get        : function() { return generator },
        toString   : function() { return generator.toString() }
    };
};

/***********************************************************************

  A JavaScript tokenizer / parser / beautifier / compressor.
  https://github.com/mishoo/UglifyJS2

  -------------------------------- (C) ---------------------------------

                           Author: Mihai Bazon
                         <mihai.bazon@gmail.com>
                       http://mihai.bazon.net/blog

  Distributed under the BSD license:

    Copyright 2012 (c) Mihai Bazon <mihai.bazon@gmail.com>

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions
    are met:

        * Redistributions of source code must retain the above
          copyright notice, this list of conditions and the following
          disclaimer.

        * Redistributions in binary form must reproduce the above
          copyright notice, this list of conditions and the following
          disclaimer in the documentation and/or other materials
          provided with the distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
    EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
    IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
    PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
    LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
    OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
    PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
    PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
    TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
    THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
    SUCH DAMAGE.

 ***********************************************************************/

"use strict";

(function(){

    var MOZ_TO_ME = {
        TryStatement : function(M) {
            return new AST_Try({
                start    : my_start_token(M),
                end      : my_end_token(M),
                body     : from_moz(M.block).body,
                bcatch   : from_moz(M.handlers[0]),
                bfinally : M.finalizer ? new AST_Finally(from_moz(M.finalizer)) : null
            });
        },
        CatchClause : function(M) {
            return new AST_Catch({
                start   : my_start_token(M),
                end     : my_end_token(M),
                argname : from_moz(M.param),
                body    : from_moz(M.body).body
            });
        },
        ObjectExpression : function(M) {
            return new AST_Object({
                start      : my_start_token(M),
                end        : my_end_token(M),
                properties : M.properties.map(function(prop){
                    var key = prop.key;
                    var name = key.type == "Identifier" ? key.name : key.value;
                    var args = {
                        start    : my_start_token(key),
                        end      : my_end_token(prop.value),
                        key      : name,
                        value    : from_moz(prop.value)
                    };
                    switch (prop.kind) {
                      case "init":
                        return new AST_ObjectKeyVal(args);
                      case "set":
                        args.value.name = from_moz(key);
                        return new AST_ObjectSetter(args);
                      case "get":
                        args.value.name = from_moz(key);
                        return new AST_ObjectGetter(args);
                    }
                })
            });
        },
        SequenceExpression : function(M) {
            return AST_Seq.from_array(M.expressions.map(from_moz));
        },
        MemberExpression : function(M) {
            return new (M.computed ? AST_Sub : AST_Dot)({
                start      : my_start_token(M),
                end        : my_end_token(M),
                property   : M.computed ? from_moz(M.property) : M.property.name,
                expression : from_moz(M.object)
            });
        },
        SwitchCase : function(M) {
            return new (M.test ? AST_Case : AST_Default)({
                start      : my_start_token(M),
                end        : my_end_token(M),
                expression : from_moz(M.test),
                body       : M.consequent.map(from_moz)
            });
        },
        Literal : function(M) {
            var val = M.value, args = {
                start  : my_start_token(M),
                end    : my_end_token(M)
            };
            if (val === null) return new AST_Null(args);
            switch (typeof val) {
              case "string":
                args.value = val;
                return new AST_String(args);
              case "number":
                args.value = val;
                return new AST_Number(args);
              case "boolean":
                return new (val ? AST_True : AST_False)(args);
              default:
                args.value = val;
                return new AST_RegExp(args);
            }
        },
        UnaryExpression: From_Moz_Unary,
        UpdateExpression: From_Moz_Unary,
        Identifier: function(M) {
            var p = FROM_MOZ_STACK[FROM_MOZ_STACK.length - 2];
            return new (M.name == "this" ? AST_This
                        : p.type == "LabeledStatement" ? AST_Label
                        : p.type == "VariableDeclarator" && p.id === M ? (p.kind == "const" ? AST_SymbolConst : AST_SymbolVar)
                        : p.type == "FunctionExpression" ? (p.id === M ? AST_SymbolLambda : AST_SymbolFunarg)
                        : p.type == "FunctionDeclaration" ? (p.id === M ? AST_SymbolDefun : AST_SymbolFunarg)
                        : p.type == "CatchClause" ? AST_SymbolCatch
                        : p.type == "BreakStatement" || p.type == "ContinueStatement" ? AST_LabelRef
                        : AST_SymbolRef)({
                            start : my_start_token(M),
                            end   : my_end_token(M),
                            name  : M.name
                        });
        }
    };

    function From_Moz_Unary(M) {
        var prefix = "prefix" in M ? M.prefix
            : M.type == "UnaryExpression" ? true : false;
        return new (prefix ? AST_UnaryPrefix : AST_UnaryPostfix)({
            start      : my_start_token(M),
            end        : my_end_token(M),
            operator   : M.operator,
            expression : from_moz(M.argument)
        });
    };

    var ME_TO_MOZ = {};

    map("Node", AST_Node);
    map("Program", AST_Toplevel, "body@body");
    map("Function", AST_Function, "id>name, params@argnames, body%body");
    map("EmptyStatement", AST_EmptyStatement);
    map("BlockStatement", AST_BlockStatement, "body@body");
    map("ExpressionStatement", AST_SimpleStatement, "expression>body");
    map("IfStatement", AST_If, "test>condition, consequent>body, alternate>alternative");
    map("LabeledStatement", AST_LabeledStatement, "label>label, body>body");
    map("BreakStatement", AST_Break, "label>label");
    map("ContinueStatement", AST_Continue, "label>label");
    map("WithStatement", AST_With, "object>expression, body>body");
    map("SwitchStatement", AST_Switch, "discriminant>expression, cases@body");
    map("ReturnStatement", AST_Return, "argument>value");
    map("ThrowStatement", AST_Throw, "argument>value");
    map("WhileStatement", AST_While, "test>condition, body>body");
    map("DoWhileStatement", AST_Do, "test>condition, body>body");
    map("ForStatement", AST_For, "init>init, test>condition, update>step, body>body");
    map("ForInStatement", AST_ForIn, "left>init, right>object, body>body");
    map("DebuggerStatement", AST_Debugger);
    map("FunctionDeclaration", AST_Defun, "id>name, params@argnames, body%body");
    map("VariableDeclaration", AST_Var, "declarations@definitions");
    map("VariableDeclarator", AST_VarDef, "id>name, init>value");

    map("ThisExpression", AST_This);
    map("ArrayExpression", AST_Array, "elements@elements");
    map("FunctionExpression", AST_Function, "id>name, params@argnames, body%body");
    map("BinaryExpression", AST_Binary, "operator=operator, left>left, right>right");
    map("AssignmentExpression", AST_Assign, "operator=operator, left>left, right>right");
    map("LogicalExpression", AST_Binary, "operator=operator, left>left, right>right");
    map("ConditionalExpression", AST_Conditional, "test>condition, consequent>consequent, alternate>alternative");
    map("NewExpression", AST_New, "callee>expression, arguments@args");
    map("CallExpression", AST_Call, "callee>expression, arguments@args");

    /* -----[ tools ]----- */

    function my_start_token(moznode) {
        return new AST_Token({
            file   : moznode.loc && moznode.loc.source,
            line   : moznode.loc && moznode.loc.start.line,
            col    : moznode.loc && moznode.loc.start.column,
            pos    : moznode.start,
            endpos : moznode.start
        });
    };

    function my_end_token(moznode) {
        return new AST_Token({
            file   : moznode.loc && moznode.loc.source,
            line   : moznode.loc && moznode.loc.end.line,
            col    : moznode.loc && moznode.loc.end.column,
            pos    : moznode.end,
            endpos : moznode.end
        });
    };

    function map(moztype, mytype, propmap) {
        var moz_to_me = "function From_Moz_" + moztype + "(M){\n";
        moz_to_me += "return new mytype({\n" +
            "start: my_start_token(M),\n" +
            "end: my_end_token(M)";

        if (propmap) propmap.split(/\s*,\s*/).forEach(function(prop){
            var m = /([a-z0-9$_]+)(=|@|>|%)([a-z0-9$_]+)/i.exec(prop);
            if (!m) throw new Error("Can't understand property map: " + prop);
            var moz = "M." + m[1], how = m[2], my = m[3];
            moz_to_me += ",\n" + my + ": ";
            if (how == "@") {
                moz_to_me += moz + ".map(from_moz)";
            } else if (how == ">") {
                moz_to_me += "from_moz(" + moz + ")";
            } else if (how == "=") {
                moz_to_me += moz;
            } else if (how == "%") {
                moz_to_me += "from_moz(" + moz + ").body";
            } else throw new Error("Can't understand operator in propmap: " + prop);
        });
        moz_to_me += "\n})}";

        // moz_to_me = parse(moz_to_me).print_to_string({ beautify: true });
        // console.log(moz_to_me);

        moz_to_me = new Function("mytype", "my_start_token", "my_end_token", "from_moz", "return(" + moz_to_me + ")")(
            mytype, my_start_token, my_end_token, from_moz
        );
        return MOZ_TO_ME[moztype] = moz_to_me;
    };

    var FROM_MOZ_STACK = null;

    function from_moz(node) {
        FROM_MOZ_STACK.push(node);
        var ret = node != null ? MOZ_TO_ME[node.type](node) : null;
        FROM_MOZ_STACK.pop();
        return ret;
    };

    AST_Node.from_mozilla_ast = function(node){
        var save_stack = FROM_MOZ_STACK;
        FROM_MOZ_STACK = [];
        var ast = from_moz(node);
        FROM_MOZ_STACK = save_stack;
        return ast;
    };

})();


exports.sys = sys;
exports.MOZ_SourceMap = MOZ_SourceMap;
exports.UglifyJS = UglifyJS;
exports.array_to_hash = array_to_hash;
exports.slice = slice;
exports.characters = characters;
exports.member = member;
exports.find_if = find_if;
exports.repeat_string = repeat_string;
exports.DefaultsError = DefaultsError;
exports.defaults = defaults;
exports.merge = merge;
exports.noop = noop;
exports.MAP = MAP;
exports.push_uniq = push_uniq;
exports.string_template = string_template;
exports.remove = remove;
exports.mergeSort = mergeSort;
exports.set_difference = set_difference;
exports.set_intersection = set_intersection;
exports.makePredicate = makePredicate;
exports.all = all;
exports.Dictionary = Dictionary;
exports.DEFNODE = DEFNODE;
exports.AST_Token = AST_Token;
exports.AST_Node = AST_Node;
exports.AST_Statement = AST_Statement;
exports.AST_Debugger = AST_Debugger;
exports.AST_Directive = AST_Directive;
exports.AST_SimpleStatement = AST_SimpleStatement;
exports.walk_body = walk_body;
exports.AST_Block = AST_Block;
exports.AST_BlockStatement = AST_BlockStatement;
exports.AST_EmptyStatement = AST_EmptyStatement;
exports.AST_StatementWithBody = AST_StatementWithBody;
exports.AST_LabeledStatement = AST_LabeledStatement;
exports.AST_IterationStatement = AST_IterationStatement;
exports.AST_DWLoop = AST_DWLoop;
exports.AST_Do = AST_Do;
exports.AST_While = AST_While;
exports.AST_For = AST_For;
exports.AST_ForIn = AST_ForIn;
exports.AST_With = AST_With;
exports.AST_Scope = AST_Scope;
exports.AST_Toplevel = AST_Toplevel;
exports.AST_Lambda = AST_Lambda;
exports.AST_Accessor = AST_Accessor;
exports.AST_Function = AST_Function;
exports.AST_Defun = AST_Defun;
exports.AST_Jump = AST_Jump;
exports.AST_Exit = AST_Exit;
exports.AST_Return = AST_Return;
exports.AST_Throw = AST_Throw;
exports.AST_LoopControl = AST_LoopControl;
exports.AST_Break = AST_Break;
exports.AST_Continue = AST_Continue;
exports.AST_If = AST_If;
exports.AST_Switch = AST_Switch;
exports.AST_SwitchBranch = AST_SwitchBranch;
exports.AST_Default = AST_Default;
exports.AST_Case = AST_Case;
exports.AST_Try = AST_Try;
exports.AST_Catch = AST_Catch;
exports.AST_Finally = AST_Finally;
exports.AST_Definitions = AST_Definitions;
exports.AST_Var = AST_Var;
exports.AST_Const = AST_Const;
exports.AST_VarDef = AST_VarDef;
exports.AST_Call = AST_Call;
exports.AST_New = AST_New;
exports.AST_Seq = AST_Seq;
exports.AST_PropAccess = AST_PropAccess;
exports.AST_Dot = AST_Dot;
exports.AST_Sub = AST_Sub;
exports.AST_Unary = AST_Unary;
exports.AST_UnaryPrefix = AST_UnaryPrefix;
exports.AST_UnaryPostfix = AST_UnaryPostfix;
exports.AST_Binary = AST_Binary;
exports.AST_Conditional = AST_Conditional;
exports.AST_Assign = AST_Assign;
exports.AST_Array = AST_Array;
exports.AST_Object = AST_Object;
exports.AST_ObjectProperty = AST_ObjectProperty;
exports.AST_ObjectKeyVal = AST_ObjectKeyVal;
exports.AST_ObjectSetter = AST_ObjectSetter;
exports.AST_ObjectGetter = AST_ObjectGetter;
exports.AST_Symbol = AST_Symbol;
exports.AST_SymbolAccessor = AST_SymbolAccessor;
exports.AST_SymbolDeclaration = AST_SymbolDeclaration;
exports.AST_SymbolVar = AST_SymbolVar;
exports.AST_SymbolConst = AST_SymbolConst;
exports.AST_SymbolFunarg = AST_SymbolFunarg;
exports.AST_SymbolDefun = AST_SymbolDefun;
exports.AST_SymbolLambda = AST_SymbolLambda;
exports.AST_SymbolCatch = AST_SymbolCatch;
exports.AST_Label = AST_Label;
exports.AST_SymbolRef = AST_SymbolRef;
exports.AST_LabelRef = AST_LabelRef;
exports.AST_This = AST_This;
exports.AST_Constant = AST_Constant;
exports.AST_String = AST_String;
exports.AST_Number = AST_Number;
exports.AST_RegExp = AST_RegExp;
exports.AST_Atom = AST_Atom;
exports.AST_Null = AST_Null;
exports.AST_NaN = AST_NaN;
exports.AST_Undefined = AST_Undefined;
exports.AST_Hole = AST_Hole;
exports.AST_Infinity = AST_Infinity;
exports.AST_Boolean = AST_Boolean;
exports.AST_False = AST_False;
exports.AST_True = AST_True;
exports.TreeWalker = TreeWalker;
exports.KEYWORDS = KEYWORDS;
exports.KEYWORDS_ATOM = KEYWORDS_ATOM;
exports.RESERVED_WORDS = RESERVED_WORDS;
exports.KEYWORDS_BEFORE_EXPRESSION = KEYWORDS_BEFORE_EXPRESSION;
exports.OPERATOR_CHARS = OPERATOR_CHARS;
exports.RE_HEX_NUMBER = RE_HEX_NUMBER;
exports.RE_OCT_NUMBER = RE_OCT_NUMBER;
exports.RE_DEC_NUMBER = RE_DEC_NUMBER;
exports.OPERATORS = OPERATORS;
exports.WHITESPACE_CHARS = WHITESPACE_CHARS;
exports.PUNC_BEFORE_EXPRESSION = PUNC_BEFORE_EXPRESSION;
exports.PUNC_CHARS = PUNC_CHARS;
exports.REGEXP_MODIFIERS = REGEXP_MODIFIERS;
exports.UNICODE = UNICODE;
exports.is_letter = is_letter;
exports.is_digit = is_digit;
exports.is_alphanumeric_char = is_alphanumeric_char;
exports.is_unicode_combining_mark = is_unicode_combining_mark;
exports.is_unicode_connector_punctuation = is_unicode_connector_punctuation;
exports.is_identifier = is_identifier;
exports.is_identifier_start = is_identifier_start;
exports.is_identifier_char = is_identifier_char;
exports.is_identifier_string = is_identifier_string;
exports.parse_js_number = parse_js_number;
exports.JS_Parse_Error = JS_Parse_Error;
exports.js_error = js_error;
exports.is_token = is_token;
exports.EX_EOF = EX_EOF;
exports.tokenizer = tokenizer;
exports.UNARY_PREFIX = UNARY_PREFIX;
exports.UNARY_POSTFIX = UNARY_POSTFIX;
exports.ASSIGNMENT = ASSIGNMENT;
exports.PRECEDENCE = PRECEDENCE;
exports.STATEMENTS_WITH_LABELS = STATEMENTS_WITH_LABELS;
exports.ATOMIC_START_TOKEN = ATOMIC_START_TOKEN;
exports.parse = parse;
exports.TreeTransformer = TreeTransformer;
exports.SymbolDef = SymbolDef;
exports.base54 = base54;
exports.OutputStream = OutputStream;
exports.Compressor = Compressor;
exports.SourceMap = SourceMap;

exports.AST_Node.warn_function = function (txt) { if (typeof console != "undefined" && typeof console.warn === "function") console.warn(txt) }

exports.minify = function (files, options) {
    options = UglifyJS.defaults(options, {
        spidermonkey : false,
        outSourceMap : null,
        sourceRoot   : null,
        inSourceMap  : null,
        fromString   : false,
        warnings     : false,
        mangle       : {},
        output       : null,
        compress     : {}
    });
    UglifyJS.base54.reset();

    // 1. parse
    var toplevel = null,
        sourcesContent = {};

    if (options.spidermonkey) {
        toplevel = UglifyJS.AST_Node.from_mozilla_ast(files);
    } else {
        if (typeof files == "string")
            files = [ files ];
        files.forEach(function(file){
            var code = options.fromString
                ? file
                : fs.readFileSync(file, "utf8");
            sourcesContent[file] = code;
            toplevel = UglifyJS.parse(code, {
                filename: options.fromString ? "?" : file,
                toplevel: toplevel
            });
        });
    }

    // 2. compress
    if (options.compress) {
        var compress = { warnings: options.warnings };
        UglifyJS.merge(compress, options.compress);
        toplevel.figure_out_scope();
        var sq = UglifyJS.Compressor(compress);
        toplevel = toplevel.transform(sq);
    }

    // 3. mangle
    if (options.mangle) {
        toplevel.figure_out_scope();
        toplevel.compute_char_frequency();
        toplevel.mangle_names(options.mangle);
    }

    // 4. output
    var inMap = options.inSourceMap;
    var output = {};
    if (typeof options.inSourceMap == "string") {
        inMap = fs.readFileSync(options.inSourceMap, "utf8");
    }
    if (options.outSourceMap) {
        output.source_map = UglifyJS.SourceMap({
            file: options.outSourceMap,
            orig: inMap,
            root: options.sourceRoot
        });
        if (options.sourceMapIncludeSources) {
            for (var file in sourcesContent) {
                if (sourcesContent.hasOwnProperty(file)) {
                    options.source_map.get().setSourceContent(file, sourcesContent[file]);
                }
            }
        }

    }
    if (options.output) {
        UglifyJS.merge(output, options.output);
    }
    var stream = UglifyJS.OutputStream(output);
    toplevel.print(stream);
    return {
        code : stream + "",
        map  : output.source_map + ""
    };
};

exports.describe_ast = function () {
    var out = UglifyJS.OutputStream({ beautify: true });
    function doitem(ctor) {
        out.print("AST_" + ctor.TYPE);
        var props = ctor.SELF_PROPS.filter(function(prop){
            return !/^\$/.test(prop);
        });
        if (props.length > 0) {
            out.space();
            out.with_parens(function(){
                props.forEach(function(prop, i){
                    if (i) out.space();
                    out.print(prop);
                });
            });
        }
        if (ctor.documentation) {
            out.space();
            out.print_string(ctor.documentation);
        }
        if (ctor.SUBCLASSES.length > 0) {
            out.space();
            out.with_block(function(){
                ctor.SUBCLASSES.forEach(function(ctor, i){
                    out.indent();
                    doitem(ctor);
                    out.newline();
                });
            });
        }
    };
    doitem(UglifyJS.AST_Node);
    return out + "";
};
},{"source-map":41,"util":106}],52:[function(require,module,exports){
'use strict';

var uglify = require('uglify-js')

module.exports = addWith

/**
 * Mimic `with` as far as possible but at compile time
 *
 * @param {String} obj The object part of a with expression
 * @param {String} src The body of the with expression
 * @param {Array.<String>} exclude A list of variable names to explicitly exclude
 */
function addWith(obj, src, exclude) {
  obj = obj + ''
  src = src + ''
  exclude = exclude || []
  exclude = exclude.concat(detect(obj))
  var vars = detect(src)
    .filter(function (v) {
      return exclude.indexOf(v) === -1
    })

  if (vars.length === 0) return src

  var declareLocal = ''
  var local = 'locals_for_with'
  var result = 'result_of_with'
  if (/^[a-zA-Z0-9$_]+$/.test(obj)) {
    local = obj
  } else {
    while (vars.indexOf(local) != -1 || exclude.indexOf(local) != -1) {
      local += '_'
    }
    declareLocal = 'var ' + local + ' = (' + obj + ')'
  }
  while (vars.indexOf(result) != -1 || exclude.indexOf(result) != -1) {
    result += '_'
  }

  var inputVars = vars.map(function (v) {
    return JSON.stringify(v) + ' in ' + local + '?' +
      local + '.' + v + ':' +
      'typeof ' + v + '!=="undefined"?' + v + ':undefined'
  })

  src = '(function (' + vars.join(', ') + ') {' +
    src +
    '}(' + inputVars.join(',') + '))'

  return ';' + declareLocal + ';' + unwrapReturns(src, result) + ';'
}

/**
 * Detect, and return a list of, any global variables in a function
 *
 * @param {String} src Some JavaScript code
 */
function detect(src) {
    var ast = uglify.parse('(function () {' + src + '}())') // allow return keyword
    ast.figure_out_scope()
    var globals = ast.globals
        .map(function (node, name) {
            return name
        })
    return globals
}

/**
 * Take a self calling function, and unwrap it such that return inside the function
 * results in return outside the function
 *
 * @param {String} src    Some JavaScript code representing a self-calling function
 * @param {String} result A temporary variable to store the result in
 */
function unwrapReturns(src, result) {
  var originalSource = src
  var hasReturn = false
  var ast = uglify.parse(src)
  src = src.split('')

  if (ast.body.length !== 1 || ast.body[0].TYPE !== 'SimpleStatement' ||
      ast.body[0].body.TYPE !== 'Call' || ast.body[0].body.expression.TYPE !== 'Function')
    throw new Error('AST does not seem to represent a self-calling function')
  var fn = ast.body[0].body.expression

  var walker = new uglify.TreeWalker(visitor)
  function visitor(node, descend) {
    if (node !== fn && (node.TYPE === 'Defun' || node.TYPE === 'Function')) {
      return true //don't descend into functions
    }
    if (node.TYPE === 'Return') {
      descend()
      hasReturn = true
      replace(node, 'return {value: ' + source(node.value) + '};')
      return true //don't descend again
    }
  }
  function source(node) {
    return src.slice(node.start.pos, node.end.endpos).join('')
  }
  function replace(node, str) {
    for (var i = node.start.pos; i < node.end.endpos; i++) {
      src[i] = ''
    }
    src[node.start.pos] = str
  }
  ast.walk(walker)
  if (!hasReturn) return originalSource
  else return 'var ' + result + '=' + src.join('') + ';if (' + result + ') return ' + result + '.value'
}

},{"uglify-js":63}],53:[function(require,module,exports){
arguments[4][41][0].apply(exports,arguments)
},{"./source-map/source-map-consumer":58,"./source-map/source-map-generator":59,"./source-map/source-node":60}],54:[function(require,module,exports){
arguments[4][42][0].apply(exports,arguments)
},{"./util":61,"amdefine":62}],55:[function(require,module,exports){
arguments[4][43][0].apply(exports,arguments)
},{"./base64":56,"amdefine":62}],56:[function(require,module,exports){
arguments[4][44][0].apply(exports,arguments)
},{"amdefine":62}],57:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"amdefine":62}],58:[function(require,module,exports){
arguments[4][46][0].apply(exports,arguments)
},{"./array-set":54,"./base64-vlq":55,"./binary-search":57,"./util":61,"amdefine":62}],59:[function(require,module,exports){
arguments[4][47][0].apply(exports,arguments)
},{"./array-set":54,"./base64-vlq":55,"./util":61,"amdefine":62}],60:[function(require,module,exports){
arguments[4][48][0].apply(exports,arguments)
},{"./source-map-generator":59,"./util":61,"amdefine":62}],61:[function(require,module,exports){
arguments[4][49][0].apply(exports,arguments)
},{"amdefine":62}],62:[function(require,module,exports){
(function (process,__filename){
/** vim: et:ts=4:sw=4:sts=4
 * @license amdefine 0.1.0 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/amdefine for details
 */

/*jslint node: true */
/*global module, process */
'use strict';

/**
 * Creates a define for node.
 * @param {Object} module the "module" object that is defined by Node for the
 * current module.
 * @param {Function} [requireFn]. Node's require function for the current module.
 * It only needs to be passed in Node versions before 0.5, when module.require
 * did not exist.
 * @returns {Function} a define function that is usable for the current node
 * module.
 */
function amdefine(module, requireFn) {
    'use strict';
    var defineCache = {},
        loaderCache = {},
        alreadyCalled = false,
        path = require('path'),
        makeRequire, stringRequire;

    /**
     * Trims the . and .. from an array of path segments.
     * It will keep a leading path segment if a .. will become
     * the first path segment, to help with module name lookups,
     * which act like paths, but can be remapped. But the end result,
     * all paths that use this function should look normalized.
     * NOTE: this method MODIFIES the input array.
     * @param {Array} ary the array of path segments.
     */
    function trimDots(ary) {
        var i, part;
        for (i = 0; ary[i]; i+= 1) {
            part = ary[i];
            if (part === '.') {
                ary.splice(i, 1);
                i -= 1;
            } else if (part === '..') {
                if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                    //End of the line. Keep at least one non-dot
                    //path segment at the front so it can be mapped
                    //correctly to disk. Otherwise, there is likely
                    //no path mapping for a path starting with '..'.
                    //This can still fail, but catches the most reasonable
                    //uses of ..
                    break;
                } else if (i > 0) {
                    ary.splice(i - 1, 2);
                    i -= 2;
                }
            }
        }
    }

    function normalize(name, baseName) {
        var baseParts;

        //Adjust any relative paths.
        if (name && name.charAt(0) === '.') {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                baseParts = baseName.split('/');
                baseParts = baseParts.slice(0, baseParts.length - 1);
                baseParts = baseParts.concat(name.split('/'));
                trimDots(baseParts);
                name = baseParts.join('/');
            }
        }

        return name;
    }

    /**
     * Create the normalize() function passed to a loader plugin's
     * normalize method.
     */
    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(id) {
        function load(value) {
            loaderCache[id] = value;
        }

        load.fromText = function (id, text) {
            //This one is difficult because the text can/probably uses
            //define, and any relative paths and requires should be relative
            //to that id was it would be found on disk. But this would require
            //bootstrapping a module/require fairly deeply from node core.
            //Not sure how best to go about that yet.
            throw new Error('amdefine does not implement load.fromText');
        };

        return load;
    }

    makeRequire = function (systemRequire, exports, module, relId) {
        function amdRequire(deps, callback) {
            if (typeof deps === 'string') {
                //Synchronous, single module require('')
                return stringRequire(systemRequire, exports, module, deps, relId);
            } else {
                //Array of dependencies with a callback.

                //Convert the dependencies to modules.
                deps = deps.map(function (depName) {
                    return stringRequire(systemRequire, exports, module, depName, relId);
                });

                //Wait for next tick to call back the require call.
                process.nextTick(function () {
                    callback.apply(null, deps);
                });
            }
        }

        amdRequire.toUrl = function (filePath) {
            if (filePath.indexOf('.') === 0) {
                return normalize(filePath, path.dirname(module.filename));
            } else {
                return filePath;
            }
        };

        return amdRequire;
    };

    //Favor explicit value, passed in if the module wants to support Node 0.4.
    requireFn = requireFn || function req() {
        return module.require.apply(module, arguments);
    };

    function runFactory(id, deps, factory) {
        var r, e, m, result;

        if (id) {
            e = loaderCache[id] = {};
            m = {
                id: id,
                uri: __filename,
                exports: e
            };
            r = makeRequire(requireFn, e, m, id);
        } else {
            //Only support one define call per file
            if (alreadyCalled) {
                throw new Error('amdefine with no module ID cannot be called more than once per file.');
            }
            alreadyCalled = true;

            //Use the real variables from node
            //Use module.exports for exports, since
            //the exports in here is amdefine exports.
            e = module.exports;
            m = module;
            r = makeRequire(requireFn, e, m, module.id);
        }

        //If there are dependencies, they are strings, so need
        //to convert them to dependency values.
        if (deps) {
            deps = deps.map(function (depName) {
                return r(depName);
            });
        }

        //Call the factory with the right dependencies.
        if (typeof factory === 'function') {
            result = factory.apply(m.exports, deps);
        } else {
            result = factory;
        }

        if (result !== undefined) {
            m.exports = result;
            if (id) {
                loaderCache[id] = m.exports;
            }
        }
    }

    stringRequire = function (systemRequire, exports, module, id, relId) {
        //Split the ID by a ! so that
        var index = id.indexOf('!'),
            originalId = id,
            prefix, plugin;

        if (index === -1) {
            id = normalize(id, relId);

            //Straight module lookup. If it is one of the special dependencies,
            //deal with it, otherwise, delegate to node.
            if (id === 'require') {
                return makeRequire(systemRequire, exports, module, relId);
            } else if (id === 'exports') {
                return exports;
            } else if (id === 'module') {
                return module;
            } else if (loaderCache.hasOwnProperty(id)) {
                return loaderCache[id];
            } else if (defineCache[id]) {
                runFactory.apply(null, defineCache[id]);
                return loaderCache[id];
            } else {
                if(systemRequire) {
                    return systemRequire(originalId);
                } else {
                    throw new Error('No module with ID: ' + id);
                }
            }
        } else {
            //There is a plugin in play.
            prefix = id.substring(0, index);
            id = id.substring(index + 1, id.length);

            plugin = stringRequire(systemRequire, exports, module, prefix, relId);

            if (plugin.normalize) {
                id = plugin.normalize(id, makeNormalize(relId));
            } else {
                //Normalize the ID normally.
                id = normalize(id, relId);
            }

            if (loaderCache[id]) {
                return loaderCache[id];
            } else {
                plugin.load(id, makeRequire(systemRequire, exports, module, relId), makeLoad(id), {});

                return loaderCache[id];
            }
        }
    };

    //Create a define function specific to the module asking for amdefine.
    function define(id, deps, factory) {
        if (Array.isArray(id)) {
            factory = deps;
            deps = id;
            id = undefined;
        } else if (typeof id !== 'string') {
            factory = id;
            id = deps = undefined;
        }

        if (deps && !Array.isArray(deps)) {
            factory = deps;
            deps = undefined;
        }

        if (!deps) {
            deps = ['require', 'exports', 'module'];
        }

        //Set up properties for this module. If an ID, then use
        //internal cache. If no ID, then use the external variables
        //for this node module.
        if (id) {
            //Put the module in deep freeze until there is a
            //require call for it.
            defineCache[id] = [id, deps, factory];
        } else {
            runFactory(id, deps, factory);
        }
    }

    //define.require, which has access to all the values in the
    //cache. Useful for AMD modules that all have IDs in the file,
    //but need to finally export a value to node based on one of those
    //IDs.
    define.require = function (id) {
        if (loaderCache[id]) {
            return loaderCache[id];
        }

        if (defineCache[id]) {
            runFactory.apply(null, defineCache[id]);
            return loaderCache[id];
        }
    };

    define.amd = {};

    return define;
}

module.exports = amdefine;

}).call(this,require("xeDTxS"),"/node_modules/jade/node_modules/with/node_modules/uglify-js/node_modules/source-map/node_modules/amdefine/amdefine.js")
},{"path":84,"xeDTxS":85}],63:[function(require,module,exports){
module.exports=require(51)
},{"source-map":53,"util":106}],"Pwf7wh":[function(require,module,exports){
/* Author: Sivamani Varun (varun@semantics3.com)
 * Copyright 2012 Semantics3 Inc., see LICENSE */

"use strict";

var VERSION = '0.01';
var MAX_LIMIT = 10;

var OAuth = require('oauth').OAuth;

module.exports = function (api_key,api_secret, options) {
    var defaults = options || {};

    var base_url = 'https://api.semantics3.com/v1/';
    var userAgent = 'Semantics3 Node.js Lib/' + VERSION;

    var customHeaders = {"Accept" : "*/*", "Connection" : "close", "User-Agent" : userAgent};
    var securer = new OAuth(null, null, api_key, api_secret,'1.0', null,'HMAC-SHA1',32,customHeaders);

    var data_query = {};
    var query_result = {};

    function _request(method, path, data, callback) {
        var request_data = encodeURIComponent(JSON.stringify(data));
        var url = base_url + path + '?q=' + request_data;

        securer.get(url, null, null,
                    function(err, data, result) {
                        if(!err) { query_result = JSON.parse(data); }
                        callback(err,data);
                    });
    }

    return {

        products: {

                //Offers

                offers_field: function () {
                    var args = Array.prototype.slice.call( arguments, 0 );
                    args.unshift('offers');
                    this.add.apply(this,args);
                },

                get_offers: function (callback) {
                    this.run_query('offers',callback);
                },

                //Categories

                categories_field: function () {
                    var args = Array.prototype.slice.call( arguments, 0 );
                    args.unshift('categories');
                    this.add.apply(this,args);
                },

                get_categories: function (callback) {
                    this.run_query('categories',callback);
                },

                // Products

                products_field: function () {
                    var args = Array.prototype.slice.call( arguments, 0 );
                    args.unshift('products');
                    this.add.apply(this,args);
                },

                get_products: function (callback) {
                    this.run_query('products',callback);
                },

                all_products: function() {
                    if(!(query_result['results'])) {
                        throw new Error("Query result is undefined. You need to run a query first. ");
                    }
                    return query_result['results'];
                },

                iterate_products: function(callback) {
                    var limit=MAX_LIMIT;

                    if( (!(query_result['total_results_count'])) || (query_result['offset'] >= query_result['total_results_count'])) {
                        callback("No more iteration");
                    }

                    if(data_query['products']['limit']) {
                        limit = data_query['products']['limit'];
                    }
                    if(!(data_query['products']['offset'])) {
                        data_query['products']['offset'] = 0;
                    }
                    data_query['products']['offset'] = data_query['products']['offset'] + limit;
                    this.get_products(callback);
                },

                // Common

                add: function(endpoint) {
                    var args = Array.prototype.slice.call( arguments, 0 );
                    var fields = args.slice(1);

                    if(!(endpoint && (typeof endpoint === 'string'))) {
                        throw new Error("An endpoint is required");
                    }

                    if(!data_query[endpoint]) {
                        data_query[endpoint] = {};
                    }

                    var prodObj = data_query[endpoint];

                    for( var i=1; i<=(fields.length-1); i++ ) {
                        if( !( prodObj[ fields[i-1] ] ) ) {
                            prodObj[ fields[i-1] ] = {};
                        }
                        if(i != fields.length-1) {
                            prodObj = prodObj[fields[i-1]];
                        }
                        else {
                            prodObj[fields[i-1]] = fields[i];
                        }
                    }
                },

                remove: function(endpoint) {
                    var args = Array.prototype.slice.call( arguments, 0 );
                    var fields = args.slice(1);

                    if(!(endpoint && (typeof endpoint === 'string'))) {
                        throw new Error("An endpoint is required");
                    }

                    var valid = 0;
                    var prodObj;
                    var arrayCt = 0;

                    if( data_query[ endpoint ] ) {
                        prodObj = data_query[ endpoint ];
                        arrayCt = fields.length - 1;
                        valid = 1;

                        for( var i=0; i<=arrayCt-1; i++ ) {
                            if( prodObj[fields[i]] ) {
                                prodObj = prodObj[fields[i]];
                            }
                            else {
                                valid = 0;
                            }
                        }
                    }

                    if( valid ) {
                        delete prodObj[ fields[ arrayCt ] ];
                    }
                    else {
                        throw new Error("Attemped Invalid Deletion");
                    }
                },

                get_query: function(endpoint) {

                    if(!(endpoint && (typeof endpoint === 'string'))) {
                        throw new Error("An endpoint is required");
                    }

                    return data_query[ endpoint ];
                },

                get_query_json: function(endpoint) {
                    if(!(endpoint && (typeof endpoint === 'string'))) {
                        throw new Error("An endpoint is required");
                    }

                    return JSON.stringify(data_query[ endpoint ]);
                },

                get_results: function() {
                    return query_result;
                },

                get_results_json: function()  {
                    return JSON.stringify( query_result );
                },

                run_query: function(endpoint) {
                    var queryObj = {};
                    var callback = arguments[arguments.length-1];

                    if(arguments.length <= 1) {
                        throw new Error("Insufficient parameters provided");
                    }

                    if(arguments.length == 2) {
                        _request('GET',endpoint,data_query[endpoint],callback);
                    }
                    else {
                        var data = arguments[1];
                        if(typeof data === 'string') {
                            _request('GET',endpoint,JSON.parse(data),callback);
                        }
                        else if(typeof data === 'object') {
                            _request('GET',endpoint,data,callback);
                        }
                        else {
                            callback("Invalid parameters sent");
                        }
                    }
                },

                clear: function() {
                    query_result={};
                    data_query={};
                },
        }
    };
}

},{"oauth":66}],"semantics3":[function(require,module,exports){
module.exports=require('Pwf7wh');
},{}],66:[function(require,module,exports){
exports.OAuth = require("./lib/oauth").OAuth;
exports.OAuthEcho = require("./lib/oauth").OAuthEcho;
exports.OAuth2 = require("./lib/oauth2").OAuth2;
},{"./lib/oauth":68,"./lib/oauth2":69}],67:[function(require,module,exports){
// Returns true if this is a host that closes *before* it ends?!?!
module.exports.isAnEarlyCloseHost= function( hostName ) {
  return hostName && hostName.match(".*google(apis)?.com$")
}
},{}],68:[function(require,module,exports){
(function (Buffer){
var crypto= require('crypto'),
    sha1= require('./sha1'),
    http= require('http'),
    https= require('https'),
    URL= require('url'),
    querystring= require('querystring'),
    OAuthUtils= require('./_utils');

exports.OAuth= function(requestUrl, accessUrl, consumerKey, consumerSecret, version, authorize_callback, signatureMethod, nonceSize, customHeaders) {
  this._isEcho = false;

  this._requestUrl= requestUrl;
  this._accessUrl= accessUrl;
  this._consumerKey= consumerKey;
  this._consumerSecret= this._encodeData( consumerSecret );
  this._version= version;
  if( authorize_callback === undefined ) {
    this._authorize_callback= "oob";
  }
  else {
    this._authorize_callback= authorize_callback;
  }

  if( signatureMethod != "PLAINTEXT" && signatureMethod != "HMAC-SHA1")
    throw new Error("Un-supported signature method: " + signatureMethod )
  this._signatureMethod= signatureMethod;
  this._nonceSize= nonceSize || 32;
  this._headers= customHeaders || {"Accept" : "*/*",
                                   "Connection" : "close",
                                   "User-Agent" : "Node authentication"}
  this._clientOptions= this._defaultClientOptions= {"requestTokenHttpMethod": "POST",
                                                    "accessTokenHttpMethod": "POST"};
  this._oauthParameterSeperator = ",";
};

exports.OAuthEcho= function(realm, verify_credentials, consumerKey, consumerSecret, version, signatureMethod, nonceSize, customHeaders) {
  this._isEcho = true;

  this._realm= realm;
  this._verifyCredentials = verify_credentials;
  this._consumerKey= consumerKey;
  this._consumerSecret= this._encodeData( consumerSecret );
  this._version= version;

  if( signatureMethod != "PLAINTEXT" && signatureMethod != "HMAC-SHA1")
    throw new Error("Un-supported signature method: " + signatureMethod );
  this._signatureMethod= signatureMethod;
  this._nonceSize= nonceSize || 32;
  this._headers= customHeaders || {"Accept" : "*/*",
                                   "Connection" : "close",
                                   "User-Agent" : "Node authentication"};
  this._oauthParameterSeperator = ",";
}

exports.OAuthEcho.prototype = exports.OAuth.prototype;

exports.OAuth.prototype._getTimestamp= function() {
  return Math.floor( (new Date()).getTime() / 1000 );
}

exports.OAuth.prototype._encodeData= function(toEncode){
 if( toEncode == null || toEncode == "" ) return ""
 else {
    var result= encodeURIComponent(toEncode);
    // Fix the mismatch between OAuth's  RFC3986's and Javascript's beliefs in what is right and wrong ;)
    return result.replace(/\!/g, "%21")
                 .replace(/\'/g, "%27")
                 .replace(/\(/g, "%28")
                 .replace(/\)/g, "%29")
                 .replace(/\*/g, "%2A");
 }
}

exports.OAuth.prototype._decodeData= function(toDecode) {
  if( toDecode != null ) {
    toDecode = toDecode.replace(/\+/g, " ");
  }
  return decodeURIComponent( toDecode);
}

exports.OAuth.prototype._getSignature= function(method, url, parameters, tokenSecret) {
  var signatureBase= this._createSignatureBase(method, url, parameters);
  return this._createSignature( signatureBase, tokenSecret );
}

exports.OAuth.prototype._normalizeUrl= function(url) {
  var parsedUrl= URL.parse(url, true)
   var port ="";
   if( parsedUrl.port ) { 
     if( (parsedUrl.protocol == "http:" && parsedUrl.port != "80" ) ||
         (parsedUrl.protocol == "https:" && parsedUrl.port != "443") ) {
           port= ":" + parsedUrl.port;
         }
   }

  if( !parsedUrl.pathname  || parsedUrl.pathname == "" ) parsedUrl.pathname ="/";
   
  return parsedUrl.protocol + "//" + parsedUrl.hostname + port + parsedUrl.pathname;
}

// Is the parameter considered an OAuth parameter
exports.OAuth.prototype._isParameterNameAnOAuthParameter= function(parameter) {
  var m = parameter.match('^oauth_');
  if( m && ( m[0] === "oauth_" ) ) {
    return true;
  }
  else {
    return false;
  }
};

// build the OAuth request authorization header
exports.OAuth.prototype._buildAuthorizationHeaders= function(orderedParameters) {
  var authHeader="OAuth ";
  if( this._isEcho ) {
    authHeader += 'realm="' + this._realm + '",';
  }

  for( var i= 0 ; i < orderedParameters.length; i++) {
     // Whilst the all the parameters should be included within the signature, only the oauth_ arguments
     // should appear within the authorization header.
     if( this._isParameterNameAnOAuthParameter(orderedParameters[i][0]) ) {
      authHeader+= "" + this._encodeData(orderedParameters[i][0])+"=\""+ this._encodeData(orderedParameters[i][1])+"\""+ this._oauthParameterSeperator;
     }
  }

  authHeader= authHeader.substring(0, authHeader.length-this._oauthParameterSeperator.length);  
  return authHeader;
}

// Takes an object literal that represents the arguments, and returns an array
// of argument/value pairs.
exports.OAuth.prototype._makeArrayOfArgumentsHash= function(argumentsHash) {
  var argument_pairs= [];
  for(var key in argumentsHash ) {
       var value= argumentsHash[key];
       if( Array.isArray(value) ) {
         for(var i=0;i<value.length;i++) {
           argument_pairs[argument_pairs.length]= [key, value[i]];
         }
       }
       else {
         argument_pairs[argument_pairs.length]= [key, value];
       }
  }
  return argument_pairs;  
} 

// Sorts the encoded key value pairs by encoded name, then encoded value
exports.OAuth.prototype._sortRequestParams= function(argument_pairs) {
  // Sort by name, then value.
  argument_pairs.sort(function(a,b) {
      if ( a[0]== b[0] )  {
        return a[1] < b[1] ? -1 : 1; 
      }
      else return a[0] < b[0] ? -1 : 1;  
  });

  return argument_pairs;
}

exports.OAuth.prototype._normaliseRequestParams= function(arguments) {
  var argument_pairs= this._makeArrayOfArgumentsHash(arguments);
  // First encode them #3.4.1.3.2 .1
  for(var i=0;i<argument_pairs.length;i++) {
    argument_pairs[i][0]= this._encodeData( argument_pairs[i][0] );
    argument_pairs[i][1]= this._encodeData( argument_pairs[i][1] );
  }
  
  // Then sort them #3.4.1.3.2 .2
  argument_pairs= this._sortRequestParams( argument_pairs );
  
  // Then concatenate together #3.4.1.3.2 .3 & .4
  var args= "";
  for(var i=0;i<argument_pairs.length;i++) {
      args+= argument_pairs[i][0];
      args+= "="
      args+= argument_pairs[i][1];
      if( i < argument_pairs.length-1 ) args+= "&";
  }     
  return args;
}

exports.OAuth.prototype._createSignatureBase= function(method, url, parameters) {
  url= this._encodeData( this._normalizeUrl(url) ); 
  parameters= this._encodeData( parameters );
  return method.toUpperCase() + "&" + url + "&" + parameters;
}

exports.OAuth.prototype._createSignature= function(signatureBase, tokenSecret) {
   if( tokenSecret === undefined ) var tokenSecret= "";
   else tokenSecret= this._encodeData( tokenSecret ); 
   // consumerSecret is already encoded
   var key= this._consumerSecret + "&" + tokenSecret;

   var hash= ""
   if( this._signatureMethod == "PLAINTEXT" ) {
     hash= key;
   }
   else {
       if( crypto.Hmac ) {
         hash = crypto.createHmac("sha1", key).update(signatureBase).digest("base64");
       }
       else {
         hash= sha1.HMACSHA1(key, signatureBase);  
       }
   }
   return hash;
}
exports.OAuth.prototype.NONCE_CHARS= ['a','b','c','d','e','f','g','h','i','j','k','l','m','n',
              'o','p','q','r','s','t','u','v','w','x','y','z','A','B',
              'C','D','E','F','G','H','I','J','K','L','M','N','O','P',
              'Q','R','S','T','U','V','W','X','Y','Z','0','1','2','3',
              '4','5','6','7','8','9'];

exports.OAuth.prototype._getNonce= function(nonceSize) {
   var result = [];
   var chars= this.NONCE_CHARS;
   var char_pos;
   var nonce_chars_length= chars.length;
   
   for (var i = 0; i < nonceSize; i++) {
       char_pos= Math.floor(Math.random() * nonce_chars_length);
       result[i]=  chars[char_pos];
   }
   return result.join('');
}

exports.OAuth.prototype._createClient= function( port, hostname, method, path, headers, sslEnabled ) {
  var options = {
    host: hostname,
    port: port,
    path: path,
    method: method,
    headers: headers
  };
  var httpModel;
  if( sslEnabled ) {
    httpModel= https;
  } else {
    httpModel= http;
  }
  return httpModel.request(options);     
}

exports.OAuth.prototype._prepareParameters= function( oauth_token, oauth_token_secret, method, url, extra_params ) {
  var oauthParameters= {
      "oauth_timestamp":        this._getTimestamp(),
      "oauth_nonce":            this._getNonce(this._nonceSize),
      "oauth_version":          this._version,
      "oauth_signature_method": this._signatureMethod,
      "oauth_consumer_key":     this._consumerKey
  };

  if( oauth_token ) {
    oauthParameters["oauth_token"]= oauth_token;
  }

  var sig;
  if( this._isEcho ) {
    sig = this._getSignature( "GET",  this._verifyCredentials,  this._normaliseRequestParams(oauthParameters), oauth_token_secret);
  }
  else {
    if( extra_params ) {
      for( var key in extra_params ) {
           oauthParameters[key]= extra_params[key];
      }
    }
    var parsedUrl= URL.parse( url, false );

    if( parsedUrl.query ) {
      var key2;
      var extraParameters= querystring.parse(parsedUrl.query);
      for(var key in extraParameters ) {
        var value= extraParameters[key];
          if( typeof value == "object" ){
            // TODO: This probably should be recursive
            for(key2 in value){
              oauthParameters[key + "[" + key2 + "]"] = value[key2];
            }
          } else {
            oauthParameters[key]= value;
          }
        }
    }

    sig = this._getSignature( method,  url,  this._normaliseRequestParams(oauthParameters), oauth_token_secret);
  }

  var orderedParameters= this._sortRequestParams( this._makeArrayOfArgumentsHash(oauthParameters) );
  orderedParameters[orderedParameters.length]= ["oauth_signature", sig];
  return orderedParameters;
}

exports.OAuth.prototype._performSecureRequest= function( oauth_token, oauth_token_secret, method, url, extra_params, post_body, post_content_type,  callback ) {
  var orderedParameters= this._prepareParameters(oauth_token, oauth_token_secret, method, url, extra_params);

  if( !post_content_type ) {
    post_content_type= "application/x-www-form-urlencoded";
  }
  var parsedUrl= URL.parse( url, false );
  if( parsedUrl.protocol == "http:" && !parsedUrl.port ) parsedUrl.port= 80;
  if( parsedUrl.protocol == "https:" && !parsedUrl.port ) parsedUrl.port= 443;

  var headers= {};
  var authorization = this._buildAuthorizationHeaders(orderedParameters);
  if ( this._isEcho ) {
    headers["X-Verify-Credentials-Authorization"]= authorization;
  }
  else {
    headers["Authorization"]= authorization;
  }

  headers["Host"] = parsedUrl.host

  for( var key in this._headers ) {
    if (this._headers.hasOwnProperty(key)) {
      headers[key]= this._headers[key];
    }
  }

  // Filter out any passed extra_params that are really to do with OAuth
  for(var key in extra_params) {
    if( this._isParameterNameAnOAuthParameter( key ) ) {
      delete extra_params[key];
    }
  }

  if( (method == "POST" || method == "PUT")  && ( post_body == null && extra_params != null) ) {
    post_body= querystring.stringify(extra_params);
  }

  headers["Content-length"]= post_body ? Buffer.byteLength(post_body) : 0;
  headers["Content-Type"]= post_content_type;
   
  var path;
  if( !parsedUrl.pathname  || parsedUrl.pathname == "" ) parsedUrl.pathname ="/";
  if( parsedUrl.query ) path= parsedUrl.pathname + "?"+ parsedUrl.query ;
  else path= parsedUrl.pathname;

  var request;
  if( parsedUrl.protocol == "https:" ) {
    request= this._createClient(parsedUrl.port, parsedUrl.hostname, method, path, headers, true);
  }
  else {
    request= this._createClient(parsedUrl.port, parsedUrl.hostname, method, path, headers);
  }

  if( callback ) {
    var data=""; 
    var self= this;

    // Some hosts *cough* google appear to close the connection early / send no content-length header
    // allow this behaviour.
    var allowEarlyClose= OAuthUtils.isAnEarlyCloseHost( parsedUrl.hostname );
    var callbackCalled= false;
    function passBackControl( response ) {
      if(!callbackCalled) {
        callbackCalled= true;
        if ( response.statusCode >= 200 && response.statusCode <= 299 ) {
          callback(null, data, response);
        } else {
          // Follow 301 or 302 redirects with Location HTTP header
          if((response.statusCode == 301 || response.statusCode == 302) && response.headers && response.headers.location) {
            self._performSecureRequest( oauth_token, oauth_token_secret, method, response.headers.location, extra_params, post_body, post_content_type,  callback);
          }
          else {
            callback({ statusCode: response.statusCode, data: data }, data, response);
          }
        }
      }
    }

    request.on('response', function (response) {
      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        data+=chunk;
      });
      response.on('end', function () {
        passBackControl( response );
      });
      response.on('close', function () {
        if( allowEarlyClose ) {
          passBackControl( response );
        }
      });
    });
  
    request.on("error", function(err) {
      callbackCalled= true;
      callback( err )
    });
    
    if( (method == "POST" || method =="PUT") && post_body != null && post_body != "" ) {
      request.write(post_body);
    }
    request.end();
  }
  else {
    if( (method == "POST" || method =="PUT") && post_body != null && post_body != "" ) {
      request.write(post_body);
    }
    return request;
  }
  
  return;
}

exports.OAuth.prototype.setClientOptions= function(options) {
  var key,
      mergedOptions= {},
      hasOwnProperty= Object.prototype.hasOwnProperty;

  for( key in this._defaultClientOptions ) {
    if( !hasOwnProperty.call(options, key) ) {
      mergedOptions[key]= this._defaultClientOptions[key];
    } else {
      mergedOptions[key]= options[key];
    }
  }

  this._clientOptions= mergedOptions;
};

exports.OAuth.prototype.getOAuthAccessToken= function(oauth_token, oauth_token_secret, oauth_verifier,  callback) {
  var extraParams= {};
  if( typeof oauth_verifier == "function" ) {
    callback= oauth_verifier;
  } else {
    extraParams.oauth_verifier= oauth_verifier;
  }
  
   this._performSecureRequest( oauth_token, oauth_token_secret, this._clientOptions.accessTokenHttpMethod, this._accessUrl, extraParams, null, null, function(error, data, response) {
         if( error ) callback(error);
         else {
           var results= querystring.parse( data );
           var oauth_access_token= results["oauth_token"];
           delete results["oauth_token"];
           var oauth_access_token_secret= results["oauth_token_secret"];
           delete results["oauth_token_secret"];
           callback(null, oauth_access_token, oauth_access_token_secret, results );
         }
   })
}

// Deprecated
exports.OAuth.prototype.getProtectedResource= function(url, method, oauth_token, oauth_token_secret, callback) {
  this._performSecureRequest( oauth_token, oauth_token_secret, method, url, null, "", null, callback );
}

exports.OAuth.prototype.delete= function(url, oauth_token, oauth_token_secret, callback) {
  return this._performSecureRequest( oauth_token, oauth_token_secret, "DELETE", url, null, "", null, callback );
}

exports.OAuth.prototype.get= function(url, oauth_token, oauth_token_secret, callback) {
  return this._performSecureRequest( oauth_token, oauth_token_secret, "GET", url, null, "", null, callback );
}

exports.OAuth.prototype._putOrPost= function(method, url, oauth_token, oauth_token_secret, post_body, post_content_type, callback) {
  var extra_params= null;
  if( typeof post_content_type == "function" ) {
    callback= post_content_type;
    post_content_type= null;
  }
  if( typeof post_body != "string" ) {
    post_content_type= "application/x-www-form-urlencoded"
    extra_params= post_body;
    post_body= null;
  }
  return this._performSecureRequest( oauth_token, oauth_token_secret, method, url, extra_params, post_body, post_content_type, callback );
}
 

exports.OAuth.prototype.put= function(url, oauth_token, oauth_token_secret, post_body, post_content_type, callback) {
  return this._putOrPost("PUT", url, oauth_token, oauth_token_secret, post_body, post_content_type, callback);
}

exports.OAuth.prototype.post= function(url, oauth_token, oauth_token_secret, post_body, post_content_type, callback) {
  return this._putOrPost("POST", url, oauth_token, oauth_token_secret, post_body, post_content_type, callback);
}

/**
 * Gets a request token from the OAuth provider and passes that information back
 * to the calling code.
 *
 * The callback should expect a function of the following form:
 *
 * function(err, token, token_secret, parsedQueryString) {} 
 *
 * This method has optional parameters so can be called in the following 2 ways:
 *
 * 1) Primary use case: Does a basic request with no extra parameters
 *  getOAuthRequestToken( callbackFunction )
 *
 * 2) As above but allows for provision of extra parameters to be sent as part of the query to the server.
 *  getOAuthRequestToken( extraParams, callbackFunction )
 *
 * N.B. This method will HTTP POST verbs by default, if you wish to override this behaviour you will
 * need to provide a requestTokenHttpMethod option when creating the client.
 *
 **/
exports.OAuth.prototype.getOAuthRequestToken= function( extraParams, callback ) {
   if( typeof extraParams == "function" ){
     callback = extraParams;
     extraParams = {};
   }
  // Callbacks are 1.0A related 
  if( this._authorize_callback ) {
    extraParams["oauth_callback"]= this._authorize_callback;
  }
  this._performSecureRequest( null, null, this._clientOptions.requestTokenHttpMethod, this._requestUrl, extraParams, null, null, function(error, data, response) {
    if( error ) callback(error);
    else {
      var results= querystring.parse(data);

      var oauth_token= results["oauth_token"];
      var oauth_token_secret= results["oauth_token_secret"];
      delete results["oauth_token"];
      delete results["oauth_token_secret"];
      callback(null, oauth_token, oauth_token_secret,  results );
    }
  });
}

exports.OAuth.prototype.signUrl= function(url, oauth_token, oauth_token_secret, method) {

  if( method === undefined ) {
    var method= "GET";
  }

  var orderedParameters= this._prepareParameters(oauth_token, oauth_token_secret, method, url, {});
  var parsedUrl= URL.parse( url, false );

  var query=""; 
  for( var i= 0 ; i < orderedParameters.length; i++) {
    query+= orderedParameters[i][0]+"="+ this._encodeData(orderedParameters[i][1]) + "&";
  }
  query= query.substring(0, query.length-1);
 
  return parsedUrl.protocol + "//"+ parsedUrl.host + parsedUrl.pathname + "?" + query;
};

exports.OAuth.prototype.authHeader= function(url, oauth_token, oauth_token_secret, method) {
  if( method === undefined ) {
    var method= "GET";
  }

  var orderedParameters= this._prepareParameters(oauth_token, oauth_token_secret, method, url, {});
  return this._buildAuthorizationHeaders(orderedParameters);
};

}).call(this,require("buffer").Buffer)
},{"./_utils":67,"./sha1":70,"buffer":72,"crypto":76,"http":"j1g5Bd","https":82,"querystring":89,"url":104}],69:[function(require,module,exports){
(function (Buffer){
var querystring= require('querystring'),
    crypto= require('crypto'),
    https= require('https'),
    http= require('http'),
    URL= require('url'),
    OAuthUtils= require('./_utils');

exports.OAuth2= function(clientId, clientSecret, baseSite, authorizePath, accessTokenPath) {
  this._clientId= clientId;
  this._clientSecret= clientSecret;
  this._baseSite= baseSite;
  this._authorizeUrl= authorizePath || "/oauth/authorize";
  this._accessTokenUrl= accessTokenPath || "/oauth/access_token";
  this._accessTokenName= "access_token";
}

// This 'hack' method is required for sites that don't use
// 'access_token' as the name of the access token (for requests).
// ( http://tools.ietf.org/html/draft-ietf-oauth-v2-16#section-7 )
// it isn't clear what the correct value should be atm, so allowing
// for specific (temporary?) override for now.
exports.OAuth2.prototype.setAccessTokenName= function ( name ) {
  this._accessTokenName= name;
}

exports.OAuth2.prototype._getAccessTokenUrl= function() {
  return this._baseSite + this._accessTokenUrl; /* + "?" + querystring.stringify(params); */
}

exports.OAuth2.prototype._request= function(method, url, headers, post_body, access_token, callback) {

  var http_library= https;
  var creds = crypto.createCredentials({ });
  var parsedUrl= URL.parse( url, true );
  if( parsedUrl.protocol == "https:" && !parsedUrl.port ) {
    parsedUrl.port= 443;
  }

  // As this is OAUth2, we *assume* https unless told explicitly otherwise.
  if( parsedUrl.protocol != "https:" ) {
    http_library= http;
  }

  var realHeaders= {};
  if( headers ) {
    for(var key in headers) {
      realHeaders[key] = headers[key];
    }
  }
  realHeaders['Host']= parsedUrl.host;

  realHeaders['Content-Length']= post_body ? Buffer.byteLength(post_body) : 0;
  if( access_token ) {
    if( ! parsedUrl.query ) parsedUrl.query= {};
    parsedUrl.query[this._accessTokenName]= access_token;
  }

  var result= "";
  var queryStr= querystring.stringify(parsedUrl.query);
  if( queryStr ) queryStr=  "?" + queryStr;
  var options = {
    host:parsedUrl.hostname,
    port: parsedUrl.port,
    path: parsedUrl.pathname + queryStr,
    method: method,
    headers: realHeaders
  };

  // Some hosts *cough* google appear to close the connection early / send no content-length header
  // allow this behaviour.
  var allowEarlyClose= OAuthUtils.isAnEarlyCloseHost(options.host);
  var callbackCalled= false;
  function passBackControl( response, result ) {
    if(!callbackCalled) {
      callbackCalled=true;
      if( response.statusCode != 200 && (response.statusCode != 301) && (response.statusCode != 302) ) {
        callback({ statusCode: response.statusCode, data: result });
      } else {
        callback(null, result, response);
      }
    }
  }

  var request = http_library.request(options, function (response) {
    response.on("data", function (chunk) {
      result+= chunk
    });
    response.on("close", function (err) {
      if( allowEarlyClose ) {
        passBackControl( response, result );
      }
    });
    response.addListener("end", function () {
      passBackControl( response, result );
    });
  });
  request.on('error', function(e) {
    callbackCalled= true;
    callback(e);
  });

  if(  method == 'POST' && post_body ) {
     request.write(post_body);
  }
  request.end();
}


exports.OAuth2.prototype.getAuthorizeUrl= function( params ) {
  var params= params || {};
  params['client_id'] = this._clientId;
  params['type'] = 'web_server';
  return this._baseSite + this._authorizeUrl + "?" + querystring.stringify(params);
}

exports.OAuth2.prototype.getOAuthAccessToken= function(code, params, callback) {
  var params= params || {};
  params['client_id'] = this._clientId;
  params['client_secret'] = this._clientSecret;
  params['type']= 'web_server';
  var codeParam = (params.grant_type === 'refresh_token') ? 'refresh_token' : 'code';
  params[codeParam]= code;

  var post_data= querystring.stringify( params );
  var post_headers= {
       'Content-Type': 'application/x-www-form-urlencoded'
   };


  this._request("POST", this._getAccessTokenUrl(), post_headers, post_data, null, function(error, data, response) {
    if( error )  callback(error);
    else {
      var results;
      try {
        // As of http://tools.ietf.org/html/draft-ietf-oauth-v2-07
        // responses should be in JSON
        results= JSON.parse( data );
      }
      catch(e) {
        // .... However both Facebook + Github currently use rev05 of the spec
        // and neither seem to specify a content-type correctly in their response headers :(
        // clients of these services will suffer a *minor* performance cost of the exception
        // being thrown
        results= querystring.parse( data );
      }
      var access_token= results["access_token"];
      var refresh_token= results["refresh_token"];
      delete results["refresh_token"];
      callback(null, access_token, refresh_token, results); // callback results =-=
    }
  });
}

// Deprecated
exports.OAuth2.prototype.getProtectedResource= function(url, access_token, callback) {
  this._request("GET", url, {}, "", access_token, callback );
}

exports.OAuth2.prototype.get= function(url, access_token, callback) {
  this._request("GET", url, {}, "", access_token, callback );
}

}).call(this,require("buffer").Buffer)
},{"./_utils":67,"buffer":72,"crypto":76,"http":"j1g5Bd","https":82,"querystring":89,"url":104}],70:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS 180-1
 * Version 2.2 Copyright Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 1;  /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "="; /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_sha1(s)    { return rstr2hex(rstr_sha1(str2rstr_utf8(s))); }
function b64_sha1(s)    { return rstr2b64(rstr_sha1(str2rstr_utf8(s))); }
function any_sha1(s, e) { return rstr2any(rstr_sha1(str2rstr_utf8(s)), e); }
function hex_hmac_sha1(k, d)
  { return rstr2hex(rstr_hmac_sha1(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_sha1(k, d)
  { return rstr2b64(rstr_hmac_sha1(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_sha1(k, d, e)
  { return rstr2any(rstr_hmac_sha1(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function sha1_vm_test()
{
  return hex_sha1("abc").toLowerCase() == "a9993e364706816aba3e25717850c26c9cd0d89d";
}

/*
 * Calculate the SHA1 of a raw string
 */
function rstr_sha1(s)
{
  return binb2rstr(binb_sha1(rstr2binb(s), s.length * 8));
}

/*
 * Calculate the HMAC-SHA1 of a key and some data (raw strings)
 */
function rstr_hmac_sha1(key, data)
{
  var bkey = rstr2binb(key);
  if(bkey.length > 16) bkey = binb_sha1(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binb_sha1(ipad.concat(rstr2binb(data)), 512 + data.length * 8);
  return binb2rstr(binb_sha1(opad.concat(hash), 512 + 160));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var remainders = Array();
  var i, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. We stop when the dividend is zero.
   * All remainders are stored for later use.
   */
  while(dividend.length > 0)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[remainders.length] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  /* Append leading zero equivalents */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)))
  for(i = output.length; i < full_length; i++)
    output = encoding[0] + output;

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of big-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binb(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
  return output;
}

/*
 * Convert an array of big-endian words to a string
 */
function binb2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (24 - i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function binb_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = bit_rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(bit_rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = bit_rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

exports.HMACSHA1= function(key, data) {
  return b64_hmac_sha1(key, data);
}
},{}],71:[function(require,module,exports){

},{}],72:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    if (Buffer.isBuffer(subject)) {
      for (i = 0; i < length; i++)
        buf[i] = subject.readUInt8(i)
    } else {
      for (i = 0; i < length; i++)
        buf[i] = ((subject[i] % 256) + 256) % 256
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str.toString()
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list[, length])')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (totalLength === undefined) {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

Buffer.compare = function (a, b) {
  assert(Buffer.isBuffer(a) && Buffer.isBuffer(b), 'Arguments must be Buffers')
  var x = a.length
  var y = b.length
  for (var i = 0, len = Math.min(x, y); i < len && a[i] === b[i]; i++) {}
  if (i !== len) {
    x = a[i]
    y = b[i]
  }
  if (x < y) {
    return -1
  }
  if (y < x) {
    return 1
  }
  return 0
}

// BUFFER INSTANCE METHODS
// =======================

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function asciiWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  var charsWritten = blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function utf16leWrite (buf, string, offset, length) {
  var charsWritten = blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end === undefined) ? self.length : Number(end)

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = asciiSlice(self, start, end)
      break
    case 'binary':
      ret = binarySlice(self, start, end)
      break
    case 'base64':
      ret = base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

Buffer.prototype.equals = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.compare = function (b) {
  assert(Buffer.isBuffer(b), 'Argument must be a Buffer')
  return Buffer.compare(this, b)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++) {
      target[i + target_start] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function binarySlice (buf, start, end) {
  return asciiSlice(buf, start, end)
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return readUInt16(this, offset, false, noAssert)
}

function readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return readInt16(this, offset, false, noAssert)
}

function readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return readInt32(this, offset, false, noAssert)
}

function readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return readFloat(this, offset, false, noAssert)
}

function readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
  return offset + 1
}

function writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
  return offset + 2
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  return writeUInt16(this, value, offset, false, noAssert)
}

function writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
  return offset + 4
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  return writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
  return offset + 1
}

function writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
  return offset + 2
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  return writeInt16(this, value, offset, false, noAssert)
}

function writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
  return offset + 4
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  return writeInt32(this, value, offset, false, noAssert)
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  var i
  if (typeof value === 'number') {
    for (i = start; i < end; i++) {
      this[i] = value
    }
  } else {
    var bytes = utf8ToBytes(value.toString())
    var len = bytes.length
    for (i = start; i < end; i++) {
      this[i] = bytes[i % len]
    }
  }

  return this
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.equals = BP.equals
  arr.compare = BP.compare
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F) {
      byteArray.push(b)
    } else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++) {
        byteArray.push(parseInt(h[j], 16))
      }
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":73,"ieee754":74}],73:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],74:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],75:[function(require,module,exports){
var Buffer = require('buffer').Buffer;
var intSize = 4;
var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
var chrsz = 8;

function toArray(buf, bigEndian) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize));
    buf = Buffer.concat([buf, zeroBuffer], len);
  }

  var arr = [];
  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
  for (var i = 0; i < buf.length; i += intSize) {
    arr.push(fn.call(buf, i));
  }
  return arr;
}

function toBuffer(arr, size, bigEndian) {
  var buf = new Buffer(size);
  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
  for (var i = 0; i < arr.length; i++) {
    fn.call(buf, arr[i], i * 4, true);
  }
  return buf;
}

function hash(buf, fn, hashSize, bigEndian) {
  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
  return toBuffer(arr, hashSize, bigEndian);
}

module.exports = { hash: hash };

},{"buffer":72}],76:[function(require,module,exports){
var Buffer = require('buffer').Buffer
var sha = require('./sha')
var sha256 = require('./sha256')
var rng = require('./rng')
var md5 = require('./md5')

var algorithms = {
  sha1: sha,
  sha256: sha256,
  md5: md5
}

var blocksize = 64
var zeroBuffer = new Buffer(blocksize); zeroBuffer.fill(0)
function hmac(fn, key, data) {
  if(!Buffer.isBuffer(key)) key = new Buffer(key)
  if(!Buffer.isBuffer(data)) data = new Buffer(data)

  if(key.length > blocksize) {
    key = fn(key)
  } else if(key.length < blocksize) {
    key = Buffer.concat([key, zeroBuffer], blocksize)
  }

  var ipad = new Buffer(blocksize), opad = new Buffer(blocksize)
  for(var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  var hash = fn(Buffer.concat([ipad, data]))
  return fn(Buffer.concat([opad, hash]))
}

function hash(alg, key) {
  alg = alg || 'sha1'
  var fn = algorithms[alg]
  var bufs = []
  var length = 0
  if(!fn) error('algorithm:', alg, 'is not yet supported')
  return {
    update: function (data) {
      if(!Buffer.isBuffer(data)) data = new Buffer(data)
        
      bufs.push(data)
      length += data.length
      return this
    },
    digest: function (enc) {
      var buf = Buffer.concat(bufs)
      var r = key ? hmac(fn, key, buf) : fn(buf)
      bufs = null
      return enc ? r.toString(enc) : r
    }
  }
}

function error () {
  var m = [].slice.call(arguments).join(' ')
  throw new Error([
    m,
    'we accept pull requests',
    'http://github.com/dominictarr/crypto-browserify'
    ].join('\n'))
}

exports.createHash = function (alg) { return hash(alg) }
exports.createHmac = function (alg, key) { return hash(alg, key) }
exports.randomBytes = function(size, callback) {
  if (callback && callback.call) {
    try {
      callback.call(this, undefined, new Buffer(rng(size)))
    } catch (err) { callback(err) }
  } else {
    return new Buffer(rng(size))
  }
}

function each(a, f) {
  for(var i in a)
    f(a[i], i)
}

// the least I can do is make error messages for the rest of the node.js/crypto api.
each(['createCredentials'
, 'createCipher'
, 'createCipheriv'
, 'createDecipher'
, 'createDecipheriv'
, 'createSign'
, 'createVerify'
, 'createDiffieHellman'
, 'pbkdf2'], function (name) {
  exports[name] = function () {
    error('sorry,', name, 'is not implemented yet')
  }
})

},{"./md5":77,"./rng":78,"./sha":79,"./sha256":80,"buffer":72}],77:[function(require,module,exports){
/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var helpers = require('./helpers');

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc") == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);

}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function md5(buf) {
  return helpers.hash(buf, core_md5, 16);
};

},{"./helpers":75}],78:[function(require,module,exports){
// Original code adapted from Robert Kieffer.
// details at https://github.com/broofa/node-uuid
(function() {
  var _global = this;

  var mathRNG, whatwgRNG;

  // NOTE: Math.random() does not guarantee "cryptographic quality"
  mathRNG = function(size) {
    var bytes = new Array(size);
    var r;

    for (var i = 0, r; i < size; i++) {
      if ((i & 0x03) == 0) r = Math.random() * 0x100000000;
      bytes[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return bytes;
  }

  if (_global.crypto && crypto.getRandomValues) {
    whatwgRNG = function(size) {
      var bytes = new Uint8Array(size);
      crypto.getRandomValues(bytes);
      return bytes;
    }
  }

  module.exports = whatwgRNG || mathRNG;

}())

},{}],79:[function(require,module,exports){
/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var helpers = require('./helpers');

/*
 * Calculate the SHA-1 of an array of big-endian words, and a bit length
 */
function core_sha1(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << (24 - len % 32);
  x[((len + 64 >> 9) << 4) + 15] = len;

  var w = Array(80);
  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;
  var e = -1009589776;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;
    var olde = e;

    for(var j = 0; j < 80; j++)
    {
      if(j < 16) w[j] = x[i + j];
      else w[j] = rol(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
      var t = safe_add(safe_add(rol(a, 5), sha1_ft(j, b, c, d)),
                       safe_add(safe_add(e, w[j]), sha1_kt(j)));
      e = d;
      d = c;
      c = rol(b, 30);
      b = a;
      a = t;
    }

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
    e = safe_add(e, olde);
  }
  return Array(a, b, c, d, e);

}

/*
 * Perform the appropriate triplet combination function for the current
 * iteration
 */
function sha1_ft(t, b, c, d)
{
  if(t < 20) return (b & c) | ((~b) & d);
  if(t < 40) return b ^ c ^ d;
  if(t < 60) return (b & c) | (b & d) | (c & d);
  return b ^ c ^ d;
}

/*
 * Determine the appropriate additive constant for the current iteration
 */
function sha1_kt(t)
{
  return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
         (t < 60) ? -1894007588 : -899497514;
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

module.exports = function sha1(buf) {
  return helpers.hash(buf, core_sha1, 20, true);
};

},{"./helpers":75}],80:[function(require,module,exports){

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var helpers = require('./helpers');

var safe_add = function(x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
};

var S = function(X, n) {
  return (X >>> n) | (X << (32 - n));
};

var R = function(X, n) {
  return (X >>> n);
};

var Ch = function(x, y, z) {
  return ((x & y) ^ ((~x) & z));
};

var Maj = function(x, y, z) {
  return ((x & y) ^ (x & z) ^ (y & z));
};

var Sigma0256 = function(x) {
  return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
};

var Sigma1256 = function(x) {
  return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
};

var Gamma0256 = function(x) {
  return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
};

var Gamma1256 = function(x) {
  return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
};

var core_sha256 = function(m, l) {
  var K = new Array(0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0xFC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x6CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2);
  var HASH = new Array(0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19);
    var W = new Array(64);
    var a, b, c, d, e, f, g, h, i, j;
    var T1, T2;
  /* append padding */
  m[l >> 5] |= 0x80 << (24 - l % 32);
  m[((l + 64 >> 9) << 4) + 15] = l;
  for (var i = 0; i < m.length; i += 16) {
    a = HASH[0]; b = HASH[1]; c = HASH[2]; d = HASH[3]; e = HASH[4]; f = HASH[5]; g = HASH[6]; h = HASH[7];
    for (var j = 0; j < 64; j++) {
      if (j < 16) {
        W[j] = m[j + i];
      } else {
        W[j] = safe_add(safe_add(safe_add(Gamma1256(W[j - 2]), W[j - 7]), Gamma0256(W[j - 15])), W[j - 16]);
      }
      T1 = safe_add(safe_add(safe_add(safe_add(h, Sigma1256(e)), Ch(e, f, g)), K[j]), W[j]);
      T2 = safe_add(Sigma0256(a), Maj(a, b, c));
      h = g; g = f; f = e; e = safe_add(d, T1); d = c; c = b; b = a; a = safe_add(T1, T2);
    }
    HASH[0] = safe_add(a, HASH[0]); HASH[1] = safe_add(b, HASH[1]); HASH[2] = safe_add(c, HASH[2]); HASH[3] = safe_add(d, HASH[3]);
    HASH[4] = safe_add(e, HASH[4]); HASH[5] = safe_add(f, HASH[5]); HASH[6] = safe_add(g, HASH[6]); HASH[7] = safe_add(h, HASH[7]);
  }
  return HASH;
};

module.exports = function sha256(buf) {
  return helpers.hash(buf, core_sha256, 32, true);
};

},{"./helpers":75}],81:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],82:[function(require,module,exports){
var http = require('http');

var https = module.exports;

for (var key in http) {
    if (http.hasOwnProperty(key)) https[key] = http[key];
};

https.request = function (params, cb) {
    if (!params) params = {};
    params.scheme = 'https';
    return http.request.call(this, params, cb);
}

},{"http":"j1g5Bd"}],83:[function(require,module,exports){
module.exports=require(10)
},{}],84:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require("xeDTxS"))
},{"xeDTxS":85}],85:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],86:[function(require,module,exports){
(function (global){
/*! http://mths.be/punycode v1.2.4 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports;
	var freeModule = typeof module == 'object' && module &&
		module.exports == freeExports && module;
	var freeGlobal = typeof global == 'object' && global;
	if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^ -~]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /\x2E|\u3002|\uFF0E|\uFF61/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		while (length--) {
			array[length] = fn(array[length]);
		}
		return array;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings.
	 * @private
	 * @param {String} domain The domain name.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		return map(string.split(regexSeparators), fn).join('.');
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <http://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * http://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols to a Punycode string of ASCII-only
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name to Unicode. Only the
	 * Punycoded parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it on a string that has already been converted to
	 * Unicode.
	 * @memberOf punycode
	 * @param {String} domain The Punycode domain name to convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(domain) {
		return mapDomain(domain, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name to Punycode. Only the
	 * non-ASCII parts of the domain name will be converted, i.e. it doesn't
	 * matter if you call it with a domain that's already in ASCII.
	 * @memberOf punycode
	 * @param {String} domain The domain name to convert, as a Unicode string.
	 * @returns {String} The Punycode representation of the given domain name.
	 */
	function toASCII(domain) {
		return mapDomain(domain, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.2.4',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <http://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && !freeExports.nodeType) {
		if (freeModule) { // in Node.js or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else { // in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else { // in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],87:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],88:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],89:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":87,"./encode":88}],90:[function(require,module,exports){
module.exports = require("./lib/_stream_duplex.js")

},{"./lib/_stream_duplex.js":91}],91:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.

module.exports = Duplex;

/*<replacement>*/
var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}
/*</replacement>*/


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var Readable = require('./_stream_readable');
var Writable = require('./_stream_writable');

util.inherits(Duplex, Readable);

forEach(objectKeys(Writable.prototype), function(method) {
  if (!Duplex.prototype[method])
    Duplex.prototype[method] = Writable.prototype[method];
});

function Duplex(options) {
  if (!(this instanceof Duplex))
    return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false)
    this.readable = false;

  if (options && options.writable === false)
    this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false)
    this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended)
    return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  process.nextTick(this.end.bind(this));
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

}).call(this,require("xeDTxS"))
},{"./_stream_readable":93,"./_stream_writable":95,"core-util-is":96,"inherits":83,"xeDTxS":85}],92:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.

module.exports = PassThrough;

var Transform = require('./_stream_transform');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough))
    return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function(chunk, encoding, cb) {
  cb(null, chunk);
};

},{"./_stream_transform":94,"core-util-is":96,"inherits":83}],93:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Readable;

/*<replacement>*/
var isArray = require('isarray');
/*</replacement>*/


/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = require('events').EventEmitter;

/*<replacement>*/
if (!EE.listenerCount) EE.listenerCount = function(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

var Stream = require('stream');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

function ReadableState(options, stream) {
  options = options || {};

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = false;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // In streams that never have any data, and do push(null) right away,
  // the consumer can miss the 'end' event if they do some I/O before
  // consuming the stream.  So, we don't emit('end') until some reading
  // happens.
  this.calledRead = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;


  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder)
      StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  if (!(this instanceof Readable))
    return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function(chunk, encoding) {
  var state = this._readableState;

  if (typeof chunk === 'string' && !state.objectMode) {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function(chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null || chunk === undefined) {
    state.reading = false;
    if (!state.ended)
      onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      if (state.decoder && !addToFront && !encoding)
        chunk = state.decoder.write(chunk);

      // update the buffer info.
      state.length += state.objectMode ? 1 : chunk.length;
      if (addToFront) {
        state.buffer.unshift(chunk);
      } else {
        state.reading = false;
        state.buffer.push(chunk);
      }

      if (state.needReadable)
        emitReadable(stream);

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}



// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended &&
         (state.needReadable ||
          state.length < state.highWaterMark ||
          state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function(enc) {
  if (!StringDecoder)
    StringDecoder = require('string_decoder/').StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
};

// Don't raise the hwm > 128MB
var MAX_HWM = 0x800000;
function roundUpToNextPowerOf2(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    for (var p = 1; p < 32; p <<= 1) n |= n >> p;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended)
    return 0;

  if (state.objectMode)
    return n === 0 ? 0 : 1;

  if (isNaN(n) || n === null) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length)
      return state.buffer[0].length;
    else
      return state.length;
  }

  if (n <= 0)
    return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark)
    state.highWaterMark = roundUpToNextPowerOf2(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else
      return state.length;
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function(n) {
  var state = this._readableState;
  state.calledRead = true;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0)
    state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 &&
      state.needReadable &&
      (state.length >= state.highWaterMark || state.ended)) {
    emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0)
      endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;

  // if we currently have less than the highWaterMark, then also read some
  if (state.length - n <= state.highWaterMark)
    doRead = true;

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading)
    doRead = false;

  if (doRead) {
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0)
      state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read called its callback synchronously, then `reading`
  // will be false, and we need to re-evaluate how much data we
  // can return to the user.
  if (doRead && !state.reading)
    n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0)
    ret = fromList(n, state);
  else
    ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended)
    state.needReadable = true;

  // If we happened to read() exactly the remaining amount in the
  // buffer, and the EOF has been seen at this point, then make sure
  // that we emit 'end' on the very next tick.
  if (state.ended && !state.endEmitted && state.length === 0)
    endReadable(this);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode &&
      !er) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}


function onEofChunk(stream, state) {
  if (state.decoder && !state.ended) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // if we've ended and we have some data left, then emit
  // 'readable' now to make sure it gets picked up.
  if (state.length > 0)
    emitReadable(stream);
  else
    endReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (state.emittedReadable)
    return;

  state.emittedReadable = true;
  if (state.sync)
    process.nextTick(function() {
      emitReadable_(stream);
    });
  else
    emitReadable_(stream);
}

function emitReadable_(stream) {
  stream.emit('readable');
}


// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(function() {
      maybeReadMore_(stream, state);
    });
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended &&
         state.length < state.highWaterMark) {
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;
    else
      len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function(n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function(dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;

  var doEnd = (!pipeOpts || pipeOpts.end !== false) &&
              dest !== process.stdout &&
              dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted)
    process.nextTick(endFn);
  else
    src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    if (readable !== src) return;
    cleanup();
  }

  function onend() {
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  function cleanup() {
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (!dest._writableState || dest._writableState.needDrain)
      ondrain();
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    unpipe();
    dest.removeListener('error', onerror);
    if (EE.listenerCount(dest, 'error') === 0)
      dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error)
    dest.on('error', onerror);
  else if (isArray(dest._events.error))
    dest._events.error.unshift(onerror);
  else
    dest._events.error = [onerror, dest._events.error];



  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    // the handler that waits for readable events after all
    // the data gets sucked out in flow.
    // This would be easier to follow with a .once() handler
    // in flow(), but that is too slow.
    this.on('readable', pipeOnReadable);

    state.flowing = true;
    process.nextTick(function() {
      flow(src);
    });
  }

  return dest;
};

function pipeOnDrain(src) {
  return function() {
    var dest = this;
    var state = src._readableState;
    state.awaitDrain--;
    if (state.awaitDrain === 0)
      flow(src);
  };
}

function flow(src) {
  var state = src._readableState;
  var chunk;
  state.awaitDrain = 0;

  function write(dest, i, list) {
    var written = dest.write(chunk);
    if (false === written) {
      state.awaitDrain++;
    }
  }

  while (state.pipesCount && null !== (chunk = src.read())) {

    if (state.pipesCount === 1)
      write(state.pipes, 0, null);
    else
      forEach(state.pipes, write);

    src.emit('data', chunk);

    // if anyone needs a drain, then we have to wait for that.
    if (state.awaitDrain > 0)
      return;
  }

  // if every destination was unpiped, either before entering this
  // function, or in the while loop, then stop flowing.
  //
  // NB: This is a pretty rare edge case.
  if (state.pipesCount === 0) {
    state.flowing = false;

    // if there were data event listeners added, then switch to old mode.
    if (EE.listenerCount(src, 'data') > 0)
      emitDataEvents(src);
    return;
  }

  // at this point, no one needed a drain, so we just ran out of data
  // on the next readable event, start it over again.
  state.ranOut = true;
}

function pipeOnReadable() {
  if (this._readableState.ranOut) {
    this._readableState.ranOut = false;
    flow(this);
  }
}


Readable.prototype.unpipe = function(dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0)
    return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes)
      return this;

    if (!dest)
      dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;
    if (dest)
      dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    this.removeListener('readable', pipeOnReadable);
    state.flowing = false;

    for (var i = 0; i < len; i++)
      dests[i].emit('unpipe', this);
    return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1)
    return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1)
    state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function(ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  if (ev === 'data' && !this._readableState.flowing)
    emitDataEvents(this);

  if (ev === 'readable' && this.readable) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        this.read(0);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function() {
  emitDataEvents(this);
  this.read(0);
  this.emit('resume');
};

Readable.prototype.pause = function() {
  emitDataEvents(this, true);
  this.emit('pause');
};

function emitDataEvents(stream, startPaused) {
  var state = stream._readableState;

  if (state.flowing) {
    // https://github.com/isaacs/readable-stream/issues/16
    throw new Error('Cannot switch to old mode now.');
  }

  var paused = startPaused || false;
  var readable = false;

  // convert to an old-style stream.
  stream.readable = true;
  stream.pipe = Stream.prototype.pipe;
  stream.on = stream.addListener = Stream.prototype.on;

  stream.on('readable', function() {
    readable = true;

    var c;
    while (!paused && (null !== (c = stream.read())))
      stream.emit('data', c);

    if (c === null) {
      readable = false;
      stream._readableState.needReadable = true;
    }
  });

  stream.pause = function() {
    paused = true;
    this.emit('pause');
  };

  stream.resume = function() {
    paused = false;
    if (readable)
      process.nextTick(function() {
        stream.emit('readable');
      });
    else
      this.read(0);
    this.emit('resume');
  };

  // now make it start, just in case it hadn't already.
  stream.emit('readable');
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function(stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function() {
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length)
        self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function(chunk) {
    if (state.decoder)
      chunk = state.decoder.write(chunk);
    if (!chunk || !state.objectMode && !chunk.length)
      return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (typeof stream[i] === 'function' &&
        typeof this[i] === 'undefined') {
      this[i] = function(method) { return function() {
        return stream[method].apply(stream, arguments);
      }}(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function(ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function(n) {
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};



// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0)
    return null;

  if (length === 0)
    ret = null;
  else if (objectMode)
    ret = list.shift();
  else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode)
      ret = list.join('');
    else
      ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode)
        ret = '';
      else
        ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode)
          ret += buf.slice(0, cpy);
        else
          buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length)
          list[0] = buf.slice(cpy);
        else
          list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0)
    throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted && state.calledRead) {
    state.ended = true;
    process.nextTick(function() {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    });
  }
}

function forEach (xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf (xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}

}).call(this,require("xeDTxS"))
},{"buffer":72,"core-util-is":96,"events":81,"inherits":83,"isarray":97,"stream":103,"string_decoder/":98,"xeDTxS":85}],94:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.

module.exports = Transform;

var Duplex = require('./_stream_duplex');

/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/

util.inherits(Transform, Duplex);


function TransformState(options, stream) {
  this.afterTransform = function(er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb)
    return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined)
    stream.push(data);

  if (cb)
    cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}


function Transform(options) {
  if (!(this instanceof Transform))
    return new Transform(options);

  Duplex.call(this, options);

  var ts = this._transformState = new TransformState(options, this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  this.once('finish', function() {
    if ('function' === typeof this._flush)
      this._flush(function(er) {
        done(stream, er);
      });
    else
      done(stream);
  });
}

Transform.prototype.push = function(chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function(chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function(chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform ||
        rs.needReadable ||
        rs.length < rs.highWaterMark)
      this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function(n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};


function done(stream, er) {
  if (er)
    return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var rs = stream._readableState;
  var ts = stream._transformState;

  if (ws.length)
    throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming)
    throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

},{"./_stream_duplex":91,"core-util-is":96,"inherits":83}],95:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// A bit simpler than readable streams.
// Implement an async ._write(chunk, cb), and it'll handle all
// the drain event emission and buffering.

module.exports = Writable;

/*<replacement>*/
var Buffer = require('buffer').Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;


/*<replacement>*/
var util = require('core-util-is');
util.inherits = require('inherits');
/*</replacement>*/


var Stream = require('stream');

util.inherits(Writable, Stream);

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
}

function WritableState(options, stream) {
  options = options || {};

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  this.highWaterMark = (hwm || hwm === 0) ? hwm : 16 * 1024;

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  // cast to ints.
  this.highWaterMark = ~~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, becuase any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function(er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.buffer = [];

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;
}

function Writable(options) {
  var Duplex = require('./_stream_duplex');

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex))
    return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function() {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};


function writeAfterEnd(stream, state, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  process.nextTick(function() {
    cb(er);
  });
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;
  if (!Buffer.isBuffer(chunk) &&
      'string' !== typeof chunk &&
      chunk !== null &&
      chunk !== undefined &&
      !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    process.nextTick(function() {
      cb(er);
    });
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function(chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  else if (!encoding)
    encoding = state.defaultEncoding;

  if (typeof cb !== 'function')
    cb = function() {};

  if (state.ended)
    writeAfterEnd(this, state, cb);
  else if (validChunk(this, state, chunk, cb))
    ret = writeOrBuffer(this, state, chunk, encoding, cb);

  return ret;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode &&
      state.decodeStrings !== false &&
      typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);
  if (Buffer.isBuffer(chunk))
    encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret)
    state.needDrain = true;

  if (state.writing)
    state.buffer.push(new WriteReq(chunk, encoding, cb));
  else
    doWrite(stream, state, len, chunk, encoding, cb);

  return ret;
}

function doWrite(stream, state, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  if (sync)
    process.nextTick(function() {
      cb(er);
    });
  else
    cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er)
    onwriteError(stream, state, sync, er, cb);
  else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(stream, state);

    if (!finished && !state.bufferProcessing && state.buffer.length)
      clearBuffer(stream, state);

    if (sync) {
      process.nextTick(function() {
        afterWrite(stream, state, finished, cb);
      });
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished)
    onwriteDrain(stream, state);
  cb();
  if (finished)
    finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}


// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;

  for (var c = 0; c < state.buffer.length; c++) {
    var entry = state.buffer[c];
    var chunk = entry.chunk;
    var encoding = entry.encoding;
    var cb = entry.callback;
    var len = state.objectMode ? 1 : chunk.length;

    doWrite(stream, state, len, chunk, encoding, cb);

    // if we didn't call the onwrite immediately, then
    // it means that we need to wait until it does.
    // also, that means that the chunk and cb are currently
    // being processed, so move the buffer counter past them.
    if (state.writing) {
      c++;
      break;
    }
  }

  state.bufferProcessing = false;
  if (c < state.buffer.length)
    state.buffer = state.buffer.slice(c);
  else
    state.buffer.length = 0;
}

Writable.prototype._write = function(chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype.end = function(chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (typeof chunk !== 'undefined' && chunk !== null)
    this.write(chunk, encoding);

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished)
    endWritable(this, state, cb);
};


function needFinish(stream, state) {
  return (state.ending &&
          state.length === 0 &&
          !state.finished &&
          !state.writing);
}

function finishMaybe(stream, state) {
  var need = needFinish(stream, state);
  if (need) {
    state.finished = true;
    stream.emit('finish');
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished)
      process.nextTick(cb);
    else
      stream.once('finish', cb);
  }
  state.ended = true;
}

}).call(this,require("xeDTxS"))
},{"./_stream_duplex":91,"buffer":72,"core-util-is":96,"inherits":83,"stream":103,"xeDTxS":85}],96:[function(require,module,exports){
(function (Buffer){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

function isBuffer(arg) {
  return Buffer.isBuffer(arg);
}
exports.isBuffer = isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}
}).call(this,require("buffer").Buffer)
},{"buffer":72}],97:[function(require,module,exports){
module.exports = Array.isArray || function (arr) {
  return Object.prototype.toString.call(arr) == '[object Array]';
};

},{}],98:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var Buffer = require('buffer').Buffer;

var isBufferEncoding = Buffer.isEncoding
  || function(encoding) {
       switch (encoding && encoding.toLowerCase()) {
         case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
         default: return false;
       }
     }


function assertEncoding(encoding) {
  if (encoding && !isBufferEncoding(encoding)) {
    throw new Error('Unknown encoding: ' + encoding);
  }
}

var StringDecoder = exports.StringDecoder = function(encoding) {
  this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
  assertEncoding(encoding);
  switch (this.encoding) {
    case 'utf8':
      // CESU-8 represents each of Surrogate Pair by 3-bytes
      this.surrogateSize = 3;
      break;
    case 'ucs2':
    case 'utf16le':
      // UTF-16 represents each of Surrogate Pair by 2-bytes
      this.surrogateSize = 2;
      this.detectIncompleteChar = utf16DetectIncompleteChar;
      break;
    case 'base64':
      // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
      this.surrogateSize = 3;
      this.detectIncompleteChar = base64DetectIncompleteChar;
      break;
    default:
      this.write = passThroughWrite;
      return;
  }

  this.charBuffer = new Buffer(6);
  this.charReceived = 0;
  this.charLength = 0;
};


StringDecoder.prototype.write = function(buffer) {
  var charStr = '';
  var offset = 0;

  // if our last write ended with an incomplete multibyte character
  while (this.charLength) {
    // determine how many remaining bytes this buffer has to offer for this char
    var i = (buffer.length >= this.charLength - this.charReceived) ?
                this.charLength - this.charReceived :
                buffer.length;

    // add the new bytes to the char buffer
    buffer.copy(this.charBuffer, this.charReceived, offset, i);
    this.charReceived += (i - offset);
    offset = i;

    if (this.charReceived < this.charLength) {
      // still not enough chars in this buffer? wait for more ...
      return '';
    }

    // get the character that was split
    charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

    // lead surrogate (D800-DBFF) is also the incomplete character
    var charCode = charStr.charCodeAt(charStr.length - 1);
    if (charCode >= 0xD800 && charCode <= 0xDBFF) {
      this.charLength += this.surrogateSize;
      charStr = '';
      continue;
    }
    this.charReceived = this.charLength = 0;

    // if there are no more bytes in this buffer, just emit our char
    if (i == buffer.length) return charStr;

    // otherwise cut off the characters end from the beginning of this buffer
    buffer = buffer.slice(i, buffer.length);
    break;
  }

  var lenIncomplete = this.detectIncompleteChar(buffer);

  var end = buffer.length;
  if (this.charLength) {
    // buffer the incomplete character bytes we got
    buffer.copy(this.charBuffer, 0, buffer.length - lenIncomplete, end);
    this.charReceived = lenIncomplete;
    end -= lenIncomplete;
  }

  charStr += buffer.toString(this.encoding, 0, end);

  var end = charStr.length - 1;
  var charCode = charStr.charCodeAt(end);
  // lead surrogate (D800-DBFF) is also the incomplete character
  if (charCode >= 0xD800 && charCode <= 0xDBFF) {
    var size = this.surrogateSize;
    this.charLength += size;
    this.charReceived += size;
    this.charBuffer.copy(this.charBuffer, size, 0, size);
    this.charBuffer.write(charStr.charAt(charStr.length - 1), this.encoding);
    return charStr.substring(0, end);
  }

  // or just emit the charStr
  return charStr;
};

StringDecoder.prototype.detectIncompleteChar = function(buffer) {
  // determine how many bytes we have to check at the end of this buffer
  var i = (buffer.length >= 3) ? 3 : buffer.length;

  // Figure out if one of the last i bytes of our buffer announces an
  // incomplete char.
  for (; i > 0; i--) {
    var c = buffer[buffer.length - i];

    // See http://en.wikipedia.org/wiki/UTF-8#Description

    // 110XXXXX
    if (i == 1 && c >> 5 == 0x06) {
      this.charLength = 2;
      break;
    }

    // 1110XXXX
    if (i <= 2 && c >> 4 == 0x0E) {
      this.charLength = 3;
      break;
    }

    // 11110XXX
    if (i <= 3 && c >> 3 == 0x1E) {
      this.charLength = 4;
      break;
    }
  }

  return i;
};

StringDecoder.prototype.end = function(buffer) {
  var res = '';
  if (buffer && buffer.length)
    res = this.write(buffer);

  if (this.charReceived) {
    var cr = this.charReceived;
    var buf = this.charBuffer;
    var enc = this.encoding;
    res += buf.slice(0, cr).toString(enc);
  }

  return res;
};

function passThroughWrite(buffer) {
  return buffer.toString(this.encoding);
}

function utf16DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 2;
  this.charLength = incomplete ? 2 : 0;
  return incomplete;
}

function base64DetectIncompleteChar(buffer) {
  var incomplete = this.charReceived = buffer.length % 3;
  this.charLength = incomplete ? 3 : 0;
  return incomplete;
}

},{"buffer":72}],99:[function(require,module,exports){
module.exports = require("./lib/_stream_passthrough.js")

},{"./lib/_stream_passthrough.js":92}],100:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');

},{"./lib/_stream_duplex.js":91,"./lib/_stream_passthrough.js":92,"./lib/_stream_readable.js":93,"./lib/_stream_transform.js":94,"./lib/_stream_writable.js":95}],101:[function(require,module,exports){
module.exports = require("./lib/_stream_transform.js")

},{"./lib/_stream_transform.js":94}],102:[function(require,module,exports){
module.exports = require("./lib/_stream_writable.js")

},{"./lib/_stream_writable.js":95}],103:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = require('events').EventEmitter;
var inherits = require('inherits');

inherits(Stream, EE);
Stream.Readable = require('readable-stream/readable.js');
Stream.Writable = require('readable-stream/writable.js');
Stream.Duplex = require('readable-stream/duplex.js');
Stream.Transform = require('readable-stream/transform.js');
Stream.PassThrough = require('readable-stream/passthrough.js');

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

},{"events":81,"inherits":83,"readable-stream/duplex.js":90,"readable-stream/passthrough.js":99,"readable-stream/readable.js":100,"readable-stream/transform.js":101,"readable-stream/writable.js":102}],104:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var punycode = require('punycode');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a puny coded representation of "domain".
      // It only converts the part of the domain name that
      // has non ASCII characters. I.e. it dosent matter if
      // you call it with a domain that already is in ASCII.
      var domainArray = this.hostname.split('.');
      var newOut = [];
      for (var i = 0; i < domainArray.length; ++i) {
        var s = domainArray[i];
        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
            'xn--' + punycode.encode(s) : s);
      }
      this.hostname = newOut.join('.');
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  Object.keys(this).forEach(function(k) {
    result[k] = this[k];
  }, this);

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    Object.keys(relative).forEach(function(k) {
      if (k !== 'protocol')
        result[k] = relative[k];
    });

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      Object.keys(relative).forEach(function(k) {
        result[k] = relative[k];
      });
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especialy happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!isNull(result.pathname) || !isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host) && (last === '.' || last === '..') ||
      last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last == '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especialy happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!isNull(result.pathname) || !isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

function isString(arg) {
  return typeof arg === "string";
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isNull(arg) {
  return arg === null;
}
function isNullOrUndefined(arg) {
  return  arg == null;
}

},{"punycode":86,"querystring":89}],105:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],106:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("xeDTxS"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":105,"inherits":83,"xeDTxS":85}]},{},[])