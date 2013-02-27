/**
 * Avac Selector Engine
 * CSS3 selector engine.
 *
 * Copyright 2011-2013 AvacWeb (avacweb.com)
 * Released under the MIT and GPL Licenses.
 */
(function(){
	try {
		var makeArray = function(item) { return Array.prototype.slice.call(item) };
		makeArray(document.getElementsByTagName('head')); //if this works with no error we can use this makeArray
	} 
	catch(e) {
		var makeArray = function(item) {
			if(item instanceof Object) return Array.prototype.slice.call(item);
			return arrayCallback(item, 'r', function(e) { 
				return e; 
			});
		};
	};
	
	//split the selector into a manageable array. 
	function selectorSplit(selector) {
		var chunky = /(?:#[\w\d_-]+)|(?:\.[\w\d_-]+)|(?:\[\w+(?:[\$\*\^!\|~=]?=["']?.+["']?)?\])|(?:[\>\+~])|\w+|\s|(?::[\w-]+(?:\([^\)]+\))?)/g;
		return selector.match( chunky ) || [];
	};
	
	//identify a chunk. Is it a class/id/tag etc?
	function identify(chunk) {
		for(var type in $avac.regex) {
			if ( $avac.regex[type].test(chunk) ) return type;
		}
		return false;
	};
	
	function arrayCallback(nodes, mode, fn) {
		for(var i = 0, ret = [], l = nodes.length; i < l; i++ ) {
			var e = nodes[i], result = fn( e );
			switch(mode) {
				case 'f' :
					if(result) ret.push(e);
					break;
				case 'm' : 
					ret = ret.concat( result );
					break;
				case 'r' :
					ret.push( result );
			}
		};
		return ret;
	};
	
	function fix_context(item) {
		if(item.length) {
			if(item.push) return item;
			return makeArray(item);
		}
		if(item.nodeType == 1) return [item];
		return [document];
	};
	
	var $avac = function(selector, context) {	
		if(!selector || $avac.regex.space.test(selector) || !selector.charAt) return [];
		selector = selector.replace(/^\s+|\s+$/, '').replace(/\s?([\+~\>])\s?/g, ' $1');
		var nodes = context ? fix_context(context) : [document]
		, quickID = /.*(?!(?:\(|\[).*#.+(?:\)|\]))(?:[\w\d]+|\s)#([\w\d_-]+).*/g
		, i = 0
		, pieceStore = [];
		
		//this pulls out an ID to jump to n queries like: 'div.content span #foo .bar'
		//jumps to #foo .bar - this may mean the result is not necessarily true, but would be much faster.
		//if(quickID.test(selector)) {
		//	nodes = [ document.getElementById( selector.replace(quickID, '$1') ) ];
		//	selector = selector.substr( quickID.lastIndex );
		//};
		
		var chunks = arrayCallback( selectorSplit(selector), 'r', function(sel) {
			return {
				text: sel, 
				type: identify(sel)
			};
		});
		
		for(var l = chunks.length; i < l; i++) {
			if(nodes.length == 0) return []; //no point carrying on if we run out of nodes.
			
			var piece = chunks[i], nextPiece = chunks[ i + 1 ];
			if(!piece.type) throw new Error('Invalid Selector: ' + piece.text);

			if(piece.type != 'space' && nextPiece) {
				pieceStore.push( piece ); //push all pieces into pieceStore until we hit a space or the end.
			}
			else {
				if(piece.type != 'space' && piece.type != 'changer') pieceStore.push( piece );
				
				var piece1 = pieceStore.shift();	
				if(piece1) {
					nodes = arrayCallback(nodes, 'm', function(el) {
						return el ? $avac.getters[ piece1.type ](el, piece1.text) : [];
					});
				}
				
				for(var j = 0, k = pieceStore.length; j < k; j++ ) {
					if(pieceStore[j].type === 'changer') {
						var info = $avac.regex.changer.exec(pieceStore[j].text);
						nodes = $avac.changers[ info[1] ](nodes, parseInt(info[2]));
						continue;
					}
					nodes = arrayCallback(nodes, 'f', function(e) {
						return e ? $avac.filters[ pieceStore[j].type ](e, pieceStore[j].text) : false;
					});
				};
				
				if(piece.type == 'changer') {
					var info = $avac.regex.changer.exec(piece.text);
					nodes = $avac.changers[ info[1] ](nodes, parseInt(info[2]));
				};
				
				pieceStore = [];
			}
		};
		return nodes;
	}
	
	$avac.regex = {
		'id': /^#[\w\d-]+$/,
		'Class': /^\.[\w\d-]+$/,
		'tag': /^\w+$/,
		'rel': /^\>|\+|~$/,
		'attr': /^\[(\w+(?:-\w+)?)(?:([\$\*\^!\|~]?=)(.+?))?\]$/,  
		'changer': /^:(eq|gt|lt|first|last|odd|even|nth)(?:\((\d+)\))?$/,
		'pseudo' : /^:([\w\-]+)(?:\((.+?)\))?$/,
		'space' : /^\s+$/
	}
	
	$avac.getters = { 
		'id' : function(elem, sel) {
			sel = sel.substr(1);
			return elem.getElementById ? [elem.getElementById(sel)] : [document.getElementById(sel)];
		},
		'Class': function(elem, sel) {
			return elem.getElementsByClassName ? makeArray( elem.getElementsByClassName(sel.substr(1)) ) :
			arrayCallback( elem.all ? elem.all : elem.getElementsByTagName('*'), 'f', function(e) {
				return $avac.filters.Class(e, sel);
			});
		},
		'tag': function(elem, sel) {
			return makeArray( elem.getElementsByTagName(sel) );
		},	
		'attr': function(elem, sel) {
			return arrayCallback( elem.all ? elem.all : elem.getElementsByTagName('*'), 'f', function(e) {
				return $avac.filters.attr(e, sel);
			});
		},
		'rel': function(elem, sel) {
			switch(sel) {
				case '+' : 
					var next = elem.nextElementSibling || elem.nextSibling;
					while(next && next.nodeType !== 1) next = next.nextSibling;
					return [next];
				case '>' :
					return arrayCallback(elem.childNodes, 'f', function(e) {
						return e.nodeType === 1;
					});
				case '~' :
					return arrayCallback(elem.parentNode.childNodes, 'f', function(e) {
						return $avac.filters.rel(e, '~', elem);
					});
			}
		},	
		'pseudo': function(elem, sel) {
			return arrayCallback(elem.all ? elem.all : elem.getElementsByTagName('*'), 'f', function(e) {
				return $avac.filters.pseudo(e, sel);
			});
		}
	};
		
	$avac.filters = {
		'id' : function(elem, sel) {
			return (elem.id && elem.id === sel.substr(1));
		},	
		'Class' : function(elem, sel) {
			return (elem.className && (RegExp('(^|\\s)' + sel.substr(1) + '(\\s|$)')).test( elem.className ));
		},	
		'tag' : function(elem, sel) {
			return (elem.tagName && elem.tagName.toLowerCase() === sel.toLowerCase());
		},	
		'attr' : function(elem, sel) {  
			var info = $avac.regex.attr.exec(sel);
			var attr = elem.getAttribute ? elem.getAttribute(info[1]) : elem.attributes.getNamedItem(info[1]);
			if( !info[2] || !attr ) return !!attr;
			
			if(info[2] && info[3]) {
				var value = info[3].replace(/^['"]|['"]$/g, '');
				switch(info[2]) {
					case '==':
					case '=':
						return (attr === value)
					case '^=':
					case '|=':
						return (attr.indexOf(value) === 0);
					case '$=':
						return (RegExp(value + '$')).test(attr);
					case '*=':
						return (attr.indexOf(value) != -1)
					case '~=':
						return attr.match(RegExp('\\b' + value + '\\b'));
					case '!=':
						return (attr != value)
				}
			}
			return false;
		},	
		'rel' : function(elem, sel, relElem) {
			switch(sel) {
				case '+' : 
					var prev = elem.previousElementSibling || elem.previousSibling;
					while(prev && prev.nodeType != 1) {
						prev = prev.previousSibling;
					}
					return prev === relElem;
				case '~' :
					return elem !== relElem && elem.parentNode === relElem.parentNode;
				case '>' :
					return elem.parentNode === relElem;
			};
			return false;
		},	
		'pseudo' : function(elem, sel) {
			var pseudo = sel.replace($avac.regex.pseudo, '$1'), info = sel.replace($avac.regex.pseudo, '$2')
			return $avac.pseudo_filter[pseudo](elem, info);
		}
	};
		
	$avac.pseudo_filter = {
		'first-child' : function(elem, sel) { 
			while(elem = elem.previousSibling) {
				if(elem.nodeType == 1) return false;
			}
			return true;
		},
		'last-child' : function(elem, sel) {
			while(elem = elem.nextSibling) {
				if(elem.nodeType == 1) return false;
			}
			return true;
		},
		'hidden' : function(elem, sel) { 
			var s = elem.style;
			return elem.type === 'hidden' || (s && s.display === "none") || (s && s.visibility === 'hidden')
		},
		'contains' : function(elem, sel) { 
			var text = elem.textContent || elem.innerText || elem.innerHTML.replace(/<.*?>/g, '');
			return (text.indexOf(sel) != -1)
		},
		'notcontains' : function(elem, sel) { return !this.contains(elem, sel) },
		'only-child' : function(elem, sel) { return ( this['first-child'](elem) && this['last-child'](elem) ) },
		'empty' : function(elem, sel) { return !elem.hasChildNodes() },
		'not' : function(elem, sel) { return $avac(sel).indexOf(elem) == -1 },
		'has' : function(elem, sel) { return $avac(sel, elem).length > 0 },
		'nothas' : function(elem, sel) { return !this.has(elem, sel) },
		'selected' : function(elem, sel) { return elem.selected; },
		'visible' : function(elem, sel) { return !this.hidden(elem) },
		'input' : function(elem, sel) { return (/input|select|textarea|button/i).test( elem.nodeName ) },
		'enabled' : function(elem, sel) { return !elem.disabled },
		'disabled' : function(elem, sel) { return elem.disabled },
		'checkbox' : function(elem, sel) { return elem.type === 'checkbox' },
		'text' : function(elem, sel) { return elem.type === 'text' },
		'header' : function(elem, sel) { return (/h\d/i).test( elem.nodeName ) },
		'radio' : function(elem, sel) { return elem.type === 'radio' },
		'checked' : function(elem, sel) { return elem.checked }
	};
	
	function ofType(arr, start, increment) {
		var i = start, ret = [], e;
		while( e = arr[i] ) {
			ret.push( e );
			i += increment;
		}
		return ret;
	};
		
	$avac.changers = {
		'eq' : function(arr, digit) { return arr[digit] ? [ arr[digit] ] : []; },
		'gt' : function(arr, digit) { return arr.slice(digit) },
		'lt' : function(arr, digit) { return arr.slice(0, digit) },
		'first' : function(arr, digit) { return [ arr[0] ] },
		'last' : function(arr, digit) { return [ arr[arr.length-1] ] },
		'odd' : function(arr, digit) { return ofType(arr, 0, 2); },
		'even' : function(arr, digit) { return ofType(arr, 1, 2); },
		'nth' : function(arr, digit) { return ofType(arr, digit - 1, digit); }
	};
	
	if(document.querySelectorAll) {
		window.$avac = function(s, c) {
			c = c ? fix_context(c) : [document];
			return arrayCallback(c, 'm', function(e) {
				return makeArray( e.querySelectorAll(s) );
			});
		}
	}
	else {
		window.$avac = $avac;
	}

})();
