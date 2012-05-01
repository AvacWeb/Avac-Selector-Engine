/* 
* Avac CSS Selector Engine. 
* Created by LGforum @ AvacWeb (avacweb.com)
* AvacWeb Copyright 2011-2012
* All Right Reserved.
* No unauthorized distrubution or copying.
*/
(function(){
	//adding indexOf array method if not supported.
	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(obj) {
			for (var i = 0, l = this.length; i < l; i++) {
				if (this[i] === obj) return i;
			}
			return -1;
		};
	}
	
	
	var Slice; //fix for IE slice bugs.
	try {
		Array.prototype.slice.call(document.getElementByTagName('head'));
		
		Slice = function(item){
			return Array.prototype.slice.call(item);
		};
    } 
	catch(e) {
        Slice = function(item){
            if(item instanceof Object) return  Array.prototype.slice.call(item);
            for(l=item.length, ret = [], i =0; i<l; i++) ret.push(item[i]);
            return ret;
        };
    };


var avac = function(selector, context, new_priority, id_safety) {
	if(!selector || selector == '' || selector==' ') return;	

	//cut off all before any ID's. Go straight to id. Unless safety is turned on.
	if(!id_safety && selector.indexOf('#')!=-1) {
		selector = selector.substring(selector.lastIndexOf('#'));
	}
	
	this.Slice = Slice;
	
	if(context) {
		//if its a string, we'll assume its a selector.
		if(typeof context === 'string')	context = $avac(context);
		if(typeof context === 'object') {
			var cur_context = ('concat' in context) ? context : 
			('tagName' in context) ? [context] : this.Slice(context);
		}
		else{
			var cur_context = [document]
		}
	}
	else {
		var cur_context = [document]
	}

	var chunky1 = /(?:#[^\>\+\.\s\[:]+)|(?:\.[^\>\+\.\s\[:]+)/
	, chunky2 = /(?:\[\w+(?:[\$\*\^!]?=["'][\w\s]+["'])?\])/
	, chunky3 = /(?:[\>\+])|\w+|\s|(?::[\w-]+(?:\([^\)]+\))?)/
	, full_chunky = new RegExp(chunky1.source+'|'+chunky2.source+'|'+chunky3.source,'g')
	, chunks = selector.match(full_chunky)
	, that = this
	, jumping = true
	, first = true
	, nodes = cur_context
	, selectorStorage = []	//stores in parts of a selector which is all one. Like div.post
	, ordering;

	//if QSA is supported and the selector is valid for QSA, perform QSA on all context elems.
	if(!/.*:(?:not|has)\(.*/.test(selector) && document.querySelectorAll) {
		var ret = [];
		for(var ci=0,cl=cur_context.length; ci<cl; ci++) {
			ret = ret.concat( this.Slice( cur_context[ci].querySelectorAll(selector) ) );
		}
		return ret;
	}

	//parse new priority if there is one.
	//expecting an array of 4 in length. Should contain '.','[','t',':'
	if(new_priority && new_priority.length == 4) {
		orderStr = new_priority.join('|').replace('.','class').replace('[','attr').replace('t','tag').replace(':','pseudo');
		ordering = orderStr.split('|');
		ordering.unshift('child','sibling');
	} 
	else {
		//default priority ordering.
		ordering = ['child','sibling','class','tag','pseudo','attr']
	}

	this.possibles = {
		'id': /^#[^\>\+\.\s\[:]+$/,
		'class': /^\.[^\>\+\.\s\[:]+$/,
		'tag': /^[^\>\+\.\s\[:="']+$/,
		'child': /^\>$/,
		'attr': /^(?:\[\w+(?:[\$\*\^!]?=["'][\w\s]+["'])?\])$/,  
		'sibling': /^\+$/,
		'pseudo' : /^:(?:(?:first|last|only(?:-of-type|-child))|empty|(?:not|has|contains)\(.*\))$/
	};
    
	//identify a chunk.
	this.identify = function(sel) {
		for(var type in that.possibles) {
			if (that.possibles[type].test(sel)) return type;
		}
		return false;
	};

	//return elements by classname. 
	this.byClass = function(elem,classname) {
		if(elem.getElementsByClassName) {
			return that.Slice(elem.getElementsByClassName(classname));
		}
		else {
			var arr = elem.all ? elem.all : elem.getElementsByTagName('*'), matches = [];
			var classTest = new RegExp("(^|\\s)" + classname + "(\\s|$)");
			for(var i=0,l=arr.length; i<l; i++) {
				if(classTest.test(arr[i].className)) matches.push(arr[i]);
			}
			return matches;
		}
	};

	//return elements by attribute, via performing a confirming function on the attribute.
	this.byAttr = function(elem,attr,fn) {
		var ret = [], arr = elem.all ? elem.all : elem.getElementsByTagName('*'), value = attr.value, attrname = attr.name;

		//if its href, then only get a elements. 
		//if its name, and getElementsByName is supported AND we have a value, use that. 
		arr = (attrname==='href') ? elem.getElementsByTagName('a') 
				: (attrname==='name') ?	elem.getElementsByName ? value ? elem.getElementsByName(value) : arr : arr : arr;

		for (var i=0,l=arr.length; i<l; i++) {
			var a=arr[i].getAttribute(attrname);
			if(a && fn(a)) ret.push(arr[i]);
		}
		return ret;
	};

	//parses an attribute selector and returns an object containing info.
	this.attrParse = function(attrsel) {
		attrsel = attrsel.replace(/^\[/,'').replace(/\]$/,'');
		var attrname = attrsel.match(/^\w+/)[0], condition = false, attrvalue = false;
		if(/^\w+[\$\^\*!]?=/.test(attrsel)) {
			condition = attrsel.match(/[\^\$\*!]?=/)[0];
			attrvalue = attrsel.substring(attrsel.indexOf(condition)+condition.length);
			attrvalue = attrvalue.replace(/^['"]/,'').replace(/['"]$/,'');
		}
		return { name: attrname, condition: condition, value: attrvalue }
	};

	this.getAttrFn = function(info) {
		return (info.condition === '=') ?
			function(attrvalue) { return (attrvalue === info.value) }
			: info.condition === '^=' ?
			function(attrvalue){ return (attrvalue.indexOf(info.value) === 0)  }
			: info.condition === '$=' ?
			function(attrvalue){ var r=new RegExp(info.value+'$'); return r.test(attrvalue); }
			: info.condition === '*=' ?
			function(attrvalue){ return (attrvalue.indexOf(info.value)!=-1) }
			: info.condition === '!=' ?
			function(attrvalue){ return (attrvalue != info.value) }
			: function(){ return false; };
	};

	this.get = {
		'id' : function(elem,sel) {
			return [document.getElementById(sel.substr(1))];
		},
      
		'class': function(elem,sel) {
			return that.byClass(elem,sel.substr(1));
		},
      
		'tag': function(elem,sel) {
			return that.Slice(elem.getElementsByTagName(sel));
		},

		'attr': function(elem,sel) {
			var info = that.attrParse(sel), fn;
			fn = (info.condition && info.value) ? fn = that.getAttrFn(info) : fn = function() { return true; };
			return that.byAttr(elem,info,fn);
		},

		'child' : function(elem,sel) {
			return elem.firstChild ? this.Slice(elem.childNodes) : [];
		},

		'sibling' : function(elem,sel) {
			while(elem = elem.nextSibling) {
				if(elem.nodeType==1) return [elem];
			}
			return [];
		},

		'pseudo' : function(elem, sel) {
			sel = sel.substr(1);
			origsel = sel;
			if(/(?:has|not)\(.*\)/.test(sel)) {
				sel = sel.substring(0,sel.indexOf('(')); //cheap and tacky, but what the hell.
				origsel = origsel.replace(/(?:has|not)\((.*)\)/,'$1').replace(/^['"]/,'').replace(/['"]$/,'');
			}
			return that.pseudo_get[sel](elem, origsel);
		}
	};

	this.context_loop = function(fn) {
		var arr = cur_context, l = cur_context.length, ret = [];
		for(var i = 0; i<l; i++) {
			if(arr[i].nodeType!=1 && arr[i].nodeType!=9) continue;
			ret = ret.concat(fn(arr[i]));
		}
		return ret;
	};
    
	this.filter_function = function(fn) {
		var loop_arr = nodes, ret = [], ll=loop_arr.length;
		for(var i=0; i<ll; i++) {
			if(loop_arr[i].nodeType!=1 && loop_arr[i].nodeType!=9) continue;
			if(fn(loop_arr[i])) ret.push(loop_arr[i]);
		}
		return ret;
	};

	this.filter = {
		'class' : function(sel) {
			var classTest = new RegExp("(^|\\s)" + sel.substr(1) + "(\\s|$)");
			return that.filter_function(function(elem) {
				return (classTest.test(elem.className))
			});
		},

		'tag' : function(sel) {
			return that.filter_function(function(elem) {
				return (elem.tagName.toLowerCase() === sel.toLowerCase()) 
			});
		},

		'attr' : function(sel) {
			var info = that.attrParse(sel), fn;
			fn = (info.condition && info.value) ? fn = that.getAttrFn(info) : function() { return true; };

			return that.filter_function(function(elem) {
				return elem.getAttribute(info.name) ? fn(elem.getAttribute(info.name)) : false;
			});
		},

		'sibling' : function() {
			return that.filter_function(function(elem) {
				var prev = elem.previousSibling;
				while(prev && prev.nodeType != 1) {
					prev = prev.previousSibling;
				}
				return (nodes.indexOf(prev) != -1 );
			});
		},

		'pseudo' : function(sel) {
			sel = sel.substr(1);
			origsel = sel;
			if(/(?:has|not)\(.*\)/.test(sel)) {
				sel = sel.substring(0,sel.indexOf('(')); //cheap and tacky, but what the hell.
				origsel = origsel.replace(/(?:has|not)\((.*)\)/,'$1').replace(/^['"]/,'').replace(/['"]$/,'');
			}
			return that.filter_function(function(elem) {
				return that.pseudo_filter[sel](elem, origsel);
			});
		}
	};

	//determines whether an element matches the pseudo rule. 
	this.pseudo_filter = {
		'first-child' : function(elem) {
			while(elem = elem.previousSibling) {
				if(elem.nodeType == 1) return false;
			}
			return true;
		},

		'last-child' : function(elem) {
			while(elem = elem.nextSibling) {
				if(elem.nodeType == 1) return false;
			}
			return true;
		},

		'only-child' : function(elem) {
			var siblings = elem.parentNode.childNodes;
			for(var i = 0, end = siblings.length; i<end; i++) {
				if(siblings[i].nodeType == 1 && siblings[i] != elem) return false;
			}
			return true;
		},

		'has' : function(elem, sel) {
			return ( $avac(sel, elem, 0, id_safety).length > 0 )
		},

		'not' : function(elem, sel) {
			return ( $avac(sel,elem.parentNode, 0, id_safety).indexOf(elem) === -1 );
		}
	};

	this.pseudo_get = {
		//to get all first children, get all elements, and filter using internal filters to see if they are a first child.
		'first-child' : function(elem) {
			var arr = elem.all ? elem.all : elem.getElementsByTagName('*'), ret = [];
			for(var i=0, end = arr.length; i<end; i++) {
				if(that.pseudo_filter['first-child'](arr[i])) ret.push(arr[i]);
			}
			return ret;
		},

		'last-child' : function(elem) {
			var arr = elem.all ? elem.all : elem.getElementsByTagName('*'), ret = [];
			for(var i=0, end = arr.length; i<end; i++) {
				if(that.pseudo_filter['last-child'](arr[i])) ret.push(arr[i]);
			}
			return ret;
		},

		'only-child' : function(elem) {
			var arr = elem.all ? elem.all : elem.getElementsByTagName('*'), ret = [];
			for(var i=0, end = arr.length; i<end; i++) {
				if(that.pseudo_filter['only-child'](arr[i])) ret.push(arr[i]);
			}
			return ret;
		},

		'has' : function(elem, sel) {
			var arr = elem.all ? elem.all : elem.getElementsByTagName('*'), ret = [];
			for(var i=0, end = arr.length; i<end; i++) {
				if(that.pseudo_filter['has'](arr[i], sel)) ret.push(arr[i]);
			}
			return ret;
		},

		'not' : function(elem, sel) {
			var arr = elem.all ? elem.all : elem.getElementsByTagName('*'), ret = [];
			for(var i=0, end = arr.length; i<end; i++) {
				if(that.pseudo_filter['not'](arr[i], sel)) ret.push(arr[i]);
			}
			return ret;
		}
	};

	//attempt to identify the selector, to see if its a single token. If it is, lets just do it and be done.
	var quick_identify = this.identify(selector);
	if(quick_identify) return this.context_loop(function(elem){ return this.get[quick_identify](elem,selector); });

	this.multiToken = function() {
		var priority_order = [], I;
		//first we will prioritise it. Aka, put it in order by priority for speed.

		for(var o=0, ol=ordering.length; o<ol; o++) {
			while(selectorStorage.indexOf(ordering[o],1) != -1) {
				I = selectorStorage.indexOf(ordering[o],1);
				priority_order.push(selectorStorage[I-1]);
				priority_order.push(selectorStorage[I]);
				selectorStorage[I] = selectorStorage[I] = null;
			}
		}

		nodes = that.context_loop(function(elem){
			return that.get[priority_order[1]](elem,priority_order[0]);
		});

		for(var i=2,ll=priority_order.length; i<ll; i++) {
			var token = priority_order[i]; i++;
			nodes = this.filter[priority_order[i]](token);
		}
		cur_context = nodes;
	};

	for(var i=0,l=chunks.length; i<l; i++) {
		cur_context = nodes;
		if(chunks[i] == ' ') {
			jumping = true;
			continue;
		}
		else {
			var action = this.identify(chunks[i]); //identify this chunk.
			if(!action) throw new Error('Invalid Selector: "'+sel+'"');

			if(jumping) {			
				if(selectorStorage.length) {
					this.multiToken();
				}

				if(action === 'id') { //lets not carry on if its an ID, lets just do it.
					nodes = that.get['id'](null,chunks[i]);
				    continue;
				}
				else if(action === 'child' || action === 'sibling') {
					//this will cause the next token to be pushed into selectorStorage rather than executed.
					i = chunks[i+1] == ' ' ? i+1 : i;
				}

				//if the next chunk is part of the same token, then store it.
				if(chunks[i+1] && chunks[i+1] != ' ' && chunks[i+1]!='>' && chunks[i+1]!='+'){
					selectorStorage.push(chunks[i])
					selectorStorage.push(action);
					jumping = false;
					continue;
				}

				nodes = this.context_loop(function(elem){
					return that.get[action](elem,chunks[i]);
				});
				selectorStorage = []; //empty storage
			}
			else {
				selectorStorage.push(chunks[i])
				selectorStorage.push(action);
			}

			jumping = (chunks[i+1] && chunks[i+1] != ' ' && chunks[i+1]!='>' && chunks[i+1]!='+') ? false : true;
		}
	}
	if(selectorStorage.length) this.multiToken();

  	return nodes;
  }
  
  window.$avac = avac;
})();
