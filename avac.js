/* 
* Avac CSS Selector Engine. 
* Created by LGforum @ AvacWeb (avacweb.com)
* AvacWeb Copyright 2011-2012
* All Right Reserved.
* No unauthorized distrubution or copying.
*/

(function(){
var avac = function(selector, context, new_priority) {
	if(!selector || selector == '' || selector==' ') return;

	//cut off all before any ID's. Go straight to id.
	if(selector.indexOf('#')!=-1) {
		selector = selector.substring(selector.lastIndexOf('#'));
	}
	
	//sort context out.
	if(context) {
		//if its a string, we'll assume its a selector.
		if(typeof context === 'string')	context = $avac(context);
		//it should be an object now. 
		if(typeof context === 'object') {
			//cur_context needs to be an array, not node collection. Check for concat.
			var cur_context = ('concat' in context) ? context : 
			//not contact, so could be an element object or a node collection.
						  ('tagName' in context) ? [context] : Array.prototype.slice.call(context);
		}
		else{
			var cur_context = [document]
		}
	}
	else {
		var cur_context = [document]
	}
	
	var chunky = /(?:#[^\>\+\.\s\[:]+)|(?:\.[^\>\+\.\s\[:]+)|(?:\[\w+(?:[\$\*\^!]?=["'][\w\s]+["'])?\])|(?:[\>\+])|\w+|\s|(?::[\w-]+)/g;
	//split the selector up into manageable chunks.
	var chunks = selector.match(chunky)
	, that = this
	, jumping = true
	, previousNodes = cur_context
	, selectorStorage = []	//stores in parts of a selector which is all one. Like div.post
	, ordering;
	
	//if QSA is supported, perform QSA on all context elems.
	if(document.querySelectorAll) {
		var ret = [];
		for(var ci=0,cl=cur_context.length; ci<cl; ci++) {
			ret = ret.concat( Array.prototype.slice.call( cur_context[ci].querySelectorAll(selector) ) );
		}
		return ret;
	}
	
	if(new_priority && new_priority.length == 3) {
		ordering = ['sibling','child',new_priority[0],new_priority[1],new_priority[2],'pseudo']
	} 
	else {
		//default priority ordering.
		ordering = ['child','sibling','class','tag','pseudo','attr']
	}

	//the possibilities of what each chunk could be.
	this.possibles = {
		'id': /^#[^\>\+\.\s\[:]+$/,
		'class': /^\.[^\>\+\.\s\[:]+$/,
		'tag': /^[^\>\+\.\s\[:="']+$/,
		'child': /^\>$/,
		'attr': /^(?:\[\w+(?:[\$\*\^!]?=["'][\w\s]+["'])?\])$/,  
		'sibling': /^\+$/,
		'pseudo' : /^:(?:first|last|only(?:-of-type|-child))|empty|not\(.*\)$/
	};
    
	//when sent a chunk, it will return the type of selector in word form, to then perform the necessary actions.
	this.identify = function(sel) {
		for(var type in that.possibles) {
			if (that.possibles[type].test(sel)) return type;
		}
		return false;
	};
	
	//return elements by classname. 
	this.byClass = function(elem,classname) {
		if(elem.getElementsByClassName) {
			return Array.prototype.slice.call(elem.getElementsByClassName(classname));
		}
		else {
			var arr = elem.getElementsByTagName('*'), matches = [];
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
			//get the ID. Lose the tagname if there is one... its not needed. 
			var id = sel.substr(1);
			return [document.getElementById(id)];
		},
      
		'class': function(elem,sel) {
			var classname = sel.substr(1);
			return that.byClass(elem,classname);
		},
      
		'tag': function(elem,sel) {
			//assuming everything has been identified correctly... sel should be the tag.
			return Array.prototype.slice.call(elem.getElementsByTagName(sel));
		},
	  
		'attr': function(elem,sel) {
			var info = that.attrParse(sel), fn;
			
			//fn will be the function to perform on the attribute value to decide if this is a match.
			fn = (info.condition && info.value) ? fn = that.getAttrFn(info) : fn = function() { return true; };
			return that.byAttr(elem,info,fn);
		},
	  
		'child' : function(elem,sel) {
			return elem.firstChild ? Array.prototype.slice.call(elem.childNodes) : [];
		},
	  
		'sibling' : function(elem,sel) {
			while(elem = elem.nextSibling) {
				if(elem.nodeType==1) return [elem];
			}
			return [];
		},
		
		'pseudo' : function(elem, sel) {
			sel = sel.substr(1);
			return that.pseudo_get[sel](elem);
		}
	};
	
	//loops through all the contexts performing a function. 
	//the function should return nodes.
	this.context_loop = function(fn) {
		var arr = cur_context, l = cur_context.length, ret = [];
		for(var i = 0; i<l; i++) {
			if(arr[i].nodeType!=1 && arr[i].nodeType!=9) continue;
			ret = ret.concat(fn(arr[i]));
		}
		return ret;
	};
    
	//filters nodes in order to match more than one rule.
	//fn should be a function to perform on each node, returning true if it matches the rule.
	this.filter_function = function(fn) {
		var loop_arr = previousNodes, ret = [], ll=loop_arr.length;
		for(var i=0,ll=loop_arr.length; i<ll; i++) {
			if(loop_arr[i].nodeType!=1 && loop_arr[i].nodeType!=9) continue;
			if(fn(loop_arr[i])) ret.push(loop_arr[i]);
		}
		return ret;
	};
	
	this.filter = {
		//these functions will filter the previousNodes array on another rule.
		//for example 'div.post', we will have prioritised and got the '.posts', and now we'll filter out the ones which aren't a div.
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
			//fn will be the function to perform on the attribute value to decide if this is a match.
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
				return (previousNodes.indexOf(prev) != -1 );
			});
		},
		
		'pseudo' : function(sel) {
			sel = sel.substr(1);
			return that.filter_function(function(elem) {
				return that.pseudo_filter[sel](elem);
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
		}
	};
	
	//attempt to identify the selector, to see if its a single token.
	var quick_identify = this.identify(selector);
	if(quick_identify) return this.context_loop(function(elem){ return this.get[quick_identify](elem,selector); });
	
	//when we are storing a (what I'm calling) MultiToken (eg div.post) this function will prioritise the order to execute it.
	//rather than finding all div's and checking if they have the class 'post'. Find all '.posts' and check if they're a div. 
	//which is VERY LIKELY quicker.
	this.multiToken = function() {
		var priority_order = [], I;
		//first we will prioritise it. Aka, put it in order by priority. Class's then tags, then attr's. 
		
		for(var o=0, ol=ordering.length; o<ol; o++) {
			while(selectorStorage.indexOf(ordering[o],1) != -1) {
				I = selectorStorage.indexOf(ordering[o],1);
				priority_order.push(selectorStorage[I-1]);
				priority_order.push(selectorStorage[I]);
				selectorStorage[I] = selectorStorage[I] = null;
			}
		}
		
		//perform the first one. Since its at the start its considered highest priority.
		//continuing with our div.post example, it will have been prioritised to ['.post','class','div','tag']
		//so now we're gonna get the .post's
		previousNodes = that.context_loop(function(elem){
			return that.get[priority_order[1]](elem,priority_order[0]);
		});
		
		//now lets filter the results to make sure the match all the others. With our div.post example, this would now be checking they are divs.
		for(var i=2,ll=priority_order.length; i<ll; i++) {
			var token = priority_order[i];
			i++;
			previousNodes = this.filter[priority_order[i]](token);
		}
		cur_context = previousNodes;
	};
	
	for(var i=0,l=chunks.length; i<l; i++) {
		cur_context = previousNodes;
		if(chunks[i] == ' ') {
			jumping = true;
			continue;
		}
		else {
			var action = this.identify(chunks[i]); //returns a string such as 'tag' or 'class'. 
			if(!action) throw new Error('Invalid Selector: "'+sel+'"');
			if(jumping) {			
				
				//if we've stored a token, then now lets prioritise and execute it.
				if(selectorStorage.length) {
					this.multiToken();
				}
				
				//special cases that require special attention.
				if(action === 'id') {
					previousNodes = that.get['id'](null,chunks[i]);
				    continue;
				}
				//[#id, ,>, ,div]
				else if(action === 'child' || action === 'sibling') {
					//this will cause the next token to be pushed into selectorStorage rather than executed.
					i = chunks[i+1] == ' ' ? i+1 : i;
				}

				//if the next chunk is part of the same token, then lets not execute just yet.
				if(chunks[i+1] && chunks[i+1] != ' ' && chunks[i+1]!='>' && chunks[i+1]!='+'){
					selectorStorage.push(chunks[i])
					selectorStorage.push(action);
					jumping = false;
					continue;
				}
				
				previousNodes = this.context_loop(function(elem){
					return that.get[action](elem,chunks[i]);
				});
				selectorStorage = [];
			}
			else {
				//we're not jumping to the next bit in the selector, its the same chunk. 
				//eg div.post  - We will store each part of this single token, and then decide the fastest way.
				selectorStorage.push(chunks[i])
				selectorStorage.push(action);
			}
			
			if(chunks[i+1] && chunks[i+1] != ' ' && chunks[i+1]!='>' && chunks[i+1]!='+') {
				jumping = false;
			}
			else {
				jumping = true;
			}
		}
	}
	
	//before returning, we may have a stored token to do, so lets do that.
	if(selectorStorage.length) this.multiToken();
	
  return previousNodes;
  }
  window.$avac = avac;
})();