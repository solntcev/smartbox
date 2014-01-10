/**
 * Main smartbox file
 */
(function (window, undefined) {

	// save in case of overwrite
	var document = window.document,
		readyCallbacks = [];

	var SB = {

		config: {
			/**
			 * Платформа, которая будет использоваться в случае, когда detectPlatform вернул false
			 * ex: browser, samsung, lg
			 * @type: {String}
			 */
			defaultPlatform: 'browser',

			/**
			 * Платформа, используемая по умолчанию, метод detectPlatform не вызывается
			 *  ex: browser, samsung, lg
			 * @type: {String}
			 */
			currentPlatform: ''
		},

		/**
		 * Main function
		 */
		ready: function (cb) {
			readyCallbacks.push(cb);
		},

		initialise: function (cb) {
			var self = this,
				utils = this.utils;

			window.$$log = utils.log.log;
			window.$$error = utils.error;

			$$log('!!!!!!!!!LOG: initialising SB');

			SB.platforms.initialise(function (currentPlatform) {
				self.currentPlatform = currentPlatform;
				cb && cb.call(self);
			});
		}
	};

	SB.utils = {
		/**
		 * Show error message
		 * @param msg
		 */
		error: function ( msg ) {
			$$log(msg, 'error');
		},

		/**
		 * Show messages in log
		 * all functionality in main.js
		 */
		log: {
			log: function () {},
			state: function () {},
			show: function () {},
			hide: function () {},
			startProfile: function () {},
			stopProfile: function () {}
		}
	};

	$(function () {
		SB.initialise(function () {

		});
	});
	window.SB = SB;
})(this);
// global SB
!(function ( window, undefined ) {

	var platforms,
		Platform,
		PlatformPrototype,
		_supportedPlatforms = {},
		_platform = null,
		_defaultPlatform = null;

	// Object for all platforms
	platforms = {

		// add supported platform
		addPlatform: function ( platform ) {
			if ( platform.name === SB.config.defaultPlatform ) {
				_defaultPlatform = platform;
			} else {
				_supportedPlatforms[platform.name] = platform;
			}
		},

		// return currentPlatform
		getCurrentPlatform: function () {
			return _platform;
		},

		// Detect & initialise platform
		initialise: function (cb) {
			var prevTime = new Date().getTime();

			// get first platform, where detect() return true
			var currentPlatform = _.find(_supportedPlatforms, function ( platform ) {
				return platform.detect();
			});

			currentPlatform = currentPlatform || _defaultPlatform;
			if ( !currentPlatform ) {
				$$error('No Platform detected!');
			} else {
				//$$log('detect platform: ' + currentPlatform.name);
				currentPlatform.addExternalFiles(function () {
					//$$log('adding files callback');

					currentPlatform.setPlugins();
					currentPlatform.refreshKeys();
					currentPlatform.initialise();

					_platform = currentPlatform;
					cb && cb.call(this, currentPlatform);
				});
			}
		}
	};

	/**
	 * Master class for platform
	 * @param name
	 * @constructor
	 */
	Platform = function ( name ) {
		this.name = name;
		var _keys = {};


		this.refreshKeys = function refreshKeys() {
			_keys = {};
			for(var keyName in this.keys) {
				_keys[this.keys[keyName]] = keyName.toLowerCase();
			}
		};

		/**
		 * Returns key name by key code
		 * @param keyCode
		 * @returns {string} key name
		 */
		this.getKeyByKeyCode = function ( keyCode) {
			return _keys[keyCode];
		};

		SB.platforms.addPlatform(this);
	};

	PlatformPrototype = {
		externalCss: [],
		externalJs: [],
		keys: {},

		DUID: '',

		/**
		 * Detecting current platform
		 * @returns {boolean} true if running on current platform
		 */
		detect: function () {
			// should be override
			return false;
		},

		/**
		 * Function called if running on current platform
		 */
		initialise: function () {},

		/**
		 * Get DUID in case of Config
		 * @return {string} DUID
		 */
		getDUID: function () {
			return '';
		},

		/**
		 * Returns random DUID for platform
		 * @returns {string}
		 */
		getRandomDUID: function () {
			return (new Date()).getTime().toString(16) + Math.floor(Math.random() * parseInt("10000", 16)).toString(16);
		},

		/**
		 * Returns native DUID for platform if exist
		 * @returns {string}
		 */
		getNativeDUID: function () {
			return '';
		},

		/**
		 * Set custom plugins
		 */
		setPlugins: function () {},

		// TODO: volume for all platforms
		volumeUp: function() {},
		volumeDown: function () {},
		getVolume: function () {},

		setData: function () {},

		getData: function () {},

		removeData: function () {},

		addExternalFiles: function (cb) {
			this.addExternalJS(this.externalJs, cb);
			this.addExternalCss(this.externalCss);
		},

		/**
		 * Asynchroniosly adding platform files
		 * @param cb {Function} callback on load javascript files
		 */
		addExternalJS: function (filesArray ,cb) {
			var defferedArray = [],
				$externalJsContainer;

			if ( filesArray.length ) {

				$externalJsContainer = document.createDocumentFragment();

				_.each(filesArray, function ( src ) {

					var d = $.Deferred(),
						el = document.createElement('script');

					el.onload = function() {
						d.resolve();
						el.onload = null;
					};

					el.type = 'text/javascript';
					el.src = src;

					defferedArray.push(d);
					$externalJsContainer.appendChild(el);
				});

				document.body.appendChild($externalJsContainer);
				$.when.apply($, defferedArray).done(function () {
					cb && cb.call();
				});
			} else {

				// if no external js simple call cb
				cb && cb.call(this);
			}
		},

		addExternalCss: function (filesArray) {
			var $externalCssContainer;

			if (filesArray.length) {
				$externalCssContainer = document.createDocumentFragment();
				_.each(filesArray, function ( src ) {

					var el = document.createElement('link');

					el.rel = 'stylesheet';
					el.href = src;

					$externalCssContainer.appendChild(el);
				});

				document.body.appendChild($externalCssContainer);
			}
		},

		exit: function () {}
	};

	_(Platform.prototype).extend(PlatformPrototype);

	SB.platforms = platforms;
	SB.Platform = Platform;
})(this);
!(function ( window ) {

})(this);
(function ( window, undefined ) {

	var profiles = {},
		logs = {},
		logNames = [],
		curPanelIndex = 0,
		// максимум логов на странице
		maxLogCount = 20,
		$logWrap,
		$logRow,
		Log,
		LogPanel;

	// append log wrapper to body
	$logWrap = $('<div></div>', {
		id: 'log'
	});
	$logWrap.appendTo(document.body);

	$logRow = $('<div></div>', {
		'class': 'log-row'
	});

	/**
	 * LogPanel constructor
	 * @param logName {String} name of log panel
	 * @constructor
	 */
	LogPanel = function ( logName ) {
		this.name = logName;
		this.logs = 0;
		this.states = {};

		var $wrapper = $('#log_' + this.name);

		this.$content = $wrapper.find('.log_content');
		this.$state = $wrapper.find('.log_states');

		// no need anymore
		$wrapper = null;
	};

	_.extend(LogPanel.prototype, {
		log: function log ( msg ) {
			var logRow = $logRow.clone(),
				$rows, length;
			this.logs++;
			msg = _.escape(msg);

			logRow.html(msg).appendTo(this.$content);
			if ( this.logs > maxLogCount ) {
				$rows = this.$content.find(".log-row");
				length = $rows.length;
				$rows.slice(0, length - maxLogCount).remove();
				this.logs = $rows.length;
			}
		},

		state: function state ( value, stateName ) {
			var state = this.states[stateName] || this.createState(stateName);
			state.textContent = stateName + ': ' + value;
		},

		createState: function ( stateName ) {
			var $state = document.createElement('div');
			$state.id = '#log_' + this.name + '_' + stateName;
			this.states[stateName] = $state;
			this.$state.append($state);

			return $state;
		}
	});

	var logPanelTemplate = _.template('<div class="log_pane" id="log_<%= name %>">' +
																			'<div class="log_name">Log: <%=name%></div>' +
																			'<div class="log_content_wrap">' +
																				'<div class="log_content"></div>' +
																			'</div>' +
																			'<div class="log_states"></div>' +
																		'</div>');

	Log = {

		create: function ( logName ) {
			$logWrap.append(logPanelTemplate({
				name: logName
			}));
			logs[logName] = new LogPanel(logName);
			logNames.push(logName);
			return logs[logName];
		},

		getPanel: function ( logName ) {
			logName = logName || 'default';
			return (logs[logName] || this.create(logName));
		}
	};

	/**
	 * Public log API
	 */
	window.SB.utils.log = {
		log: function ( msg, logName ) {
			Log.getPanel(logName).log(msg);
		},

		state: function ( msg, state, logName ) {
			Log.getPanel(logName).state(msg, state);
		},

		show: function ( logName ) {
			logName = logName || logNames[curPanelIndex];

			if ( !logName ) {
				curPanelIndex = 0;
				this.hide();
			} else {
				curPanelIndex++;
				$logWrap.show();
				$('.log_pane').hide();
				$('#log_' + logName).show();
			}
		},

		hide: function () {
			$logWrap.hide();
		},

		startProfile: function ( profileName ) {
			if ( profileName ) {
				profiles[profileName] = (new Date()).getTime();
			}
		},

		stopProfile: function ( profileName ) {
			if ( profiles[profileName] ) {
				this.log(profileName + ': ' + ((new Date()).getTime() - profiles[profileName]) + 'ms', 'profiler');
				delete profiles[profileName];
			}
		}
	};
})(this);

$(document.body).on('nav_key:tools', function () {
	SB.utils.log.show();
});

!(function ( window, undefined ) {

	var $body = null,
		nav;

	function Navigation () {


		// for methods save и restore
		var savedNavs = [],

		// object for store throttled color keys  methods
			throttledMethods = {},

		// current el in focus
			navCur = null,

		// arrays
			numsKeys = ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9'],
			colorKeys = ['green', 'red', 'yellow', 'red'],

		// pause counter
			paused = 0;

		function onKeyDown ( e ) {
			var key,
				data = {},
				keyCode = e.keyCode;

			if ( paused || !navCur ) {
				return;
			}

			key = SB.currentPlatform.getKeyByKeyCode(keyCode);

			if ( colorKeys.indexOf(key) > -1 ) {
				throttleEvent(key);
			} else {
				if ( numsKeys.indexOf(key) > -1 ) {
					data.num = key[1];
					key = 'num';
				}

				triggerKeyEvent(key, data);
			}
		}

		/**
		 * 'nav_key:' event trigger
		 * @param key key name
		 * @param data event data
		 */
		function triggerKeyEvent ( key, data ) {
			var ev,
				commonEvent;
			if ( navCur ) {
				ev = $.Event("nav_key:" + key, data || {});
				commonEvent = $.Event("nav_key");

				ev.keyName = key;
				commonEvent.keyName = key;
				navCur.trigger(ev);
				//первый trigger мог уже сменить текщий элемент
				navCur && navCur.trigger(commonEvent);
			}
		}

		function throttleEvent ( key ) {
			var keyMethod = throttledMethods[key];

			// lazy init
			if ( !keyMethod ) {
				keyMethod = throttledMethods[key] = _.throttle(function () {
					triggerKeyEvent(key);
				}, 800, {
					leading: true
				});
			}

			keyMethod(key);
		}

		/**
		 * trigger click on current element
		 */
		function onClick () {
			navCur && navCur.click();
		}

		return {

			// nav els selector
			area_selector: '.nav-item',

			/**
			 * Current el class
			 * @type {string}
			 */
			higlight_class: 'focus',

			/**
			 * navigation container
			 * @type {jQuery}
			 */
			$container: null,

			/**
			 * Current looping type
			 * false/hbox/vbox
			 * @type {boolean|string}
			 */
			loopType: null,

			/**
			 * Phantom els selector
			 * @type {string}
			 */
			phantom_selector: '[data-nav-phantom]',

			/**
			 * Returns current navigation state
			 * @returns {boolean}
			 */
			isPaused: function () {
				return !!paused;
			},

			/**
			 * Stop navigation. Increase pause counter
			 * @returns {Navigation}
			 */
			pause: function () {
				paused++;
				return this;
			},

			/**
			 * Resume navigation if force or pause counter is zero
			 * @param force {Boolean} force navigation resume
			 * @returns {Navigation}
			 */
			resume: function ( force ) {
				paused--;
				if ( paused < 0 || force ) {
					paused = 0;
				}
				return this;
			},

			/**
			 * Save current navigation state
			 * @returns {Navigation}
			 */
			save: function () {

				savedNavs.push({
					navCur: navCur,
					area_selector: this.area_selector,
					higlight_class: this.higlight_class,
					$container: this.$container
				});
				return this;
			},

			/**
			 * Restore navigation state
			 * @returns {Navigation}
			 */
			restore: function () {
				if ( savedNavs.length ) {
					this.off();
					var foo = savedNavs.pop();
					this.area_selector = foo.area_selector;
					this.higlight_class = foo.higlight_class;
					this.on(foo.$container, foo.navCur);
				}

				return this;
			},

			/**
			 * Setting focus on element
			 * @param element {*} - HTMLElement, selector or Jquery object
			 * @param originEvent {string} - event source(nav_key, mousemove, voice etc.)
			 * @return {Navigation}
			 */
			current: function ( element, originEvent ) {
				if ( !element ) {
					return navCur;
				}

				originEvent = originEvent || 'nav_key';

				var $el = $(element);
				if ( $el.is(this.phantom_selector) ) {
					$el = $($($el.attr('data-nav-phantom'))[0]);
				}
				if ( $el.length > 1 ) {
					throw new Error('Focused element must be only one!');
				}
				if ( !$el.length ) {
					return this;
				}
				var old = navCur;
				if ( navCur ) {
					navCur.removeClass(this.higlight_class).trigger('nav_blur', [originEvent, $el]);
				}

				navCur = $el;

				$el.addClass(this.higlight_class).trigger('nav_focus', [originEvent, old]);
				return this;
			},

			/**
			 * Turn on navigation in container, turn off previous navigation
			 * @param container - HTMLElement, selector or Jquery object (body by default)
			 * @param cur - HTMLElement, selector or Jquery object(first nav el by default)
			 * @return {Navigation}
			 */
			on: function ( container, cur ) {

				var self = this,
					$navTypeEls;

				$body = $body || $(document.body);

				this.off();

				this.$container = container ? $(container) : $body;

				this.$container.on('mouseenter.nav', this.area_selector, function ( e ) {
					if ( !$(this).is(self.phantom_selector) ) {
						self.current(this, 'mouseenter');
					}
				});


				$navTypeEls = this.$container.find('[data-nav_type]');

				if (this.$container.attr('data-nav_type')) {
					$navTypeEls = $navTypeEls.add(this.$container);
				}

				$navTypeEls.each(function () {
					var $el = $(this);
					var navType = $el.attr("data-nav_type");
					$el.removeAttr('data-nav_type');
					//self.setLoop($el);
					var loop = $el.attr("data-nav_loop");

					self.siblingsTypeNav($el, navType, loop);
				});

				$body
					.bind('keydown.navigation', onKeyDown)
					.bind('nav_key:enter.navigation', onClick);

				if ( !cur ) {
					cur = this.$container.find(this.area_selector).filter(':visible')[0];
				}
				this.current(cur);
				return this;
			},

			siblingsTypeNav: function ( $container, type, loop ) {
				var self = this;
				$container.on('nav_key:left nav_key:right nav_key:up nav_key:down', this.area_selector,
					function ( e ) {
						var last = 'last',
							cur = self.current(),
							fn;

						//check if direction concur with declared
						if ( (type == 'hbox' && e.keyName == 'left') ||
								 (type == 'vbox' && e.keyName == 'up') ) {
							fn = 'prev';
						} else if ( (type == 'hbox' && e.keyName == 'right') ||
												(type == 'vbox' && e.keyName == 'down') ) {
							fn = 'next';
						}

						if ( fn == 'next' ) {
							last = 'first';
						}

						if ( fn ) {
							var next = cur[fn](self.area_selector);

							while ( next.length && !next.is(':visible') ) {
								next = next[fn](self.area_selector);
							}

							if ( !next.length && loop ) {
								next = $container.find(self.area_selector).filter(':visible')[last]();
							}

							if ( next.length ) {
								nav.current(next);
								return false;
							}
						}
					});
			},

			/**
			 * Turn off navigation from container, disable navigation from current element
			 * @return {Navigation}
			 */
			off: function () {
				if ( navCur ) {
					navCur.removeClass(this.higlight_class).trigger('nav_blur');
				}
				this.$container && this.$container.off('mouseenter.nav').off('.loop');
				$body.unbind('.navigation');
				navCur = null;
				return this;
			},

			/**
			 * Find first nav el & set navigation on them
			 */
			findSome: function () {
				var cur;

				if ( !(navCur && navCur.is(':visible')) ) {
					cur = this.$container.find(this.area_selector).filter(':visible').eq(0);
					this.current(cur);
				}

				return this;
			},

			/**
			 * Find closest to $el element by dir direction
			 * @param $el {jQuery} - source element
			 * @param dir {string} - direction up, right, down, left
			 * @param navs {jQuery} - object, contains elements to search
			 * @returns {*}
			 */
			findNav: function ( $el, dir, navs ) {
				var user_defined = this.checkUserDefined($el, dir);

				if ( user_defined ) {
					return user_defined;
				}

				var objBounds = $el[0].getBoundingClientRect(),
					arr = [],
					curBounds = null,
					cond1, cond2, i , l;

				for ( i = 0, l = navs.length; i < l; i++ ) {
					curBounds = navs[i].getBoundingClientRect();

					if ( curBounds.left == objBounds.left &&
							 curBounds.top == objBounds.top ) {
						continue;
					}

					switch ( dir ) {
						case 'left':
							cond1 = objBounds.left > curBounds.left;
							break;
						case 'right':
							cond1 = objBounds.right < curBounds.right;
							break;
						case 'up':
							cond1 = objBounds.top > curBounds.top;
							break;
						case 'down':
							cond1 = objBounds.bottom < curBounds.bottom;
							break;
						default:
							break;
					}

					if ( cond1 ) {
						arr.push({
							'obj': navs[i],
							'bounds': curBounds
						});
					}
				}

				var min_dy = 9999999, min_dx = 9999999, min_d = 9999999, max_intersection = 0;
				var dy = 0, dx = 0, d = 0;

				function isIntersects ( b1, b2, dir ) {
					var temp = null;
					switch ( dir ) {
						case 'left':
						case 'right':
							if ( b1.top > b2.top ) {
								temp = b2;
								b2 = b1;
								b1 = temp;
							}
							if ( b1.bottom > b2.top ) {
								if ( b1.top > b2.right ) {
									return b2.top - b1.right;
								}
								else {
									return b2.height;
								}
							}
							break;
						case 'up':
						case 'down':
							if ( b1.left > b2.left ) {
								temp = b2;
								b2 = b1;
								b1 = temp;
							}
							if ( b1.right > b2.left ) {
								if ( b1.left > b2.right ) {
									return b2.left - b1.right;
								}
								else {
									return b2.width;
								}
							}
							break;
						default:
							break;
					}
					return false;
				}

				var intersects_any = false;
				var found = false;

				for ( i = 0, l = arr.length; i < l; i++ ) {
					if ( !this.checkEntryPoint(arr[i].obj, dir) ) {
						continue;
					}

					var b = arr[i].bounds;
					var intersects = isIntersects(objBounds, b, dir);
					dy = Math.abs(b.top - objBounds.top);
					dx = Math.abs(b.left - objBounds.left);
					d = Math.sqrt(dy * dy + dx * dx);
					if ( intersects_any && !intersects ) {
						continue;
					}
					if ( intersects && !intersects_any ) {
						min_dy = dy;
						min_dx = dx;
						max_intersection = intersects;
						found = arr[i].obj;
						intersects_any = true;
						continue;
					}

					switch ( dir ) {
						case 'left':
						case 'right':
							if ( intersects_any ) {
								cond2 = dx < min_dx || (dx == min_dx && dy < min_dy);
							}
							else {
								cond2 = dy < min_dy || (dy == min_dy && dx < min_dx);
							}
							break;
						case 'up':
						case 'down':
							if ( intersects_any ) {
								cond2 = dy < min_dy || (dy == min_dy && dx < min_dx);
							}
							else {
								cond2 = dx < min_dx || (dx == min_dx && dy < min_dy);
							}
							break;
						default:
							break;
					}
					if ( cond2 ) {
						min_dy = dy;
						min_dx = dx;
						min_d = d;
						found = arr[i].obj;
					}
				}

				return found;
			},

			/**
			 * Return element defied by user
			 * Если юзером ничего не определено или направление равно 0, то возвращает false
			 * Если направление определено как none, то переход по этому направлению запрещен
			 *
			 * @param $el - current element
			 * @param dir - direction
			 * @returns {*}
			 */
			checkUserDefined: function ( $el, dir ) {
				var ep = $el.attr('data-nav_ud'),
					result = false,
					res = $el.attr('data-nav_ud_' + dir);

				if ( !(ep && res) ) {
					return false;
				}

				if ( !res ) {
					var sides = ep.split(','),
						dirs = ['up', 'right', 'left', 'bottom'];

					$el.attr({
						'data-nav_ud_up': sides[0],
						'data-nav_ud_right': sides[1],
						'data-nav_ud_down': sides[2],
						'data-nav_ud_left': sides[3]
					});

					res = sides[dirs.indexOf(dir)];
				}

				if ( res == 'none' ) {
					result = 'none';
				} else if ( res ) {
					result = $(res).first();
				}

				return result;
			},

			/**
			 * Проверяет можно ли войти в элемент с определенной стороны.
			 * Работает если у элемента задан атрибут data-nav_ep. Точки входа задаются в атрибуте с помощью 0 и 1 через запятые
			 * 0 - входить нельзя
			 * 1 - входить можно
			 * Стороны указываются в порядке CSS - top, right, bottom, left
			 *
			 * data-nav_ep="0,0,0,0" - в элемент зайти нельзя, поведение такое же как у элемента не являющегося элементом навигации
			 * data-nav_ep="1,1,1,1" - поведение по умолчанию, как без задания этого атрибута
			 * data-nav_ep="0,1,0,0" - в элемент можно зайти справа
			 * data-nav_ep="1,1,0,1" - в элемент нельзя зайти снизу
			 * data-nav_ep="0,1,0,1" - можно зайти слева и справа, но нельзя сверху и снизу
			 *
			 * @param elem -  проверяемый элемент
			 * @param dir - направление
			 * @returns {boolean}
			 */
			checkEntryPoint: function ( elem, dir ) {
				var $el = $(elem),
					ep = $el.attr('data-nav_ep'),
					res = null;

				if ( !ep ) {
					return true;
				}

				res = $el.attr('data-nav_ep_' + dir);

				if ( res === undefined ) {
					var sides = ep.split(',');
					$el.attr('data-nav_ep_top', sides[0]);
					$el.attr('data-nav_ep_right', sides[1]);
					$el.attr('data-nav_ep_bottom', sides[2]);
					$el.attr('data-nav_ep_left', sides[3]);
					res = $el.attr('data-nav_ep_' + dir);
				}

				return !!parseInt(res);
			}
		};
	}

	nav = window.$$nav = new Navigation();

	$(function () {
		// Navigation events handler
		$('body').bind('nav_key:left nav_key:right nav_key:up nav_key:down', function ( e ) {
			var cur = nav.current(),
				$navs,
				n;

			$navs = nav.$container.find(nav.area_selector).filter(':visible');
			n = nav.findNav(cur, e.keyName, $navs);
			n && nav.current(n);
		});
	});

})(this);
(function (window) {

    var updateInterval, curAudio = 0;

    //emulates events after `play` method called
    var stub_play = function (self) {
        self._state = "play";
        updateInterval = setInterval(function () {
            self.trigger("update");
            self.videoInfo.currentTime += 0.5;
            if (self.videoInfo.currentTime >= self.videoInfo.duration) {
                self.stop();
                self.trigger("complete");
            }
        }, 500);
    }

    var Player = window.Player = {
        /**
         * inserts player object to DOM and do some init work
         */
        init: function () {
            //no need to do anything because just stub
        },
        /**
         * current player state ["play", "stop", "pause"]
         */
        _state: 'stop',
        /**
         * Runs some video
         * @param options object {
         *      url: "path to video file/stream"
         *      from: optional {Number} time in seconds where need start playback
         *      type: optional {String} should be set to "hls" if stream is hls
         * }
         */
        play: function (options) {
            this.stop();
            this._state = 'play';
            this._play(options);
        },
        _play: function () {
            var self = this;

            setTimeout(function () {
                self.trigger("ready");
                setTimeout(function () {
                    self.trigger("bufferingBegin");
                    setTimeout(function () {
                        self.videoInfo.currentTime = 0;
                        self.trigger("bufferingEnd");
                        stub_play(self);
                    }, 1000);
                }, 1000);
            }, 1000);

        },
        /**
         * Stop video playback
         * @param silent {Boolean} if flag is set, player will no trigger "stop" event
         */
        stop: function (silent) {
            if (this._state != 'stop') {
                this._stop();
                if (!silent) {
                    this.trigger('stop');
                }
            }
            this._state = 'stop';
        },
        /**
         * Pause playback
         */
        pause: function () {
            this._stop();
            this._state = "pause";
        },
        /**
         * Resume playback
         */
        resume: function () {
            stub_play(this);
        },
        togglePause: function () {
            if (this._state == "play") {
                this.pause();
            } else {
                this.resume();
            }
        },
        _stop: function () {
            clearInterval(updateInterval);
        },
        /**
         * Converts time in seconds to readable string in format H:MM:SS
         * @param seconds {Number} time to convert
         * @returns {String} result string
         * Example:
         * $('#duration').html(Player.formatTime(PLayer.videoInfo.duration));
         * Result:
         * <div id="duration">1:30:27</div>
         */
        formatTime: function (seconds) {
            var hours = Math.floor(seconds / (60 * 60));
            var divisor_for_minutes = seconds % (60 * 60);
            var minutes = Math.floor(divisor_for_minutes / 60);
            var divisor_for_seconds = divisor_for_minutes % 60;
            var seconds = Math.ceil(divisor_for_seconds);
            if (seconds < 10) {
                seconds = "0" + seconds;
            }
            if (minutes < 10) {
                minutes = "0" + minutes;
            }
            return (hours ? hours + ':' : '') + minutes + ":" + seconds;
        },

        videoInfo: {
            /**
             * Total video duration in seconds
             */
            duration: 31,
            /**
             * Video stream width in pixels
             */
            width: 640,
            /**
             * Video stream height in pixels
             */
            height: 360,
            /**
             * Current playback time in seconds
             */
            currentTime: 0
        },
        /**
         * If set to true Player.init() calls after DOM ready
         */
        autoInit: false,
        /**
         * @param seconds time to seek
         */
        seek: function (seconds) {
            var self = this;
            self.videoInfo.currentTime = seconds;
            self.pause();
            self.trigger("bufferingBegin");
            setTimeout(function () {
                self.trigger("bufferingEnd");
                self.resume();
            }, 500);
        },
        /**
         * For multi audio tracks videos
         */
        audio: {
            /**
             * Set audio track index
             * @param index
             */
            set: function (index) {
                curAudio = index;
            },
            /**
             * Returns list of supported language codes
             * @returns {Array}
             */
            get: function () {
                var len = 2;
                var result = [];
                for (var i = 0; i < len; i++) {
                    result.push(0);
                }
                return result;
            },
            /**
             * @returns {Number} index of current playing audio track
             */
            cur: function () {
                return curAudio;
            }
        }
    };


    var extendFunction, eventProto;
    //use underscore, or jQuery extend function
    if (window._ && _.extend) {
        extendFunction = _.extend;
    } else if (window.$ && $.extend) {
        extendFunction = $.extend;
    }


    if (window.EventEmitter) {
        eventProto = EventEmitter.prototype;
    } else if (window.Backbone) {
        eventProto = Backbone.Events;
    } else if (window.Events) {
        eventProto = Events.prototype;
    }

    Player.extend = function (proto) {
        extendFunction(this, proto);
    };

    Player.extend(eventProto);


    $(function () {
        if (Player.autoInit) {
            $('body').on('load', function () {
                Player.init();
            });
        }
    });


}(this));
(function ($) {
    var optionsHash = {

    };


    var typeNum = function (e, input, options) {
        switch (e.keyName) {
            case 'red':
                privateMethods.type(input, 'backspace', options);
                break;
            default:
                privateMethods.type(input, e.num, options);
                break;
        }
        e.stopPropagation();
    };

    var blink_interval;
    var privateMethods = {
        format: function ($inp, text) {
            var id = $inp.attr('id');
            var options = optionsHash[id] || {};
            var formatText = text;
            if (options.formatText)
                formatText = options.formatText(text);
            return formatText;
        },
        startBlink: function ($input) {
            if (blink_interval) {
                clearInterval(blink_interval);
            }
            var $cursor = $input.parent().find('.smart_input-cursor');
            blink_interval = setInterval(function () {
                $cursor.toggleClass('smart_input-cursor_hidden');
            }, 500);
        },
        stopBlink: function () {
            if (blink_interval) {
                clearInterval(blink_interval);
            }
        },
        setText: function ($inp, text) {

            var id = $inp.attr('id');
            var options = optionsHash[id] || {};
            var max = $inp.attr('data-max');

            if (text.length > max && max != 0) {
                text = text.substr(0, max);
            }

            var formatText = text;
            if (options.formatText)
                formatText = options.formatText(text);


            var $wrap = $inp.parent().find('.smart_input-wrap');
            var $text = $wrap.find('.smart_input-text');

            $inp.val(text).change();


            //условие - костыль для 11 телевизора
            if (formatText.length > 1)
                $wrap[(($text.width() > $wrap.width()) ? 'add' : 'remove') + 'Class']('smart_input-wrap_right');
            else
                $wrap.removeClass('smart_input-wrap_right');


        },
        type: function ($input, letter, options) {
            var text = $input.val();
            if (!text)
                text = '';

            if (letter == 'backspace') {
                text = text.substr(0, text.length - 1)
            }
            else if (letter == 'delall') {
                text = '';
            }
            else {
                text += letter;
            }
            privateMethods.setText($input, text);

            //jump to next input if is set
            if (text.length == options.max && options.max != 0 && options.next !== undefined) {
                privateMethods.hideKeyboard($input);
                nav.current(options.next);
                nav.current().click();
            }
        },
        hideKeyboard: function ($this, isComplete) {
            $this.removeClass('smart-input-active').trigger('keyboard_hide');
            $('#keyboard_overlay').hide();
            nav.restore();
            $.voice.restore();
            $this.data('keyboard_active', false);
            if (isComplete) {
                $this.trigger('keyboard_complete');
            }
            else {
                $this.trigger('keyboard_cancel');
            }
            $('#keyboard_popup').trigger('keyboard_hide');
        },
        showKeyboard: function ($this, options) {
            $this.data('keyboard_active', true);
            $this.addClass('smart-input-active');
            var h = $this.height();
            var o = $this.offset();
            var top = o.top + h;
            var $pop = $('#keyboard_popup');
            $pop.smartKeyboard(options.keyboard).css({
                'left': o.left,
                'top': top
            }).off('type backspace delall complete cancel').on('type',function (e) {
                    type($this, e.letter, options);
                }).on('backspace',function (e) {
                    type($this, 'backspace', options);
                }).on('delall',function (e) {
                    type($this, 'delall', options);
                }).on('complete cancel', function (e) {
                    var isComplete = false;
                    if (e.type === 'complete') {
                        isComplete = true;
                    }
                    privateMethods.hideKeyboard($this, isComplete);
                    privateMethods.stopBlink();
                });
            $('#keyboard_overlay').show();
            var kh = $pop.height();
            var kw = $pop.width();
            if (top + kh > 680) {
                $pop.css({
                    'top': top - kh - h
                })
            }
            if (o.left + kw > 1280) {
                $pop.css({
                    'left': 1280 - kw - 20
                })
            }
            $.voice.save();
            nav.save();
            nav.on('#keyboard_popup');
            $('#keyboard_popup').smartKeyboard('refreshVoice').voiceLink();
            $this.addClass(nav.higlight_class);
            $('#keyboard_popup').trigger('keyboard_show');
        },
        bindEvents: function ($self) {
            $self.off('nav_focus nav_blur click');
            var options = optionsHash[$self.attr('id')];

            var $cursor = $self.find('.sig-cursor');

            options.bindKeyboard && (options.keyboard = false);
            if (options.keyboard) {
                $self.on('click', function () {
                    privateMethods.startBlink($cursor);
                    privateMethods.showKeyboard($self, options);
                })
            }

            $self.on({
                'startBlink': function () {
                    privateMethods.startBlink($cursor);
                },
                'stopBlink': function () {
                    privateMethods.stopBlink();
                },
                'hideKeyboard': function () {
                    if ($self.hasClass('smart-input-active')) {
                        privateMethods.hideKeyboard($self);
                    }
                },
                'showKeyboard': function () {
                    privateMethods.showKeyboard($self, options);
                }
            });

            if (options.bindKeyboard) {
                options.bindKeyboard.off('type backspace delall').on('type',function (e) {
                    privateMethods.type($self, e.letter, options);
                }).on('backspace',function (e) {
                        privateMethods.type($self, 'backspace', options);
                    }).on('delall', function (e) {
                        privateMethods.type($self, 'delall', options);
                    });
            }

            $self.on('nav_focus', function (e) {
                if ((options && (options.noKeyboard || options.bindNums))) {
                    $self.unbind('nav_key:num nav_key:red').bind('nav_key:num nav_key:red', function (e) {
                        typeNum(e, $self, options)
                    });
                }
            });
            /*
             $self.on('nav_focus', function (e) {
             if (!options.keyboard) {
             $self.bind('nav_key:num nav_key:red', function (e) {
             typeNum(e, $self, options)
             });
             }
             else {
             if (!$self.data('keyboard_active') && options.keyboard.autoshow !== false) {
             e.stopPropagation();
             showKeyboard($self, options);
             }
             }
             })
             //*/
            $self.on('nav_blur', function () {
                var $this = $(this);
                if (!options.keyboard) {
                    $this.unbind('nav_key:num nav_key:red');
                }
            })
        },
        extend: function ($input, name, fn) {
            privateMethods[name] = fn;
        },
        defaults: function ($input, options) {
            _.extend(defaultInputOptions, options);
        }
    };

    //document.write();

    var defaultInputOptions = {
        keyboard: {
            type: 'fulltext',
            firstClass: 'keyboard_en shift_active keyboard_num'
        },

        directKeyboardInput: true,

        max: 0,

        next: null,

        decorate: function ($input, options) {
            var className = $input[0].className;
            var $wrapper = $('\
            <div class="smart_input-container ' + className + '">\n\
                <div class="smart_input-wrap">\n\
                    <span class="smart_input-text"></span>\n\
                    <span class="smart_input-cursor smart_input-cursor_hidden"></span>\n\
                </div>\n\
                <b class="smart_input-decor-l"></b>\n\
                <b class="smart_input-decor-r"></b>\n\
                <b class="smart_input-decor-c"></b>\n\
            </div>');
            $input.hide().after($wrapper);
            $wrapper.append($input);

            var $text = $wrapper.find(".smart_input-text");



            $input.on({
                change: function () {
                    $text.html(this.value);
                }
            });

            if (options.directKeyboardInput) {
                $input.parent().on({
                    nav_focus: function () {
                        $('body').on('keypress.smartinput', function (e) {
                            if (e.charCode) {
                                e.preventDefault();
                                var letter = String.fromCharCode(e.charCode);
                                privateMethods.type($input, letter, options);
                            } else {
                                switch (e.keyCode) {
                                    case 8:
                                        e.preventDefault();
                                        privateMethods.type($input, 'backspace', options);
                                        break;
                                }
                            }

                        });
                    },
                    nav_blur: function () {
                        $('body').off('keypress.smartinput');
                    }
                });
            }


            privateMethods.setText($input, $input.val(), options);
        }
    };


    $.fn.smartInput = function (options) {

        //call some private method
        if (typeof options == 'string') {
            var fn = privateMethods[options];
            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift(this);
            return fn.apply(null, args);
        }


        this.each(function () {
            var _opts = _.clone(options);
            if (!_opts)
                _opts = {};
            _opts = $.extend({}, defaultInputOptions, _opts);

            var $self = $(this);

            if (!this.id)
                this.id = _.uniqueId('smartInput');

            _opts.next = $self.attr('data-next') || _opts.next;
            _opts.max = $self.attr('data-max') || _opts.max || 0;

            optionsHash[this.id] = _opts;

            _opts.decorate($self, _opts);

            $self.attr({
                'data-value': '',
                'data-max': _opts.max
            });
            privateMethods.bindEvents($self);
        });
        return this;
    };
})(jQuery);
Player.extend({
    init: function () {
        var self = this;
        var ww = window.innerWidth;
        var wh = window.innerHeight;


        this.$video_container = $('<video id="smart_player" style="position: absolute; left: 0; top: 0;width: ' + ww + 'px; height: ' + wh + 'px;"></video>');
        var video = this.$video_container[0];
        $('body').append(this.$video_container);

        this.$video_container.on('loadedmetadata', function () {
            self.videoInfo.width = video.videoWidth;
            self.videoInfo.height = video.videoHeight;
            self.videoInfo.duration = video.duration;
            self.trigger('ready');
        });


        this.$video_container.on('loadstart',function (e) {
            self.trigger('bufferingBegin');
        }).on('playing',function () {
                self.trigger('bufferingEnd');
            }).on('timeupdate',function () {
                self.videoInfo.currentTime = video.currentTime;
                self.trigger('update');
            }).on('ended', function () {
                self._state = "stop";
                self.trigger('complete');
            });


        this.$video_container.on('abort canplay canplaythrough canplaythrough durationchange emptied ended error loadeddata loadedmetadata loadstart mozaudioavailable pause play playing ratechange seeked seeking suspend volumechange waiting', function (e) {
            //console.log(e.type);
        });


        /*
         abort 	Sent when playback is aborted; for example, if the media is playing and is restarted from the beginning, this event is sent.
         canplay 	Sent when enough data is available that the media can be played, at least for a couple of frames.  This corresponds to the CAN_PLAY readyState.
         canplaythrough 	Sent when the ready state changes to CAN_PLAY_THROUGH, indicating that the entire media can be played without interruption, assuming the download rate remains at least at the current level. Note: Manually setting the currentTime will eventually fire a canplaythrough event in firefox. Other browsers might not fire this event.
         durationchange 	The metadata has loaded or changed, indicating a change in duration of the media.  This is sent, for example, when the media has loaded enough that the duration is known.
         emptied 	The media has become empty; for example, this event is sent if the media has already been loaded (or partially loaded), and the load() method is called to reload it.
         ended 	Sent when playback completes.
         error 	Sent when an error occurs.  The element's error attribute contains more information. See Error handling for details.
         loadeddata 	The first frame of the media has finished loading.
         loadedmetadata 	The media's metadata has finished loading; all attributes now contain as much useful information as they're going to.
         loadstart 	Sent when loading of the media begins.
         mozaudioavailable 	Sent when an audio buffer is provided to the audio layer for processing; the buffer contains raw audio samples that may or may not already have been played by the time you receive the event.
         pause 	Sent when playback is paused.
         play 	Sent when playback of the media starts after having been paused; that is, when playback is resumed after a prior pause event.
         playing 	Sent when the media begins to play (either for the first time, after having been paused, or after ending and then restarting).
         progress 	Sent periodically to inform interested parties of progress downloading the media. Information about the current amount of the media that has been downloaded is available in the media element's buffered attribute.
         ratechange 	Sent when the playback speed changes.
         seeked 	Sent when a seek operation completes.
         seeking 	Sent when a seek operation begins.
         suspend 	Sent when loading of the media is suspended; this may happen either because the download has completed or because it has been paused for any other reason.
         timeupdate 	The time indicated by the element's currentTime attribute has changed.
         volumechange 	Sent when the audio volume changes (both when the volume is set and when the muted attribute is changed).
         waiting 	Sent when the requested operation (such as playback) is delayed pending the completion of another operation (such as a seek).
         */
    },
    _play: function (options) {
        this.$video_container.attr('src', options.url);
        this.$video_container[0].play();
    },
    _stop: function () {
        this.$video_container[0].pause();
        this.$video_container[0].src = '';
    },
    pause: function () {
        this.$video_container[0].pause();
        this._state = "pause";
    },
    resume: function () {
        this.$video_container[0].play();
        this._state = "play";
    },
    seek: function (time) {
        this.$video_container[0].currentTime = time;
    },
    audio: {
        //https://bugzilla.mozilla.org/show_bug.cgi?id=744896
        set: function (index) {

        },
        get: function () {

        },
        cur: function () {

        }
    }
});
/**
 * Browser platform description
 */
!(function ( window, undefined  ) {

	var platform = new window.SB.Platform('browser'),
		platformObj;

	platformObj = {

		keys: {
			RIGHT: 39,
			LEFT: 37,
			DOWN: 40,
			UP: 38,
			RETURN: 27,//esc
			EXIT: 46,//delete
			TOOLS: 32,//space
			FF: 33,//page up
			RW: 34,//page down
			NEXT: 107,//num+
			PREV: 109,//num-
			ENTER: 13,
			RED: 65,//A
			GREEN: 66,//B
			YELLOW: 67,//C
			BLUE: 68,//D
			CH_UP: 221, // ]
			CH_DOWN: 219, // [
			N0: 48,
			N1: 49,
			N2: 50,
			N3: 51,
			N4: 52,
			N5: 53,
			N6: 54,
			N7: 55,
			N8: 56,
			N9: 57,
			PRECH: 45,//ins
			SMART: 36,//home
			PLAY: 97,//numpad 1
			STOP: 98,//numpad 2
			PAUSE: 99,//numpad 3
			SUBT: 76,//l,
			INFO: 73,//i
			REC: 82//r
		},

		detect: function () {
			// always true for browser platform
			return true;
		},

		initialise: function () {},

		getNativeDUID: function () {
			if (navigator.userAgent.indexOf('Chrome') != -1) {
				this.DUID = 'CHROMEISFINETOO';
			} else {
				this.DUID = 'FIREFOXISBEST';
			}
			return this.DUID;
		},

		volumeUp: function() {},

		volumeDown: function () {},

		getVolume: function () {},

		setData: function (name, val) {
			// save data in string format
			localStorage.setItem(name, JSON.stringify(val));
		},

		getData: function (name) {
			var result;
			try {
				result = JSON.parse(localStorage.getItem(name));
			} catch (e) {}

			return result;
		},

		removeData: function (name) {
			localStorage.removeItem(name);
		}
	};

	_(platform).extend(platformObj);

})(this);
if (navigator.userAgent.toLowerCase().indexOf('netcast') != -1) {


    (function () {
        var updateInterval;

        var isReady = false;

        Player.extend({
            updateDelay: 500,
            init: function () {
                var self = this;
                $('body').append('<object type="video/mp4" data="" width="1280" height="720" id="pluginPlayer" style="z-index: 1; position: absolute; left: 0; top: 0;"></object>');
                this.plugin = $('#pluginPlayer')[0];
                this.$plugin = $(this.plugin);
                this.plugin.onPlayStateChange = function () {
                    self.onEvent.apply(self, arguments);
                }
                this.plugin.onBuffering = function () {
                    self.onBuffering.apply(self, arguments);
                }
            },
            _update: function () {
                var info = this.plugin.mediaPlayInfo();

                if (info && !isReady) {
                    //$('#log').append('<div>'+info.duration+'</div>');
                    isReady = true;

                    this.trigger('ready');
                    this.videoInfo = {
                        duration: info.duration/1000
                    };
                }


                this.trigger('update');
            },
            onBuffering: function (isStarted) {
                this.trigger(isStarted ? 'bufferingBegin' : 'bufferingEnd');
            },
            _play: function (options) {
                clearInterval(updateInterval);
                updateInterval = setInterval(function () {

                    Player._update();
                }, this.updateDelay);
                isReady = false;
                this.plugin.data = options.url;
                this.plugin.play(1);
            },
            _stop: function () {
                this.plugin.stop();
            }
        })
    }());

}
(function () {

	var localStorage = window.localStorage,
		fileSysObj,
		commonDir,
		fileName,
		fileObj;

	//if Samsung 11

	if (_.isFunction(window.FileSystem)) {

		fileSysObj = new FileSystem();
		commonDir = fileSysObj.isValidCommonPath(curWidget.id);

		if ( !commonDir ) {
			fileSysObj.createCommonDir(curWidget.id);
		}
		fileName = curWidget.id + "_localStorage.db";
		fileObj = fileSysObj.openCommonFile(fileName, "r+");

		if ( fileObj ) {
			try {
				JSON.parse(fileObj.readAll());
			} catch (e) {
				localStorage && localStorage.clear();
			}
		} else {
			fileObj = fileSysObj.openCommonFile(fileName, "w");
			fileObj.writeAll("{}");
		}
		fileSysObj.closeCommonFile(fileObj);

		if ( !localStorage) {
			var lStorage = {},
				changed = false;

			var saveStorage = _.debounce(function saveStorage() {
				if (changed) {
					fileObj = fileSysObj.openCommonFile(fileName, "w");
					fileObj.writeAll(JSON.stringify(window.localStorage));
					fileSysObj.closeCommonFile(fileObj);
					changed = false;
				}
			},100);


			lStorage.setItem = function ( key, value ) {
				changed = true;
				this[key] = value;
				saveStorage();
				return this[key];
			};
			lStorage.getItem = function ( key ) {
				return this[key];
			};
			lStorage.removeItem = function ( key ) {
				delete this[key];
				saveStorage();
			};
			lStorage.clear = function () {
				var self = this;
				for ( var key in self ) {
					if ( typeof self[key] != 'function' ) {
						delete self[key];
					}
				}
				saveStorage();
			};
			window.localStorage = lStorage;
		}
	}
}());
if (navigator.userAgent.toLowerCase().indexOf('maple') != -1) {
    (function () {
        var curAudio = 0;


        var safeApply = function (self, method, args) {
            try {
                switch (args.length) {
                    case 0:
                        return self[method]();
                    case 1:
                        return self[method](args[0]);
                    case 2:
                        return self[method](args[0], args[1]);
                    case 3:
                        return self[method](args[0], args[1], args[2]);
                    case 4:
                        return self[method](args[0], args[1], args[2], args[3]);
                    case 5:
                        return self[method](args[0], args[1], args[2], args[3], args[4]);
                    case 6:
                        return self[method](args[0], args[1], args[2], args[3], args[4], args[5]);
                    case 7:
                        return self[method](args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
                    case 8:
                        return self[method](args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7]);

                }
            } catch (e) {
                throw e;
            }
        }
        Player.extend({
            usePlayerObject: false,
            init: function () {
                var self = this;
                //document.body.onload=function(){
                if (self.usePlayerObject) {
                    //self.$plugin = $('<object id="pluginPlayer" border=0 classid="clsid:SAMSUNG-INFOLINK-PLAYER" style="position: absolute; left: 0; top: 0; width: 1280px; height: 720px;"></object>');
                    self.plugin = document.getElementById('pluginPlayer');
                    $('body').append(self.$plugin);


                } else {
                    self.plugin = sf.core.sefplugin('Player');
                }


                if (!self.plugin) {
                    throw new Error('failed to set plugin');
                }

                self.plugin.OnStreamInfoReady = 'Player.OnStreamInfoReady';
                self.plugin.OnRenderingComplete = 'Player.OnRenderingComplete';
                self.plugin.OnCurrentPlayTime = 'Player.OnCurrentPlayTime';
                self.plugin.OnCurrentPlaybackTime = 'Player.OnCurrentPlayTime';
                self.plugin.OnBufferingStart = 'Player.OnBufferingStart';
                //self.plugin.OnBufferingProgress = 'Player.OnBufferingProgress';
                self.plugin.OnBufferingComplete = 'Player.OnBufferingComplete';
                //self.plugin.OnConnectionFailed = 'Player.onError';
                //self.plugin.OnNetworkDisconnected = 'Player.onError';
                //self.plugin.OnAuthenticationFailed = 'Player.OnAuthenticationFailed';

                self.plugin.OnEvent = 'Player.onEvent';
                //}

            },
            seek: function (time) {
                if (time <= 0) {
                    time = 0;
                }
                /*if ( this.duration <= time + 1 ) {
                 this.videoInfo.currentTime = this.videoInfo.duration;
                 }
                 else {*/
                var jump = Math.floor(time - this.videoInfo.currentTime - 1);
                this.videoInfo.currentTime = time;
                alert('jump: ' + jump);
                if (jump < 0) {
                    this.doPlugin('JumpBackward', -jump);
                }
                else {
                    this.doPlugin('JumpForward', jump);
                }
                //  this.currentTime = time;
                //}
            },
            onEvent: function (event, arg1, arg2) {

               // alert('playerEvent: ' + event);
                switch (event) {
                    case 9:
                        this.OnStreamInfoReady();
                        break;

                    case 4:
                        //this.onError();
                        break;

                    case 8:
                        this.OnRenderingComplete();
                        break;
                    case 14:
                        this.OnCurrentPlayTime(arg1);
                        break;
                    case 13:
                        //this.OnBufferingProgress(arg1);
                        break;
                    case 12:
                        this.OnBufferingComplete();
                        break;
                    case 11:
                        this.OnBufferingStart();
                        break;
                }
            },
            OnRenderingComplete: function () {
                alert('PLAYER COMPLETE');
                Player.trigger('complete');
            },
            OnStreamInfoReady: function () {
                var duration, width, height, resolution;

                try {
                    duration = this.doPlugin('GetDuration');
                } catch (e) {
                    alert('######## ' + e.message);
                }

                duration = Math.ceil(duration / 1000);
                //this.jumpLength = Math.floor(this.duration / 30);

                if (this.usePlayerObject) {
                    width = this.doPlugin('GetVideoWidth');
                    height = this.doPlugin('GetVideoHeight');
                } else {
                    resolution = this.doPlugin('GetVideoResolution');
                    if (resolution == -1) {
                        width = 0;
                        height = 0;
                    } else {
                        var arrResolution = resolution.split('|');
                        width = arrResolution[0];
                        height = arrResolution[1];
                    }
                }

                this.videoInfo.duration = duration;
                this.videoInfo.width = width * 1;
                this.videoInfo.height = height * 1;
                this.trigger('ready');
            },
            OnBufferingStart: function () {
                this.trigger('bufferingBegin');
            },
            OnBufferingComplete: function () {
                this.trigger('bufferingEnd');
            },
            OnCurrentPlayTime: function (millisec) {
                if (this._state == 'play') {
                    alert(millisec / 1000);
                    this.videoInfo.currentTime = millisec / 1000;
                    this.trigger('update');
                }
            },
            _play: function (options) {
                var url = options.url;
                switch (options.type) {
                    case 'hls':
                        url += '|COMPONENT=HLS'
                }
                this.doPlugin('InitPlayer', url);
                this.doPlugin('StartPlayback', options.from || 0);
            },
            _stop: function () {
                this.doPlugin('Stop');
            },
            doPlugin: function () {
                var result,
                    plugin = this.plugin,
                    methodName = arguments[0],
                    args = Array.prototype.slice.call(arguments, 1, arguments.length) || [];

                if (this.usePlayerObject) {


                    result = safeApply(plugin, methodName, args);

                }
                else {
                    if (methodName.indexOf('Buffer') != -1) {
                        methodName += 'Size';
                    }
                    args.unshift(methodName);
                    result = safeApply(plugin, 'Execute', args);
                }

                return result;
            },
            audio: {
                set: function (index) {
                    /*one is for audio*/
                    //http://www.samsungdforum.com/SamsungDForum/ForumView/f0cd8ea6961d50c3?forumID=63d211aa024c66c9
                    Player.doPlugin('SetStreamID', 1, index);
                    curAudio = index;
                },
                get: function () {
                    /*one is for audio*/
                    var len = Player.doPlugin('GetTotalNumOfStreamID', 1);

                    var result = [];
                    for (var i = 0; i < len; i++) {
                        result.push(Player.doPlugin('GetStreamLanguageInfo', 1, i));
                    }
                    return result;
                },
                cur: function () {
                    return curAudio;
                }
            }
        });
    }());

}

/**
 * Samsung platform
 */
!(function ( window, undefined  ) {

	var platform = new window.SB.Platform('samsung'),
		/**
		 * Native plugins
		 * id: clsid (DOM element id : CLSID)
		 * @type {{object}}
		 */
			plugins = {
			audio: 'SAMSUNG-INFOLINK-AUDIO',
			pluginObjectTV: 'SAMSUNG-INFOLINK-TV',
			pluginObjectTVMW: 'SAMSUNG-INFOLINK-TVMW',
			pluginObjectNetwork: 'SAMSUNG-INFOLINK-NETWORK',
			pluginObjectNNavi: 'SAMSUNG-INFOLINK-NNAVI'
		},
		platformObj,
		detectResult = false;

	detectResult = navigator.userAgent.search(/Maple/) > -1;

	// non-standart inserting objects in DOM (i'm looking at you 2011 version)
	// in 2011 samsung smart tv's we can't add objects if document is ready
	if (detectResult) {
		var objectsString = '';
		for ( var id in plugins ) {
			objectsString += '<object id=' + id +' border=0 classid="clsid:' + plugins[id] +'" style="opacity:0.0;background-color:#000000;width:0px;height:0px;"></object>';
		}
		document.write(objectsString);
	}

	platformObj = {

		keys: {

		},

		externalJs: [
			'$MANAGER_WIDGET/Common/af/../webapi/1.0/deviceapis.js',
			'$MANAGER_WIDGET/Common/af/../webapi/1.0/serviceapis.js',
			'$MANAGER_WIDGET/Common/af/2.0.0/extlib/jquery.tmpl.js',
			'$MANAGER_WIDGET/Common/Define.js',
			'$MANAGER_WIDGET/Common/af/2.0.0/sf.min.js',
			'$MANAGER_WIDGET/Common/API/Widget.js',
			'$MANAGER_WIDGET/Common/API/TVKeyValue.js',
			'$MANAGER_WIDGET/Common/API/Plugin.js',
			'src/platforms/samsung/localstorage.js'
		],

		$plugins: {},

		detect: function () {
			return detectResult;
		},

		initialise: function () {},

		getNativeDUID: function () {
			return this.$plugins.pluginObjectNNavi.GetDUID(this.getMac());
		},

		getMac: function () {
			return this.$plugins.pluginObjectNetwork.GetMAC();
		},

		getSDI: function () {
			this.SDI = this.SDIPlugin.Execute('GetSDI_ID');
			return this.SDI;
		},

		/**
		 * Return hardware version for 2013 samsung only
		 * @returns {*}
		 */
		getHardwareVersion: function () {
			var version = this.firmware.match(/\d{4}/) || [];
			if (version[0] === '2013') {
				this.hardwareVersion = sf.core.sefplugin('Device').Execute('Firmware');
			} else {
				this.hardwareVersion = null;
			}
			return this.hardwareVersion;
		},

		setPlugins: function () {
			var self = this;

			_.each(plugins, function ( clsid, id ) {
				self.$plugins[id] = document.getElementById(id);
			});

			this.$plugins.SDIPlugin = sf.core.sefplugin('ExternalWidgetInterface');
			this.$plugins.tvKey = new Common.API.TVKeyValue();

			var NNAVIPlugin = this.$plugins.pluginObjectNNavi,
				TVPlugin = this.$plugins.pluginObjectTV;

			this.modelCode = NNAVIPlugin.GetModelCode();
			this.firmware = NNAVIPlugin.GetFirmware();
			this.systemVersion = NNAVIPlugin.GetSystemVersion(0);
			this.productCode = TVPlugin.GetProductCode(1);

			this.pluginAPI = new Common.API.Plugin();
			this.widgetAPI = new Common.API.Widget();

			this.productType = TVPlugin.GetProductType();
			this.setKeys();

			// enable standart volume indicator
			this.pluginAPI.unregistKey(sf.key.KEY_VOL_UP);
			this.pluginAPI.unregistKey(sf.key.KEY_VOL_DOWN);
			this.pluginAPI.unregistKey(sf.key.KEY_MUTE);
			NNAVIPlugin.SetBannerState(2);
		},

		/**
		 * Set keys for samsung platform
		 */
		setKeys: function () {
			this.keys = sf.key;
		},

		/**
		 * Start screensaver
		 * @param time
		 */
		enableScreenSaver: function (time) {
			time = time || false;
			sf.service.setScreenSaver(true, time);
		},

		/**
		 * Disable screensaver
		 */
		disableScreenSaver: function () {
			sf.service.setScreenSaver(false);
		},

		exit: function () {
			sf.core.exit(false);
		},

		blockNavigation: function () {
			sf.key.preventDefault();
		}
	};

	_.extend(platform, platformObj);
})(this);