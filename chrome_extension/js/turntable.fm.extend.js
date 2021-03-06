TFMEX = {};

/*
  turntable.fm extend
  
  Developed by:
    Mark Reeder http://twitter.com/Mark_Reeder, http://github.com/MarkReeder
    Adam Creeger http://twitter.com/Creeger, http://github.com/acreeger
*/

TFMEX.$body = $("body");
TFMEX.prefs = {
    "showChat": false,
    "filteredChat": false,
    "chatFilters": [],
    "showSong": true,
    "showVote": true,
    "showDJChanges": false,
    "showListenerChanges": false,
	"tagsClosed": false,
	"enableScrobbling":false,
	"enableSongkick":true,
    "messageTimeout": 10000,
    "eventDistance": 50
};

TFMEX.clearNotifications = function() {
	// Should work but doesn't at the moment due to this bug: https://code.google.com/p/chromium/issues/detail?id=40262
	var notifciation = null;
	while(TFMEX.notificationQueue.length) {
		notification = TFMEX.notificationQueue.pop();
		// console.log(notification);
		notification.cancel();
	}
}

TFMEX.performMigrations = function() {
	var manifestVersion = $('body').attr('tt-ext-manifest-version') //populated by contentscript
	var lastRunVersion = localStorage.lastRunVersion

	if (typeof(lastRunVersion) === "undefined" || lastRunVersion == null) {
		//either first time install or first time since we started doing migrations
		console.log("Running First Migration")

		var tree = ["div.tt-ext-welcome-message", ["h2","Thanks for installing Turntable Extended!"],["p","Be sure to play around with the new options in the settings menu, as well as the song suggestions link above your DJ Queue."]]
		turntable.showAlert(tree)

		if (localStorage['lastfm-session-token']) {
			//if lastfm is configured, enable scrobbling by default
			console.log("performMigrations: enabling scrobbling")
			try {
                var prefs = JSON.parse(localStorage.TFMEX)
                prefs.enableScrobbling = true
                localStorage.TFMEX = JSON.stringify(prefs)
            } catch (ex) {console.warn("Error occurred whilst enabling scrobbling.",ex.stack)}
		}
	}
	
	localStorage.lastRunVersion = manifestVersion
}

TFMEX.votelog = [];
TFMEX.heartlog = [];
TFMEX.notificationQueue = [];
TFMEX.songTags = {};
TFMEX.tagSongs = {};
TFMEX.autoTagsInitialized = false;
TFMEX.bitrateSongs = {};
TFMEX.genreSongs = {};
TFMEX.lastUserAction = {};
TFMEX.djSongCount = {};

TFMEX.showOverlay = function (tree){
	turntable.showAlert(tree);
}

TFMEX.suggestionsOverlayView = function() {
	return [
		"div.suggestionsOverlay.tt-ext-ui",
		{
			style: {
				width:"590px",
				"padding-left":0,
				"padding-right":0,
				"padding-bottom":0			 
			}
		},
		[
			"h2",
			"Some Suggestions For You"
		],
		[
			"p",
			"Similar to..."
		],
		[
			"div#tt-ext-suggestion-tabs",
			[ "ul",["li",["a",{href:"#tt-ext-suggestion-tabs-0"},"...the current track"]],["li",["a",{href:"#tt-ext-suggestion-tabs-1"},"...this room's most popular tracks"]]],
			[
				"div#tt-ext-suggestion-tabs-0##similarToCurrentSong.tt-ext-suggested-songs"
			],
			[
				"div#tt-ext-suggestion-tabs-1##similarToSongLog.tt-ext-suggested-songs"
			]
		]
	]
}

TFMEX.suggestedSongView = function(song) {
	var a = {}
	a.artist = song.artist.name
	a.song = song.name
	
	return [
		"div.tt-ext-suggested-song",
		{
			
		},
		[
			"div",
			[
				"span.title",
				{title:a.song},		
				a.song
			],
			[
				"span.tt-ext-search-link",
				{
					data: {
						query: a.song + " " + a.artist
					}						
				},
				"Search for this track"
			]
		],
		[
			"div",
			[
				"span.artist",
				{},		
				a.artist
			],
			[
				"span.tt-ext-search-link",
				{
					data: {
						query: a.artist
					}						
				},
				"Search for this artist"
			]
		]
	]	 
}
TFMEX.songkickEventView = function (event) {
    return [
        "div",
        [
            "a.title.songkick-event.flL.clB",
            {href:event.uri,target:'songkick'},
            event.displayName
        ],
        [
            "span.date.flL.clB",
            {},
            'on: ' + event.start.date
        ],
        [
            "span.city.flL.clB",
            {},
            'in: ',
            [
                "span",
                {},
                event.location.city
            ]
        ]
    ];
}

TFMEX.ticketflyEventView = function (event) {
    var eventLink = [
        "a.title.ticketfly-event.flL.clB",
        {href:event.ticketPurchaseUrl,target:'ticketfly','data-event-id':event.id},
        event.name
    ];
    
    if(event.eventStatusCode === "SOLD_OUT") {
        eventLink = [
            "div.flL.clB",
            {},
            [
                "span.sold-out",
                {},
                'SOLD OUT'
            ],
            [
                "span",
                {},
                event.name
            ]
        ];
    }
    if(!(event.eventStatusCode === "BUY" || event.eventStatusCode === "CUSTOM" || event.eventStatusCode === "SOLD_OUT")) { return []; }
    return [
        "div",
        eventLink,
        [
            "span.date.flL.clB",
            {},
            'on: ' + event.startDate
        ],
        [
            "span.venue.flL.clB",
            {},
            'at: ',
            [
                "a",
                {href:event.venue.url,target:'ticketfly'},
                event.venue.name + ', ' + event.venue.city
            ]
        ]
    ];
    /*
	return $("#" + elementId).length > 0 ? null : [
		"div#" + elementId + ".menuItem",
		{
			event: {
				click: clickHandler
			}
		},
		itemLabel
	];
	*/
}

TFMEX.settingsItemView = function (itemLabel,clickHandler,elementId) {	
	return $("#" + elementId).length > 0 ? null : [
		"li#" + elementId + ".option",
		{
			event: {
				click: clickHandler
			}
		},
		itemLabel
	];
}

TFMEX.preferencesView = function(cancelEvent,saveEvent) {
	return [
		"div.tt-ext-preferences",
		{
			
		},
		[
			"h2",
			"Extension Settings"
		],
		[
			"div.tt-ext-pref-section",
			["h3.tt-ext-pref-header","Notifications"],
			[
				"dl.tt-ext-pref-body",
				[
					"dt","Chat Messages?",["br"],"(Note: Disable the chat ding for this to work)"
				],
				[
					"dd",["input#showChat",{type:"checkbox","data-tfmex-pref":"showChat",value:1}]
				],
				[
					"dt","Filter Chat Messages?",["br"]
				],
				[
					"dd",["input#filteredChat",{type:"checkbox","data-tfmex-pref":"filteredChat",value:1}]
				],
				[
					"div",["input#chatFiltersValue",{type:"text","data-tfmex-pref":"chatFilters",value:""}]
				],
				[
					"dt","Song Messages?"
				],
				[
					"dd",["input#showSong",{type:"checkbox","data-tfmex-pref":"showSong",value:1}]
				],
				[
					"dt","Vote Messages?"
				],
				[
					"dd",["input#showVote",{type:"checkbox","data-tfmex-pref":"showVote",value:1}]
				],			
				[
					"dt","DJ Changes?"
				],
				[
					"dd",["input#showDJChanges",{type:"checkbox","data-tfmex-pref":"showDJChanges",value:1}]
				],			
				[
					"dt","Listener Changes?"
				],
				[
					"dd",["input#showListenerChanges",{type:"checkbox","data-tfmex-pref":"showListenerChanges",value:1}]
				]			
			]			
		],["div.clB"],
		[
			"div.tt-ext-pref-section",
				["h3.tt-ext-pref-header","Last.fm"],["dl.tt-ext-pref-body",
					[
						"dt","Enable scrobbling?"
					],
					[
						"dd",["input#tt-ext-enable-scrobbling",{type:"checkbox","data-tfmex-pref":"enableScrobbling",value:1}]
					]
				]
		],["div.clB"],
		[
			"div.tt-ext-pref-section",
				["h3.tt-ext-pref-header","Songkick"],["dl.tt-ext-pref-body",
					[
						"dt","Show concert listings?"
					],
					[
						"dd",["input#tt-ext-enable-songkick",{type:"checkbox","data-tfmex-pref":"enableSongkick",value:1}]
					],
					[
						"dt","Automatically expand for concerts closer than:"
					],
					[
						"dd.event-distance",
						    [
						        "select#tt-ext-event-distance",{"data-tfmex-pref":"eventDistance"},
						         ["option",{"value":0},"Don't auto expand"]
						        ,["option",{"value":5},"5 miles"]
						        ,["option",{"value":10},"10 miles"]
 						        ,["option",{"value":25},"25 miles"]
						        ,["option",{"value":50},"50 miles"]
						        ,["option",{"value":100},"100 miles"]
						        ,["option",{"value":250},"250 miles"]
						        ,["option",{"value":500},"500 miles"]
						        ,["option",{"value":5000},"5000 miles"]
						    ]
					]
				]
		],["div.clB"],
		[
			"div.tt-ext-pref-section",
				["div.save-changes.centered-button",{event:{click:saveEvent}}]
		]
	]
}



TFMEX.exportView = function(cancelEvent) {
	return [
		"div.tt-ext-export",
		{
			
		},
		[
			"h2",
			"Export XSPF"
		],
		[
			"div.tt-ext-export-section",
			[
			    "a",{id:"tt-ex-export-queue"},"Export your song queue"
			],
			["br"],
			[
			    "a",{id:"tt-ex-export-recent"},"Export songs recently played in this room"
			],
    		["br"],
			[
			    "textarea",{id:"tt-ex-export"}
			],
			["br"],
			[
			    "input",{type:"text",id:"tt-ex-export-filename",value:"turntable_songs.xspf"}
			],
			[
			    "input",{type:"button",id:"tt-ex-export-save",value:"SAVE"}
			]
		]
	]
}

TFMEX.roomUsersView = function() {
	return [
		"div.roomUsersOverlay",
		{
			style: {
				width:"600px",
				"padding-left":0,
				"padding-right":0,
				"padding-bottom":0			 
			}
		},
		[
			"h2",
			"In the room, we have..."
		],
		[
			"div.tt-ext-room-users",["div##users"]
		]
	]
}

TFMEX.roomUserView = function(user) {
	var userLink = null,
		userVote = [],
		userVoteText = "",
		returnObj = null,
		userIsSelf = user.userid === TFMEX.user.id,
	    userIsMod = false,
	    userIsCreator = user.userid === TFMEX.roomInfo.creatorId,
	    userIsSuper = user.acl === 1,
	    userIsOnDeckPosition = jQuery.inArray(user.userid, TFMEX.room.djIds),
	    fanOf = user.fanof,
	    divTag = "div.tt-ext-room-user",
	    userNameSpan = [],
	    auxSpan = [],
	    memberSince = "Member since: ",
	    now = new Date(),
	    newDate = new Date(),
	    idleMessage = "",
	    songCountMessage = "",
	    playCount = 0;
	userIsMod = jQuery.inArray(user.userid, TFMEX.roommanager.roomData.metadata.moderator_id) > -1;
	if (userIsMod || userIsCreator) divTag += ".tt-ext-room-mod";    
	if (userIsSuper) divTag += ".tt-ext-super-user";
	returnObj = [
		divTag
	];
    newDate.setTime( user.created * 1000 );
    dateString = newDate.toDateString();
    memberSince += dateString;
	userNameSpan = ["span.tt-ext-user-name.tt-ext-cell",["a",{href:"javascript:TFMEX.showUserProfile('" + user.userid + "')",title:memberSince},user.name]];
	
	if(TFMEX.userVotes[user.userid]) {
	    if(TFMEX.userVotes[user.userid] === "up") {
    	    userNameSpan.push(["span.vote.upVote"]);
	    } else {
    	    userNameSpan.push(["span.vote.downVote"]);
	    }
	}

	if(TFMEX.heartlog.indexOf(user.userid) > -1) {
	    userNameSpan.push(["span.heart"]);
	}

	if (userIsCreator) {
	    userNameSpan.push("(Creator)");
	} else if (userIsMod) {
		userNameSpan.push("(Mod)");
	}
	if(userIsSuper) {
	    userNameSpan.push("(Super)");
	}
	var secondsToHms = function(d) {
    	d = Number(d);
    	var h = Math.floor(d / 3600);
    	var m = Math.floor(d % 3600 / 60);
    	var s = Math.floor(d % 3600 % 60);
    	return ((h > 0 ? h + ":" : "") + (m > 0 ? (h > 0 && m < 10 ? "0" : "") + m + ":" : "0:") + (s < 10 ? "0" : "") + s);
    };
	if(userIsOnDeckPosition > -1) {
        try {
            // idleMessage = " - idle: " + secondsToHms(((now.getTime() - TFMEX.lastUserAction[user.userid].getTime()) / 1000).toFixed(0));
        } catch(e) { console.log(e.message) }
        try {
            if(TFMEX.djSongCount[user.userid]) {
                playCount = TFMEX.djSongCount[user.userid];
            }
            songCountMessage = " - played " + playCount;
        } catch(e) { console.log(e.message) }
	    userNameSpan.push("(DJ" + songCountMessage + idleMessage +")");
	}
	auxSpan = ["span.tt-ext-cell.tt-ext-aux-links",["a.icon.ttDashboard",{href:'http://ttstats.info/user/' + user.userid,target: "_blank",title:'on TTStats'},""]];
	if(!userIsSelf) {
    	if(fanOf) {
    	    auxSpan.push(["a.icon.fan.evtToggleFan",{title:"Unfan",'data-userid':user.userid,href:"javascript:"},""]);
    	} else {
        	auxSpan.push(["a.icon.fan.notFan.evtToggleFan",{title:"Become a Fan",'data-userid':user.userid,href:"javascript:"},""]);
    	}
    	if(TFMEX.room.isMod(TFMEX.roomInfo.selfId)) {
        	auxSpan.push(["a.icon.evtBootUser.bootUser",{'data-userid':user.userid,href:"javascript:",title:'Boot User'},""]);
    	}
	}
	returnObj.push(userNameSpan);
    returnObj.push(auxSpan);
	return returnObj;
}

TFMEX.bootUser = function(element) {
    var $element = $(element);
    TFMEX.roommanager.callback('boot_user', $element.data("userid"));
    $element.closest('.tt-ext-room-user').hide('slow', function(evt) {
        $(evt.target).remove();
    });
}

TFMEX.toggleFan = function(element) {
    var $element = $(element);
    if($element.hasClass("notFan")) {
        TFMEX.roommanager.callback('become_fan', $element.data("userid"));
        $element.removeClass("notFan");
        $element.attr('title','Unfan');
    } else {
        TFMEX.roommanager.callback('remove_fan', $element.data("userid"));
        $element.addClass("notFan");
        $element.attr('title','Become a Fan');
    }
}

TFMEX.addSong = function(songId, songMetadata) {
    // songId = TFMEX.songlog[0]._id
    // metadata = TFMEX.songlog[0].metadata
    turntable.playlist.addSong({
        fileId: songId,
        metadata: songMetadata
    });
}

TFMEX.tagView = function(tag, fileId) {
	return [
		"div.tt-ext-song-tag",
		{
			'data-song-id':fileId,
			'data-tag':tag
		},
		[
			"span.tag",
			{title:tag},		
			tag
		],
		[
			"a.remove-tag",
			{title:"Remove Tag"},
			"X"
		]
	]
}

TFMEX.tagAdd = function(fileId) {
	return [
		"div.tt-ext-song-tag.tt-ext-new-song-tag",
		{
		},
		[
			"form.input-box.new-song-tag",
			{},
			[
				"input#new-song-tag-value",
				{
					type:"text",
					'data-song-id':fileId
				},
				""
			]
		]
	]
}

TFMEX.metadataDisplay = function(song) {
    var metadata = song.metadata,
        displayLength = function(length) {
            var mm = Math.floor(length/60),
                ss = length%60;
            if(ss < 10) {
                ss = '0' + ss;
            }
            return mm + ':' + ss;
        }
	return [
		"div.tt-ext-song-tag.tt-ext-new-song-tag",
		{
		},
		[
			"div.input-box.song-metadata",
			{
			    "data-file-id":song.fileId
			},
			[
			    "span.label",
			    {},
			    "Artist:"
			],
			[
				"span#song-metadata-artist-value.value",
				{},
				metadata.artist
			],
			[
			    "span.label",
			    {},
			    "Song:"
			],
			[
    			"span#song-metadata-song-value.value",
    			{},
    			metadata.song
			],
			[
			    "span.label",
			    {},
			    "Album:"
			],
			[
    			"span#song-metadata-album-value.value",
    			{},
    			metadata.album
			],
			[
			    "span.label",
			    {},
			    "Genre:"
			],
			[
    			"span#song-metadata-genre-value.value",
    			{},
    			metadata.genre
			],
			[
			    "span.label",
			    {},
			    "Bitrate:"
			],
			[
    			"span#song-metadata-bitrate-value.value",
    			{},
    			metadata.bitrate
			],
			[
			    "span.label",
			    {},
			    "Length:"
			],
			[
    			"span#song-metadata-length-value.value",
    			{},
    			displayLength(metadata.length)
			],
			[
			    "br"
			]
		]
	]
}

TFMEX.removeTagFromSong = function(tag, fileId) {
	TFMEX.songTags[fileId].splice(TFMEX.songTags[fileId].indexOf(tag), 1);
	localStorage.TFMEXsongTags = JSON.stringify(TFMEX.songTags);
	TFMEX.refreshTagSongs();
}

TFMEX.addTagToSong = function(tag, fileId) {
	TFMEX.songTags[fileId].push(tag);
	localStorage.TFMEXsongTags = JSON.stringify(TFMEX.songTags);
	TFMEX.refreshTagSongs();
}

TFMEX.updateQueueTagIcons = function() {
	var i = 0, numTotalSongs = 0;
	TFMEX.songsUntagged = [];
	for(i in turntable.playlist.songsByFid) {
	    var fileId = turntable.playlist.songsByFid[i].fileId;
	    numTotalSongs++;
		if(TFMEX.songTags && (typeof(TFMEX.songTags[fileId]) === "undefined" || TFMEX.songTags[fileId].length === 0)) {
		    if(TFMEX.songsUntagged[fileId] === undefined) {
    			TFMEX.songsUntagged.push(fileId);
		    }
		}
	}
	$('#playlist').off('hover.TFMEX');
	$('#playlist').on('hover.TFMEX', '.song', function() {
		var fileId = null,
			html = '',
			$this = $(this),
			currentTagIcon = $this.find('a.tag');
		$this.find('.tag').remove();
		fileId = $this.data().songData.fileId;
		if(currentTagIcon) {
			currentTagIcon.remove();
		}
		html += '<a class="tag';
		if(typeof(TFMEX.songTags[fileId]) === "undefined" || TFMEX.songTags[fileId].length === 0) {
			html += ' no-tags';
		}
		html += '" data-file-id="';
		html += fileId;
		html += '"></a>';
		$this.append(html);
	});
	$('#tfmExtended .tag-list li[data-tag="___untagged___"]').html('Untagged Songs (' + TFMEX.songsUntagged.length + ')');
	$('#tfmExtended .tag-list li[data-tag="___allsongs___"]').html('All Songs (' + numTotalSongs + ')');
	TFMEX.setAutoTags();
}

TFMEX.youtubePlayer = {
    initialize: function() {
        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = 'https://ajax.googleapis.com/ajax/libs/swfobject/2.2/swfobject.js';
        $('head').append(s);
        this.addYoutubePlayLinks();
    },
    
    fadeRoomAudioOut: function() {
        for (var d = 0; d < turntablePlayer.tracks.length; d++) {
            turntablePlayer.fade(turntablePlayer.tracks[d].sound, 0);
        }
    },
    
    fadeRoomAudioIn: function() {
        for (var a = 0; a < turntablePlayer.tracks.length; a++) {
            turntablePlayer.fade(turntablePlayer.tracks[a].sound, turntablePlayer.calculatedBarsVolume());
        }  
    },
    
    addYoutubePlayLinks: function() {
        $('#playlist .queueView .song').each(function() {
    		var $this = $(this),
    		    details = $this.find('.details')[0].innerHTML,
    		    artist = details.slice(0,details.lastIndexOf('-') - 1),
    		    title = $this.find('.titlediv')[0].innerHTML;
    		if($this.hasClass('noPreview')) {
    		    $this
    		        .addClass('youtubePreview')
    		        .find('.playSample')
    		            .removeClass('playSample')
    		            .addClass('youtubeSample')
            		    .unbind('click')
    		            .click(function(event) {
    		                var searchString = artist + ' ' + title,
    		                    $this = $(this);
    		                event.preventDefault();
    		                if($this.hasClass('playing')) {
            		            $('.youtubeSample.playing').removeClass('playing');
                                TFMEX.youtubePlayer.player.stopVideo();
                                TFMEX.youtubePlayer.fadeRoomAudioIn();
    		                } else {
                		        $('.youtubeSample.playing').removeClass('playing');
    		                    $this.addClass('playing');
        		                $.getJSON('http://gdata.youtube.com/feeds/api/videos?callback=?', 
        		                    {
        		                        v: '2',
        		                        alt: 'jsonc',
        		                        q: searchString,
        		                        'max-results': '1'
        		                    },
        		                    function(data) {
        		                        if(data.data.items) {
                                            var params = { allowScriptAccess: "always", bgcolor: "#000000" };
                                            var atts = { id: "tfmexYoutubePlayer" };
                                            if(TFMEX.youtubePlayer.player) {
                                               TFMEX.youtubePlayer.player.cueVideoById(data.data.items[0].id);
                                               TFMEX.youtubePlayer.fadeRoomAudioOut();
                                               TFMEX.youtubePlayer.player.seekTo(data.data.items[0].duration / 4, true);
                                               if(TFMEXyoutubePlayerSampleTimer) { clearTimeout(TFMEXyoutubePlayerSampleTimer); }
                                               TFMEXyoutubePlayerSampleTimer = setTimeout(function() {
                                   		          $('.youtubeSample.playing').removeClass('playing');
                                                  TFMEX.youtubePlayer.player.stopVideo();
                                                  TFMEX.youtubePlayer.fadeRoomAudioIn();
                                               }, 30000);
                                            } else {
                                               swfobject.embedSWF("http://www.youtube.com/v/" + data.data.items[0].id + "?border=0&amp;enablejsapi=1&amp;playerapiid=tfmexYoutubePlayer", "tfmex-ytplayer", "0", "0", "8", null, null, params, atts);
                                               TFMEX.youtubePlayer.fadeRoomAudioOut();
                                               TFMEX.youtubePlayer.player = document.getElementById('tfmexYoutubePlayer');
                                               TFMEXyoutubePlayerStartTimer = setInterval(function() {
                                                   try {
                                                      TFMEX.youtubePlayer.player.seekTo(data.data.items[0].duration / 4, true);
                                                      clearInterval(TFMEXyoutubePlayerStartTimer);
                                                   } catch(e) { }
                                                }, 250);
                                                TFMEXyoutubePlayerSampleTimer = setTimeout(function() {
                                    		        $('.youtubeSample.playing').removeClass('playing');
                                                    TFMEX.youtubePlayer.player.stopVideo();
                                                    TFMEX.youtubePlayer.fadeRoomAudioIn();
                                                }, 30000);
                                            }
        		                        } else {    
                                            $this
                                                .removeClass('playing')
                                                .removeClass('youtubeSample')
                                                .addClass('noYoutubeSample');
        		                            console.log('not found');
        		                        }
        		                    });
        		            }
    		            });
    		    // console.log(artist + ' ' + title);
    		}
    	});
    }
}

TFMEX.showUserProfile = function(userId) {
	TFMEX.roommanager.callback('profile',userId);
	turntable.hideOverlay();
}

TFMEX.tagsOverlayView = function(metadata) {
	var songName = metadata.song,
		artistName = metadata.artist;
	return [
		"div.tfmexModal.tagsOverlay",
		{
			style: {
				"padding-left":0,
				"padding-right":0,
				"padding-bottom":0			 
			}
		},
		[
			"h2",
			"Tags For:"
		],
		[
			"p",
			songName + " by " +artistName
		],
		[
			"div##tags.tt-ext-song-tags"
		],
		[
			"div##metadata.tt-ext-song-metadata"
		],
	]
}

TFMEX.findSongInQueue = function(fileId) {
	for(i in turntable.playlist.songsByFid) {
		if(turntable.playlist.songsByFid[i].fileId === fileId) {
			return $('#playlist .queue .song').eq(i);
		}
	}
}

TFMEX.getXSPF = function(songArray, playlistTitle) {
    var XSPF = '<?xml version="1.0" encoding="UTF-8"?>\n';
    
    XSPF += '<playlist version="1" xmlns="http://xspf.org/ns/0/">\n';
    XSPF += '<title>Exported from Turntable.fm</title>\n';
    
    XSPF += '<trackList>\n';
    $.each(songArray, function(index, value) {
        XSPF += '<track>';
        XSPF += '<creator>' + $('<div/>').text(this.metadata.artist).html() + '</creator>';
        XSPF += '<title>' + $('<div/>').text(this.metadata.song).html() + '</title>';
        if(this.metadata.album) {
            XSPF += '<album>' + $('<div/>').text(this.metadata.album).html() + '</album>';
        }
        if(this.metadata.coverart) {
            XSPF += '<image>' + this.metadata.coverart + '</image>';
            
        }
        XSPF += '<duration>' + this.metadata.length * 1000 + '</duration>';
        XSPF += '</track>\n';
    });
    XSPF += '</trackList>\n';
    
    XSPF += '</playlist>';
    
    return XSPF;
}

TFMEX.turnAway = function(layers) {
    // console.log("turnAway", layers);
    $(layers.headback).css('display', 'none');
    $(layers.headfront).css('display', 'block');
    $(layers.headfront).css('top', 0);
}

TFMEX.turnToward = function(layers) {
    // console.log("turnToward", layers);
    $(layers.headback).css('display', 'block');
    $(layers.headfront).css('display', 'none');
    $(layers.headfront).css('top', 0);
}

$(document).ready(function() {
	var tKeysLength = Object.keys(turntable).length,
		lastPlayedSong = {},
		tagIconsAdded = false;
	TFMEX.room = null;
	TFMEX.user = null;
	TFMEX.roommanager = null;
	TFMEX.geo = {};
	var getTurntableObjects = function(){
		TFMEX.room = null;
		TFMEX.user = null;
		TFMEX.roommanager = null;
//     	TFMEX.geo = {};
	    var dfd = $.Deferred(),
			resolveWhenReady = function() {
			if(window.location.pathname !== "/lobby") {
				// console.log("attempting to resolve");
				// console.log(Object.keys(turntable).length, tKeysLength);
				// console.dir(turntable);
				TFMEX.user = turntable.user;
				for(var o in turntable) {
					if(turntable[o] !== null) {
						for(var o2 in turntable[o]) {
							if(turntable[o][o2] !== null) {
								if(o2 == 'roomInfoHandler') {
									// console.log("currentDj found in: ", o);
									TFMEX.room = turntable[o];
									break;
								}
							}
						}
					}
				}

				if(TFMEX.room && TFMEX.user) {
					for(o in TFMEX.room) {
						if(TFMEX.room[o] !== null) {
							for(o2 in TFMEX.room[o]) {
								if(o2 == 'taken_dj_map') {
									TFMEX.roommanager = TFMEX.room[o]
								}
							}
						}
					}
					if(TFMEX.roommanager) {
					    dfd.resolve();
					} else {
    					setTimeout(function(){
    						resolveWhenReady();
    					}, 250);
					}
				} else {
					setTimeout(function(){
						resolveWhenReady();
					}, 250);
				}
			} else {
				setTimeout(function(){
					resolveWhenReady();
				}, 250);
			}
		};	
		resolveWhenReady();

	    return dfd.promise();
	}
	var locationFeatures = function() {
        TFMEX.geo = {
            concertProvider: 'songkick',
            // concertProvider: 'ticketfly',
            setUserLocation: function(position) {
                TFMEX.geo.position = position;
            },
            findSongkickEvents: function(artistId) {
                queryObj = {
                    'apikey'    : TFMEX_KEYS.songkick
                };
                $.getJSON('http://api.songkick.com/api/3.0/artists/' + artistId + '/calendar.json?jsoncallback=?',
                    queryObj,
                    function(data) {
	                    if(data.resultsPage.totalEntries) {
    	                    $('#tfmExtended .event-container').removeClass('hidden');
	                        $('.event-container.songkick').append('<div class="on-tour songkick"><span class="vertical-text">On Tour</span></div>');
	                        $('#tfmExtended .event-container').removeClass('hidden');
	                        // console.log('found events: ', data.events);
	                        if(TFMEX.geo.position) {
                    			data.resultsPage.results.event.sort(function(a,b) {
                    				var aD=getDistance(a.location),bD=getDistance(b.location);
                    				if(!isNaN(aD) && isNaN(bD)) { return -1; }
                    				if(isNaN(aD) && !isNaN(bD)) { return 1; }
                    			 	return aD==bD?(a.start.datetime==b.start.datetime?0:a.start.datetime<b.start.datetime?-1:1):aD<bD?-1:1;
                    			});
	                        }
	                        if(data.resultsPage.results.event.length && TFMEX.prefs.eventDistance) {
	                            if(getDistance(data.resultsPage.results.event[0].location) > TFMEX.prefs.eventDistance) {
    	                            $('#tfmExtended .event-container').addClass('collapsed');
    	                        } else {
    	                            $('#tfmExtended .event-container').removeClass('collapsed');
    	                        }
	                        } else {
	                            $('#tfmExtended .event-container').addClass('collapsed');
	                        }
	                        $.each(data.resultsPage.results.event, function(i, event) {
                				var tree = TFMEX.songkickEventView(event);
                				if (tree) {
                					// console.log("Creating menu item",menuItem.name,"with tree",tree)
                					$("#tfmExtended .event-container .events").append(util.buildTree(tree))
                				}
	                            // console.log('event', event);
		                        // if(TFMEX.geo.position) { console.log(getDistance(event.venue)); }
	                        });
                        } else {
    	                    $('#tfmExtended .event-container').addClass('hidden');
                        }
                    }
                );
            },
            findSongkickArtist: function(queryObj) {
                if(!queryObj) {
                    queryObj = {
                        'query'     : TFMEX.room.currentSong.metadata.artist,
                        'apikey'    : TFMEX_KEYS.songkick
                    };
                }    
	            $('#songboard').find('.on-tour').remove();
                $('#tfmExtended .event-container').addClass('hidden');
                $("#tfmExtended .event-container .events").empty();
                $.getJSON('http://api.songkick.com/api/3.0/search/artists.json?jsoncallback=?',
                    queryObj,
                    function(data) {
                        var findEvents = function(id) {
                            TFMEX.geo.findSongkickEvents(id);
                        }
	                    if(data.resultsPage.totalEntries) {
	                        $.each(data.resultsPage.results.artist, function(i, artist) {
	                            if(artist.displayName === TFMEX.room.currentSong.metadata.artist) {
	                                findEvents(artist.id);
	                                return false;
	                            }
	                            if(artist.onTourUntil) {
	                                findEvents(artist.id);
	                                return false;
	                            }
	                        });
	                    } else {
	                        $('#tfmExtended .event-container').addClass('hidden');
	                    }
                    }
                )
            },
            findSongkickArtistCanned: function() {
                TFMEX.geo.findSongkickArtist({'query':'Pretty Lights','apikey':TFMEX_KEYS.songkick});
            },
            ticketflyWidgetIsInitialized: false,
            initTicketflyWidget: function() {
                if(!TFMEX.geo.ticketflyWidgetIsInitialized) {
                    TFP.widget.init({
                        //this is your apiKey you obtained in the first step
                        apiKey:TFMEX_KEYS.ticketfly,
                        //optional event handler, fired when the widget opens
                        onWidgetOpening: function() {/* Handler code goes here*/},
                        //optional event handler, fired when the widget closes.
                        //A boolean parameter is passed that indicates whether a sale completed or not.
                        onWidgetClosed: function(saleCompleted) {/* Handler code goes here*/},
                    });
                    TFMEX.geo.ticketflyWidgetIsInitialized = true;
                }
            },
            findTicketflyEvents: function(queryObj) {
                if(!queryObj) {
                    queryObj = {
	                    'orgId'         : 1,
	                    'artistName'    : TFMEX.room.currentSong.metadata.artist,
	                    'tflyTicketd'   : true
	                };
                }
    		    $.getJSON('http://www.ticketfly.com/api/events/upcoming.json?callback=?',
    		                queryObj,
    		                function(data) {
    		                    $('#songboard').find('.on-tour').remove();
    		                    if(data.events.length) {
    		                        TFMEX.geo.initTicketflyWidget();
    		                        $('#songboard').append('<a href="#" class="on-tour"></a>');
    		                        $('#tfmExtended .event-container').removeClass('hidden');
    		                        // console.log('found events: ', data.events);
    		                        if(TFMEX.geo.position) {
                            			data.events.sort(function(a,b) {
                            				var aD=getDistance(a.venue),bD=getDistance(b.venue);
                            			 	return aD==bD?(a.startDate==b.startDate?0:a.startDate<b.startDate?-1:1):aD<bD?-1:1;
                            			});
    		                        }
    		                        $("#tfmExtended .event-container .events").empty();
    		                        $.each(data.events, function(i, event) {
                        				var tree = TFMEX.ticketflyEventView(event);
                        				if (tree) {
                        					// console.log("Creating menu item",menuItem.name,"with tree",tree)
                        					$("#tfmExtended .event-container .events").append(util.buildTree(tree))
                        				}
    		                            // console.log('event', event);
        		                        // if(TFMEX.geo.position) { console.log(getDistance(event.venue)); }
    		                        });
    		                    } else {
    		                        $('#tfmExtended .event-container').addClass('hidden');
    		                        console.log('no events found');
    		                    }
    		                }
    	        );
    		},
    		findTicketflyEventsCanned: function() {
    		    // TFMEX.geo.findTicketflyEvents({'orgId':1, 'artistName':'Of Monsters And Men'});
    		    TFMEX.geo.findTicketflyEvents({'orgId':1, 'artistName':'Gotye'});
    		}
        }
	    if(TFMEX.geo.concertProvider === 'ticketfly') {
    	    var js;
            js = document.createElement('script');
            js.src = "http://api-stage.ticketfly.com/v2/js/tfly-pur-shared.js";
            document.body.appendChild(js);

            js = document.createElement('script');
            js.src = "http://api-stage.ticketfly.com/v2/js/tfly-pur-widget-client.js";
            document.body.appendChild(js);
    		$('#tfmExtended .ticketfly-event').live('click', function(evt) {
    			evt.preventDefault();
    			TFP.widget.show($(evt.target).data().eventId);
    		});
	    }
		var geoSuccess = function(position) {
    	        TFMEX.geo.setUserLocation(position);
		    },
		    geoError = function(error) {
		        TFMEX.geo.position = false;
		    },
		    getDistance = function(venue) {
		        var userCoords = TFMEX.geo.position.coords;
		        var toRad = function(num) { return num * Math.PI / 180; };
		        var lat1 = userCoords.latitude,
		            lon1 = userCoords.longitude,
		            lat2 = parseFloat(venue.lat),
		            lon2 = parseFloat(venue.lng);
                var R = 6371, // km
                    kmToMi = 0.621371192,
                    dLat = toRad(lat2-lat1),
                    dLon = toRad(lon2-lon1);
                var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                        Math.sin(dLon/2) * Math.sin(dLon/2); 
                var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                return R * c * kmToMi;
            };
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(geoSuccess, geoError);
        } else {
          geoError('not supported');
        }
        
        $(".on-tour.songkick").live('click', function(evt) {
    		localStorage.TFMEX = JSON.stringify(TFMEX.prefs);
            evt.preventDefault();
            $(evt.target).closest('.event-container').removeClass('collapsed');
        });
        $(".events-header").live('click', function(evt) {
    		localStorage.TFMEX = JSON.stringify(TFMEX.prefs);
            evt.preventDefault();
            $(evt.target).closest('.event-container').addClass('collapsed');
        });
	};
	locationFeatures();
	var whenTurntableObjectsReady = function(fromRoomChange) {
		localStorage.removeItem("disableTFMEX");
		var now = new Date();
		/*
		console.log("success!");
		console.log(TFMEX.room);
		console.log(TFMEX.user);
		console.log("TFMEX.roommanager", TFMEX.roommanager);
		*/
		
		try {
	    // $("script[href$='turntable.fm.extend.dev.js']").remove();
		// $(window).bind('beforeunload', TFMEX.clearNotifications);
	    
        if (!fromRoomChange) {
			TFMEX.performMigrations()
			$("#tfmExtendedWrap").remove();
			TFMEX.$body.append('<div id="tfmExtendedWrap"><div id="tfmExtended"><div id="tfmex-ytplayer"></div><div class="tag-container closed"><div class="openTags"><img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAS9JREFUeNqkk8FKwzAcxv8t3rsnEDwIgoK5CZ7qm5g32At49jXyCHr2UtCrW49eBBFRYUOXwRTbJvFLsm52y6rFP3xJaZOvv+/fNDLG0H9qyw7R+dUQEwuuMEZg7NP1QIYex25UikFEWmeYJ+66ltan7v7xYdJmYPVAN8MTzBcNAy/7goyODtZMItuD6OyybkQ2j9LbEDlHpJRu72SIwCqFegGCJYmNw3aTpkFZdRGjCnH2d5LFV3Du3Yq5uHvbqSeolICooxyJJ9CqT0qzjWehhcQT3L9INCeFY96RQsQLr8eRNymr/E/NtLGfxjxuAD2/wcT8TqK0oNd3vvyMP2skJRa0kQgaT3nzHKzWZOZNCpgU2FTLYk8/+fq/EKrZ15wEcUpgl9j8UfDVZd8CDAAgHS7xBVF0CwAAAABJRU5ErkJggg==" /><span class="vertical-text">Tags</span></div><div class="black-right-header"><img class="icon" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAS9JREFUeNqkk8FKwzAcxv8t3rsnEDwIgoK5CZ7qm5g32At49jXyCHr2UtCrW49eBBFRYUOXwRTbJvFLsm52y6rFP3xJaZOvv+/fNDLG0H9qyw7R+dUQEwuuMEZg7NP1QIYex25UikFEWmeYJ+66ltan7v7xYdJmYPVAN8MTzBcNAy/7goyODtZMItuD6OyybkQ2j9LbEDlHpJRu72SIwCqFegGCJYmNw3aTpkFZdRGjCnH2d5LFV3Du3Yq5uHvbqSeolICooxyJJ9CqT0qzjWehhcQT3L9INCeFY96RQsQLr8eRNymr/E/NtLGfxjxuAD2/wcT8TqK0oNd3vvyMP2skJRa0kQgaT3nzHKzWZOZNCpgU2FTLYk8/+fq/EKrZ15wEcUpgl9j8UfDVZd8CDAAgHS7xBVF0CwAAAABJRU5ErkJggg==" /><div class="header-text">Tags</div><a class="closeTags">X</a></div><div class="tag-wrap"><ul class="tag-list"></ul><ul class="auto-tag-list"></ul></div></div><div class="settings"><div class="preferences hidden"></div></div><div class="tags hidden"></div><div class="event-container hidden"><div class="events-header">Tour Dates</div><div class="events"></div></div></div></div>');

			var customMenuItems = [
				// { name:"Room users", callback: function(){ showRoomUsers() }, elementId:"tt-ext-room-users-menu-item"},
				{ name:"Extension settings", callback: function(){ showPrefs() }, elementId:"tt-ext-settings-menu-item"},
				{ name:"Export XSPF", callback: function(){ showExport() }, elementId:"tt-ext-export-menu-item"}
			]

			$.each(customMenuItems,function (i,menuItem) {
				var pos = $('#settings-dropdown .option').length - 1;
				// console.log(pos);
				var tree = TFMEX.settingsItemView(menuItem.name,menuItem.callback,menuItem.elementId);
				if (tree) {
					// console.log("Creating menu item",menuItem.name,"with tree",tree)
					$("#settings-dropdown .option:eq(" + pos + ")").before(util.buildTree(tree))
				}
			});
			
			$('#tt-ext-mpd')[0].addEventListener('tt-ext-process-similar-songs',function () {
				//var similarSongs = $('body').data('similarSongs')
				var allSimilarSongs = JSON.parse($('body').attr('tt-ext-similar-songs'))
				//console.debug("allSimilarSongs:",allSimilarSongs)
				var similarToCurrentSong = allSimilarSongs.similarToCurrentSong
				var similarToSongLog = allSimilarSongs.similarToSongLog
				$('#tt-ext-suggestions-link').fadeIn(500)
				if (similarToSongLog.length > 0 || similarToCurrentSong.length > 0) {
					// console.log("Found",similarToCurrentSong.length,"similar songs.")
					$('#tt-ext-suggestions-link').removeClass("tt-ext-link-disabled")
					$('#tt-ext-suggestions-link').attr("title","View suggestions from last.fm")
				} else {
					// console.log("No related songs available for",songMetadata.artist,". Disabling suggestions link.")
					$('#tt-ext-suggestions-link').addClass("tt-ext-link-disabled")
					$('#tt-ext-suggestions-link').attr("title","Sorry, no suggestions are available.")
				}
			});
			$('#tt-ext-mpd')[0].addEventListener('tt-ext-process-remote-song-tags', function() {
			    console.log('remote tags', $('#tt-ext-mpd').first().attr('data-song-tags-remote'));
			});
			$('#tt-ext-suggestions-link').live('click', function() {
					//$('#tt-ext-suggestions-box').dialog()
				var allSimilarSongs = JSON.parse($('body').attr('tt-ext-similar-songs'))
				var similarToCurrentSong = allSimilarSongs.similarToCurrentSong
				var similarToSongLog = allSimilarSongs.similarToSongLog
//				var arrayToUse = similarToSongLog, source = "based on this room's most popular tracks"
//				if (!similarToSongLog || similarToSongLog.length == 0) {
//					arrayToUse = similarToCurrentSong;
//					source = "based on the current song"
//				}
				if (similarToSongLog.length > 0 || similarToCurrentSong.length > 0) {
					var containers = {}
					var suggestionsMarkup = util.buildTree(TFMEX.suggestionsOverlayView(),containers)

					var arraysToUse = [{containerName: "similarToCurrentSong",contents: similarToCurrentSong},
									   {containerName: "similarToSongLog",contents: similarToSongLog}]

					$.each(arraysToUse,function() {
						var songContainer = containers[this.containerName];
						$.each(this.contents,function() {
							var tree = TFMEX.suggestedSongView(this)
							var songMarkup = util.buildTree(tree)
							$(songContainer).append(songMarkup)
						});
					});

					var tabOptions = { disabled: [] }
					//TODO: This order is specific, and is too tightly bound to the TFMEX.suggestionsOverlayView() function.
					$.each([similarToCurrentSong,similarToSongLog], function(i) {
						if (this.length == 0) tabOptions.disabled.push(i)
					});

					//we select the tab with the largest number of entries so that the layout is correct.
					var indexOfLongestTab = similarToCurrentSong.length >= similarToSongLog.length ? 0 : 1
					tabOptions.selected = indexOfLongestTab
					var $tabs = $(suggestionsMarkup).find("#tt-ext-suggestion-tabs").tabs(tabOptions)

					//then show the overlay, which does the layout calculations
					TFMEX.showOverlay(suggestionsMarkup)

					//then we flip back to the first tab, unless its disabled.
					var firstTabDisabled = tabOptions.disabled.indexOf(0) != -1
					if (!firstTabDisabled) {
						$tabs.tabs("select",0)
					}
				}
			});
			$('.tt-ext-suggested-song .tt-ext-search-link').live('click', function(evt) {
					var $searchBox = $('form.input.songSearch input')
					if ($searchBox.length == 0) {
						console.warn("Couldn't find search box")
					}
					else {
						$searchBox.val($(evt.target).data('query'))
						$('form.input.songSearch').trigger('submit')
						turntable.hideOverlay()
					}

			});
			$('.evtToggleFan').live('click', function(evt) {
			   TFMEX.toggleFan($(evt.target)) ;
			});
   			$('.evtBootUser').live('click', function(evt) {
   			   TFMEX.bootUser($(evt.target)) ;
   			});
   			$('#song-metadata-update').live('click', function(evt) {
   			    var $form = $(evt.target).closest('form'),
   			        song = {};
   			        
       			song.fileId = $form.data('file-id'),
   			    song.metadata = {};
   			    song.metadata.artist = $form.find('#song-metadata-artist-value').val();
   			    song.metadata.song = $form.find('#song-metadata-song-value').val();
   			    song.metadata.album = $form.find('#song-metadata-album-value').val();
   			    song.metadata.genre = $form.find('#song-metadata-genre-value').val();
   			    song.metadata.length = parseInt($form.find('#song-metadata-length-value').val(), 10);
   			    song.metadata.bitrate = parseInt($form.find('#song-metadata-bitrate-value').val(), 10);
   			    turntable.playlist.removeFile(song.fileId);
   			    turntable.playlist.addSong(song);
   			});
		}
		
		TFMEX.lastUserAction = {};
        $.each(TFMEX.room.users, function(userId, value) {
            TFMEX.lastUserAction[userId] = now;
        });
        
		$("*").undelegate(".TFMEX")
		
		$("#tfmExtended .tag-wrap").delegate(".tag-inactive", "click.TFMEX", function() {
			var i,
				$this = $(this),
				$songList = null,
				songs = [],
				tag = $this.data("tag"),
				genreTag = $this.data("genre-tag"),
				lengthTag = $this.data("length-tag"),
				bitrateTag = $this.data("bitrate-tag"),
				metadata = null,
				taggedSongs = [],
				numTaggedSongs = 0,
				missingSongs = [],
				songFilterList = {};
			
			TFMEX.updateQueueTagIcons();
			if(tag === "___untagged___") {
				songs = TFMEX.songsUntagged;
			} else {
			    if(tag) {
				    songs = TFMEX.tagSongs[tag];
			    } else if(genreTag) {
			        songs = TFMEX.genreSongs[genreTag];
			    } else if(lengthTag) {
			        songs = TFMEX.lengthSongs[lengthTag];
			    } else if(bitrateTag) {
			        songs = TFMEX.bitrateSongs[bitrateTag];
			    }
			}
			$('#playlist .firstInactive').removeClass('firstInactive');
			if(tag === "___allsongs___") {
				// $('#playlist .song').show().removeClass('inactive');
				$this.closest('.tag-wrap').find('.tag-active').removeClass('tag-active').addClass('tag-inactive');
				$('#tfmExtended .all-tags').addClass('tag-active');
				$('#tfmExtended .all-tags').removeClass('tag-inactive');
				turntable.playlist.queue.clearFilter();
			} else {
				for(i in turntable.playlist.songsByFid) {
				    if(turntable.playlist.songsByFid.hasOwnProperty(i)) {
				        songFilterList[turntable.playlist.songsByFid[i]] = false;
				    }
				}
				for(i in songs) {
					if(songs.hasOwnProperty(i)) {
						songFilterList[songs[i]] = true;
					}
				}
				turntable.playlist.queue.setFilter(songFilterList);
				$('#playlist .song.inactive').first().addClass('firstInactive').show();
				if(missingSongs.length) {
					$.each(missingSongs, function(i, missingSong) {
						// console.log("missing song:", missingSong);
						delete TFMEX.songTags[missingSong];
						TFMEX.refreshTagSongs();
					});
				}
				$this.removeClass("tag-inactive");
				$this.closest('.tag-wrap').find('.tag-active').removeClass('tag-active').addClass('tag-inactive');
				$this.addClass("tag-active");
				$('#tfmExtended .all-tags').removeClass('tag-active');
				$('#tfmExtended .all-tags').addClass('tag-inactive');
			}
			$this.closest('.tag-group').addClass('group-active');
		});
		
    	$("#tfmExtended .tag-wrap").delegate(".tag-group .title", "click.TFMEX", function() {
    	    $(this).closest('.tag-group').toggleClass('collapsed');
    	});

		$('#tfmExtended .tag-wrap').delegate('.move-top', 'click.TFMEX', function() {
			TFMEX.findSongInQueue($(this).data("song-id")).find('.goTop').click();
			return false;
		});

		$('#tfmExtended .tag-wrap').delegate('.tag-active', 'click.TFMEX', function() {
			var $this = $(this);
			$('#playlist .firstInactive').removeClass('firstInactive');
			$('#playlist .song').removeClass('inactive').show();
			$this.removeClass("tag-active");
			$this.addClass("tag-inactive");
			$('#tfmExtended .all-tags').addClass('tag-active');
			$('#tfmExtended .all-tags').removeClass('tag-inactive');
			turntable.playlist.queue.clearFilter();
			$this.closest('.tag-group').removeClass('group-active');
		});
		
		$('#tfmExtended').delegate('.closeTags', 'click.TFMEX', function() {
			$('#tfmExtended .tag-container').animate({
				right:'-185px'
			}, function() {
				$('tfmExtended .tag-container').addClass('closed');
			});
			$('#tfmExtended .openTags').animate({
				left:'-27px'
			});
			TFMEX.prefs.tagsClosed = true;
			localStorage.TFMEX = JSON.stringify(TFMEX.prefs);
			$('#playlist .song .inactive').removeClass('inactive').show();
			$('#playlist .song .firstInactive').removeClass('firstInactive');
			$('#tfmEX .tag-wrap .tag-active').removeClass('tag-active').addClass('tag-inactive');
		});

		$('#tfmExtended').delegate('.openTags', 'click.TFMEX', function() {
			$('tfmExtended .tag-container').removeClass('closed');
			$('#tfmExtended .tag-container').animate({
				right:'0px'
			});
			$('#tfmExtended .openTags').animate({
				left:'185px'
			});
			TFMEX.prefs.tagsClosed = false;
			localStorage.TFMEX = JSON.stringify(TFMEX.prefs);
		});
		
		
		$('#songs').on('hover', '.song', function() {
		    
	    });
		
		$('#songs').delegate('.tag', 'click.TFMEX', function() {
			var containers = {},
				fileId = $(this).data('file-id'),
				tags = TFMEX.songTags[fileId],
				song = turntable.playlist.songsByFid[fileId],
				metadata = song.metadata,
				markup = util.buildTree(TFMEX.tagsOverlayView(metadata),containers),
				tagsContainer = containers.tags,
				metadataContainer = containers.metadata,
				tagName;
			if(typeof(tags) === "undefined") {
				tags = [];
				TFMEX.songTags[fileId] = tags;
			}
			$.each(tags,function(index, tag) {
				var tree = TFMEX.tagView(tag, fileId);
				var tagMarkup = util.buildTree(tree);
				$(tagsContainer).append(tagMarkup);
			});
			
			$(tagsContainer).append(util.buildTree(TFMEX.tagAdd(fileId)));
			$(metadataContainer).append(util.buildTree(TFMEX.metadataDisplay(song)));

			TFMEX.showOverlay(markup);
			$('#new-song-tag-value').focus();

			$('#new-song-tag-value').on('keypress', function(evt) {
    			var $newSongTag = $('#new-song-tag-value'),
    				$newSongRow = $newSongTag.closest('div'),
    				tag = $newSongTag.val(),
    				fileId = $newSongTag.data('song-id');
    		    if(evt.keyCode === 13) {
            		evt.preventDefault();
            		evt.stopPropagation();
        			TFMEX.addTagToSong(tag, fileId);
        			$newSongRow.before(util.buildTree(TFMEX.tagView(tag, fileId)));
        			$newSongTag.val("");
        		}
    		});

    		$('.tt-ext-song-tags').on('click', '.remove-tag', function(evt) {
    			var $this = $(this),
    				$tagWrapper = $this.closest('.tt-ext-song-tag');
    				songId = $tagWrapper.data('song-id'),
    				tag = $tagWrapper.data('tag');
    			TFMEX.removeTagFromSong(tag, songId);
    			$tagWrapper.remove();
    			return false;
    		});
    		
		});

		$('body').delegate('.queue', 'click.TFMEX', function() {
		    TFMEX.refreshTagSongs();
			TFMEX.updateQueueTagIcons();
		});
		
		$('#playlist').delegate('.remove', 'click.TFMEX', function() {
		    TFMEX.refreshTagSongs();
			TFMEX.updateQueueTagIcons();
		});

		$('document').keypress(function(evt) {
			if (evt.keyCode === 27) {
				evt.preventDefault();
				$('#overlay .close-x').click();
			}
		});
		$("#tfmExtended").delegate('#getTagsFromLastFm', 'click.TFMEX', function(evt) {
			getSongTagsFromLastFm();	
		});
		function enableDesktopNotifications() {
		    if(window.webkitNotifications && window.webkitNotifications.checkPermission() != 0){
		        TFMEX.$body.bind('click.enableDesktopNotify', function() {
					window.webkitNotifications.requestPermission(function() {
		            	desktopAlert({
			                title: "",
			                image: "",
			                body: "Desktop notifications enabled.",
			                timeout: 1
		            	});
		            	TFMEX.$body.unbind('click.enableDesktopNotify')
					});
		        });
		    }
		}
		function untrickify (b) {
			if (b) {
				 var c = function(){}
			     for (var a in b) {
			          if (typeof b[a] == "function") {
						b[a].toString = c.toString;
			         }
			     }
			 }
		}
		if (!fromRoomChange) {
			untrickify(window.turntable);
			enableDesktopNotifications();
		}
	    var songMetadata = {},
			lastSongMetadata = {},
			lastRoomUrl = "",
	        songVotes = [],
	        voteMap = {
	            "up": "Awesome",
	            "down": "Lame"
	        },
		listenerChangeMap = {
		    "deregistered": "left",
		    "registered": "entered"
		},
		djChangeMap = {
		    "add_dj": "just stepped up to",
		    "rem_dj": "just stepped down from"
		},
		highlightMatchingTracks = function(songToMatch, $songQueue) {
			var normalizeText = function(incomingText) {
				var parsedText, alphaNumericText;

				parsedText = incomingText.toLowerCase();
				alphaNumericText = parsedText.replace(/[^a-zA-Z 0-9]+/g,'');
				if(alphaNumericText === "") {
					return parsedText;
				} else {
					return alphaNumericText;
				}
			}
			try {
				for(j in turntable.playlist.songsByFid) {
					playlistSong = turntable.playlist.songsByFid[j];
					if(songToMatch._id === playlistSong.fileId ||
						(normalizeText(songToMatch.metadata.artist) === normalizeText(playlistSong.metadata.artist)
						 && normalizeText(songToMatch.metadata.song) === normalizeText(playlistSong.metadata.song))) {
						$($songQueue[j]).addClass("matchesRecentlyPlayedExactly");
					} else if(normalizeText(songToMatch.metadata.artist) === normalizeText(playlistSong.metadata.artist)) {
						$($songQueue[j]).addClass("matchesRecentlyPlayedArtist");
					} else if(normalizeText(songToMatch.metadata.song) === normalizeText(playlistSong.metadata.song)) {
						$($songQueue[j]).addClass("matchesRecentlyPlayedSongTitle");
					}
				}
			} catch(e) { console.error("error highlighting tracks", e.stack); }
		},
		getSongTagsFromLastFm = function() {
			var i = 0,
				song = {};
			$('#tfmExtended .tag-list').html("Loading tags from last.fm, please be patient...");
			for(i in turntable.playlist.songsByFid) {
				try {
					song = turntable.playlist.songsByFid[i];
					// console.log("TFMEX.songTags[song.fileId]", TFMEX.songTags[song.fileId]);
					if(typeof(TFMEX.songTags[song.fileId]) === "undefined") {
						$("body").attr("data-temp-song-obj", JSON.stringify(song));
						dispatchEventToContentScript('tt-ext-get-song-tags');
					}
				} catch(e) {console.error("error getting song tags", e.stack);}
			}
		},
		getRoomInfo = function() {
			// console.log("in getRoomInfo()");
			var messageFunc = getSendMessageFunction()
			try {
				// console.log("messageFunctionName", messageFunctionName);

				messageFunc({
					api: "room.info",
					roomid: TFMEX.room.roomId
				}, function(info){
					//console.debug("Got room.info with songlog",info.room.metadata.songlog)
					var song, $songQueue;
					$songQueue = $("#right-panel .songlist .song");
					$songQueue.removeClass("matchesRecentlyPlayedExactly");
					$songQueue.removeClass("matchesRecentlyPlayedArtist");
					$songQueue.removeClass("matchesRecentlyPlayedSongTitle");
					TFMEX.songlog = info.room.metadata.songlog;
					for(var i in info.room.metadata.songlog) {
						song = info.room.metadata.songlog[i];
						highlightMatchingTracks(song, $songQueue);
						/* Log these into a local indexedDB
						startTime = song.starttime;
						delete song.starttime;
						*/
						// console.log(startTime, song);
					}    
					if (TFMEX.songlog) {
						//console.debug("Setting data-current-song-log to",TFMEX.songlog,new Error().stack)
						TFMEX.$body.attr("data-current-song-log",JSON.stringify(TFMEX.songlog))
					} else {
						TFMEX.$body.attr("data-current-song-log","[]")
					}
					raiseNewRoomInfoEvent();
					TFMEX.$body.trigger("ttfm-got-room-info")
				});
			} catch(e) {console.error("Exception occured in getRoomInfo",e.stack)}
		},
		attachListeners = function() {
			var numMessageListeners = 0;
			// numSoundstartListeners = 0;
			// console.error("in attachListeners");
			updatePrefs();
	        var intervalID = window.setInterval(function() {
				// console.log("window.turntable.eventListeners.message.length", window.turntable.eventListeners.message.length);
	            if(window.turntable.eventListeners.message.length) {
					// console.log("attaching listeners");
					getRoomInfo();
					
					for(var eventListener in window.turntable.eventListeners.message) {
						if(window.turntable.eventListeners.message[eventListener] && window.turntable.eventListeners.message[eventListener].toString() !== undefined) {
							numMessageListeners += 1;
						}
					}
					/*
					for(var eventListener in window.turntable.eventListeners.soundstart) {
						if(window.turntable.eventListeners.soundstart[eventListener] && window.turntable.eventListeners.soundstart[eventListener].toString() !== undefined) {
							numSoundstartListeners += 1;
						}
					}
					*/
					if(!numMessageListeners) {
	                	window.turntable.addEventListener("message", extensionEventListener);
					}
					/*
					if(!numSoundstartListeners) {
	                	window.turntable.addEventListener("soundstart", extensionEventListener);
					}
					*/
	                window.clearInterval(intervalID);
					if (!TFMEX.checkForChangeIntervalID) {
						TFMEX.checkForChangeIntervalID = setInterval(checkForChange,1000);
					}
	            }
	        }, 250);
		},
		checkForChange = function() {
			var tempSongMetadata = null,
				i = 0;
				// $songTags = $('#tfmExtended .tags div');
			try {
				lastSongMetadata = songMetadata;

				var updateCurrentSongAndDispatchEvents;
				var boundHandler = function() {updateCurrentSongAndDispatchEvents(true)};
				var needToUpdateCurrentSongAndDispatchEvents = true

				// the new song gets picked up before the room change!
				updateCurrentSongAndDispatchEvents = function(fromRoomChange) {
					//console.debug("In updateCurrentSongAndDispatchEvents. fromRoomChange:",fromRoomChange)
					if (fromRoomChange) {
						TFMEX.$body.unbind("ttfm-got-room-info",boundHandler)
						// console.debug("Unbound the ttfm-got-room-info handler")
					}
					if(TFMEX.room && TFMEX.room.currentSong) {
						songMetadata = TFMEX.room.currentSong.metadata;
						if((songMetadata.song !== lastSongMetadata.song && songMetadata.artist !== lastSongMetadata.artist)) {
							// console.log("Found a change!");
							lastSongMetadata = songMetadata;
							TFMEX.$body.attr("data-current-song-obj", JSON.stringify(songMetadata));
							$('#tt-ext-suggestions-link').fadeOut(250)
							updateNowPlaying(songMetadata);
							TFMEX.youtubePlayer.initialize()
							raiseNewSongEvent();
							if(TFMEX_KEYS) {
    							if(TFMEX.geo.concertProvider === "ticketfly") {
    							    TFMEX.geo.findTicketflyEvents();
    							} else {
    							    if (TFMEX.prefs["enableSongkick"]) {
        							    $('#tfmExtended .event-container').addClass('songkick');
            							TFMEX.geo.findSongkickArtist();
            						}
    							}
							}
						}
					}
				};

				if(lastRoomUrl !== window.location.href) {
					if(lastRoomUrl !== "") {
						TFMEX.$body.bind("ttfm-got-room-info", boundHandler)
						//console.debug("setting needToUpdateCurrentSongAndDispatchEvents to false")
						needToUpdateCurrentSongAndDispatchEvents = false
						$.when(getTurntableObjects()).then(function() {whenTurntableObjectsReady(true)});
					}
					lastRoomUrl = window.location.href;
				}
				/*
				$songTags.each(function() {
					var $this = $(this);
					TFMEX.songTags[$this.data('song')] = $this.data('tags');
					$this.remove();
					i += 1;
				});
				if(i) {
					localStorage.TFMEXsongTags = JSON.stringify(TFMEX.songTags);
					TFMEX.refreshTagSongs();
				}
				TFMEX.updateQueueTagIcons();
				*/
				if(!tagIconsAdded) {
					TFMEX.updateQueueTagIcons();
					tagIconsAdded = true;
				}
				if (needToUpdateCurrentSongAndDispatchEvents) {
					// If needToXXXX is false, this will be fired in the event handler assigned above.
					updateCurrentSongAndDispatchEvents(false)
				}
			} catch(e) {
				console.warn("Got an error whilst checking for changes",e.stack)
			}
		},
		refreshTagSongs = function() {
			var songId, song, i, j, tag, sortedTags = [], activeTag = "", tags = [], numTotalSongs = 0;
			for(i in turntable.playlist.songsByFid) { numTotalSongs++; }
			TFMEX.tagSongs = {};
			// console.log("TFMEX.songTags", TFMEX.songTags);
			for(songId in TFMEX.songTags) {
				if(TFMEX.songTags.hasOwnProperty(songId)) {
					// console.log("Trimming songs no longer in the queue")
					tags = TFMEX.songTags[songId];
					if(typeof(tags) === "object") { // make sure it's not string or undefined
						for(j in tags) {
							if(tags.hasOwnProperty(j)) {
								tag = tags[j];
								if(typeof(TFMEX.tagSongs[tag]) === "undefined") {
									TFMEX.tagSongs[tag] = [];
								}
								TFMEX.tagSongs[tag].push(songId);
							}
						}
					}
				}
			}
			TFMEX.updateQueueTagIcons();
			if($("#tfmExtended .tag-wrap .tag-active").length) {
				activeTag = $("#tfmExtended .tag-wrap .tag-active").first().data("tag");
			}
			$("#tfmExtended .tag-list").html("");
			sortAndDisplayTags(TFMEX.tagSongs, 'data-tag');
			$("#tfmExtended .tag-list").append('<li data-tag="___untagged___" class="tag-inactive">Untagged Songs (' + TFMEX.songsUntagged.length + ')</li>');
			$("#tfmExtended .tag-list").append('<li data-tag="___allsongs___" class="all-tags tag-inactive">All Songs (' + numTotalSongs + ')</li>');
			$("#tfmExtended .tag-list").append('<li>-------------------------</li>');
			if(activeTag) {
				try {
					$('#tfmExtended .tag-wrap li[data-tag="' + activeTag + '"]').removeClass('tag-inactive').addClass('tag-active');
				} catch(e) { console.error(e.stack) }
			} else {
				$('#tfmExtended .all-tags').addClass('tag-active');
				$('#tfmExtended .all-tags').removeClass('tag-inactive');
			}
		},
		setAutoTags = function() {
		    var numTotalSongs = 0;
        	for(i in turntable.playlist.songsByFid) { numTotalSongs++; }
		    if(numTotalSongs && !TFMEX.autoTagsInitialized) {
		        TFMEX.autoTagsInitialized = true;
                TFMEX.bitrateSongs = {};
                TFMEX.lengthSongs = {};
                TFMEX.genreSongs = {};
    			for(i in turntable.playlist.songsByFid) {
    			    song = turntable.playlist.songsByFid[i];
    			    if(song.metadata) {
        			    if(song.metadata.bitrate) {
        			        if(song.metadata.bitrate === 320) {
        			            if(!TFMEX.bitrateSongs['320k']) {
        			                TFMEX.bitrateSongs['320k'] = [];
        			            }
        			            TFMEX.bitrateSongs['320k'].push(song.fileId);
        			        }
        			        if(song.metadata.bitrate < 320 && song.metadata.bitrate >= 256) {
        			            if(!TFMEX.bitrateSongs['256k-319k']) {
        			                TFMEX.bitrateSongs['256k-319k'] = [];
        			            }
        			            TFMEX.bitrateSongs['256k-319k'].push(song.fileId);
        			        }
        			        if(song.metadata.bitrate < 256 && song.metadata.bitrate >= 192) {
        			            if(!TFMEX.bitrateSongs['192k-255k']) {
        			                TFMEX.bitrateSongs['192k-255k'] = [];
        			            }
        			            TFMEX.bitrateSongs['192k-255k'].push(song.fileId);
        			        }
        			        if(song.metadata.bitrate < 192 && song.metadata.bitrate > 128) {
        			            if(!TFMEX.bitrateSongs['128k-191k']) {
        			                TFMEX.bitrateSongs['128k-191k'] = [];
        			            }
        			            TFMEX.bitrateSongs['128k-191k'].push(song.fileId);
        			        }
        			        if(song.metadata.bitrate === 128) {
        			            if(!TFMEX.bitrateSongs['128k']) {
        			                TFMEX.bitrateSongs['128k'] = [];
        			            }
        			            TFMEX.bitrateSongs['128k'].push(song.fileId);
        			        }
        			        if(song.metadata.bitrate < 128) {
        			            if(!TFMEX.bitrateSongs['<128k']) {
        			                TFMEX.bitrateSongs['<128k'] = [];
        			            }
        			            TFMEX.bitrateSongs['<128k'].push(song.fileId);
        			        }
        			    }
        			    if(song.metadata.length) {
        			        if(song.metadata.length < 60) {
        			            if(!TFMEX.lengthSongs['under 1:00']) {
        			                TFMEX.lengthSongs['under 1:00'] = [];
        			            }
        			            TFMEX.lengthSongs['under 1:00'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 60 && song.metadata.length < 120) {
        			            if(!TFMEX.lengthSongs['1:00 - 1:59']) {
        			                TFMEX.lengthSongs['1:00 - 1:59'] = [];
        			            }
        			            TFMEX.lengthSongs['1:00 - 1:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 120 && song.metadata.length < 180) {
        			            if(!TFMEX.lengthSongs['2:00 - 2:59']) {
        			                TFMEX.lengthSongs['2:00 - 2:59'] = [];
        			            }
        			            TFMEX.lengthSongs['2:00 - 2:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 180 && song.metadata.length < 240) {
        			            if(!TFMEX.lengthSongs['3:00 - 3:59']) {
        			                TFMEX.lengthSongs['3:00 - 3:59'] = [];
        			            }
        			            TFMEX.lengthSongs['3:00 - 3:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 240 && song.metadata.length < 300) {
        			            if(!TFMEX.lengthSongs['4:00 - 4:59']) {
        			                TFMEX.lengthSongs['4:00 - 4:59'] = [];
        			            }
        			            TFMEX.lengthSongs['4:00 - 4:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 300 && song.metadata.length < 360) {
        			            if(!TFMEX.lengthSongs['5:00 - 5:59']) {
        			                TFMEX.lengthSongs['5:00 - 5:59'] = [];
        			            }
        			            TFMEX.lengthSongs['5:00 - 5:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 360 && song.metadata.length < 420) {
        			            if(!TFMEX.lengthSongs['6:00 - 6:59']) {
        			                TFMEX.lengthSongs['6:00 - 6:59'] = [];
        			            }
        			            TFMEX.lengthSongs['6:00 - 6:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 420 && song.metadata.length < 480) {
        			            if(!TFMEX.lengthSongs['7:00 - 7:59']) {
        			                TFMEX.lengthSongs['7:00 - 7:59'] = [];
        			            }
        			            TFMEX.lengthSongs['7:00 - 7:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 480 && song.metadata.length < 540) {
        			            if(!TFMEX.lengthSongs['8:00 - 8:59']) {
        			                TFMEX.lengthSongs['8:00 - 8:59'] = [];
        			            }
        			            TFMEX.lengthSongs['8:00 - 8:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length >= 540 && song.metadata.length < 600) {
        			            if(!TFMEX.lengthSongs['9:00 - 9:59']) {
        			                TFMEX.lengthSongs['9:00 - 9:59'] = [];
        			            }
        			            TFMEX.lengthSongs['9:00 - 9:59'].push(song.fileId);
        			        }
        			        if(song.metadata.length > 600) {
        			            if(!TFMEX.lengthSongs['over 9:59']) {
        			                TFMEX.lengthSongs['over 9:59'] = [];
        			            }
        			            TFMEX.lengthSongs['over 9:59'].push(song.fileId);
        			        }
        			    }
        			    if(song.metadata.genre) {
        			        if(!TFMEX.genreSongs[song.metadata.genre]) {
        			            TFMEX.genreSongs[song.metadata.genre] = [];
        			        }
        			        TFMEX.genreSongs[song.metadata.genre].push(song.fileId);
        			        // console.log('TFMEX.genreSongs[' + song.metadata.genre + ']', TFMEX.genreSongs[song.metadata.genre]);
        			    }
        			}
    			}
    			
    			sortAndDisplayTags(TFMEX.lengthSongs, 'length-tag', 'auto-tag-list', 'Length');
    			sortAndDisplayTags(TFMEX.genreSongs, 'genre-tag', 'auto-tag-list', 'Genre');
    			// sortAndDisplayTags(TFMEX.bitrateSongs, 'bitrate-tag', 'auto-tag-list', 'Bitrate');
		    }
		},
		sortAndDisplayTags = function(tags, dataAttribute, targetList, groupTitle) {
			var sortedTags = [], tag, htmlString = '';
			if(!targetList) {
			    targetList = 'tag-list';
			}
			for(tag in tags) {
				if(tags.hasOwnProperty(tag)) {
					sortedTags.push(tag);
				}
			}
			sortedTags.sort(function(a,b) {
				var al=a.toLowerCase(),bl=b.toLowerCase();
			 	return al==bl?(a==b?0:a<b?-1:1):al<bl?-1:1;
			});
			if(groupTitle) {
			    htmlString = '<li class="tag-group collapsed"><div class="title"><span class="plus">+</span><span class="minus">-</span>' + groupTitle + '</div>';
    			htmlString += '<ul class="' + dataAttribute + '-group">';
				$("#tfmExtended ." + targetList).append(htmlString);
			}
			for(i in sortedTags) {
				tag = sortedTags[i];
				if(tags.hasOwnProperty(tag)) {
				    htmlString = '<li ';
				    htmlString += (dataAttribute && dataAttribute!=='data-tag')?'data-'+dataAttribute:'data-tag';
				    htmlString += '="' + tag +'" class="tag-inactive">' + tag + ' (' + tags[tag].length + ')</li>';
				    if(groupTitle) {
					    $("#tfmExtended ." + targetList + ' .' + dataAttribute + '-group').append(htmlString);
				    } else {
    					$("#tfmExtended ." + targetList).append(htmlString);
				    }
				}
			}
			if(groupTitle) {
    			htmlString += '</ul>';
        		htmlString += '</li>';
			}
		},
		populateTagsColdStart = function() {
			$('#tfmExtended .tag-list').html('Looks like you don\'t have any tags in your collection. Add tags by clicking on the tag icons in your queue.');
		},
		updatePrefs = function() {
			// console.log("TFMEX.prefs", TFMEX.prefs);
			var preferenceSettings = localStorage.getItem("TFMEX"),
				songTags = localStorage.getItem("TFMEXsongTags");
			if(preferenceSettings) {
			    preferenceSettings = JSON.parse(preferenceSettings);
			    $.extend(TFMEX.prefs, preferenceSettings);
			    preferenceSettings = TFMEX.prefs;
			} else {
			    preferenceSettings = TFMEX.prefs;
			}
			
			if(songTags) {
				TFMEX.songTags = JSON.parse(songTags);
				refreshTagSongs();
			} else {
				populateTagsColdStart();
			}
			
			var lastFmToken = localStorage["lastfm-session-token"]
			if(!lastFmToken || lastFmToken === 'null') {
				TFMEX.prefs.enableScrobbling = false //this happens if the user cancels the auth
			}
			if(!TFMEX.prefs.tagsClosed) {
				$('#tfmExtended .tag-container').removeClass('closed');
			}
			//save them back - this way any new defaults are saved
			localStorage.TFMEX = JSON.stringify(TFMEX.prefs);
		},
		showRoomUsers = function() {
			var containers = {},
			    markup = util.buildTree(TFMEX.roomUsersView(),containers),
			    $usersContainer = $(containers.users),
			    sortedUsers = [];
			TFMEX.userVotes = {};
			
			$.each(TFMEX.votelog, function(index, user) {
    			TFMEX.userVotes[this[0]] = this[1];
			});
			$.each(TFMEX.room.users, function(index, user) {
			    sortedUsers.push(user);
			});
			
			sortedUsers.sort(function(a,b) {
				var al=a.name.toLowerCase(),bl=b.name.toLowerCase();
			 	return al==bl?(a==b?0:a<b?-1:1):al<bl?-1:1;
			});
			$.each(sortedUsers,function(index, user) {
				var tree = TFMEX.roomUserView(user)
				var userMarkup = util.buildTree(tree)
				$usersContainer.append(userMarkup)
			})
			
			TFMEX.showOverlay(markup)
		}
		showExport = function() {
            var markup = util.buildTree(TFMEX.exportView(turntable.hideOverlay));

    		$("*").undelegate(".TFMEX_EXPORT")
            TFMEX.showOverlay(markup)
			$('#tt-ex-export-queue').on('click.TFMEX_EXPORT', function(evt) {
    			evt.preventDefault();
    			var xspfText = TFMEX.getXSPF(turntable.playlist.songsByFid);
    			$('#tt-ex-export').val(xspfText).select();
			});
			$('#tt-ex-export-recent').on('click.TFMEX_EXPORT', function(evt) {
			    evt.preventDefault();
    			$('#tt-ex-export').val(TFMEX.getXSPF(TFMEX.songlog)).select();
			});
			$('#tt-ex-export-save').on('click.TFMEX_EXPORT', function(evt) {
    			evt.preventDefault();
    			var blob = new Blob([$('#tt-ex-export').val()], {"type":"application/xspf+xml;charset=UTF-8"});
                saveAs(blob, $("#tt-ex-export-filename").val());
			});
		},
		showPrefs = function() {
			var markup = util.buildTree(TFMEX.preferencesView(turntable.hideOverlay,this.savePrefs))
			var $markup = $(markup)
			
			updatePrefs();
						
			for (var prefName in TFMEX.prefs) {
	            if (TFMEX.prefs.hasOwnProperty(prefName)) {
	                $markup.find('input[data-tfmex-pref=' + prefName + ']')
	                    .prop('checked', TFMEX.prefs[prefName])
	            }
	        }
	        
	        $markup.find('#chatFiltersValue').val(TFMEX.prefs.chatFilters.join(","));
	        $markup.find('#tt-ext-event-distance').val(TFMEX.prefs.eventDistance);
			
			if (TFMEX.prefs["enableScrobbling"]) {
				$markup.find('#tt-ext-enable-scrobbling').prop("checked",true)
			}

			if (TFMEX.prefs["enableSongkick"]) {
				$markup.find('#tt-ext-enable-songkick').prop("checked",true)
			}
			
			TFMEX.showOverlay(markup)
		},
		savePrefs = function() {
			var oldEnableScrobblingValue = TFMEX.prefs["enableScrobbling"]
			
			var prefsToSave = ["showChat","filteredChat","showSong","showVote","showDJChanges","showListenerChanges","tagsClosed","enableSongkick"],
			    prefValsToSave = ["chatFilters"],
			    prefSelectValsToSave = ["eventDistance"];
			for (var i in prefsToSave) {
				var prefName = prefsToSave[i]
	            if (TFMEX.prefs.hasOwnProperty(prefName)) {
					// console.debug("Processing pref",prefName)
					var chkBox = $('input[data-tfmex-pref=' + prefName + ']')
					var val = chkBox.is(':checked')
					// console.debug("Setting pref",prefName,"to",val)
					TFMEX.prefs[prefName] = val;
				}
	        }    
			for (var i in prefValsToSave) {
				var prefVal = prefValsToSave[i];
				//console.debug("prefVal:",prefVal);
	            if (TFMEX.prefs.hasOwnProperty(prefVal)) {
					var txtBox = $('input[data-tfmex-pref=' + prefVal + ']');
					    filters = [];
					if(txtBox) {
					    filters = txtBox.val().split(",");
					    $.each(filters, function(index, value) {
					        filters[index] = $.trim(value);
					    });
					}
					// console.debug("Setting pref",prefVal,"to",filters)
					TFMEX.prefs[prefVal] = filters;
				}
	        }
	        $.each(prefSelectValsToSave, function(i) {
	            var prefName = prefSelectValsToSave[i],
	                selectBox = $('select[data-tfmex-pref=' + prefName + ']');
	            TFMEX.prefs[prefName] = selectBox.val();
	        });
		
			var enableScrobbling = $('#tt-ext-enable-scrobbling').prop('checked')			
			$('.modal .buttons .submit').click();
						
			if (!oldEnableScrobblingValue && enableScrobbling) {
				turntable.showAlert("In order to enable last.fm scrobbling, you will now be taken to last.fm to authorize Turntable Extended to scrobble tracks on your behalf.", function() {
					//console.debug("savePrefs: User has selected to enable scrobbling, dispatching last.fm auth event")
					dispatchEventToContentScript('tt-ext-need-lastfm-auth');
				})
			}
			
			if(!TFMEX.prefs["enableSongkick"]) { $('#tfmExtended .event-container').addClass('hidden'); }
			if(!JSON.parse(localStorage.TFMEX).enableSongkick && TFMEX.prefs["enableSongkick"]) {
			    $('#tfmExtended .event-container').addClass('songkick');
			    $('#tfmExtended .event-container').removeClass('hidden');
				TFMEX.geo.findSongkickArtist();
			}
			    
			//console.debug("savePrefs: setting enable-scrobbling to:",enableScrobbling)
			TFMEX.prefs["enableScrobbling"] = enableScrobbling //gets into local storage
			
			localStorage.setItem("TFMEX", JSON.stringify(TFMEX.prefs));	
					
		},
	    showPrefsOld = function() {
	        var preferencesContent = "",
	            preferenceSettings = {},
	            currentVote = null;

		    preferencesContent += '<div class="flR">';
			preferencesContent += '<h3>Current Users:</h3>';
			preferencesContent += '<ul class="currentUserList"></ul></div>';

			if($("body").data('scrobbling-disabled')) {
				preferencesContent += '<a class="setEnableScrobbling">Click here to enable last.fm scrobbling.</a>';
			}
	        preferencesContent += '<dl class="flL">';
	        preferencesContent += '<dt>Show Chat Messages?<br />(Note: Disable the chat ding for this to work)</dt>';
	        preferencesContent += '<dd><input type="checkbox" id="showChat" data-tfmex-pref="showChat" value="1" /></dd>';
	        preferencesContent += '<dt>Show Song Messages?</dt>';
	        preferencesContent += '<dd><input type="checkbox" id="showSong" data-tfmex-pref="showSong" value="1" /></dd>';
	        preferencesContent += '<dt>Show Vote Messages?</dt>';
	        preferencesContent += '<dd><input type="checkbox" id="showVote" data-tfmex-pref="showVote" value="1" /></dd>';
	        preferencesContent += '<dt>Show DJ Changes?</dt>';
	        preferencesContent += '<dd><input type="checkbox" id="showDJChanges" data-tfmex-pref="showDJChanges" value="1" /></dd>';
	        preferencesContent += '<dt>Show Listener Changes?</dt>';
	        preferencesContent += '<dd><input type="checkbox" id="showListenerChanges" data-tfmex-pref="showListenerChanges" value="1" /></dd>';
	        preferencesContent += '</dl>';

	        if(TFMEX.votelog.length === 0 && typeof(TFMEX.room.upvoters) !== "undefined" && TFMEX.room.upvoters.length > 0) {
	            for (var upvoter in TFMEX.room.upvoters) {
	                if (TFMEX.room.upvoters.hasOwnProperty(upvoter)) {
	                    TFMEX.votelog.push([TFMEX.room.upvoters[upvoter], "up"]);
	                }
	            }
	        }
	        preferencesContent += '<ul class="currentSongVotes clL">';
			var currentVoteUserName = null;
	        for (var vote in TFMEX.votelog) {
				currentVoteUserName = "";
	            if (TFMEX.votelog.hasOwnProperty(vote)) {
	                currentVote = TFMEX.votelog[vote];
	                try {
	                    currentVoteUserName = TFMEX.room.users[currentVote[0]].name;
	                } catch(e) { };
					if(currentVoteUserName !== "") {
			            preferencesContent += "<li>";
						preferencesContent += currentVoteUserName;
		                preferencesContent += " voted: " + voteMap[currentVote[1]];
		                preferencesContent += "</li>";
					}
	            }
	        }
	        preferencesContent += '</ul>';
	        preferencesContent += '<div class="clB">&nbsp;</div>';
	        $("#tfmExtended .preferences").html(preferencesContent);
	        $("#tfmExtended .preferences").removeClass("hidden");
	
	        for (var prefName in TFMEX.prefs) {
	            if (TFMEX.prefs.hasOwnProperty(prefName)) {
	                $('#tfmExtended input[data-tfmex-pref=' + prefName + ']')
	                    .attr('checked', TFMEX.prefs[prefName])
	                    .change(function() {
	                        var $this = $(this);
	                        if($this.attr('checked')) {
	                            TFMEX.prefs[$this.attr('data-tfmex-pref')] = true;
	                        } else {
	                            TFMEX.prefs[$this.attr('data-tfmex-pref')] = false;
	                        }
	                        localStorage.setItem("TFMEX", JSON.stringify(TFMEX.prefs));
	                    });
	            }
	        }
			updateUserList();
	    },
	    desktopAlert = function(notificationObj) {
			// console.log("desktopAlert", notificationObj.title + " | " + notificationObj.body);
		    if(window.webkitNotifications && window.webkitNotifications.checkPermission() == 0){
				// console.log("Have permissions, setting up desktop alert.");
			    var notification = webkitNotifications.createNotification(
				      notificationObj.image?notificationObj.image:"",  // icon url - can be relative
				      notificationObj.title?notificationObj.title:"",  // notification title
				      notificationObj.body?notificationObj.body:""  // notification body text
				    );
				// TFMEX.notificationQueue.push(notification);
			    notification.show();
			    setTimeout(function(){
					// var lastNotification = TFMEX.notificationQueue.pop();
			        notification.cancel();
			    }, notificationObj.timeout);
			} else {
				// console.log("Discarded desktop alert, don't have proper permission.")
			}
	    },
	    updateNowPlaying = function(songObj) {
			var	songToMatch = {};
			if(songObj.artist !== lastPlayedSong.artist && songObj.song !== lastPlayedSong.song) {
				lastPlayedSong = songObj;
				songToMatch.metadata = songObj;
				// console.log("updateNowPlaying: ", songObj);
				if(lastRoomUrl === window.location.href) {
				    /*
                    $.each(TFMEX.votelog, function() {
                        var layers = {};
                        // Reset turned away down voters
                        if(TFMEX.roommanager.listeners[this[0]] && TFMEX.roommanager.listeners[this[0]].layers) {
                            layers = TFMEX.roommanager.listeners[this[0]].layers;
                            if(this[1] == "down") {
                                TFMEX.turnToward(layers);
                            }
                        }
                    });
                    */
                }
		        TFMEX.votelog = [];
		        TFMEX.heartlog = [];

				try {
		    		highlightMatchingTracks(songToMatch, $("#right-panel .songlist .song"));
		    		setTimeout(function() {
                        if(typeof(TFMEX.djSongCount[TFMEX.room.users[TFMEX.roommanager.roomData.metadata.currentDj].userid]) === "undefined") {
                            TFMEX.djSongCount[TFMEX.room.users[TFMEX.roommanager.roomData.metadata.currentDj].userid] = 0;
                        }
                        TFMEX.djSongCount[TFMEX.room.users[TFMEX.roommanager.roomData.metadata.currentDj].userid] += 1;
		    		}, 500);
		            if(TFMEX.prefs.showSong) {
		    			// console.log("About to show song: ", songObj);
		    			setTimeout(function() {
		    				// console.log("Show Song: ", songMetadata);
		    				var title = TFMEX.room.users[TFMEX.roommanager.roomData.metadata.currentDj].name + " is spinning:",
		                        coverArt = songObj.coverart?songObj.coverart:"",
		                        body = songObj.artist + " - " + songObj.song;
		                    desktopAlert({
		                        title: title,
		                        image: coverArt,
		                        body: body,
		                        timeout: TFMEX.prefs.messageTimeout
		                    });
		    			}, 500);
		            } else {
		    			// console.log("Not displaying song change notification: ", TFMEX.prefs);
		    		}

		    	} catch(e) { 
		    	    console.error("updateNowPlaying error: " + e.stack);
		    	}
			}
	    },
		updateUserList = function() {
			var userList = "",
				currentUser = {};
	        for (var user in TFMEX.room.users) {
	            if (TFMEX.room.users.hasOwnProperty(user)) {
					currentUser = TFMEX.room.users[user];
					userList += '<li><a href="http://facebook.com/profile.php?id=' + currentUser['fbid'] + '" target="_blank">' + currentUser['name'] + "</a>";
	            }
	        }	
			$('#tfmExtended .preferences .currentUserList').html(userList);
		},
		dispatchEventToContentScript = function(eventType) {
			var customEvent = document.createEvent('Event');
			customEvent.initEvent(eventType, true, true);
			document.getElementById('tt-ext-mpd').dispatchEvent(customEvent)			
		},
		raiseNewSongEvent = function() { //sends it to the content script
			dispatchEventToContentScript('tt-ext-new-song-event');
		},
		raiseNewRoomInfoEvent = function() {
			dispatchEventToContentScript('tt-ext-new-room-info')
		},
		raiseNewSongTagsEvent = function() {
		    $('#tt-ext-mpd').first().attr('data-user-id', TFMEX.user.id);
		    $('#tt-ext-mpd').first().attr('data-song-tags', localStorage.TFMEXsongTags);
			dispatchEventToContentScript('tt-ext-new-song-tags');
		},
		raiseGetSongTagsEvent = function() {
			dispatchEventToContentScript('tt-ext-get-song-tags');
		},
		getSendMessageFunction = function() {
			var messageFunctionName = $('body').data('tt-ext-messageFunctionName')
			if (!messageFunctionName) {
				messageFunctionName = turntable.randomRoom.toString().match(/(\.)([a-zA-Z0-9]*)(\(\{api:)/)[2];
				$('body').data('tt-ext-messageFunctionName',messageFunctionName)
			}
		    var messageFunc = eval("turntable." + messageFunctionName)
			if (!messageFunc) {
				console.warn("Unable to determine sendMessage function.")
			}
			return messageFunc
		},
	    extensionEventListener = function(m){

	        var songMetadata = null,
	            currentDJ = "",
	            currentDJName = "",
	            showChat = true,
	            now = new Date();



			// if(m.hasOwnProperty("msgid")){ }

			// console.log("m.command", m.command);
	        if(typeof(m.command) !== "undefined") {
				// console.log("m.command: ", m.command, TFMEX.prefs);
	            switch(m.command) {
	                case "newsong":
                        // console.debug("Got newsong message")
                        var roomInfo = m.room.metadata
                        var newSong = (roomInfo ? roomInfo.current_song : null);
                        if (newSong) {
                            if (TFMEX.songlog) {
                                var currentSong = TFMEX.room.currentSong
                                if (currentSong.starttime != newSong.starttime) {
                                    TFMEX.songlog.push(newSong)
                                    //console.debug("Adding new song",newSong,"to songLog",TFMEX.songlog)
                                } else {
                                    //console.debug("Not adding newSong",newSong,"to songlog as the starttime was the same as on the old song",currentSong)
                                }
                            } else {
                                //console.debug("Not adding newSong",newSong,"to songlog as TFMEX.songlog was",TFMEX.songlog)
                            }
                        } else {
                            //console.debug("Not processing newsong message as newSong was",newSong)
                        }
	                    break;
	                case "speak":
                        TFMEX.lastUserAction[TFMEX.room.userIdFromName(m.name)] = now;
	                    if(TFMEX.prefs.filteredChat) {
	                        if(TFMEX.prefs.chatFilters.length) {
    	                        showChat = false;
    	                        $.each(TFMEX.prefs.chatFilters, function() {
    	                            if(m.text.toLowerCase().indexOf(this.toLowerCase()) > -1)  {
                                       showChat = true;
                                       return false;
                                    }
    	                        });
	                        }
	                    }
	                    if(TFMEX.prefs.showChat && showChat) {
	                        desktopAlert({
	                            title: "",
	                            image: "",
	                            body: m.name + ": " + m.text,
	                            timeout: TFMEX.prefs.messageTimeout
	                        });
	                    }
	                    break;
	                case "registered":
	                    for (var userIndex in m.user){
	                        var user = m.user[userIndex];
	                        TFMEX.lastUserAction[user.userid] = now;
	                    }
	                    break;
	                case "deregistered":
	                    if(TFMEX.prefs.showListenerChanges) {
	                        // console.log("showListenerChanges", m);
	                        desktopAlert({
	                            title: m.user[0].name + " just " + listenerChangeMap[m.command] + " the room.",
	                            image: "",
	                            body: "",
	                            timeout: TFMEX.prefs.messageTimeout
	                        });
			            }
	                    break;
	                case "add_dj":
	                case "rem_dj":
                        TFMEX.lastUserAction[m.user[0].userid] = now;
                        if(m.command === "add_dj") {
	                        TFMEX.djSongCount[m.user[0].userid] = 0;
                        }
	                    if(TFMEX.prefs.showDJChanges) {
	                        // console.log("showDJChanges", m);
	                        desktopAlert({
	                            title: m.user[0].name + " " + djChangeMap[m.command] + " the decks.",
	                            image: "",
	                            body: "",
	                            timeout: TFMEX.prefs.messageTimeout
	                        });
	                    }
	                    break;
	                case "snagged":
	                    TFMEX.heartlog.push(m.userid);
	                    break;
	                case "update_votes":
	                    //update vote in song log
                        var roomInfo = m.room.metadata,
                            score = (roomInfo.upvotes - roomInfo.downvotes + roomInfo.listeners) / (2 * roomInfo.listeners),
                            currentVote = [],
                            currentUserLayers = {};
                        if (score) {
                            if (TFMEX.songlog) {
                                var latestSong = TFMEX.songlog[TFMEX.songlog.length - 1]
                                if (latestSong) latestSong.score = score
                            }
                        }
                        // console.log(m.room.metadata.votelog);
                        $.each(m.room.metadata.votelog, function() {
                            TFMEX.votelog.push(this);
                        });
	                    currentVote = TFMEX.votelog[TFMEX.votelog.length - 1];
                        TFMEX.lastUserAction[currentVote[0]] = now;
						if(currentVote[0] === TFMEX.user.id) {
							if(currentVote[1] == "down") {
								$("body").attr("data-cancel-scrobble", true);
							} else {
								$("body").attr("data-cancel-scrobble", false);
							}
						}
						/*
	                    currentUserLayers = TFMEX.roommanager.listeners[currentVote[0]].layers;
						if(currentVote[1] == "down") {
						    if(currentUserLayers) {
						        TFMEX.turnAway(currentUserLayers);
						    } else {
						        // Deal with DJs on deck
						    }
						} else {
						    TFMEX.turnToward(currentUserLayers);
						}
						*/
	                    try {
	                        if(TFMEX.prefs.showVote && TFMEX.room.users[currentVote[0]]) {
	                            desktopAlert({
	                                title: TFMEX.room.users[currentVote[0]].name + " voted: ",
	                                image: "",
	                                body: voteMap[currentVote[1]],
	                                timeout: TFMEX.prefs.messageTimeout
	                            });
	                        }
	                    } catch(e) { console.error("Exception occurred during showVote",e.stack); }
	                case "update_user":
	                case "new_moderator":
	                default:
	            }
	        } else {
	            // console.log("Command Undefined");
	        }
	    }
	    TFMEX.saveSongTagsRemotely = raiseNewSongTagsEvent;
	    TFMEX.getRemoteSongTags = raiseGetSongTagsEvent;
		TFMEX.refreshTagSongs = refreshTagSongs;
	    TFMEX.setAutoTags = setAutoTags;
		extensionEventListener.prototype.TFMEXListener = true;
	} catch(e) { console.error("Exception during initialization:",e.stack); }

	try {
		attachListeners();
	} catch(e) { console.error("Exception during attachListeners",e.stack); }
	};
	$.when(getTurntableObjects()).then(function() {whenTurntableObjectsReady(false)});
});

/*! @source http://purl.eligrey.com/github/canvas-toBlob.js/blob/master/canvas-toBlob.js */
(function(a){"use strict";var b=a.Uint8Array,c=a.HTMLCanvasElement,d=/\s*;\s*base64\s*(?:;|$)/i,f,e=function(n){var o=n.length,k=new b(o/4*3|0),m=0,q=0,r=[0,0],g=0,p=0,l,h,j;while(o--){h=n.charCodeAt(m++);l=f[h-43];if(l!==255&&l!==j){r[1]=r[0];r[0]=h;p=(p<<6)|l;g++;if(g===4){k[q++]=p>>>16;if(r[1]!==61){k[q++]=p>>>8}if(r[0]!==61){k[q++]=p}g=0}}}return k.buffer};if(b){f=new b([62,-1,-1,-1,63,52,53,54,55,56,57,58,59,60,61,-1,-1,-1,0,-1,-1,-1,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,-1,-1,-1,-1,-1,-1,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51])}if(c&&!c.prototype.toBlob){c.prototype.toBlob=function(p,m){if(!m){m="image/png"}var l=Array.prototype.slice.call(arguments,1),h=this.toDataURL.apply(this,l),n=h.indexOf(","),i=h.substring(n+1),o=d.test(h.substring(0,n)),j=a.BlobBuilder||a.WebKitBlobBuilder||a.MozBlobBuilder,k=new j,g;if(j.fake){g=k.getBlob(m);if(o){g.encoding="base64"}else{g.encoding="URI"}g.data=i;g.size=i.length}else{if(b){if(o){k.append(e(i))}else{k.append(decodeURIComponent(i))}g=k.getBlob(m)}}p(g)}}}(self));
/*! @source http://purl.eligrey.com/github/BlobBuilder.js/blob/master/BlobBuilder.js */
var BlobBuilder=BlobBuilder||self.WebKitBlobBuilder||self.MozBlobBuilder||(function(j){"use strict";var c=function(v){return Object.prototype.toString.call(v).match(/^\[object\s(.*)\]$/)[1]},u=function(){this.data=[]},t=function(x,v,w){this.data=x;this.size=x.length;this.type=v;this.encoding=w},k=u.prototype,s=t.prototype,n=j.FileReaderSync,a=function(v){this.code=this[this.name=v]},l=("NOT_FOUND_ERR SECURITY_ERR ABORT_ERR NOT_READABLE_ERR ENCODING_ERR NO_MODIFICATION_ALLOWED_ERR INVALID_STATE_ERR SYNTAX_ERR").split(" "),r=l.length,o=j.URL||j.webkitURL||j,p=o.createObjectURL,b=o.revokeObjectURL,e=o,i=j.btoa,f=j.atob,m=false,h=function(v){m=!v},d=j.ArrayBuffer,g=j.Uint8Array;u.fake=s.fake=true;while(r--){a.prototype[l[r]]=r+1}try{if(g){h.apply(0,new g(1))}}catch(q){}if(!o.createObjectURL){e=j.URL={}}e.createObjectURL=function(w){var x=w.type,v;if(x===null){x="application/octet-stream"}if(w instanceof t){v="data:"+x;if(w.encoding==="base64"){return v+";base64,"+w.data}else{if(w.encoding==="URI"){return v+","+decodeURIComponent(w.data)}}if(i){return v+";base64,"+i(w.data)}else{return v+","+encodeURIComponent(w.data)}}else{if(real_create_object_url){return real_create_object_url.call(o,w)}}};e.revokeObjectURL=function(v){if(v.substring(0,5)!=="data:"&&real_revoke_object_url){real_revoke_object_url.call(o,v)}};k.append=function(z){var B=this.data;if(g&&z instanceof d){if(m){B.push(String.fromCharCode.apply(String,new g(z)))}else{var A="",w=new g(z),x=0,y=w.length;for(;x<y;x++){A+=String.fromCharCode(w[x])}}}else{if(c(z)==="Blob"||c(z)==="File"){if(n){var v=new n;B.push(v.readAsBinaryString(z))}else{throw new a("NOT_READABLE_ERR")}}else{if(z instanceof t){if(z.encoding==="base64"&&f){B.push(f(z.data))}else{if(z.encoding==="URI"){B.push(decodeURIComponent(z.data))}else{if(z.encoding==="raw"){B.push(z.data)}}}}else{if(typeof z!=="string"){z+=""}B.push(unescape(encodeURIComponent(z)))}}}};k.getBlob=function(v){if(!arguments.length){v=null}return new t(this.data.join(""),v,"raw")};k.toString=function(){return"[object BlobBuilder]"};s.slice=function(y,v,x){var w=arguments.length;if(w<3){x=null}return new t(this.data.slice(y,w>1?v:this.data.length),x,this.encoding)};s.toString=function(){return"[object Blob]"};return u}(self));
/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */
var saveAs=saveAs||(function(h){"use strict";var r=h.document,l=function(){return h.URL||h.webkitURL||h},e=h.URL||h.webkitURL||h,n=r.createElementNS("http://www.w3.org/1999/xhtml","a"),g="download" in n,j=function(t){var s=r.createEvent("MouseEvents");s.initMouseEvent("click",true,false,h,0,0,0,0,0,false,false,false,false,0,null);return t.dispatchEvent(s)},o=h.webkitRequestFileSystem,p=h.requestFileSystem||o||h.mozRequestFileSystem,m=function(s){(h.setImmediate||h.setTimeout)(function(){throw s},0)},c="application/octet-stream",k=0,b=[],i=function(){var t=b.length;while(t--){var s=b[t];if(typeof s==="string"){e.revokeObjectURL(s)}else{s.remove()}}b.length=0},q=function(t,s,w){s=[].concat(s);var v=s.length;while(v--){var x=t["on"+s[v]];if(typeof x==="function"){try{x.call(t,w||t)}catch(u){m(u)}}}},f=function(t,u){var v=this,B=t.type,E=false,x,w,s=function(){var F=l().createObjectURL(t);b.push(F);return F},A=function(){q(v,"writestart progress write writeend".split(" "))},D=function(){if(E||!x){x=s(t)}w.location.href=x;v.readyState=v.DONE;A()},z=function(F){return function(){if(v.readyState!==v.DONE){return F.apply(this,arguments)}}},y={create:true,exclusive:false},C;v.readyState=v.INIT;if(!u){u="download"}if(g){x=s(t);n.href=x;n.download=u;if(j(n)){v.readyState=v.DONE;A();return}}if(h.chrome&&B&&B!==c){C=t.slice||t.webkitSlice;t=C.call(t,0,t.size,c);E=true}if(o&&u!=="download"){u+=".download"}if(B===c||o){w=h}else{w=h.open()}if(!p){D();return}k+=t.size;p(h.TEMPORARY,k,z(function(F){F.root.getDirectory("saved",y,z(function(G){var H=function(){G.getFile(u,y,z(function(I){I.createWriter(z(function(J){J.onwriteend=function(K){w.location.href=I.toURL();b.push(I);v.readyState=v.DONE;q(v,"writeend",K)};J.onerror=function(){var K=J.error;if(K.code!==K.ABORT_ERR){D()}};"writestart progress write abort".split(" ").forEach(function(K){J["on"+K]=v["on"+K]});J.write(t);v.abort=function(){J.abort();v.readyState=v.DONE};v.readyState=v.WRITING}),D)}),D)};G.getFile(u,{create:false},z(function(I){I.remove();H()}),z(function(I){if(I.code===I.NOT_FOUND_ERR){H()}else{D()}}))}),D)}),D)},d=f.prototype,a=function(s,t){return new f(s,t)};d.abort=function(){var s=this;s.readyState=s.DONE;q(s,"abort")};d.readyState=d.INIT=0;d.WRITING=1;d.DONE=2;d.error=d.onwritestart=d.onprogress=d.onwrite=d.onabort=d.onerror=d.onwriteend=null;h.addEventListener("unload",i,false);return a}(self));