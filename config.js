"use strict";

var path = require('path');

exports.host = {
    name : 'product-semantics',
    port : process.env.PORT || 8080,
    baseurl : process.env.BASEURL || 'http://127.0.0.1',
    contact : 'contact@bespinholdings.com'
};
var config = exports;

exports.database = {
    dialect   : process.env.DBDIALECT || 'mariadb', 
    host      : process.env.DBHOST || '127.0.0.1',
    port      : process.env.DBPORT || 3306,
    username  : process.env.DBUSER || 'root',
    password  : process.env.DBPASSWORD || '',
    dbname    : process.env.DBNAME || 'semantics',
    logging   : process.env.DBLOGGING || false,
    sync      : process.env.DBSYNC || false
};

exports.client = {
    enabled : process.env.CLIENT_ENABLED || true,
    view_dir : process.env.CLIENT_VIEWS_DIR || 'views/client',
    template : {
        index : process.env.CLIENT_INDEX_TEMPLATE || 'index.jade',
        redir : process.env.REDIR_INDEX_TEMPLATE || 'redir.jade'
    },
    index_template : process.env.CLIENT_INDEX_TEMPLATE || 'index.jade',
    redir_template : process.env.REDIR_INDEX_TEMPLATE || 'redir.jade'
};

exports.getIndexTemplate = function() {
    return path.join(__dirname, exports.client.view_dir, exports.client.index_template);
};

exports.getRedirTemplate = function() {
    return path.join(__dirname, exports.client.view_dir, exports.client.redir_template);
};

exports.getConfirmedPath = function() {
    return '/confirmed';
};

exports.logging = {
    trace : {
        logpath : 'trace.log'
    }
};
