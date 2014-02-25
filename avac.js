/**
 * Avac Selector Engine
 * CSS3 selector engine.
 *
 * Copyright 2011-2013 AvacWeb (avacweb.com)
 * Released under the MIT and GPL Licenses.
 */
(function(doc){
	
	//MODE: f = filter, m = map, c = concat (fn returns arr to concat), a = all (forEach), no mode is essentially forEach
	function array_walk(nodes, mode, fn) {
		var nativeMethod = {f: 'filter', m: 'map', a: 'forEach'}[mode]
		, i = 0
		, ret = []
		, l = nodes.length;
		
		if(nativeMethod && nodes[nativeMethod]) {
			return nodes[nativeMethod].call(nodes, fn);
		}
		
		for(; i < l; i++ ) {
			var elem = nodes[i]
			, result = fn.call(nodes, elem, i, nodes);
			
			switch(mode) {
				case 'f' :
					if(result) ret.push(elem);
					break;
				case 'c' : 
					ret = ret.concat( toArray(result) );
					break;
				case 'm' :
					ret.push( result );
			}
		};
		
		return ret;
	};
	
	function toArray(item) {
		return Array.prototype.slice.call(item);
	};
	
	try {
		toArray( {0:1, length:1} ); //if this works with no error we can use this toArray
	}
	catch(e) {
		toArray = function(item) {
			return array_walk(item, 'm', function(o) {
				return o;
			});
		};
	};
	
	//split the selector into a manageable array. 
	function selectorSplit(selector) {
		var chunky = /(?:#[\w\d_-]+)|(?:\.[\w\d_-]+)|(?:\[(\w+(?:-\w+)?)(?:([\$\*\^!\|~\/]?=)(.+?))?\])|(?:[\>\+~])|\w+|\s|(?::[\w-]+(?:\([^\)]+\))?)/g;
		return selector.match( chunky ) || [];
	};
	
	//identify a chunk. Is it a class/id/tag etc?
	function identify(chunk) {
		for(var type in avac.regex) {
			if ( avac.regex[type].test(chunk) ) return type;
		}
		return false;
	};
	
	//just to prevent rewriting over and over...
	function all(elem) {
		return elem.all ? elem.all : elem.getElementsByTagName('*');
	};
	
	var avac = function(selector, context) {	
		if(!selector || this.regex.space.test(selector) || !selector.charAt) return [];
		selector = selector.replace(/^\s+|\s+$/, '').replace(/\s?([\+~\>])\s?/g, ' $1'); //some internal fixing.
		
		var shortcut = /.*(?!(?:\(|\[).*#.+(?:\)|\]))(?:[\w\d]+|\s)#([\w\d_-]+).*/g
		, i = 0
		, pieceStore = []
		, nodes = [doc]
		, chunks;
		
		if(context) { //context can be a node, nodelist, array, document
			if(context instanceof Array) {
				nodes = context;
			}
			else if(context.length) {
				nodes = toArray(nodes);
			}
			else if(context.nodeType === 1) {
				nodes = [context];
			}
			//throw error for invalid context? 
		}
		
		/* OPTIONAL SHORTCUT:
		 * ID's are quick to find. If a selector contains an ID we jump to it. 
		 * Aka 'div .content #foo .bar' becomes '#foo .bar' to speed things up.
		 * This may give incorrect results if #foo is not within .content
		 * But the option is here if its safe for use in your case.
		*/
		//if( shortuct.test(selector) ) {
		//	nodes = [ doc.getElementById( selector.replace(shortcut, '$1') ) ];
		//	selector = selector.substr( shortcut.lastIndex );
		//}
		
		//QSA support. This is put inside the main func so as to keep the multi-context, and above shortcut supported.
		if(doc.querySelectorAll) {
			try {
				return array_walk(nodes, 'c', function(e) {
					return toArray( e.querySelectorAll(selector) );
				});
			} 
			catch(e){}; //catch bad selectors. (Avac supports things QSA doesn't)
		}
		
		//create an array with all the diff parts of the selector
		chunks = array_walk( selectorSplit(selector), 'm', function(sel) {
			return {
				text: sel, 
				type: identify(sel)
			};
		});
		
		//now we go through the chunks, creating the node set.
		for(var l = chunks.length; i < l; i++) {
			
			if(nodes.length === 0 || chunks.length === 0) return []; //no point carrying on if we run out of nodes.
			
			var piece = chunks[i];
			
			if(!piece.type) throw new Error('Invalid Selector: ' + piece.text);

			if(piece.type !== 'space' && chunks[ i + 1 ]) {  
				pieceStore.push( piece ); 
				//We push all non-descendant selectors into piece store until we hit a space in the selector.
			}
			else {
				if(piece.type !== 'space' && piece.type !== 'changer') {
					pieceStore.push( piece );
				}
				
				//now we begin. Grab the first piece, as the starting point, then perform the filters on the nodes.
				var piece1 = pieceStore.shift()
				, j = 0
				, k = pieceStore.length;
				
				nodes = array_walk(nodes, 'c', function(elem) {
					return elem ?
							avac.getters[ piece1.type ](elem, piece1.text)
							: [];
				});
				
				//now perform filters on the nodes.
				for(; j < k; j++ ) {
					
					//a 'changer' changes the nodes completely, rather than adding to them.
					if(pieceStore[j].type === 'changer') {
						var info = this.regex.changer.exec(pieceStore[j].text);
						nodes = this.changers[ info[1] ](nodes, parseInt(info[2])); //sooo ugly.
						continue;
					}
					
					nodes = array_walk(nodes, 'f', function(elem) {
						return elem ? 
								avac.filters[ pieceStore[j].type ](elem, pieceStore[j].text)
								: false;
					});
				}
				
				if(piece.type == 'changer') {
					var info = this.regex.changer.exec(piece.text);
					nodes = this.changers[ info[1] ](nodes, parseInt(info[2]));
				}
				
				pieceStore = [];
			}
		}
		
		return nodes;
	}
	
	avac.regex = {
		'id': /^#[\w\d-]+$/,
		'Class': /^\.[\w\d-]+$/,
		'tag': /^\w+$/,
		'rel': /^\>|\+|~$/,
		'attr': /^\[(\w+(?:-\w+)?)(?:([\$\*\^!\|~\/]?=)(.+?))?\]$/,
		'changer': /^:(eq|gt|lt|first|last|odd|even|nth)(?:\((\d+)\))?$/,
		'pseudo' : /^:([\w\-]+)(?:\((.+?)\))?$/,
		'space' : /^\s+$/
	};
	
	//these func 'get' elements.
	avac.getters = { 
		'id' : function(elem, sel) {
			sel = sel.replace('#', '');
			return elem.getElementById 
					? [ elem.getElementById(sel) ]
					: [ doc.getElementById(sel) ];
		},
		
		'Class' : function(elem, sel) {
			sel = sel.replace('.', '');
			return elem.getElementsByClassName
					? toArray( elem.getElementsByClassName(sel) )
					: array_walk( all(elem), 'f', function(e) {
						return avac.filters.Class(e, sel);
					});
		},
		
		'tag' : function(elem, sel) {
			return toArray( elem.getElementsByTagName(sel) );
		},	
		
		'attr' : function(elem, sel) {
			return array_walk( all(elem), 'f', function(e) {
				return avac.filters.attr(e, sel);
			});
		},
		
		'rel' : function(elem, sel) {
			switch(sel) {
				case '+' : 
					var next = elem.nextElementSibling || elem.nextSibling;
					while(next && next.nodeType !== 1) {
						next = next.nextSibling;
					}
					return [next];
					
				case '>' :
					return array_walk(elem.childNodes, 'f', function(e) {
						return e.nodeType === 1;
					});
				case '~' :
					var children; 
					return (elem.parentNode && (children = elem.parentNode.children)) 
							? array_walk(children, 'f', function(e) {
								return avac.filters.rel(e, '~', elem);
							  })
							: [];
			}
		},	
		
		'pseudo': function(elem, sel) {
			return array_walk( all(elem), 'f', function(e) {
				return avac.filters.pseudo(e, sel);
			});
		}
	};
	
	//and as the name suggests, these filter the nodes to match a selector part
	avac.filters = {
		'id' : function(elem, sel) {
			return (elem.id && elem.id === sel.replace('#', ''));
		},	
		
		'Class' : function(elem, sel) {
			return (elem.className && (RegExp('(^|\\s)' + sel.replace('.', '') + '(\\s|$)')).test( elem.className ));
		},
			
		'tag' : function(elem, sel) {
			return (elem.tagName && elem.tagName.toLowerCase() === sel.toLowerCase());
		},	
		
		'attr' : function(elem, sel) {  
			var info = avac.regex.attr.exec(sel)
			, attr = elem.getAttribute ? elem.getAttribute(info[1]) : elem.attributes.getNamedItem(info[1]);
			
			if( !info[2] || !attr ) {
				return !!attr;
			}
			
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
						return attr.indexOf(value) === attr.length - value.length; //avoid using a regex, as would need to escape the string. Pointless.
					case '*=':
						return (attr.indexOf(value) != -1)
					case '~=':
						return attr.match(RegExp('\\b' + value + '\\b'));
					case '!=':
						return (attr != value);
					case '/=':
						var modifiers = value.match(/\s(\w+)$/) || ['', ''];
						value = value.replace(/\\/g, '\\\\').replace(modifiers[0], '');
						return RegExp(value, modifiers[1]).test(attr);
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
			var pseudo = sel.replace(avac.regex.pseudo, '$1')
			, info = sel.replace(avac.regex.pseudo, '$2');
			return avac.pseudo_filters[pseudo](elem, info); //we're going into another object again for pseudos.
		}
	};
		
	avac.pseudo_filters = {
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
			if(elem.style) {
				if(elem.style.display === 'none' || elem.style.visibility === 'hidden') {
					return true;
				}
			}
			return elem.type === 'hidden';
		},
		'contains' : function(elem, sel) { 
			var text = elem.textContent || elem.innerText || elem.innerHTML.replace(/<.*?>/g, '');
			return (text.indexOf(sel) != -1)
		},
		'notcontains' : function(elem, sel) { return !this.contains(elem, sel) },
		'only-child' : function(elem, sel) { return ( this['first-child'](elem) && this['last-child'](elem) ) },
		'empty' : function(elem, sel) { return !elem.hasChildNodes() },
		'not' : function(elem, sel) { return avac(sel).indexOf(elem) == -1 },
		'has' : function(elem, sel) { return avac(sel, elem).length > 0 },
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
		
	avac.changers = {
		'eq' : function(arr, digit) { return arr[digit] ? [ arr[digit] ] : []; },
		'gt' : function(arr, digit) { return arr.slice(digit) },
		'lt' : function(arr, digit) { return arr.slice(0, digit) },
		'first' : function(arr, digit) { return [ arr[0] ] },
		'last' : function(arr, digit) { return [ arr[arr.length-1] ] },
		'odd' : function(arr, digit) { return ofType(arr, 0, 2); },
		'even' : function(arr, digit) { return ofType(arr, 1, 2); },
		'nth' : function(arr, digit) { return ofType(arr, digit - 1, digit); }
	};
	
	//expose and call with itself as this
	window.$avac = function(selector, context) {
		return avac.call(avac, selector, context);
	};
	
	//allow extending of pseudos.
	$avac.add_pseudo = function(name, fn) {
		avac.pseudo_filters[name] = fn;
	};

})(document);
