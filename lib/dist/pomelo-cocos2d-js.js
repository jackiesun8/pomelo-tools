(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"browser-http":12,"events":26,"pomelo-jsclient-websocket":27,"pomelo-protobuf":33,"pomelo-protocol":35,"web-storage":37}],2:[function(require,module,exports){
/**
 * from https://github.com/philikon/MockHttpRequest
 * thanks
 */



/*
 * Mock XMLHttpRequest (see http://www.w3.org/TR/XMLHttpRequest)
 *
 * Written by Philipp von Weitershausen <philipp@weitershausen.de>
 * Released under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * For test interaction it exposes the following attributes:
 *
 * - method, url, urlParts, async, user, password
 * - requestText
 *
 * as well as the following methods:
 *
 * - getRequestHeader(header)
 * - setResponseHeader(header, value)
 * - receive(status, data)
 * - err(exception)
 * - authenticate(user, password)
 *
 */
function MockHttpRequest () {
	// These are internal flags and data structures
	this.error = false;
	this.sent = false;
	this.requestHeaders = {};
	this.responseHeaders = {};
}
MockHttpRequest.prototype = {

	statusReasons: {
		100: 'Continue',
		101: 'Switching Protocols',
		102: 'Processing',
		200: 'OK',
		201: 'Created',
		202: 'Accepted',
		203: 'Non-Authoritative Information',
		204: 'No Content',
		205: 'Reset Content',
		206: 'Partial Content',
		207: 'Multi-Status',
		300: 'Multiple Choices',
		301: 'Moved Permanently',
		302: 'Moved Temporarily',
		303: 'See Other',
		304: 'Not Modified',
		305: 'Use Proxy',
		307: 'Temporary Redirect',
		400: 'Bad Request',
		401: 'Unauthorized',
		402: 'Payment Required',
		403: 'Forbidden',
		404: 'Not Found',
		405: 'Method Not Allowed',
		406: 'Not Acceptable',
		407: 'Proxy Authentication Required',
		408: 'Request Time-out',
		409: 'Conflict',
		410: 'Gone',
		411: 'Length Required',
		412: 'Precondition Failed',
		413: 'Request Entity Too Large',
		414: 'Request-URI Too Large',
		415: 'Unsupported Media Type',
		416: 'Requested range not satisfiable',
		417: 'Expectation Failed',
		422: 'Unprocessable Entity',
		423: 'Locked',
		424: 'Failed Dependency',
		500: 'Internal Server Error',
		501: 'Not Implemented',
		502: 'Bad Gateway',
		503: 'Service Unavailable',
		504: 'Gateway Time-out',
		505: 'HTTP Version not supported',
		507: 'Insufficient Storage'
	},

	/*** State ***/

	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4,
	readyState: 0,


	/*** Request ***/

	open: function (method, url, async, user, password) {
		if (typeof method !== "string") {
			throw "INVALID_METHOD";
		}
		switch (method.toUpperCase()) {
			case "CONNECT":
			case "TRACE":
			case "TRACK":
				throw "SECURITY_ERR";

			case "DELETE":
			case "GET":
			case "HEAD":
			case "OPTIONS":
			case "POST":
			case "PUT":
				method = method.toUpperCase();
		}
		this.method = method;

		if (typeof url !== "string") {
			throw "INVALID_URL";
		}
		this.url = url;
		this.urlParts = this.parseUri(url);

		if (async === undefined) {
			async = true;
		}
		this.async = async;
		this.user = user;
		this.password = password;

		this.readyState = this.OPENED;
		this.onreadystatechange();
	},

	setRequestHeader: function (header, value) {
		header = header.toLowerCase();

		switch (header) {
			case "accept-charset":
			case "accept-encoding":
			case "connection":
			case "content-length":
			case "cookie":
			case "cookie2":
			case "content-transfer-encoding":
			case "date":
			case "expect":
			case "host":
			case "keep-alive":
			case "referer":
			case "te":
			case "trailer":
			case "transfer-encoding":
			case "upgrade":
			case "user-agent":
			case "via":
				return;
		}
		if ((header.substr(0, 6) === "proxy-")
			|| (header.substr(0, 4) === "sec-")) {
			return;
		}

		// it's the first call on this header field
		if (this.requestHeaders[header] === undefined)
			this.requestHeaders[header] = value;
		else {
			var prev = this.requestHeaders[header];
			this.requestHeaders[header] = prev + ", " + value;
		}

	},

	send: function (data) {
		if ((this.readyState !== this.OPENED)
			|| this.sent) {
			throw "INVALID_STATE_ERR";
		}
		if ((this.method === "GET") || (this.method === "HEAD")) {
			data = null;
		}

		//TODO set Content-Type header?
		this.error = false;
		this.sent = true;
		this.onreadystatechange();

		// fake send
		this.requestText = data;
		this.onsend();
	},

	abort: function () {
		this.responseText = null;
		this.error = true;
		for (var header in this.requestHeaders) {
			delete this.requestHeaders[header];
		}
		delete this.requestText;
		this.onreadystatechange();
		this.onabort();
		this.readyState = this.UNSENT;
	},


	/*** Response ***/

	status: 0,
	statusText: "",

	getResponseHeader: function (header) {
		if ((this.readyState === this.UNSENT)
			|| (this.readyState === this.OPENED)
			|| this.error) {
			return null;
		}
		return this.responseHeaders[header.toLowerCase()];
	},

	getAllResponseHeaders: function () {
		var r = "";
		for (var header in this.responseHeaders) {
			if ((header === "set-cookie") || (header === "set-cookie2")) {
				continue;
			}
			//TODO title case header
			r += header + ": " + this.responseHeaders[header] + "\r\n";
		}
		return r;
	},

	responseText: "",
	responseXML: undefined, //TODO


	/*** See http://www.w3.org/TR/progress-events/ ***/

	onload: function () {
		// Instances should override this.
	},

	onprogress: function () {
		// Instances should override this.
	},

	onerror: function () {
		// Instances should override this.
	},

	onabort: function () {
		// Instances should override this.
	},

	onreadystatechange: function () {
		// Instances should override this.
	},


	/*** Properties and methods for test interaction ***/

	onsend: function () {
		// Instances should override this.
	},

	getRequestHeader: function (header) {
		return this.requestHeaders[header.toLowerCase()];
	},

	setResponseHeader: function (header, value) {
		this.responseHeaders[header.toLowerCase()] = value;
	},

	makeXMLResponse: function (data) {
		var xmlDoc;
		// according to specs from point 3.7.5:
		// "1. If the response entity body is null terminate these steps
		//     and return null.
		//  2. If final MIME type is not null, text/xml, application/xml,
		//     and does not end in +xml terminate these steps and return null.
		var mimetype = this.getResponseHeader("Content-Type");
		mimetype = mimetype && mimetype.split(';', 1)[0];
		if ((mimetype == null) || (mimetype == 'text/xml') ||
			(mimetype == 'application/xml') ||
			(mimetype && mimetype.substring(mimetype.length - 4) == '+xml')) {
			// Attempt to produce an xml response
			// and it will fail if not a good xml
			try {
				if (window.DOMParser) {
					var parser = new DOMParser();
					xmlDoc = parser.parseFromString(data, "text/xml");
				} else { // Internet Explorer
					xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
					xmlDoc.async = "false";
					xmlDoc.loadXML(data);
				}
			} catch (e) {
				// according to specs from point 3.7.5:
				// "3. Let document be a cookie-free Document object that
				// represents the result of parsing the response entity body
				// into a document tree following the rules from the XML
				//  specifications. If this fails (unsupported character
				// encoding, namespace well-formedness error etc.), terminate
				// these steps return null."
				xmlDoc = null;
			}
			// parse errors also yield a null.
			if ((xmlDoc && xmlDoc.parseError && xmlDoc.parseError.errorCode != 0)
				|| (xmlDoc && xmlDoc.documentElement && xmlDoc.documentElement.nodeName == "parsererror")
				|| (xmlDoc && xmlDoc.documentElement && xmlDoc.documentElement.nodeName == "html"
				&&  xmlDoc.documentElement.firstChild &&  xmlDoc.documentElement.firstChild.nodeName == "body"
				&&  xmlDoc.documentElement.firstChild.firstChild && xmlDoc.documentElement.firstChild.firstChild.nodeName == "parsererror")) {
				xmlDoc = null;
			}
		} else {
			// mimetype is specified, but not xml-ish
			xmlDoc = null;
		}
		return xmlDoc;
	},

	// Call this to simulate a server response
	receive: function (status, data, timeout) {
		if ((this.readyState !== this.OPENED) || (!this.sent)) {
			// Can't respond to unopened request.
			throw "INVALID_STATE_ERR";
		}

		this.status = status;
		this.statusText = status + " " + this.statusReasons[status];
		this.readyState = this.HEADERS_RECEIVED;
		this.onprogress();
		this.onreadystatechange();

		this.responseText = data;
		this.responseXML = this.makeXMLResponse(data);

		this.readyState = this.LOADING;
		this.onprogress();
		this.onreadystatechange();

		var _this = this;
		var done = function() {
			_this.readyState = _this.DONE;
			_this.onreadystatechange();
			_this.onprogress();
			_this.onload();
		};

		if (timeout === null) {
			done();
		} else if (typeof timeout === 'number' || (typeof timeout === 'object' && typeof timeout.min === 'number' && typeof timeout.max === 'number')) {
			if (typeof timeout === 'object') {
				timeout = Math.floor(Math.random() * (timeout.max - timeout.min + 1)) + timeout.min;
			}

			setTimeout(function() {
				done();
			}, timeout);
		} else {
			throw new Error('Invalid type of timeout.');
		}
	},

	// Call this to simulate a request error (e.g. NETWORK_ERR)
	err: function (exception) {
		if ((this.readyState !== this.OPENED) || (!this.sent)) {
			// Can't respond to unopened request.
			throw "INVALID_STATE_ERR";
		}

		this.responseText = null;
		this.error = true;
		for (var header in this.requestHeaders) {
			delete this.requestHeaders[header];
		}
		this.readyState = this.DONE;
		if (!this.async) {
			throw exception;
		}
		this.onreadystatechange();
		this.onerror();
	},

	// Convenience method to verify HTTP credentials
	authenticate: function (user, password) {
		if (this.user) {
			return (user === this.user) && (password === this.password);
		}

		if (this.urlParts.user) {
			return ((user === this.urlParts.user)
				&& (password === this.urlParts.password));
		}

		// Basic auth.  Requires existence of the 'atob' function.
		var auth = this.getRequestHeader("Authorization");
		if (auth === undefined) {
			return false;
		}
		if (auth.substr(0, 6) !== "Basic ") {
			return false;
		}
		if (typeof atob !== "function") {
			return false;
		}
		auth = atob(auth.substr(6));
		var pieces = auth.split(':');
		var requser = pieces.shift();
		var reqpass = pieces.join(':');
		return (user === requser) && (password === reqpass);
	},

	// Parse RFC 3986 compliant URIs.
	// Based on parseUri by Steven Levithan <stevenlevithan.com>
	// See http://blog.stevenlevithan.com/archives/parseuri
	parseUri: function (str) {
		var pattern = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;
		var key = ["source", "protocol", "authority", "userInfo", "user",
			"password", "host", "port", "relative", "path",
			"directory", "file", "query", "anchor"];
		var querypattern = /(?:^|&)([^&=]*)=?([^&]*)/g;

		var match = pattern.exec(str);
		var uri = {};
		var i = 14;
		while (i--) {
			uri[key[i]] = match[i] || "";
		}

		uri.queryKey = {};
		uri[key[12]].replace(querypattern, function ($0, $1, $2) {
			if ($1) {
				uri.queryKey[$1] = $2;
			}
		});

		return uri;
	}
};


/*
 * A small mock "server" that intercepts XMLHttpRequest calls and
 * diverts them to your handler.
 *
 * Usage:
 *
 * 1. Initialize with either
 *       var server = new MockHttpServer(your_request_handler);
 *    or
 *       var server = new MockHttpServer();
 *       server.handle = function (request) { ... };
 *
 * 2. Call server.start() to start intercepting all XMLHttpRequests.
 *
 * 3. Do your tests.
 *
 * 4. Call server.stop() to tear down.
 *
 * 5. Profit!
 */
function MockHttpServer (handler) {
	if (handler) {
		this.handle = handler;
	}
};
MockHttpServer.prototype = {

	start: function () {
		var self = this;

		function Request () {
			this.onsend = function () {
				self.handle(this);
			};
			MockHttpRequest.apply(this, arguments);
		}
		Request.prototype = MockHttpRequest.prototype;

		window.OriginalHttpRequest = window.XMLHttpRequest;
		window.XMLHttpRequest = Request;
	},

	stop: function () {
		window.XMLHttpRequest = window.OriginalHttpRequest;
	},

	handle: function (request) {
		// Instances should override this.
	}
};

module.exports = MockHttpRequest;

},{}],3:[function(require,module,exports){
(function() {
  var BaseExtension, EventEmitter,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  BaseExtension = (function(superClass) {
    extend(BaseExtension, superClass);

    function BaseExtension() {
      return BaseExtension.__super__.constructor.apply(this, arguments);
    }

    BaseExtension.prototype.http = null;

    BaseExtension.prototype.setHttp = function(http) {
      this.http = http;
      return this.emit('httpReady', this.http);
    };

    return BaseExtension;

  })(EventEmitter);

  module.exports = BaseExtension;

}).call(this);

},{"events":26}],4:[function(require,module,exports){
(function() {
  var $, BaseExtension, Forms,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BaseExtension = require('./BaseExtension');

  $ = null;

  Forms = (function(superClass) {
    extend(Forms, superClass);

    Forms.EVENTS_NAMESPACE = 'http-ext-forms';

    function Forms(jQuery) {
      this.onFormSubmitted = bind(this.onFormSubmitted, this);
      $ = jQuery;
      $(document).on('submit.' + Forms.EVENTS_NAMESPACE, 'form.ajax:not(.not-ajax)', this.onFormSubmitted);
      $(document).on('click.' + Forms.EVENTS_NAMESPACE, 'form.ajax:not(.not-ajax) input[type="submit"]', this.onFormSubmitted);
      $(document).on('click.' + Forms.EVENTS_NAMESPACE, 'form input[type="submit"].ajax', this.onFormSubmitted);
    }

    Forms.prototype.onFormSubmitted = function(e) {
      var action, el, form, i, j, len, name, options, sendValues, val, value, values;
      e.preventDefault();
      if (this.http === null) {
        throw new Error('Please add Forms extension into http object with addExtension method.');
      }
      el = $(e.target);
      sendValues = {};
      if (el.is(':submit')) {
        form = el.closest('form');
        sendValues[el.attr('name')] = el.val() || '';
      } else if (el.is('form')) {
        form = el;
      } else {
        return null;
      }
      if (form.get(0).onsubmit && form.get(0).onsubmit() === false) {
        return null;
      }
      values = form.serializeArray();
      for (i = j = 0, len = values.length; j < len; i = ++j) {
        value = values[i];
        name = value.name;
        if (typeof sendValues[name] === 'undefined') {
          sendValues[name] = value.value;
        } else {
          val = sendValues[name];
          if (Object.prototype.toString.call(val) !== '[object Array]') {
            val = [val];
          }
          val.push(value.value);
          sendValues[name] = val;
        }
      }
      options = {
        data: sendValues,
        type: form.attr('method') || 'GET'
      };
      action = form.attr('action') || window.location.href;
      return this.http.request(action, options);
    };

    Forms.prototype.detach = function() {
      return $(document).off('.' + Forms.EVENTS_NAMESPACE);
    };

    return Forms;

  })(BaseExtension);

  module.exports = Forms;

}).call(this);

},{"./BaseExtension":3}],5:[function(require,module,exports){
(function() {
  var $, BaseExtension, Links, hasAttr,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BaseExtension = require('./BaseExtension');

  $ = null;

  hasAttr = function(el, name) {
    var attr;
    attr = $(el).attr(name);
    return typeof attr !== 'undefined' && attr !== false;
  };

  Links = (function(superClass) {
    extend(Links, superClass);

    Links.HISTORY_API_ATTRIBUTE = 'data-history-api';

    Links.EVENT_NAMESPACE = 'http-ext-links';

    function Links(jQuery) {
      $ = jQuery;
      $(document).on('click.' + Links.EVENT_NAMESPACE, 'a.ajax:not(.not-ajax)', (function(_this) {
        return function(e) {
          var a, link, type;
          e.preventDefault();
          if (_this.http === null) {
            throw new Error('Please add Links extension into http object with addExtension method.');
          }
          a = e.target.nodeName.toLowerCase() === 'a' ? $(e.target) : $(e.target).closest('a');
          link = a.attr('href');
          type = hasAttr(a, 'data-type') ? a.attr('data-type').toUpperCase() : 'GET';
          if (_this.http.isHistoryApiSupported() && hasAttr(a, Links.HISTORY_API_ATTRIBUTE)) {
            window.history.pushState({}, null, link);
          }
          return _this.http.request(link, {
            type: type
          });
        };
      })(this));
    }

    Links.prototype.detach = function() {
      return $(document).off('.' + Links.EVENT_NAMESPACE);
    };

    return Links;

  })(BaseExtension);

  module.exports = Links;

}).call(this);

},{"./BaseExtension":3}],6:[function(require,module,exports){
(function() {
  var BaseExtension, Loading,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BaseExtension = require('./BaseExtension');

  Loading = (function(superClass) {
    extend(Loading, superClass);

    function Loading() {
      return Loading.__super__.constructor.apply(this, arguments);
    }

    Loading.prototype.send = function() {
      return document.body.style.cursor = 'progress';
    };

    Loading.prototype.complete = function() {
      return document.body.style.cursor = 'auto';
    };

    return Loading;

  })(BaseExtension);

  module.exports = Loading;

}).call(this);

},{"./BaseExtension":3}],7:[function(require,module,exports){
(function() {
  var BaseExtension, Offline,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BaseExtension = require('./BaseExtension');

  Offline = (function(superClass) {
    extend(Offline, superClass);

    Offline.HTTP_TYPE = 'HEAD';

    Offline.prototype.timer = null;

    Offline.prototype.offline = false;

    function Offline(url, timeout) {
      if (url == null) {
        url = 'favicon.ico';
      }
      if (timeout == null) {
        timeout = 5000;
      }
      this.start(url, timeout);
    }

    Offline.prototype.start = function(url, timeout) {
      if (url == null) {
        url = 'favicon.ico';
      }
      if (timeout == null) {
        timeout = 5000;
      }
      return this.timer = window.setInterval((function(_this) {
        return function() {
          var options;
          if (_this.http === null) {
            throw new Error('Please add Offline extension into http object with addExtension method.');
          }
          options = {
            type: Offline.HTTP_TYPE,
            data: {
              r: Math.floor(Math.random() * 1000000000)
            }
          };
          return _this.http.request(url, options, function(response, err) {
            if (err) {
              if (!_this.offline) {
                _this.offline = true;
                return _this.http.emit('disconnected');
              }
            } else {
              if ((response.status >= 200 && response.status <= 300) || response.status === 304) {
                if (_this.offline) {
                  _this.offline = false;
                  return _this.http.emit('connected');
                }
              } else if (!_this.offline) {
                _this.offline = true;
                return _this.http.emit('disconnected');
              }
            }
          });
        };
      })(this), timeout);
    };

    Offline.prototype.stop = function() {
      if (this.timer !== null) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
      return this;
    };

    return Offline;

  })(BaseExtension);

  module.exports = Offline;

}).call(this);

},{"./BaseExtension":3}],8:[function(require,module,exports){
(function() {
  var BaseExtension, Redirect,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BaseExtension = require('./BaseExtension');

  Redirect = (function(superClass) {
    extend(Redirect, superClass);

    function Redirect() {
      return Redirect.__super__.constructor.apply(this, arguments);
    }

    Redirect.prototype.success = function(response) {
      if (response.data !== null && typeof response.data.redirect !== 'undefined') {
        return window.location.href = response.data.redirect;
      }
    };

    return Redirect;

  })(BaseExtension);

  module.exports = Redirect;

}).call(this);

},{"./BaseExtension":3}],9:[function(require,module,exports){
(function() {
  var BaseExtension, Snippets, hasAttr,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  BaseExtension = require('./BaseExtension');

  hasAttr = function(el, name) {
    var attr;
    attr = el.getAttribute(name);
    return attr !== null && typeof attr !== 'undefined' && attr !== false;
  };

  Snippets = (function(superClass) {
    extend(Snippets, superClass);

    function Snippets() {
      this.success = bind(this.success, this);
      return Snippets.__super__.constructor.apply(this, arguments);
    }

    Snippets.APPEND_ATTRIBUTE = 'data-append';

    Snippets.prototype.success = function(response) {
      var el, html, id, ref, results;
      if (response.data !== null && typeof response.data.snippets !== 'undefined') {
        ref = response.data.snippets;
        results = [];
        for (id in ref) {
          html = ref[id];
          el = document.getElementById(id);
          if (hasAttr(el, Snippets.APPEND_ATTRIBUTE)) {
            results.push(this.appendSnippet(el, html));
          } else {
            results.push(this.updateSnippet(el, html));
          }
        }
        return results;
      }
    };

    Snippets.prototype.updateSnippet = function(el, html) {
      return el.innerHTML = html;
    };

    Snippets.prototype.appendSnippet = function(el, html) {
      return el.innerHTML += html;
    };

    return Snippets;

  })(BaseExtension);

  module.exports = Snippets;

}).call(this);

},{"./BaseExtension":3}],10:[function(require,module,exports){
(function() {
  var FakePromise;

  FakePromise = (function() {
    function FakePromise() {}

    FakePromise.prototype._error = function() {
      throw new Error('Please, use callbacks instead of promise pattern.');
    };

    FakePromise.prototype.then = function() {
      return this._error();
    };

    FakePromise.prototype["catch"] = function() {
      return this._error();
    };

    FakePromise.prototype.fail = function() {
      return this._error();
    };

    FakePromise.prototype.done = function() {
      return this._error();
    };

    return FakePromise;

  })();

  module.exports = FakePromise;

}).call(this);

},{}],11:[function(require,module,exports){
(function() {
  var Helpers;

  Helpers = (function() {
    function Helpers() {}

    Helpers.urlencode = function(param) {
      param = (param + '').toString();
      return encodeURIComponent(param).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/\~/g, '%7E').replace(/%20/g, '+');
    };

    Helpers.buildQuery = function(params) {
      var add, buildParams, j, key, len, result, value;
      result = [];
      add = function(key, value) {
        value = typeof value === 'function' ? value() : (value === null ? '' : value);
        return result.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
      };
      buildParams = function(key, value) {
        var i, j, k, len, results, results1, v;
        if (Object.prototype.toString.call(value) === '[object Array]') {
          results = [];
          for (i = j = 0, len = value.length; j < len; i = ++j) {
            v = value[i];
            if (/\[\]$/.test(key) === true) {
              results.push(add(key, v));
            } else {
              results.push(buildParams(key + '[' + (typeof v === 'object' ? i : '') + ']', v));
            }
          }
          return results;
        } else if (Object.prototype.toString.call(value) === '[object Object]') {
          results1 = [];
          for (k in value) {
            v = value[k];
            results1.push(buildParams(key + '[' + k + ']', v));
          }
          return results1;
        } else {
          return add(key, value);
        }
      };
      if (Object.prototype.toString.call(params) === '[object Array]') {
        for (key = j = 0, len = params.length; j < len; key = ++j) {
          value = params[key];
          add(key, value);
        }
      } else {
        for (key in params) {
          value = params[key];
          buildParams(key, value);
        }
      }
      return result.join('&').replace(/%20/g, '+');
    };

    return Helpers;

  })();

  module.exports = Helpers;

}).call(this);

},{}],12:[function(require,module,exports){
(function() {
  var Http, createInstance, http;

  Http = require('./_Http');

  createInstance = function() {
    var http;
    http = new Http;
    http.Helpers = require('./Helpers');
    http.Xhr = require('./Xhr');
    http.Extensions = {
      Forms: require('./Extensions/Forms'),
      Links: require('./Extensions/Links'),
      Loading: require('./Extensions/Loading'),
      Redirect: require('./Extensions/Redirect'),
      Snippets: require('./Extensions/Snippets'),
      Offline: require('./Extensions/Offline')
    };
    http.Mocks = {
      Http: require('./Mocks/Http')
    };
    return http;
  };

  http = createInstance();

  http.createInstance = createInstance;

  module.exports = http;

}).call(this);

},{"./Extensions/Forms":4,"./Extensions/Links":5,"./Extensions/Loading":6,"./Extensions/Offline":7,"./Extensions/Redirect":8,"./Extensions/Snippets":9,"./Helpers":11,"./Mocks/Http":13,"./Xhr":19,"./_Http":20}],13:[function(require,module,exports){
(function() {
  var Http, OriginalHttp, Request, createRequest,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Request = require('./Request');

  OriginalHttp = require('../_Http');

  createRequest = function(requestUrl, requestType, requestData, requestJsonp, requestJsonPrefix, responseData, responseHeaders, responseStatus, responseTimeout) {
    var ref, request;
    if (responseHeaders == null) {
      responseHeaders = {};
    }
    if (responseStatus == null) {
      responseStatus = 200;
    }
    if (responseTimeout == null) {
      responseTimeout = null;
    }
    if (typeof responseHeaders['content-type'] === 'undefined') {
      responseHeaders['content-type'] = 'text/plain';
    }
    if ((responseHeaders['content-type'].match(/application\/json/) !== null || this.jsonPrefix !== null) && ((ref = Object.prototype.toString.call(responseData)) === '[object Array]' || ref === '[object Object]')) {
      responseData = JSON.stringify(responseData);
    }
    request = new Request(requestUrl, requestType, requestData, requestJsonp, requestJsonPrefix);
    request.on('afterSend', function() {
      var name, value;
      for (name in responseHeaders) {
        value = responseHeaders[name];
        request.xhr.setResponseHeader(name, value);
      }
      return request.xhr.receive(responseStatus, responseData, responseTimeout);
    });
    return request;
  };

  Http = (function(superClass) {
    extend(Http, superClass);

    Http.prototype._originalCreateRequest = null;

    function Http() {
      Http.__super__.constructor.apply(this, arguments);
      this._originalCreateRequest = this.createRequest;
    }

    Http.prototype.receive = function(sendData, headers, status, timeout) {
      if (sendData == null) {
        sendData = '';
      }
      if (headers == null) {
        headers = {};
      }
      if (status == null) {
        status = 200;
      }
      if (timeout == null) {
        timeout = null;
      }
      return this.createRequest = function(url, type, data, jsonp, jsonPrefix) {
        return createRequest(url, type, data, jsonp, jsonPrefix, sendData, headers, status, timeout);
      };
    };

    Http.prototype.receiveDataFromRequestAndSendBack = function(headers, status, timeout) {
      if (headers == null) {
        headers = {};
      }
      if (status == null) {
        status = 200;
      }
      if (timeout == null) {
        timeout = null;
      }
      return this.createRequest = function(url, type, data, jsonp, jsonPrefix) {
        return createRequest(url, type, data, jsonp, jsonPrefix, data, headers, status, timeout);
      };
    };

    Http.prototype.receiveError = function(err) {
      return this.createRequest = function(url, type, data, jsonp, jsonPrefix) {
        var request;
        request = new Request(url, type, data, jsonp, jsonPrefix);
        request.on('afterSend', function() {
          return request.xhr.receiveError(err);
        });
        return request;
      };
    };

    Http.prototype.restore = function() {
      return this.createRequest = this._originalCreateRequest;
    };

    return Http;

  })(OriginalHttp);

  module.exports = Http;

}).call(this);

},{"../_Http":20,"./Request":14}],14:[function(require,module,exports){
(function() {
  var OriginalRequest, Request, Xhr,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  OriginalRequest = require('../Request');

  Xhr = require('./Xhr');

  Request = (function(superClass) {
    extend(Request, superClass);

    function Request() {
      return Request.__super__.constructor.apply(this, arguments);
    }

    Request.prototype.createXhr = function(url, type, data, jsonp, jsonPrefix) {
      return new Xhr(url, type, data, jsonp, jsonPrefix);
    };

    return Request;

  })(OriginalRequest);

  module.exports = Request;

}).call(this);

},{"../Request":17,"./Xhr":15}],15:[function(require,module,exports){
(function() {
  var OriginalXhr, Xhr, XmlHttpMocks,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  OriginalXhr = require('../Xhr');

  XmlHttpMocks = require('../../external/XmlHttpRequest');

  Xhr = (function(superClass) {
    extend(Xhr, superClass);

    function Xhr() {
      return Xhr.__super__.constructor.apply(this, arguments);
    }

    Xhr.prototype.createXhr = function() {
      return new XmlHttpMocks;
    };

    Xhr.prototype.receive = function(status, data, timeout) {
      if (timeout == null) {
        timeout = null;
      }
      return this.xhr.receive(status, data, timeout);
    };

    Xhr.prototype.receiveError = function(err) {
      return this.xhr.err(err);
    };

    Xhr.prototype.setResponseHeader = function(name, value) {
      return this.xhr.setResponseHeader(name, value);
    };

    return Xhr;

  })(OriginalXhr);

  module.exports = Xhr;

}).call(this);

},{"../../external/XmlHttpRequest":2,"../Xhr":19}],16:[function(require,module,exports){
(function() {
  var EventEmitter, FakePromise, Queue,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  EventEmitter = require('events').EventEmitter;

  FakePromise = require('./FakePromise');

  Queue = (function(superClass) {
    extend(Queue, superClass);

    Queue.prototype.requests = null;

    Queue.prototype.running = false;

    function Queue() {
      this.requests = [];
    }

    Queue.prototype.hasWritableRequests = function() {
      var i, len, ref, ref1, request;
      if (this.running) {
        ref = this.requests;
        for (i = 0, len = ref.length; i < len; i++) {
          request = ref[i];
          if ((ref1 = request.request.type) === 'PUT' || ref1 === 'POST' || ref1 === 'DELETE') {
            return true;
          }
        }
      }
      return false;
    };

    Queue.prototype.getCurrentRequest = function() {
      if (this.requests.length === 0) {
        return null;
      }
      return this.requests[0].request;
    };

    Queue.prototype.addAndSend = function(request, fn) {
      this.emit('add', request);
      this.requests.push({
        request: request,
        fn: fn
      });
      if (!this.running) {
        this.run();
      }
      return new FakePromise;
    };

    Queue.prototype.next = function() {
      this.requests.shift();
      if (this.requests.length > 0) {
        this.emit('next', this.requests[0].request);
        return this.run();
      } else {
        this.running = false;
        return this.emit('finish');
      }
    };

    Queue.prototype.run = function() {
      var data, fn, request;
      if (this.requests.length === 0) {
        throw new Error('No pending requests');
      }
      this.running = true;
      data = this.requests[0];
      request = data.request;
      fn = data.fn;
      this.emit('send', request);
      return request.send((function(_this) {
        return function(response, err) {
          fn(response, err);
          return _this.next();
        };
      })(this));
    };

    Queue.prototype.removePending = function() {
      var request;
      if (this.running) {
        request = this.requests[0];
        this.requests = [request];
      } else {
        this.requests = [];
      }
      return this;
    };

    Queue.prototype.stop = function() {
      if (this.running) {
        this.getCurrentRequest().abort();
      }
      this.requests = [];
      return this;
    };

    return Queue;

  })(EventEmitter);

  module.exports = Queue;

}).call(this);

},{"./FakePromise":10,"events":26}],17:[function(require,module,exports){
(function() {
  var EventEmitter, Request, Xhr,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Xhr = require('./Xhr');

  EventEmitter = require('events').EventEmitter;

  Request = (function(superClass) {
    extend(Request, superClass);

    Request.prototype.url = null;

    Request.prototype.type = 'GET';

    Request.prototype.data = null;

    Request.prototype.jsonp = null;

    Request.prototype.xhr = null;

    Request.prototype.response = null;

    Request.prototype.jsonPrefix = null;

    Request.prototype.aborted = false;

    function Request(url1, type1, data1, jsonp1, jsonPrefix1) {
      var ref;
      this.url = url1;
      this.type = type1 != null ? type1 : 'GET';
      this.data = data1 != null ? data1 : null;
      this.jsonp = jsonp1 != null ? jsonp1 : false;
      this.jsonPrefix = jsonPrefix1 != null ? jsonPrefix1 : null;
      Request.__super__.constructor.apply(this, arguments);
      this.type = this.type.toUpperCase();
      if ((ref = this.type) !== 'GET' && ref !== 'POST' && ref !== 'PUT' && ref !== 'DELETE' && ref !== 'HEAD' && ref !== 'CONNECT' && ref !== 'OPTIONS' && ref !== 'TRACE') {
        throw new Error("Http request: type must be GET, POST, PUT, DELETE, HEAD, CONNECT, OPTIONS or TRACE, " + this.type + " given");
      }
      this.xhr = this.createXhr(this.url, this.type, this.data, this.jsonp, this.jsonPrefix);
      this.response = this.xhr.response;
      this.xhr.on('send', (function(_this) {
        return function(response) {
          return _this.emit('send', response, _this);
        };
      })(this));
      this.xhr.on('afterSend', (function(_this) {
        return function(response) {
          return _this.emit('afterSend', response, _this);
        };
      })(this));
      this.xhr.on('success', (function(_this) {
        return function(response) {
          return _this.emit('success', response, _this);
        };
      })(this));
      this.xhr.on('error', (function(_this) {
        return function(err, response) {
          return _this.emit('error', err, response, _this);
        };
      })(this));
      this.xhr.on('complete', (function(_this) {
        return function(err, response) {
          return _this.emit('complete', err, response, _this);
        };
      })(this));
      this.xhr.on('abort', (function(_this) {
        return function(response) {
          return _this.emit('abort', response);
        };
      })(this));
    }

    Request.prototype.createXhr = function(url, type, data, jsonp, jsonPrefix) {
      return new Xhr(url, type, data, jsonp, jsonPrefix);
    };

    Request.prototype.setHeader = function(name, value) {
      return this.xhr.setHeader(name, value);
    };

    Request.prototype.send = function(fn) {
      return this.xhr.send(fn);
    };

    Request.prototype.abort = function() {
      return this.xhr.abort();
    };

    Request.prototype.getHeaders = function() {
      return this.xhr.getHeaders();
    };

    Request.prototype.getHeader = function(name) {
      return this.xhr.getHeader(name);
    };

    Request.prototype.setHeader = function(name, value) {
      return this.xhr.setHeader(name, value);
    };

    Request.prototype.setMimeType = function(mime) {
      return this.xhr.setMimeType(mime);
    };

    return Request;

  })(EventEmitter);

  module.exports = Request;

}).call(this);

},{"./Xhr":19,"events":26}],18:[function(require,module,exports){
(function() {
  var Response;

  Response = (function() {
    function Response() {}

    Response.prototype.state = 0;

    Response.prototype.status = null;

    Response.prototype.statusText = null;

    Response.prototype.rawData = null;

    Response.prototype.data = null;

    Response.prototype.xml = null;

    Response.prototype.error = null;

    return Response;

  })();

  module.exports = Response;

}).call(this);

},{}],19:[function(require,module,exports){
(function() {
  var EventEmitter, FakePromise, Helpers, Response, Xhr, escape,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Helpers = require('./Helpers');

  Response = require('./Response');

  FakePromise = require('./FakePromise');

  EventEmitter = require('events').EventEmitter;

  escape = require('escape-regexp');

  Xhr = (function(superClass) {
    extend(Xhr, superClass);

    Xhr.JSONP_METHOD_PREFIX = '__browser_http_jsonp_callback_';

    Xhr.COUNTER = 0;

    Xhr.prototype.xhr = null;

    Xhr.prototype.response = null;

    Xhr.prototype.url = null;

    Xhr.prototype.type = 'GET';

    Xhr.prototype.data = null;

    Xhr.prototype.jsonp = false;

    Xhr.prototype.jsonPrefix = null;

    function Xhr(url, type, data1, jsonp, jsonPrefix) {
      var method;
      this.url = url;
      this.type = type != null ? type : 'GET';
      this.data = data1 != null ? data1 : null;
      this.jsonp = jsonp != null ? jsonp : false;
      this.jsonPrefix = jsonPrefix != null ? jsonPrefix : null;
      this.response = new Response;
      Xhr.COUNTER++;
      if (this.jsonp !== false) {
        if (this.jsonp === true) {
          this.jsonp = 'callback';
        }
        method = Xhr.JSONP_METHOD_PREFIX + Xhr.COUNTER;
        this.url += this.url.indexOf('?') !== -1 ? '&' : '?';
        this.url += this.jsonp + '=' + method;
        window[method] = (function(_this) {
          return function(data) {
            return _this.response.data = data;
          };
        })(this);
      }
      if (this.data !== null) {
        this.data = Helpers.buildQuery(this.data);
        if (this.type !== 'POST') {
          this.url += this.url.indexOf('?') !== -1 ? '&' : '?';
          this.url += this.data;
        }
      }
      this.xhr = this.createXhr();
      this.xhr.open(this.type, this.url, true);
      if (this.url.match(/^(http)s?\:\/\//) === null) {
        this.xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      }
      if (this.type === 'POST') {
        this.xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      }
      this.xhr.onreadystatechange = (function(_this) {
        return function() {
          var contentType, data, error, isSuccess, prefix;
          _this.response.state = _this.xhr.readyState;
          if (_this.response.state === 4) {
            _this.response.status = _this.xhr.status;
            isSuccess = (_this.response.status >= 200 && _this.response.status < 300) || _this.response.status === 304;
            if (isSuccess) {
              if (_this.response.status === 204 || _this.type === 'HEAD') {
                _this.response.statusText = 'nocontent';
              } else if (_this.response.status === 304) {
                _this.response.statusText = 'notmodified';
              } else {
                _this.response.statusText = _this.xhr.statusText;
                _this.response.rawData = _this.xhr.responseText;
                _this.response.xml = _this.xhr.responseXML;
                _this.response.data = _this.xhr.responseText;
                contentType = _this.xhr.getResponseHeader('content-type');
                if (contentType !== null && (contentType.match(/application\/json/) !== null || _this.jsonPrefix !== null)) {
                  data = _this.response.data;
                  if (_this.jsonPrefix !== null) {
                    prefix = escape(_this.jsonPrefix);
                    data = data.replace(new RegExp('^' + prefix), '');
                  }
                  _this.response.data = JSON.parse(data);
                }
                if (contentType !== null && (contentType.match(/text\/javascript/) !== null || contentType.match(/application\/javascript/) !== null) && _this.jsonp) {
                  eval(_this.response.data);
                }
              }
              return _this.emit('success', _this.response);
            } else {
              _this.response.statusText = _this.xhr.statusText;
              error = new Error("Can not load " + _this.url + " address");
              error.response = _this.response;
              return _this.emit('error', error, _this.response);
            }
          }
        };
      })(this);
    }

    Xhr.prototype.createXhr = function() {
      if (window.XMLHttpRequest) {
        return new window.XMLHttpRequest;
      } else {
        return new ActiveXObject("Microsoft.XMLHTTP");
      }
    };

    Xhr.prototype.getHeaders = function() {
      return this.xhr.getAllResponseHeaders();
    };

    Xhr.prototype.getHeader = function(name) {
      return this.xhr.getResponseHeader(name);
    };

    Xhr.prototype.setHeader = function(name, value) {
      this.xhr.setRequestHeader(name, value);
      return this;
    };

    Xhr.prototype.setMimeType = function(mime) {
      this.xhr.overrideMimeType(mime);
      return this;
    };

    Xhr.prototype.send = function(fn) {
      this.emit('send', this.response);
      this.on('success', (function(_this) {
        return function(response) {
          _this.emit('complete', null, response);
          return fn(response, null);
        };
      })(this));
      this.on('error', (function(_this) {
        return function(err, response) {
          _this.emit('complete', err, response);
          return fn(null, err);
        };
      })(this));
      this.xhr.send(this.data);
      this.emit('afterSend', this.response);
      return new FakePromise;
    };

    Xhr.prototype.abort = function() {
      this.xhr.abort();
      this.emit('abort', this.response);
      return this;
    };

    return Xhr;

  })(EventEmitter);

  module.exports = Xhr;

}).call(this);

},{"./FakePromise":10,"./Helpers":11,"./Response":18,"escape-regexp":21,"events":26}],20:[function(require,module,exports){
(function() {
  var BaseExtension, EventEmitter, Http, Queue, Request,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice;

  Request = require('./Request');

  Queue = require('./Queue');

  BaseExtension = require('./Extensions/BaseExtension');

  EventEmitter = require('events').EventEmitter;

  Http = (function(superClass) {
    extend(Http, superClass);

    Http.prototype.extensions = null;

    Http.prototype.queue = null;

    Http.prototype.historyApiSupported = null;

    Http.prototype.useQueue = true;

    Http.prototype.options = {
      type: 'GET',
      jsonPrefix: null,
      parallel: true
    };

    function Http() {
      Http.__super__.constructor.apply(this, arguments);
      this.extensions = {};
      this.queue = new Queue;
      this.on('send', (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return _this.callExtensions('send', args);
        };
      })(this));
      this.on('afterSend', (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return _this.callExtensions('afterSend', args);
        };
      })(this));
      this.on('complete', (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return _this.callExtensions('complete', args);
        };
      })(this));
      this.on('error', (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return _this.callExtensions('error', args);
        };
      })(this));
      this.on('success', (function(_this) {
        return function() {
          var args;
          args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
          return _this.callExtensions('success', args);
        };
      })(this));
    }

    Http.prototype.createRequest = function(url, type, data, jsonp, jsonPrefix) {
      return new Request(url, type, data, jsonp, jsonPrefix);
    };

    Http.prototype.request = function(url, optionsOrFn, fn) {
      var args, options, ref, request;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      url = args.url;
      options = args.options;
      fn = args.fn;
      if (typeof options.type === 'undefined') {
        options.type = this.options.type;
      }
      if (typeof options.data === 'undefined') {
        options.data = null;
      }
      if (typeof options.jsonp === 'undefined') {
        options.jsonp = false;
      }
      if (typeof options.jsonPrefix === 'undefined') {
        options.jsonPrefix = this.options.jsonPrefix;
      }
      if (typeof options.parallel === 'undefined') {
        options.parallel = this.options.parallel;
      }
      request = this.createRequest(url, options.type, options.data, options.jsonp, options.jsonPrefix);
      request.on('send', (function(_this) {
        return function(response, request) {
          return _this.emit('send', response, request);
        };
      })(this));
      request.on('afterSend', (function(_this) {
        return function(response, request) {
          return _this.emit('afterSend', response, request);
        };
      })(this));
      request.on('success', (function(_this) {
        return function(response, request) {
          return _this.emit('success', response, request);
        };
      })(this));
      request.on('error', (function(_this) {
        return function(error, response, request) {
          return _this.emit('error', error, response, request);
        };
      })(this));
      request.on('complete', (function(_this) {
        return function(err, response, request) {
          return _this.emit('complete', err, response, request);
        };
      })(this));
      if (this.useQueue && (((ref = options.type) === 'PUT' || ref === 'POST' || ref === 'DELETE') || options.parallel === false || this.queue.hasWritableRequests())) {
        return this.queue.addAndSend(request, fn);
      } else {
        return request.send(fn);
      }
    };

    Http.prototype.get = function(url, optionsOrFn, fn) {
      var args;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      args.options.type = 'GET';
      return this.request(args.url, args.options, args.fn);
    };

    Http.prototype.post = function(url, optionsOrFn, fn) {
      var args;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      args.options.type = 'POST';
      return this.request(args.url, args.options, args.fn);
    };

    Http.prototype.put = function(url, optionsOrFn, fn) {
      var args;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      args.options.type = 'PUT';
      return this.request(args.url, args.options, args.fn);
    };

    Http.prototype["delete"] = function(url, optionsOrFn, fn) {
      var args;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      args.options.type = 'DELETE';
      return this.request(args.url, args.options, args.fn);
    };

    Http.prototype.getJson = function(url, optionsOrFn, fn) {
      var args;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      return this.request(args.url, args.options, function(response, err) {
        if (!err && typeof response.data === 'string') {
          response.data = JSON.parse(response.data);
        }
        return fn(response, err);
      });
    };

    Http.prototype.postJson = function(url, optionsOrFn, fn) {
      var args;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      args.options.type = 'POST';
      return this.request(args.url, args.options, function(response, err) {
        if (!err && typeof response.data === 'string') {
          response.data = JSON.parse(response.data);
        }
        return fn(response, err);
      });
    };

    Http.prototype.jsonp = function(url, optionsOrFn, fn) {
      var args;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      args = this._optimizeArguments(url, optionsOrFn, fn);
      if (typeof args.options.jsonp === 'undefined') {
        args.options.jsonp = true;
      }
      return this.get(args.url, args.options, args.fn);
    };

    Http.prototype.isHistoryApiSupported = function() {
      if (this.historyApiSupported) {
        this.historyApiSupported = window.history && window.history.pushState && window.history.replaceState && !navigator.userAgent.match(/((iPod|iPhone|iPad).+\bOS\s+[1-4]|WebApps\/.+CFNetwork)/);
      }
      return this.historyApiSupported;
    };

    Http.prototype.addExtension = function(name, extension) {
      if (extension instanceof BaseExtension) {
        extension.setHttp(this);
      }
      this.extensions[name] = extension;
      return this;
    };

    Http.prototype.removeExtension = function(name) {
      if (typeof this.extensions[name] === 'undefined') {
        throw new Error('Extension ' + name + ' does not exists');
      }
      delete this.extensions[name];
      return this;
    };

    Http.prototype.callExtensions = function(event, args) {
      var ext, name, ref, results;
      ref = this.extensions;
      results = [];
      for (name in ref) {
        ext = ref[name];
        if (typeof ext[event] !== 'undefined') {
          results.push(ext[event].apply(ext[event], args));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    Http.prototype._optimizeArguments = function(url, optionsOrFn, fn) {
      var options;
      if (optionsOrFn == null) {
        optionsOrFn = {};
      }
      if (fn == null) {
        fn = null;
      }
      if (Object.prototype.toString.call(optionsOrFn) === '[object Function]') {
        fn = optionsOrFn;
        options = {};
      } else {
        options = optionsOrFn;
      }
      if (fn === null) {
        fn = function() {
          return {};
        };
      }
      return {
        url: url,
        options: options,
        fn: fn
      };
    };

    return Http;

  })(EventEmitter);

  module.exports = Http;

}).call(this);

},{"./Extensions/BaseExtension":3,"./Queue":16,"./Request":17,"events":26}],21:[function(require,module,exports){

/**
 * Escape regexp special characters in `str`.
 *
 * @param {String} str
 * @return {String}
 * @api public
 */

module.exports = function(str){
  return String(str).replace(/([.*+?=^!:${}()|[\]\/\\])/g, '\\$1');
};
},{}],22:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var isArray = require('is-array')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192 // not used by this implementation

var kMaxLength = 0x3fffffff
var rootParent = {}

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Note:
 *
 * - Implementation must support adding new properties to `Uint8Array` instances.
 *   Firefox 4-29 lacked support, fixed in Firefox 30+.
 *   See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *  - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *  - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *    incorrect length in some situations.
 *
 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they will
 * get the Object implementation, which is slower but will work correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = (function () {
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        new Uint8Array(1).subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
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
function Buffer (arg) {
  if (!(this instanceof Buffer)) {
    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
    if (arguments.length > 1) return new Buffer(arg, arguments[1])
    return new Buffer(arg)
  }

  this.length = 0
  this.parent = undefined

  // Common case.
  if (typeof arg === 'number') {
    return fromNumber(this, arg)
  }

  // Slightly less common case.
  if (typeof arg === 'string') {
    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
  }

  // Unusual.
  return fromObject(this, arg)
}

function fromNumber (that, length) {
  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < length; i++) {
      that[i] = 0
    }
  }
  return that
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

  // Assumption: byteLength() return value is always < kMaxLength.
  var length = byteLength(string, encoding) | 0
  that = allocate(that, length)

  that.write(string, encoding)
  return that
}

function fromObject (that, object) {
  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

  if (isArray(object)) return fromArray(that, object)

  if (object == null) {
    throw new TypeError('must start with number, buffer, array or string')
  }

  if (typeof ArrayBuffer !== 'undefined' && object.buffer instanceof ArrayBuffer) {
    return fromTypedArray(that, object)
  }

  if (object.length) return fromArrayLike(that, object)

  return fromJsonObject(that, object)
}

function fromBuffer (that, buffer) {
  var length = checked(buffer.length) | 0
  that = allocate(that, length)
  buffer.copy(that, 0, 0, length)
  return that
}

function fromArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Duplicate of fromArray() to keep fromArray() monomorphic.
function fromTypedArray (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  // Truncating the elements is probably not what people expect from typed
  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
  // of the old Buffer constructor.
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayLike (that, array) {
  var length = checked(array.length) | 0
  that = allocate(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
// Returns a zero-length buffer for inputs that don't conform to the spec.
function fromJsonObject (that, object) {
  var array
  var length = 0

  if (object.type === 'Buffer' && isArray(object.data)) {
    array = object.data
    length = checked(array.length) | 0
  }
  that = allocate(that, length)

  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function allocate (that, length) {
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return an object instance of the Buffer class
    that.length = length
    that._isBuffer = true
  }

  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
  if (fromPool) that.parent = rootParent

  return that
}

function checked (length) {
  // Note: cannot use `length < kMaxLength` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (subject, encoding) {
  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

  var buf = new Buffer(subject, encoding)
  delete buf.parent
  return buf
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  var i = 0
  var len = Math.min(x, y)
  while (i < len) {
    if (a[i] !== b[i]) break

    ++i
  }

  if (i !== len) {
    x = a[i]
    y = b[i]
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
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

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; i++) {
      length += list[i].length
    }
  }

  var buf = new Buffer(length)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

function byteLength (string, encoding) {
  if (typeof string !== 'string') string = String(string)

  if (string.length === 0) return 0

  switch (encoding || 'utf8') {
    case 'ascii':
    case 'binary':
    case 'raw':
      return string.length
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return string.length * 2
    case 'hex':
      return string.length >>> 1
    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(string).length
    case 'base64':
      return base64ToBytes(string).length
    default:
      return string.length
  }
}
Buffer.byteLength = byteLength

// pre-set for values that may exist in the future
Buffer.prototype.length = undefined
Buffer.prototype.parent = undefined

// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function toString (encoding, start, end) {
  var loweredCase = false

  start = start | 0
  end = end === undefined || end === Infinity ? this.length : end | 0

  if (!encoding) encoding = 'utf8'
  if (start < 0) start = 0
  if (end > this.length) end = this.length
  if (end <= start) return ''

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'binary':
        return binarySlice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return 0
  return Buffer.compare(this, b)
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
  byteOffset >>= 0

  if (this.length === 0) return -1
  if (byteOffset >= this.length) return -1

  // Negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

  if (typeof val === 'string') {
    if (val.length === 0) return -1 // special case: looking for empty string always fails
    return String.prototype.indexOf.call(this, val, byteOffset)
  }
  if (Buffer.isBuffer(val)) {
    return arrayIndexOf(this, val, byteOffset)
  }
  if (typeof val === 'number') {
    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
    }
    return arrayIndexOf(this, [ val ], byteOffset)
  }

  function arrayIndexOf (arr, val, byteOffset) {
    var foundIndex = -1
    for (var i = 0; byteOffset + i < arr.length; i++) {
      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
      } else {
        foundIndex = -1
      }
    }
    return -1
  }

  throw new TypeError('val must be string, number or Buffer')
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function get (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function set (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

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
  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) throw new Error('Invalid hex string')
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function binaryWrite (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    var swap = encoding
    encoding = offset
    offset = length | 0
    length = swap
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'binary':
        return binaryWrite(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
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
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function binarySlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
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

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
  }

  if (newBuf.length) newBuf.parent = this.parent || this

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = value
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = value
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = value < 0 ? 1 : 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = value
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = value
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = value
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = value
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (value > max || value < min) throw new RangeError('value is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('index out of range')
  if (offset < 0) throw new RangeError('index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < len; i++) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    target._set(this.subarray(start, start + len), targetStart)
  }

  return len
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (end < start) throw new RangeError('end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

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

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer.TYPED_ARRAY_SUPPORT) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1) {
        buf[i] = this[i]
      }
      return buf.buffer
    }
  } else {
    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function _augment (arr) {
  arr.constructor = Buffer
  arr._isBuffer = true

  // save reference to original Uint8Array set method before overwriting
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
  arr.indexOf = BP.indexOf
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUIntLE = BP.readUIntLE
  arr.readUIntBE = BP.readUIntBE
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readIntLE = BP.readIntLE
  arr.readIntBE = BP.readIntBE
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
  arr.writeUIntLE = BP.writeUIntLE
  arr.writeUIntBE = BP.writeUIntBE
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeIntLE = BP.writeIntLE
  arr.writeIntBE = BP.writeIntBE
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

var INVALID_BASE64_RE = /[^+\/0-9A-z\-]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []
  var i = 0

  for (; i < length; i++) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (leadSurrogate) {
        // 2 leads in a row
        if (codePoint < 0xDC00) {
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          leadSurrogate = codePoint
          continue
        } else {
          // valid surrogate pair
          codePoint = leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00 | 0x10000
          leadSurrogate = null
        }
      } else {
        // no lead yet

        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else {
          // valid lead
          leadSurrogate = codePoint
          continue
        }
      }
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
      leadSurrogate = null
    }

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x200000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
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

},{"base64-js":23,"ieee754":24,"is-array":25}],23:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
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

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

},{}],24:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],25:[function(require,module,exports){

/**
 * isArray
 */

var isArray = Array.isArray;

/**
 * toString
 */

var str = Object.prototype.toString;

/**
 * Whether or not the given `val`
 * is an array.
 *
 * example:
 *
 *        isArray([]);
 *        // > true
 *        isArray(arguments);
 *        // > false
 *        isArray('');
 *        // > false
 *
 * @param {mixed} val
 * @return {bool}
 */

module.exports = isArray || function (val) {
  return !! val && '[object Array]' == str.call(val);
};

},{}],26:[function(require,module,exports){
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
      }
      throw TypeError('Uncaught, unspecified "error" event.');
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

},{}],27:[function(require,module,exports){
(function() {
  var JS_WS_CLIENT_TYPE = 'js-websocket';
  var JS_WS_CLIENT_VERSION = '0.0.1';

  var Protocol = window.Protocol;
  var protobuf = window.protobuf;
  var decodeIO_protobuf = window.decodeIO_protobuf;
  var decodeIO_encoder = null;
  var decodeIO_decoder = null;
  var Package = Protocol.Package;
  var Message = Protocol.Message;
  var EventEmitter = window.EventEmitter;
  var rsa = window.rsa;

  if(typeof(window) != "undefined" && typeof(sys) != 'undefined' && sys.localStorage) {
    window.localStorage = sys.localStorage;
  }
  
  var RES_OK = 200;
  var RES_FAIL = 500;
  var RES_OLD_CLIENT = 501;

  if (typeof Object.create !== 'function') {
    Object.create = function (o) {
      function F() {}
      F.prototype = o;
      return new F();
    };
  }

  var root = window;
  var pomelo = Object.create(EventEmitter.prototype); // object extend from object
  root.pomelo = pomelo;
  var socket = null;
  var reqId = 0;
  var callbacks = {};
  var handlers = {};
  //Map from request id to route
  var routeMap = {};
  var dict = {};    // route string to code
  var abbrs = {};   // code to route string
  var serverProtos = {};
  var clientProtos = {};
  var protoVersion = 0;

  var heartbeatInterval = 0;
  var heartbeatTimeout = 0;
  var nextHeartbeatTimeout = 0;
  var gapThreshold = 100;   // heartbeat gap threashold
  var heartbeatId = null;
  var heartbeatTimeoutId = null;
  var handshakeCallback = null;

  var decode = null;
  var encode = null;

  var reconnect = false;
  var reconncetTimer = null;
  var reconnectUrl = null;
  var reconnectAttempts = 0;
  var reconnectionDelay = 5000;
  var DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

  var useCrypto;

  var handshakeBuffer = {
    'sys': {
      type: JS_WS_CLIENT_TYPE,
      version: JS_WS_CLIENT_VERSION,
      rsa: {}
    },
    'user': {
    }
  };

  var initCallback = null;

  pomelo.init = function(params, cb) {
    initCallback = cb;
    var host = params.host;
    var port = params.port;

    encode = params.encode || defaultEncode;
    decode = params.decode || defaultDecode;

    var url = 'ws://' + host;
    if(port) {
      url +=  ':' + port;
    }

    handshakeBuffer.user = params.user;
    if(params.encrypt) {
      useCrypto = true;
      rsa.generate(1024, "10001");
      var data = {
        rsa_n: rsa.n.toString(16),
        rsa_e: rsa.e
      }
      handshakeBuffer.sys.rsa = data;
    }
    handshakeCallback = params.handshakeCallback;
    connect(params, url, cb);
  };

  var defaultDecode = pomelo.decode = function(data) {
    //probuff decode
    var msg = Message.decode(data);

    if(msg.id > 0){
      msg.route = routeMap[msg.id];
      delete routeMap[msg.id];
      if(!msg.route){
        return;
      }
    }

    msg.body = deCompose(msg);
    return msg;
  };

  var defaultEncode = pomelo.encode = function(reqId, route, msg) {
    var type = reqId ? Message.TYPE_REQUEST : Message.TYPE_NOTIFY;

    //compress message by protobuf
    if(protobuf && clientProtos[route]) {
      msg = protobuf.encode(route, msg);
    } else if(decodeIO_encoder && decodeIO_encoder.lookup(route)) {
      var Builder = decodeIO_encoder.build(route);
      msg = new Builder(msg).encodeNB();
    } else {
      msg = Protocol.strencode(JSON.stringify(msg));
    }

    var compressRoute = 0;
    if(dict && dict[route]) {
      route = dict[route];
      compressRoute = 1;
    }

    return Message.encode(reqId, type, compressRoute, route, msg);
  };

  var connect = function(params, url, cb) {
    console.log('connect to ' + url);

    var params = params || {};
    var maxReconnectAttempts = params.maxReconnectAttempts || DEFAULT_MAX_RECONNECT_ATTEMPTS;
    reconnectUrl = url;
    //Add protobuf version
    if(window.localStorage && window.localStorage.getItem('protos') && protoVersion === 0) {
      var protos = JSON.parse(window.localStorage.getItem('protos'));

      protoVersion = protos.version || 0;
      serverProtos = protos.server || {};
      clientProtos = protos.client || {};

      if(!!protobuf) {
        protobuf.init({encoderProtos: clientProtos, decoderProtos: serverProtos});
      } 
      if(!!decodeIO_protobuf) {
        decodeIO_encoder = decodeIO_protobuf.loadJson(clientProtos);
        decodeIO_decoder = decodeIO_protobuf.loadJson(serverProtos);
      }
    }
    //Set protoversion
    handshakeBuffer.sys.protoVersion = protoVersion;

    var onopen = function(event) {
      if(!!reconnect) {
        pomelo.emit('reconnect');
      }
      reset();
      var obj = Package.encode(Package.TYPE_HANDSHAKE, Protocol.strencode(JSON.stringify(handshakeBuffer)));
      send(obj);
    };
    var onmessage = function(event) {
      processPackage(Package.decode(event.data), cb);
      // new package arrived, update the heartbeat timeout
      if(heartbeatTimeout) {
        nextHeartbeatTimeout = Date.now() + heartbeatTimeout;
      }
    };
    var onerror = function(event) {
      pomelo.emit('io-error', event);
      console.error('socket error: ', event);
    };
    var onclose = function(event) {
      pomelo.emit('close',event);
      pomelo.emit('disconnect', event);
      console.error('socket close: ', event);
      if(!!params.reconnect && reconnectAttempts < maxReconnectAttempts) {
        reconnect = true;
        reconnectAttempts++;
        reconncetTimer = setTimeout(function() {
          connect(params, reconnectUrl, cb);
        }, reconnectionDelay);
        reconnectionDelay *= 2;
      }
    };
    socket = new WebSocket(url);
    socket.binaryType = 'arraybuffer';
    socket.onopen = onopen;
    socket.onmessage = onmessage;
    socket.onerror = onerror;
    socket.onclose = onclose;
  };

  pomelo.disconnect = function() {
    if(socket) {
      if(socket.disconnect) socket.disconnect();
      if(socket.close) socket.close();
      console.log('disconnect');
      socket = null;
    }

    if(heartbeatId) {
      clearTimeout(heartbeatId);
      heartbeatId = null;
    }
    if(heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }
  };

  var reset = function() {
    reconnect = false;
    reconnectionDelay = 1000 * 5;
    reconnectAttempts = 0;
    clearTimeout(reconncetTimer);
  };

  pomelo.request = function(route, msg, cb) {
    if(arguments.length === 2 && typeof msg === 'function') {
      cb = msg;
      msg = {};
    } else {
      msg = msg || {};
    }
    route = route || msg.route;
    if(!route) {
      return;
    }

    reqId++;
    sendMessage(reqId, route, msg);

    callbacks[reqId] = cb;
    routeMap[reqId] = route;
  };

  pomelo.notify = function(route, msg) {
    msg = msg || {};
    sendMessage(0, route, msg);
  };

  var sendMessage = function(reqId, route, msg) {
    if(useCrypto) {
      msg = JSON.stringify(msg);
      var sig = rsa.signString(msg, "sha256");
      msg = JSON.parse(msg);
      msg['__crypto__'] = sig;
    }

    if(encode) {
      msg = encode(reqId, route, msg);
    }

    var packet = Package.encode(Package.TYPE_DATA, msg);
    send(packet);
  };

  var send = function(packet) {
    if(socket)
      socket.send(packet.buffer);
  };

  var handler = {};

  var heartbeat = function(data) {
    if(!heartbeatInterval) {
      // no heartbeat
      return;
    }

    var obj = Package.encode(Package.TYPE_HEARTBEAT);
    if(heartbeatTimeoutId) {
      clearTimeout(heartbeatTimeoutId);
      heartbeatTimeoutId = null;
    }

    if(heartbeatId) {
      // already in a heartbeat interval
      return;
    }
    heartbeatId = setTimeout(function() {
      heartbeatId = null;
      send(obj);

      nextHeartbeatTimeout = Date.now() + heartbeatTimeout;
      heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, heartbeatTimeout);
    }, heartbeatInterval);
  };

  var heartbeatTimeoutCb = function() {
    var gap = nextHeartbeatTimeout - Date.now();
    if(gap > gapThreshold) {
      heartbeatTimeoutId = setTimeout(heartbeatTimeoutCb, gap);
    } else {
      console.error('server heartbeat timeout');
      pomelo.emit('heartbeat timeout');
      pomelo.disconnect();
    }
  };

  var handshake = function(data) {
    data = JSON.parse(Protocol.strdecode(data));
    if(data.code === RES_OLD_CLIENT) {
      pomelo.emit('error', 'client version not fullfill');
      return;
    }

    if(data.code !== RES_OK) {
      pomelo.emit('error', 'handshake fail');
      return;
    }

    handshakeInit(data);

    var obj = Package.encode(Package.TYPE_HANDSHAKE_ACK);
    send(obj);
    if(initCallback) {
      initCallback(socket);
    }
  };

  var onData = function(data) {
    var msg = data;
    if(decode) {
      msg = decode(msg);
    }
    processMessage(pomelo, msg);
  };

  var onKick = function(data) {
    data = JSON.parse(Protocol.strdecode(data));
    pomelo.emit('onKick', data);
  };

  handlers[Package.TYPE_HANDSHAKE] = handshake;
  handlers[Package.TYPE_HEARTBEAT] = heartbeat;
  handlers[Package.TYPE_DATA] = onData;
  handlers[Package.TYPE_KICK] = onKick;

  var processPackage = function(msgs) {
    if(Array.isArray(msgs)) {
      for(var i=0; i<msgs.length; i++) {
        var msg = msgs[i];
        handlers[msg.type](msg.body);
      }
    } else {
      handlers[msgs.type](msgs.body);
    }
  };

  var processMessage = function(pomelo, msg) {
    if(!msg.id) {
      // server push message
      pomelo.emit(msg.route, msg.body);
      return;
    }

    //if have a id then find the callback function with the request
    var cb = callbacks[msg.id];

    delete callbacks[msg.id];
    if(typeof cb !== 'function') {
      return;
    }

    cb(msg.body);
    return;
  };

  var processMessageBatch = function(pomelo, msgs) {
    for(var i=0, l=msgs.length; i<l; i++) {
      processMessage(pomelo, msgs[i]);
    }
  };

  var deCompose = function(msg) {
    var route = msg.route;

    //Decompose route from dict
    if(msg.compressRoute) {
      if(!abbrs[route]){
        return {};
      }

      route = msg.route = abbrs[route];
    }
    if(protobuf && serverProtos[route]) {
      return protobuf.decodeStr(route, msg.body);
    } else if(decodeIO_decoder && decodeIO_decoder.lookup(route)) {
      return decodeIO_decoder.build(route).decode(msg.body);
    } else {
      return JSON.parse(Protocol.strdecode(msg.body));
    }

    return msg;
  };

  var handshakeInit = function(data) {
    if(data.sys && data.sys.heartbeat) {
      heartbeatInterval = data.sys.heartbeat * 1000;   // heartbeat interval
      heartbeatTimeout = heartbeatInterval * 2;        // max heartbeat timeout
    } else {
      heartbeatInterval = 0;
      heartbeatTimeout = 0;
    }

    initData(data);

    if(typeof handshakeCallback === 'function') {
      handshakeCallback(data.user);
    }
  };

  //Initilize data used in pomelo client
  var initData = function(data) {
    if(!data || !data.sys) {
      return;
    }
    dict = data.sys.dict;
    var protos = data.sys.protos;

    //Init compress dict
    if(dict) {
      dict = dict;
      abbrs = {};

      for(var route in dict) {
        abbrs[dict[route]] = route;
      }
    }

    //Init protobuf protos
    if(protos) {
      protoVersion = protos.version || 0;
      serverProtos = protos.server || {};
      clientProtos = protos.client || {};

        //Save protobuf protos to localStorage
        window.localStorage.setItem('protos', JSON.stringify(protos));

        if(!!protobuf) {
          protobuf.init({encoderProtos: protos.client, decoderProtos: protos.server});
        }
        if(!!decodeIO_protobuf) {
          decodeIO_encoder = decodeIO_protobuf.loadJson(clientProtos);
          decodeIO_decoder = decodeIO_protobuf.loadJson(serverProtos);
        }
      }
    };

    module.exports = pomelo;
  })();

},{}],28:[function(require,module,exports){
var Encoder = module.exports;

/**
 * [encode an uInt32, return a array of bytes]
 * @param  {[integer]} num
 * @return {[array]}
 */
Encoder.encodeUInt32 = function(num){
	var n = parseInt(num);
	if(isNaN(n) || n < 0){
		console.log(n);
		return null;
	}

	var result = [];
	do{
		var tmp = n % 128;
		var next = Math.floor(n/128);

		if(next !== 0){
			tmp = tmp + 128;
		}
		result.push(tmp);
		n = next;
	} while(n !== 0);

	return result;
};

/**
 * [encode a sInt32, return a byte array]
 * @param  {[sInt32]} num  The sInt32 need to encode
 * @return {[array]} A byte array represent the integer
 */
Encoder.encodeSInt32 = function(num){
	var n = parseInt(num);
	if(isNaN(n)){
		return null;
	}
	n = n<0?(Math.abs(n)*2-1):n*2;

	return Encoder.encodeUInt32(n);
};

Encoder.decodeUInt32 = function(bytes){
	var n = 0;

	for(var i = 0; i < bytes.length; i++){
		var m = parseInt(bytes[i]);
		n = n + ((m & 0x7f) * Math.pow(2,(7*i)));
		if(m < 128){
			return n;
		}
	}

	return n;
};


Encoder.decodeSInt32 = function(bytes){
	var n = this.decodeUInt32(bytes);
	var flag = ((n%2) === 1)?-1:1;

	n = ((n%2 + n)/2)*flag;

	return n;
};

},{}],29:[function(require,module,exports){
module.exports = {
	TYPES : {
		uInt32 : 0,
		sInt32 : 0,
		int32 : 0,
		double : 1,
		string : 2,
		message : 2,
		float : 5
	}
}
},{}],30:[function(require,module,exports){
var codec = require('./codec');
var util = require('./util');

var Decoder = module.exports;

var buffer;
var offset = 0;

Decoder.init = function(protos){
	this.protos = protos || {};
};

Decoder.setProtos = function(protos){
	if(!!protos){
		this.protos = protos;
	}
};

Decoder.decode = function(route, buf){
	var protos = this.protos[route];

	buffer = buf;
	offset = 0;

	if(!!protos){
		return decodeMsg({}, protos, buffer.length);
	}

	return null;
};

function decodeMsg(msg, protos, length){
	while(offset<length){
		var head = getHead();
		var type = head.type;
		var tag = head.tag;
		var name = protos.__tags[tag];

		switch(protos[name].option){
			case 'optional' :
			case 'required' :
				msg[name] = decodeProp(protos[name].type, protos);
			break;
			case 'repeated' :
				if(!msg[name]){
					msg[name] = [];
				}
				decodeArray(msg[name], protos[name].type, protos);
			break;
		}
	}

	return msg;
}

/**
 * Test if the given msg is finished
 */
function isFinish(msg, protos){
	return (!protos.__tags[peekHead().tag]);
}
/**
 * Get property head from protobuf
 */
function getHead(){
	var tag = codec.decodeUInt32(getBytes());

	return {
		type : tag&0x7,
		tag	: tag>>3
	};
}

/**
 * Get tag head without move the offset
 */
function peekHead(){
	var tag = codec.decodeUInt32(peekBytes());

	return {
		type : tag&0x7,
		tag	: tag>>3
	};
}

function decodeProp(type, protos){
	switch(type){
		case 'uInt32':
			return codec.decodeUInt32(getBytes());
		case 'int32' :
		case 'sInt32' :
			return codec.decodeSInt32(getBytes());
		case 'float' :
			var float = buffer.readFloatLE(offset);
			offset += 4;
			return float;
		case 'double' :
			var double = buffer.readDoubleLE(offset);
			offset += 8;
			return double;
		case 'string' :
			var length = codec.decodeUInt32(getBytes());

			var str =  buffer.toString('utf8', offset, offset+length);
			offset += length;

			return str;
		default :
			var message = protos && (protos.__messages[type] || Decoder.protos['message ' + type]);
			if(message){
				var length = codec.decodeUInt32(getBytes());
				var msg = {};
				decodeMsg(msg, message, offset+length);
				return msg;
			}
		break;
	}
}

function decodeArray(array, type, protos){
	if(util.isSimpleType(type)){
		var length = codec.decodeUInt32(getBytes());

		for(var i = 0; i < length; i++){
			array.push(decodeProp(type));
		}
	}else{
		array.push(decodeProp(type, protos));
	}
}

function getBytes(flag){
	var bytes = [];
	var pos = offset;
	flag = flag || false;

	var b;
	do{
		var b = buffer.readUInt8(pos);
		bytes.push(b);
		pos++;
	}while(b >= 128);

	if(!flag){
		offset = pos;
	}
	return bytes;
}

function peekBytes(){
	return getBytes(true);
}
},{"./codec":28,"./util":34}],31:[function(require,module,exports){
(function (Buffer){
var codec = require('./codec');
var constant = require('./constant');
var util = require('./util');

var Encoder = module.exports;

Encoder.init = function(protos){
	this.protos = protos || {};
};

Encoder.encode = function(route, msg){
	if(!route || !msg){
		console.warn('Route or msg can not be null! route : %j, msg %j', route, msg);
		return null;
	}

	//Get protos from protos map use the route as key
	var protos = this.protos[route];

	//Check msg
	if(!checkMsg(msg, protos)){
		console.warn('check msg failed! msg : %j, proto : %j', msg, protos);
		return null;
	}

	//Set the length of the buffer 2 times bigger to prevent overflow
	var length = Buffer.byteLength(JSON.stringify(msg))*2;

	//Init buffer and offset
	var buffer = new Buffer(length);
	var offset = 0;

	if(!!protos){
		offset = encodeMsg(buffer, offset, protos, msg);
		if(offset > 0){
			return buffer.slice(0, offset);
		}
	}

	return null;
};

/**
 * Check if the msg follow the defination in the protos
 */
function checkMsg(msg, protos){
	if(!protos || !msg){
		console.warn('no protos or msg exist! msg : %j, protos : %j', msg, protos);
		return false;
	}

	for(var name in protos){
		var proto = protos[name];

		//All required element must exist
		switch(proto.option){
			case 'required' :
				if(typeof(msg[name]) === 'undefined'){
					console.warn('no property exist for required! name: %j, proto: %j, msg: %j', name, proto, msg);
					return false;
				}
			case 'optional' :
				if(typeof(msg[name]) !== 'undefined'){
					var message = protos.__messages[proto.type] || Encoder.protos['message ' + proto.type];
					if(!!message && !checkMsg(msg[name], message)){
						console.warn('inner proto error! name: %j, proto: %j, msg: %j', name, proto, msg);
						return false;
					}
				}
			break;
			case 'repeated' :
				//Check nest message in repeated elements
				var message = protos.__messages[proto.type] || Encoder.protos['message ' + proto.type];
				if(!!msg[name] && !!message){
					for(var i = 0; i < msg[name].length; i++){
						if(!checkMsg(msg[name][i], message)){
							return false;
						}
					}
				}
			break;
		}
	}

	return true;
}

function encodeMsg(buffer, offset, protos, msg){
	for(var name in msg){
		if(!!protos[name]){
			var proto = protos[name];

			switch(proto.option){
				case 'required' :
				case 'optional' :
					offset = writeBytes(buffer, offset, encodeTag(proto.type, proto.tag));
					offset = encodeProp(msg[name], proto.type, offset, buffer, protos);
				break;
				case 'repeated' :
					if(!!msg[name] && msg[name].length > 0){
						offset = encodeArray(msg[name], proto, offset, buffer, protos);
					}
				break;
			}
		}
	}

	return offset;
}

function encodeProp(value, type, offset, buffer, protos){
	var length = 0;

	switch(type){
		case 'uInt32':
			offset = writeBytes(buffer, offset, codec.encodeUInt32(value));
		break;
		case 'int32' :
		case 'sInt32':
			offset = writeBytes(buffer, offset, codec.encodeSInt32(value));
		break;
		case 'float':
			buffer.writeFloatLE(value, offset);
			offset += 4;
		break;
		case 'double':
			buffer.writeDoubleLE(value, offset);
			offset += 8;
		break;
		case 'string':
			length = Buffer.byteLength(value);

			//Encode length
			offset = writeBytes(buffer, offset, codec.encodeUInt32(length));
			//write string
			buffer.write(value, offset, length);
			offset += length;
		break;
		default :
			var message = protos.__messages[type] || Encoder.protos['message ' + type];
			if(!!message){
				//Use a tmp buffer to build an internal msg
				var tmpBuffer = new Buffer(Buffer.byteLength(JSON.stringify(value))*2);
				length = 0;

				length = encodeMsg(tmpBuffer, length, message, value);
				//Encode length
				offset = writeBytes(buffer, offset, codec.encodeUInt32(length));
				//contact the object
				tmpBuffer.copy(buffer, offset, 0, length);

				offset += length;
			}
		break;
	}

	return offset;
}

/**
 * Encode reapeated properties, simple msg and object are decode differented
 */
function encodeArray(array, proto, offset, buffer, protos){
	var i = 0;
	if(util.isSimpleType(proto.type)){
		offset = writeBytes(buffer, offset, encodeTag(proto.type, proto.tag));
		offset = writeBytes(buffer, offset, codec.encodeUInt32(array.length));
		for(i = 0; i < array.length; i++){
			offset = encodeProp(array[i], proto.type, offset, buffer);
		}
	}else{
		for(i = 0; i < array.length; i++){
			offset = writeBytes(buffer, offset, encodeTag(proto.type, proto.tag));
			offset = encodeProp(array[i], proto.type, offset, buffer, protos);
		}
	}

	return offset;
}

function writeBytes(buffer, offset, bytes){
	for(var i = 0; i < bytes.length; i++){
		buffer.writeUInt8(bytes[i], offset);
		offset++;
	}

	return offset;
}

function encodeTag(type, tag){
	var value = constant.TYPES[type];

	if(value === undefined) value = 2;

	return codec.encodeUInt32((tag<<3)|value);
}

}).call(this,require("buffer").Buffer)
},{"./codec":28,"./constant":29,"./util":34,"buffer":22}],32:[function(require,module,exports){
var Parser = module.exports;

/**
 * [parse the original protos, give the paresed result can be used by protobuf encode/decode.]
 * @param  {[Object]} protos Original protos, in a js map.
 * @return {[Object]} The presed result, a js object represent all the meta data of the given protos.
 */
Parser.parse = function(protos){
	var maps = {};
	for(var key in protos){
		maps[key] = parseObject(protos[key]);
	}

	return maps;
};

/**
 * [parse a single protos, return a object represent the result. The method can be invocked recursively.]
 * @param  {[Object]} obj The origin proto need to parse.
 * @return {[Object]} The parsed result, a js object.
 */
function parseObject(obj){
	var proto = {};
	var nestProtos = {};
	var tags = {};

	for(var name in obj){
		var tag = obj[name];
		var params = name.split(' ');

		switch(params[0]){
			case 'message':
				if(params.length !== 2){
					continue;
				}
				nestProtos[params[1]] = parseObject(tag);
				continue;
			case 'required':
			case 'optional':
			case 'repeated':{
				//params length should be 3 and tag can't be duplicated
				if(params.length !== 3 || !!tags[tag]){
					continue;
				}
				proto[params[2]] = {
					option : params[0],
					type : params[1],
					tag : tag
				};
				tags[tag] = params[2];
			}
		}
	}

	proto.__messages = nestProtos;
	proto.__tags = tags;
	return proto;
}
},{}],33:[function(require,module,exports){
(function (Buffer){
var encoder = require('./encoder');
var decoder = require('./decoder');
var parser = require('./parser');

var Protobuf = module.exports;

/**
 * [encode the given message, return a Buffer represent the message encoded by protobuf]
 * @param  {[type]} key The key to identify the message type.
 * @param  {[type]} msg The message body, a js object.
 * @return {[type]} The binary encode result in a Buffer.
 */
Protobuf.encode = function(key, msg){
	return encoder.encode(key, msg);
};

Protobuf.encode2Bytes = function(key, msg){
	var buffer = this.encode(key, msg);
	if(!buffer || !buffer.length){
		console.warn('encode msg failed! key : %j, msg : %j', key, msg);
		return null;
	}
	var bytes = new Uint8Array(buffer.length);
	for(var offset = 0; offset < buffer.length; offset++){
		bytes[offset] = buffer.readUInt8(offset);
	}

	return bytes;
};

Protobuf.encodeStr = function(key, msg, code){
	code = code || 'base64';
	var buffer = Protobuf.encode(key, msg);
	return !!buffer?buffer.toString(code):buffer;
};

Protobuf.decode = function(key, msg){
	return decoder.decode(key, msg);
};

Protobuf.decodeStr = function(key, str, code){
	code = code || 'base64';
	var buffer = new Buffer(str, code);

	return !!buffer?Protobuf.decode(key, buffer):buffer;
};

Protobuf.parse = function(json){
	return parser.parse(json);
};

Protobuf.setEncoderProtos = function(protos){
	encoder.init(protos);
};

Protobuf.setDecoderProtos = function(protos){
	decoder.init(protos);
};

Protobuf.init = function(opts){
	//On the serverside, use serverProtos to encode messages send to client
	encoder.init(opts.encoderProtos);

	//On the serverside, user clientProtos to decode messages receive from clients
	decoder.init(opts.decoderProtos);

};
}).call(this,require("buffer").Buffer)
},{"./decoder":30,"./encoder":31,"./parser":32,"buffer":22}],34:[function(require,module,exports){
var util = module.exports;

util.isSimpleType = function(type){
	return ( type === 'uInt32' ||
					 type === 'sInt32' ||
					 type === 'int32'  ||
					 type === 'uInt64' ||
					 type === 'sInt64' ||
					 type === 'float'  ||
					 type === 'double');
};

util.equal = function(obj0, obj1){
	for(var key in obj0){
		var m = obj0[key];
		var n = obj1[key];

		if(typeof(m) === 'object'){
			if(!util.equal(m, n)){
				return false;
			}
		}else if(m !== n){
			return false;
		}
	}

	return true;
};
},{}],35:[function(require,module,exports){
module.exports = require('./lib/protocol');
},{"./lib/protocol":36}],36:[function(require,module,exports){
(function (Buffer){
(function (exports, ByteArray, global) {
  var Protocol = exports;

  var PKG_HEAD_BYTES = 4;
  var MSG_FLAG_BYTES = 1;
  var MSG_ROUTE_CODE_BYTES = 2;
  var MSG_ID_MAX_BYTES = 5;
  var MSG_ROUTE_LEN_BYTES = 1;

  var MSG_ROUTE_CODE_MAX = 0xffff;

  var MSG_COMPRESS_ROUTE_MASK = 0x1;
  var MSG_TYPE_MASK = 0x7;

  var Package = Protocol.Package = {};
  var Message = Protocol.Message = {};

  Package.TYPE_HANDSHAKE = 1;
  Package.TYPE_HANDSHAKE_ACK = 2;
  Package.TYPE_HEARTBEAT = 3;
  Package.TYPE_DATA = 4;
  Package.TYPE_KICK = 5;

  Message.TYPE_REQUEST = 0;
  Message.TYPE_NOTIFY = 1;
  Message.TYPE_RESPONSE = 2;
  Message.TYPE_PUSH = 3;

  /**
   * pomele client encode
   * id message id;
   * route message route
   * msg message body
   * socketio current support string
   */
  Protocol.strencode = function(str) {
    if(typeof Buffer !== "undefined" && ByteArray === Buffer) {
      // encoding defaults to 'utf8'
      return (new Buffer(str));
    } else {
      var byteArray = new ByteArray(str.length * 3);
      var offset = 0;
      for(var i = 0; i < str.length; i++){
        var charCode = str.charCodeAt(i);
        var codes = null;
        if(charCode <= 0x7f){
          codes = [charCode];
        }else if(charCode <= 0x7ff){
          codes = [0xc0|(charCode>>6), 0x80|(charCode & 0x3f)];
        }else{
          codes = [0xe0|(charCode>>12), 0x80|((charCode & 0xfc0)>>6), 0x80|(charCode & 0x3f)];
        }
        for(var j = 0; j < codes.length; j++){
          byteArray[offset] = codes[j];
          ++offset;
        }
      }
      var _buffer = new ByteArray(offset);
      copyArray(_buffer, 0, byteArray, 0, offset);
      return _buffer;
    }
  };

  /**
   * client decode
   * msg String data
   * return Message Object
   */
  Protocol.strdecode = function(buffer) {
    if(typeof Buffer !== "undefined" && ByteArray === Buffer) {
      // encoding defaults to 'utf8'
      return buffer.toString();
    } else {
      var bytes = new ByteArray(buffer);
      var array = [];
      var offset = 0;
      var charCode = 0;
      var end = bytes.length;
      while(offset < end){
        if(bytes[offset] < 128){
          charCode = bytes[offset];
          offset += 1;
        }else if(bytes[offset] < 224){
          charCode = ((bytes[offset] & 0x1f)<<6) + (bytes[offset+1] & 0x3f);
          offset += 2;
        }else{
          charCode = ((bytes[offset] & 0x0f)<<12) + ((bytes[offset+1] & 0x3f)<<6) + (bytes[offset+2] & 0x3f);
          offset += 3;
        }
        array.push(charCode);
      }
      return String.fromCharCode.apply(null, array);
    }
  };

  /**
   * Package protocol encode.
   *
   * Pomelo package format:
   * +------+-------------+------------------+
   * | type | body length |       body       |
   * +------+-------------+------------------+
   *
   * Head: 4bytes
   *   0: package type,
   *      1 - handshake,
   *      2 - handshake ack,
   *      3 - heartbeat,
   *      4 - data
   *      5 - kick
   *   1 - 3: big-endian body length
   * Body: body length bytes
   *
   * @param  {Number}    type   package type
   * @param  {ByteArray} body   body content in bytes
   * @return {ByteArray}        new byte array that contains encode result
   */
  Package.encode = function(type, body){
    var length = body ? body.length : 0;
    var buffer = new ByteArray(PKG_HEAD_BYTES + length);
    var index = 0;
    buffer[index++] = type & 0xff;
    buffer[index++] = (length >> 16) & 0xff;
    buffer[index++] = (length >> 8) & 0xff;
    buffer[index++] = length & 0xff;
    if(body) {
      copyArray(buffer, index, body, 0, length);
    }
    return buffer;
  };

  /**
   * Package protocol decode.
   * See encode for package format.
   *
   * @param  {ByteArray} buffer byte array containing package content
   * @return {Object}           {type: package type, buffer: body byte array}
   */
  Package.decode = function(buffer){
    var offset = 0;
    var bytes = new ByteArray(buffer);
    var length = 0;
    var rs = [];
    while(offset < bytes.length) {
      var type = bytes[offset++];
      length = ((bytes[offset++]) << 16 | (bytes[offset++]) << 8 | bytes[offset++]) >>> 0;
      var body = length ? new ByteArray(length) : null;
      if(body) {
        copyArray(body, 0, bytes, offset, length);
      }
      offset += length;
      rs.push({'type': type, 'body': body});
    }
    return rs.length === 1 ? rs[0]: rs;
  };

  /**
   * Message protocol encode.
   *
   * @param  {Number} id            message id
   * @param  {Number} type          message type
   * @param  {Number} compressRoute whether compress route
   * @param  {Number|String} route  route code or route string
   * @param  {Buffer} msg           message body bytes
   * @return {Buffer}               encode result
   */
  Message.encode = function(id, type, compressRoute, route, msg){
    // caculate message max length
    var idBytes = msgHasId(type) ? caculateMsgIdBytes(id) : 0;
    var msgLen = MSG_FLAG_BYTES + idBytes;

    if(msgHasRoute(type)) {
      if(compressRoute) {
        if(typeof route !== 'number'){
          throw new Error('error flag for number route!');
        }
        msgLen += MSG_ROUTE_CODE_BYTES;
      } else {
        msgLen += MSG_ROUTE_LEN_BYTES;
        if(route) {
          route = Protocol.strencode(route);
          if(route.length>255) {
            throw new Error('route maxlength is overflow');
          }
          msgLen += route.length;
        }
      }
    }

    if(msg) {
      msgLen += msg.length;
    }

    var buffer = new ByteArray(msgLen);
    var offset = 0;

    // add flag
    offset = encodeMsgFlag(type, compressRoute, buffer, offset);

    // add message id
    if(msgHasId(type)) {
      offset = encodeMsgId(id, buffer, offset);
    }

    // add route
    if(msgHasRoute(type)) {
      offset = encodeMsgRoute(compressRoute, route, buffer, offset);
    }

    // add body
    if(msg) {
      offset = encodeMsgBody(msg, buffer, offset);
    }

    return buffer;
  };

  /**
   * Message protocol decode.
   *
   * @param  {Buffer|Uint8Array} buffer message bytes
   * @return {Object}            message object
   */
  Message.decode = function(buffer) {
    var bytes =  new ByteArray(buffer);
    var bytesLen = bytes.length || bytes.byteLength;
    var offset = 0;
    var id = 0;
    var route = null;

    // parse flag
    var flag = bytes[offset++];
    var compressRoute = flag & MSG_COMPRESS_ROUTE_MASK;
    var type = (flag >> 1) & MSG_TYPE_MASK;

    // parse id
    if(msgHasId(type)) {
      var m = 0;
      var i = 0;
      do{
        m = parseInt(bytes[offset]);
        id += (m & 0x7f) << (7 * i);
        offset++;
        i++;
      }while(m >= 128);
    }

    // parse route
    if(msgHasRoute(type)) {
      if(compressRoute) {
        route = (bytes[offset++]) << 8 | bytes[offset++];
      } else {
        var routeLen = bytes[offset++];
        if(routeLen) {
          route = new ByteArray(routeLen);
          copyArray(route, 0, bytes, offset, routeLen);
          route = Protocol.strdecode(route);
        } else {
          route = '';
        }
        offset += routeLen;
      }
    }

    // parse body
    var bodyLen = bytesLen - offset;
    var body = new ByteArray(bodyLen);

    copyArray(body, 0, bytes, offset, bodyLen);

    return {'id': id, 'type': type, 'compressRoute': compressRoute,
            'route': route, 'body': body};
  };

  var copyArray = function(dest, doffset, src, soffset, length) {
    if('function' === typeof src.copy) {
      // Buffer
      src.copy(dest, doffset, soffset, soffset + length);
    } else {
      // Uint8Array
      for(var index=0; index<length; index++){
        dest[doffset++] = src[soffset++];
      }
    }
  };

  var msgHasId = function(type) {
    return type === Message.TYPE_REQUEST || type === Message.TYPE_RESPONSE;
  };

  var msgHasRoute = function(type) {
    return type === Message.TYPE_REQUEST || type === Message.TYPE_NOTIFY ||
           type === Message.TYPE_PUSH;
  };

  var caculateMsgIdBytes = function(id) {
    var len = 0;
    do {
      len += 1;
      id >>= 7;
    } while(id > 0);
    return len;
  };

  var encodeMsgFlag = function(type, compressRoute, buffer, offset) {
    if(type !== Message.TYPE_REQUEST && type !== Message.TYPE_NOTIFY &&
       type !== Message.TYPE_RESPONSE && type !== Message.TYPE_PUSH) {
      throw new Error('unkonw message type: ' + type);
    }

    buffer[offset] = (type << 1) | (compressRoute ? 1 : 0);

    return offset + MSG_FLAG_BYTES;
  };

  var encodeMsgId = function(id, buffer, offset) {
    do{
      var tmp = id % 128;
      var next = Math.floor(id/128);

      if(next !== 0){
        tmp = tmp + 128;
      }
      buffer[offset++] = tmp;

      id = next;
    } while(id !== 0);

    return offset;
  };

  var encodeMsgRoute = function(compressRoute, route, buffer, offset) {
    if (compressRoute) {
      if(route > MSG_ROUTE_CODE_MAX){
        throw new Error('route number is overflow');
      }

      buffer[offset++] = (route >> 8) & 0xff;
      buffer[offset++] = route & 0xff;
    } else {
      if(route) {
        buffer[offset++] = route.length & 0xff;
        copyArray(buffer, offset, route, 0, route.length);
        offset += route.length;
      } else {
        buffer[offset++] = 0;
      }
    }

    return offset;
  };

  var encodeMsgBody = function(msg, buffer, offset) {
    copyArray(buffer, offset, msg, 0, msg.length);
    return offset + msg.length;
  };

  module.exports = Protocol;
  if(typeof(window) != "undefined") {
    window.Protocol = Protocol;
  }
})(typeof(window)=="undefined" ? module.exports : (this.Protocol = {}),typeof(window)=="undefined"  ? Buffer : Uint8Array, this);

}).call(this,require("buffer").Buffer)
},{"buffer":22}],37:[function(require,module,exports){
'use strict';

module.exports = function(config) {
  config = config || {};

  var stringify = config.stringify || JSON.stringify;
  var parse = config.parse || JSON.parse;

  var _localStorage = typeof localStorage !== 'undefined'
    ? localStorage
    : {};

  var _sessionStorage = typeof sessionStorage !== 'undefined'
    ? sessionStorage
    : {};

  return {
    localStorage: {
      get: function(key) {
        if (_localStorage[key]) {
          try {
            return parse(_localStorage[key]);
          } catch(e) {
            return null;
          }
        }
      },
      remove: function(key) {
        delete _localStorage[key];
      },
      set: function(key, data) {
        try {
          _localStorage[key] = stringify(data);
          return true;
        } catch(e) {
          return false;
        }
      }
    },

    sessionStorage: {
      get: function(key) {
        if (_sessionStorage[key]) {
          try {
            return parse(_sessionStorage[key]);
          } catch(e) {
            return null;
          }
        }
      },
      remove: function(key) {
        delete _sessionStorage[key];
      },
      set: function(key, data) {
        try {
          _sessionStorage[key] = stringify(data);
          return true;
        } catch(e) {
          return false;
        }
      }
    }
  };
};

},{}]},{},[1]);
