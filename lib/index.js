var Root;
(function() {
	Root = this;
}());

var EventEmitter = require('events').EventEmitter;
Root.EventEmitter = EventEmitter;
var protobuf = require('pomelo-protobuf');
Root.protobuf = protobuf;
var Protocol = require('pomelo-protocol');
Root.Protocol = Protocol;
var pomelo = require('pomelo-jsclient-websocket');
Root.pomelo = pomelo;
var browser_http = require('browser-http');
Root.browser_http = browser_http;
var web_storage = require('web-storage')
Root.web_storage = web_storage