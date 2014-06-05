"use strict";

var restify = require('restify');
var async = require('async');
var qs = require('querystring');

var config = require('./config');

//Register for your access credentials at https://semantics3.com
var api_key = 'SEM392B01AE3C87CF6BF75C5FE336B3E487C';
var api_secret = 'NTYwZDI4NGVjOTU1MDZlMTUxYmRkZjlhMDhhZjZlYmU';
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

var getProductInfo = function(req, res, next) {
    if(req.params.q) {
        var query = qs.parse(req.params.q);
        for(var key in query) {
            sem3.products.products_field( key, query[key] );
        }
    } else {
        for(var key in req.params) {
            sem3.products.products_field( key, req.params[key] );
        }
    }
    var constructedJson = sem3.products.get_query_json( "products" );

    sem3.products.get_products(
    function(err, rs) {
        if (err) {
            return log.info(err);
        }
        var output = {
            total : rs.total_results_count,
            count : rs.results_count,
            offset : rs.offset,
            products : []
        };
        rs = JSON.parse(rs);
        for(var p in rs.results) {
            p = rs.results[p];
            var pout = {
                id : p.sem3_id,
                cat_id : p.cat_id,
                brand : p.brand,
                model : p.model,
                total_available_qty : p.offers_total,
                name : p.name,
                price : p.price,
                upc : p.upc,
                features : p.features,
                created_on : p.created_at,
                updated_on : p.updated_at,
                sellers : []
            };
            for(var sd in p.sitedetails) {
                sd = p.sitedetails[sd];
                var seller = {
                    available_qty : sd.offers_count,
                    sku : sd.sku,
                    name : sd.name,
                    url : sd.url,
                    newlylisted_qty : sd.recentoffers_count,
                    inventory : []
                }
                for(var lo in sd.latestoffers) {
                    lo = sd.latestoffers[lo];
                    delete lo.seller;
                    seller.inventory.push(lo);
                }
                pout.sellers.push(seller);
            }
            output.products.push(pout);
        }
        res.send(output);
        next();
    });
}

server.get('/query', getProductInfo);

// serve statically from this dir
server.get(/.*/, function(req,res,next) {
    return restify.serveStatic({
        directory: __dirname,
        default: 'index.html'
    })(req, res, next);
});

server.listen(config.host.port, function () {
    log.info({message:'%s listening at %s'}, server.name, server.url);
});


