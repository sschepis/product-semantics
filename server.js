"use strict";

var restify = require('restify');
var async = require('async');
var path = require('path');
var fs = require('fs');

var config = require('./config');

//Register for your access credentials at https://semantics3.com
var api_key = 'SEM3xxxxxxxxxxxxxxxxxxxxxx';
var api_secret = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
var sem3 = require('semantics3-node')(api_key,api_secret);

// configure bunyan logger
var Logger = require('bunyan');
var log = new Logger({
    name: 'product-semantics',
    streams: [
        {   // one debug logger to stdout
            stream: process.stdout,
            level: 'debug'
        },
        {   // one trace log to a logfile
            path: config.logging.trace.logpath,
            level: 'trace'
        }
    ],
    serializers: {
        req: Logger.stdSerializers.req,
        res: restify.bunyan.serializers.res
    }
});

// build the server now
var server = restify.createServer({
    name : config.host.name,
    version : '0.0.1',
    log : log
});

// add a server formatter for HTML
server.formatters['text/html'] = function (req, res, body) {
    return body.toString();
};

// add loggers to pre and after to log all requests
server.pre(function (req, res, next) {
    req.log.info({req: req}, 'begin');
    return next();
});
server.on('after', function (req, res, route) {
    req.log.info({res: res, route: route}, "end");
});

// set up all our standard server modules
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());
server.use(restify.dateParser());
server.use(restify.jsonp());
server.use(restify.requestLogger());
server.use(restify.sanitizePath());

var getProductInfo = function(req, req, next) {
    for(var key in req.params) {
        sem3.products.products_field( key, req.params[key] );
    }
    var constructedJson = sem3.products.get_query_json( "products" );
    req.log( constructedJson );

    sem3.products.get_products(
    function(err, products) {
        if (err) {
            return req.log(err);
        }   
        req.log(products);
        res.send(products);
    });
}

server.get('/', getProductInfo);
server.listen(config.host.port, function () {
    log.info({message:'%s listening at %s'}, server.name, server.url);
});

