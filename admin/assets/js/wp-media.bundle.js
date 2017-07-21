require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (global){
"use strict";
var Playlists,
	Backbone = (typeof window !== "undefined" ? window['Backbone'] : typeof global !== "undefined" ? global['Backbone'] : null),
	l10n = require( 'cue' ).l10n,
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null);

Playlists = wp.media.controller.State.extend({
	defaults: {
		id: 'cue-playlists',
		title: l10n.insertPlaylist || 'Insert Playlist',
		collection: null,
		content: 'cue-playlist-browser',
		menu: 'default',
		menuItem: {
			text: l10n.insertFromCue || 'Insert from Cue',
			priority: 130
		},
		selection: null,
		toolbar: 'cue-insert-playlist'
	},

	initialize: function( options ) {
		var collection = options.collection || new Backbone.Collection(),
			selection = options.selection || new Backbone.Collection();

		this.set( 'attributes', new Backbone.Model({
			id: null,
			show_playlist: true
		}) );

		this.set( 'collection', collection );
		this.set( 'selection', selection );

		this.listenTo( selection, 'remove', this.updateSelection );
	}
});

module.exports = Playlists;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"cue":"cue"}],2:[function(require,module,exports){
(function (global){
"use strict";
var PlaylistBrowser,
	_ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null),
	PlaylistItems = require( '../playlist/items' ),
	PlaylistNoItems = require( '../playlist/no-items' ),
	PlaylistSidebar = require( '../playlist/sidebar' ),
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null);

PlaylistBrowser = wp.Backbone.View.extend({
	className: 'cue-playlist-browser',

	initialize: function( options ) {
		this.collection = options.controller.state().get( 'collection' );
		this.controller = options.controller;

		this._paged = 1;
		this._pending = false;

		_.bindAll( this, 'scroll' );
		this.listenTo( this.collection, 'reset', this.render );

		if ( ! this.collection.length ) {
			this.getPlaylists();
		}
	},

	render: function() {
		this.$el.off( 'scroll' ).on( 'scroll', this.scroll );

		this.views.add([
			new PlaylistItems({
				collection: this.collection,
				controller: this.controller
			}),
			new PlaylistSidebar({
				controller: this.controller
			}),
			new PlaylistNoItems({
				collection: this.collection
			})
		]);

		return this;
	},

	scroll: function() {
		if ( ! this._pending && this.el.scrollHeight < this.el.scrollTop + this.el.clientHeight * 3 ) {
			this._pending = true;
			this.getPlaylists();
		}
	},

	getPlaylists: function() {
		var view = this;

		wp.ajax.post( 'cue_get_playlists', {
			paged: view._paged
		}).done(function( response ) {
			view.collection.add( response.playlists );

			view._paged++;

			if ( view._paged <= response.maxNumPages ) {
				view._pending = false;
				view.scroll();
			}
		});
	}
});

module.exports = PlaylistBrowser;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../playlist/items":5,"../playlist/no-items":6,"../playlist/sidebar":7}],3:[function(require,module,exports){
(function (global){
"use strict";
var InsertPlaylistFrame,
	PlaylistBrowser = require( '../content/playlist-browser' ),
	PlaylistsController = require( '../../controllers/playlists' ),
	PlaylistToolbar = require( '../toolbar/playlist' ),
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null),
	PostFrame = wp.media.view.MediaFrame.Post;

InsertPlaylistFrame = PostFrame.extend({
	createStates: function() {
		PostFrame.prototype.createStates.apply( this, arguments );

		this.states.add( new PlaylistsController({}) );
	},

	bindHandlers: function() {
		PostFrame.prototype.bindHandlers.apply( this, arguments );

		//this.on( 'menu:create:default', this.createCueMenu, this );
		this.on( 'content:create:cue-playlist-browser', this.createCueContent, this );
		this.on( 'toolbar:create:cue-insert-playlist', this.createCueToolbar, this );
	},

	createCueMenu: function( menu ) {
		menu.view.set({
			'cue-playlist-separator': new wp.media.View({
				className: 'separator',
				priority: 200
			})
		});
	},

	createCueContent: function( content ) {
		content.view = new PlaylistBrowser({
			controller: this
		});
	},

	createCueToolbar: function( toolbar ) {
		toolbar.view = new PlaylistToolbar({
			controller: this
		});
	},
});

module.exports = InsertPlaylistFrame;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../../controllers/playlists":1,"../content/playlist-browser":2,"../toolbar/playlist":8}],4:[function(require,module,exports){
(function (global){
"use strict";
var Playlist,
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null);

Playlist = wp.Backbone.View.extend({
	tagName: 'li',
	className: 'cue-playlist-browser-list-item',
	template: wp.template( 'cue-playlist-browser-list-item' ),

	events: {
		'click': 'resetSelection'
	},

	initialize: function( options ) {
		this.controller = options.controller;
		this.model = options.model;
		this.selection = this.controller.state().get( 'selection' );

		this.listenTo( this.selection, 'add remove reset', this.updateSelectedClass );
	},

	render: function() {
		this.$el.html( this.template( this.model.toJSON() ) );
		return this;
	},

	resetSelection: function( e ) {
		if ( this.selection.contains( this.model ) ) {
			this.selection.remove( this.model );
		} else {
			this.selection.reset( this.model );
		}
	},

	updateSelectedClass: function() {
		if ( this.selection.contains( this.model ) ) {
			this.$el.addClass( 'is-selected' );
		} else {
			this.$el.removeClass( 'is-selected' );
		}
	}
});

module.exports = Playlist;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
(function (global){
"use strict";
var PlaylistItems,
	PlaylistItem = require( '../playlist/item' ),
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null);

PlaylistItems = wp.Backbone.View.extend({
	className: 'cue-playlist-browser-list',
	tagName: 'ul',

	initialize: function( options ) {
		this.collection = options.controller.state().get( 'collection' );
		this.controller = options.controller;

		this.listenTo( this.collection, 'add', this.addItem );
		this.listenTo( this.collection, 'reset', this.render );
	},

	render: function() {
		this.collection.each( this.addItem, this );
		return this;
	},

	addItem: function( model ) {
		var view = new PlaylistItem({
			controller: this.controller,
			model: model
		}).render();

		this.$el.append( view.el );
	}
});

module.exports = PlaylistItems;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../playlist/item":4}],6:[function(require,module,exports){
(function (global){
"use strict";
var PlaylistNoItems,
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null);

PlaylistNoItems = wp.Backbone.View.extend({
	className: 'cue-playlist-browser-empty',
	tagName: 'div',
	template: wp.template( 'cue-playlist-browser-empty' ),

	initialize: function( options ) {
		this.collection = this.collection;

		this.listenTo( this.collection, 'add remove reset', this.toggleVisibility );
	},

	render: function() {
		this.$el.html( this.template() );
		return this;
	},

	toggleVisibility: function() {
		this.$el.toggleClass( 'is-visible', this.collection.length < 1 );
	}
});

module.exports = PlaylistNoItems;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],7:[function(require,module,exports){
(function (global){
"use strict";
var PlaylistSidebar,
	$ = (typeof window !== "undefined" ? window['jQuery'] : typeof global !== "undefined" ? global['jQuery'] : null),
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null);

PlaylistSidebar = wp.Backbone.View.extend({
	className: 'cue-playlist-browser-sidebar media-sidebar',
	template: wp.template( 'cue-playlist-browser-sidebar' ),

	events: {
		'change [data-setting]': 'updateAttribute'
	},

	initialize: function( options ) {
		this.attributes = options.controller.state().get( 'attributes' );
	},

	render: function() {
		this.$el.html( this.template() );
	},

	updateAttribute: function( e ) {
		var $target = $( e.target ),
			attribute = $target.data( 'setting' ),
			value = e.target.value;

		if ( 'checkbox' === e.target.type ) {
			value = !! $target.prop( 'checked' );
		}

		this.attributes.set( attribute, value );
	}
});

module.exports = PlaylistSidebar;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],8:[function(require,module,exports){
(function (global){
"use strict";
var PlaylistToolbar,
	_ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null),
	wp = (typeof window !== "undefined" ? window['wp'] : typeof global !== "undefined" ? global['wp'] : null);

PlaylistToolbar = wp.media.view.Toolbar.extend({
	initialize: function( options ) {
		this.controller = options.controller;

		_.bindAll( this, 'insertCueShortcode' );

		// This is a button.
		this.options.items = _.defaults( this.options.items || {}, {
			insert: {
				text: wp.media.view.l10n.insertIntoPost || 'Insert into post',
				style: 'primary',
				priority: 80,
				requires: {
					selection: true
				},
				click: this.insertCueShortcode
			}
		});

		wp.media.view.Toolbar.prototype.initialize.apply( this, arguments );
	},

	insertCueShortcode: function() {
		var html,
			state = this.controller.state(),
			attributes = state.get( 'attributes' ).toJSON(),
			selection = state.get( 'selection' ).first();

		attributes.id = selection.get( 'id' );
		_.pick( attributes, 'id', 'theme', 'width', 'show_playlist' );

		if ( ! attributes.show_playlist ) {
			attributes.show_playlist = '0';
		} else {
			delete attributes.show_playlist;
		}

		html = wp.shortcode.string({
			tag: 'cue',
			type: 'single',
			attrs: attributes
		});

		wp.media.editor.insert( html );
		this.controller.close();
	}
});

module.exports = PlaylistToolbar;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],9:[function(require,module,exports){
"use strict";
/*global _cueMediaSettings:false, wp:false */

(function( wp ) {
	'use strict';

	var cue = require( 'cue' );

	cue.settings( _cueMediaSettings );

	wp.media.view.MediaFrame.Post = require( './views/frame/insert-playlist' );

})( wp );

},{"./views/frame/insert-playlist":3,"cue":"cue"}],"cue":[function(require,module,exports){
(function (global){
"use strict";
var _ = (typeof window !== "undefined" ? window['_'] : typeof global !== "undefined" ? global['_'] : null);

function Application() {
	var settings = {};

	_.extend( this, {
		controller: {},
		l10n: {},
		model: {},
		view: {}
	});

	this.settings = function( options ) {
		if ( options ) {
			_.extend( settings, options );
		}

		if ( settings.l10n ) {
			this.l10n = _.extend( this.l10n, settings.l10n );
			delete settings.l10n;
		}

		return settings || {};
	};
}

global.cue = global.cue || new Application();
module.exports = global.cue;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[9]);
