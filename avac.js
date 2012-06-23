/* 
* Avac CSS Selector Engine. 
* Created by LGforum @ AvacWeb (avacweb.com)
* AvacWeb Copyright 2011-2012
* All Right Reserved.
* No unauthorized distrubution or copying.
*/
(function(){
	if (![].indexOf) {
		Array.prototype.indexOf = function(obj) {
			for (var i = 0, l = this.length; i < l; i++) if (this[i] === obj) return i;
			return -1;
		};
	}
	
	var makeArray //fix for IE slice bugs.
	try {
		Array.prototype.slice.call(document.getElementsByTagName('html'));
		makeArray = function(item){ return Array.prototype.slice.call(item) };
    } 
	catch(e) {
        makeArray = function(item){
            if(item instanceof Object) return Array.prototype.slice.call(item);
            for(l=item.length, ret = [], i = 0; i<l; i++) ret.push(item[i]);
            return ret;
        };
    };
	
	//split the selector into a manageable array. 
	function selectorSplit(selector) {
		var chunky = /(?:#[\w\d_-]+)|(?:\.[\w\d_-]+)|(?:\[\w+(?:[\$\*\^!\|~=]?=["']?.+["']?)?\])|(?:[\>\+~])|\w+|\s|(?::[\w-]+(?:\([^\)]+\))?)/g
		return selector.match( chunky ) || [];
	};
	
	//identify a chunk. Is it a class/id/tag etc?
	function identify(chunk) {
		var possibles = {
			'id': /^#[^\>\+\.\s\[:]+$/,
			'class': /^\.[^\>\+\.\s\[:]+$/,
			'tag': /^[^\>\+\.\s\[:="']+$/,
			'rel': /^\>|\+|~$/,
			'attr': /^\[\w+(?:[\$\*\^!\|~]?=["']?.+["']?)?\]$/,  
			'changer': /^:(?:eq|gt|lt|first|last|odd|even)(?:\(\d+\))?$/,
			'pseudo' : /^:[\w\-]+(?:\(.+\))?$/,
			'space' : /^\s+$/
		};
		for(var type in possibles) {
			if (possibles[type].test(chunk)) return type;
		}
		return false;
	};
	
	//check for QSA compatibility.
	function QSA(selector) {
		if(!document.querySelectorAll) return false;
		try {
			document.querySelectorAll(selector);
			return window.Element.prototype.querySelectorAll;
		}
		catch(e) {
			return false;	
		}
	};
	
	//If filter = true, acts as a filter. else acts as a "getter"
	function arrayCallback(nodes, filter, fn) {
		for(var i = 0, ret = [], l = nodes.length; i<l; i++ ) {
			var e = nodes[i];
			var result = fn( e );
			if(filter) {
				if(result) ret.push( e );
			}
			else {
				ret = ret.concat( result );
			}
		};
		return ret;
	};

	var $avac = function(selector, context) {	
		if(!selector || /^\s*$/.test(selector) || !selector.charAt) return;
		selector = selector.replace(/^\s+|\s+$/, '').replace(/\s?([\+~\>])\s?/g, ' $1'); //trim
		
		var nodes = [document];
		if(context && context.nodeType && context.nodeType == 1) nodes = [context];
		
		//will pull out any ID to use for speed. Will avoid ID's inside attribute values or :not|:contains etc.
		var quickID = /.*(?!(?:\(|\[).*#.+(?:\)|\]))(?:[\w\d]+|\s)#([\w\d_-]+).*/g;
		if(quickID.test(selector)) {
			nodes = [ document.getElementById( selector.replace(quickID, '$1') ) ];
			selector = selector.substr( quickID.lastIndex );
		};

		if( QSA(selector) ) // QSA compatibility check.
			return arrayCallback(nodes, false, function(e) { 
				return makeArray( e.querySelectorAll(selector) );
			});
		
		var chunks = selectorSplit(selector)
		,	i = 0
		,	l = chunks.length
		,	pieceStore = []
		,	getters = $avac.getters
		,	filters = $avac.filters
		,	changers = $avac.changers;
		
		chunks = arrayCallback(chunks, false, function(sel) {
			return [ {text: sel, type: identify(sel)} ];
		});
		
		for(; i<l; i++) {
			if(nodes.length == 0) return []; //no point carrying on if we run out of nodes.
			var piece = chunks[i], nextPiece = chunks[i+1];
			if(!piece.type) throw new Error('Invalid Selector: '+piece.text);

			if(piece.type != 'space' && nextPiece) {
				pieceStore.push( piece ); //push all pieces into pieceStore until we hit a space or the end.
			}
			else {
				var piece1 = (piece.type != 'space' && piece.type != 'changer') ? piece : pieceStore.shift(); 				
				nodes = arrayCallback(nodes, false, function(el) {
					return getters[ piece1.type ](el, piece1.text);
				});
				
				if(piece.type == 'changer') {
					var value = piece.text.replace(/[^\(]+\((\d+)\)$/, '$1');
					var type = piece.text.replace(/^:(\w+).*/, '$1');
					nodes = changers[type](nodes, value);
				};
				
				if(pieceStore.length) {
					for( var j = 0, k = pieceStore.length; j<k; j++ ) {
						nodes = arrayCallback(nodes, true, function(node) {
							return filters[ pieceStore[j].type ](node, pieceStore[j].text);
						});
					}
					j = 0;
				};
				pieceStore = [];
			}
		};

		return nodes;
	}
	
	$avac.getters = { 
		'id' : function(elem, sel) {
			return elem.getElementById ? [elem.getElementById(sel.substr(1))] : [document.getElementById(sel.substr(1))];
		},
		'class': function(elem, sel) {
			return elem.getElementsByClassName ? makeArray( elem.getElementsByClassName(sel.substr(1)) ) :
			arrayCallback( elem.all ? elem.all : elem.getElementsByTagName('*'), true, function(e) {
				return $avac.filters['class'](e, sel);
			});
		},
		'tag': function(elem, sel) {
			return makeArray( elem.getElementsByTagName(sel) );
		},	
		'attr': function(elem, sel) {
			return arrayCallback( elem.all ? elem.all : elem.getElementsByTagName('*'), true, function(e) {
				return $avac.filters['attr'](e, sel);
			});
		},
		'rel': function(elem, sel) {
			if(/\+|~/.test(sel)) elem = elem.parentNode;
			return arrayCallback(elem.childNodes, true, function(e) {
				return $avac.filters['rel'](e, sel);
			});
		},	
		'pseudo': function(elem, sel) {
			return arrayCallback(elem.all ? elem.all : elem.getElementsByTagName('*'), true, function(e) {
				return $avac.filters['pseudo'](e, sel);
			});
		}
	};
		
	$avac.filters = {
		'id' : function(elem, sel) {
			return (elem.id && elem.id === sel.substr(1));
		},	
		'class' : function(elem, sel) {
			return (elem.className && (RegExp('(^|\\s)'+sel.substr(1)+'(\\s|$)')).test( elem.className ));
		},	
		'tag' : function(elem, sel) {
			return (elem.tagName && elem.tagName.toLowerCase() === sel.toLowerCase());
		},	
		'attr' : function(elem, sel) {
			sel = sel.replace(/^\[|\]$/g, '');
			var info = sel.match(/(?:[^\|\^\*\$!~=]+)|(?:[\|\^\*\$!~=]?=)|(?:['"]?.+['"]?$)/g);
			if(info[2]) info[2] = info[2].replace(/^['"]|['"]$/g, '');

			var attrvalue = elem.getAttribute ? elem.getAttribute(info[0]) : elem.attributes.getNamedItem(info[0]);
			if(!info[1] || !attrvalue) return (attrvalue);
				
			switch(info[1]) {
				case '==':
				case '=':
					return (attrvalue === info[2])
				case '^=':
				case '|=':
					return (attrvalue.indexOf( info[2] ) === 0);
				case '$=':
					return (RegExp(info[2]+'$')).test(attrvalue);
				case '*=':
				case '~=':
					return (attrvalue.indexOf( info[2] ) != -1)
				case '!=':
					return (attrvalue != info[2])
			};
			return false;
		},	
		'rel' : function(elem, sel) {
			switch(sel) {
				case '+' : 
					var prev = elem.previousElementSibling || elem.previousSibling;
					while(prev && prev.nodeType != 1) {
						prev = prev.previousSibling;
					}
					return (nodes.indexOf(prev) != -1);
				case '~' :
					while(elem = elem.previousSibling) {
						if( nodes.indexOf( elem ) != -1 ) return true;
					}
					return false;
				case '>' :
					var parent = elem.parentElement || elem.parentNode;
					return (nodes.indexOf(parent) != -1);
			};
			return false;
		},	
		'pseudo' : function(elem, sel) {
			var info = sel.match(/^:([\w-]+)|\(\s*['"]?(.*)['"]?\s*\)?/g);
			return $avac.pseudo_filter[info[0].substr(1)](elem, info[1]);
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
			var text = elem.textContent || elem.innerText || elem.innerHTML.replace(/\<\/?[^\>]+>/g, '');
			return (text.indexOf(sel) != -1 )
		},
		'notcontains' : function(elem, sel) { return !this['contains'](elem, sel) },
		'only-child' : function(elem, sel) { return ( this['first-child'](elem) && this['last-child'](elem) ) },
		'empty' : function(elem, sel) { return !elem.hasChildNodes() },
		'not' : function(elem, sel) { return ( $avac.self(sel, elem.parentNode).indexOf(elem) == -1 ) },
		'has' : function(elem, sel) { return ( $avac.self(sel, elem).length > 0 ) },
		'nothas' : function(elem, sel) { return !this['has'](elem, sel) },
		'selected' : function(elem, sel) { return elem.selected; },
		'visible' : function(elem, sel) { return !this['hidden'](elem) },
		'input' : function(elem, sel) { return (/input|select|textarea|button/i).test( elem.nodeName ) },
		'enabled' : function(elem, sel) { return !elem.disabled },
		'disabled' : function(elem, sel) { return elem.disabled },
		'checkbox' : function(elem, sel) { return elem.type === 'checkbox' },
		'text' : function(elem, sel) { return elem.type === 'text' },
		'header' : function(elem, sel) { return (/h\d/i).test( elem.nodeName ) },
		'radio' : function(elem, sel) { return elem.type === 'radio' },
		'checked' : function(elem, sel) { return elem.checked },
		'parent' : function(elem, sel) { return elem.hasChildNodes() }
	};
		
	$avac.changers = {
		'eq' : function(arr, digit) { return [ arr[parseInt(digit)] ] },
		'gt' : function(arr, digit) { return arr.slice(parseInt(digit)) },
		'lt' : function(arr, digit) { return arr.slice(0, parseInt(digit)) },
		'first' : function(arr, digit) { return [ arr[0] ] },
		'last' : function(arr, digit) { return [ arr[a.length-1] ] },
		'odd' : function(arr, digit, even) {
			for(var i = even ? 0 : 1, l = arr.length, ret = []; i<l; i++) {
				ret.push( arr[i] );
				i++;
			}
			return ret;
		},
		'even' : function(arr, digit) { return this['odd'](arr, digit, true); }
	};
	
	$avac.self = $avac;
	$avac.filter = function(nodes, filter) {
		var type = identify( filter );
		return arrayCallback(nodes, true, function(e) {
			return $avac.filters[type](e, filter);
		});
	};
	
	$avac.match = function(node, sel) {
		var chunks = selectorSplit( sel );
		for(var i = 0, l = chunks.length; i<l; i++ ) {
			var type = identify(chunks[i]);
			if( !$avac.filters[type](node, chunks[i]) ) return false;
		}
		return true;
	};
	window.$avac = $avac;

})();