Avac Selector Engine 
===============================
Original Size:	3.61KB gzipped (10.45KB uncompressed)
Compiled Size:	2.07KB gzipped (5.44KB uncompressed)

This is basically the same as the rest of them, a CSS3 Selector Engine, but its also very fast and lightweight. It has an abundance of helpful pseudo's, but I dislike all of the silly '-of-type' or 'nth' selectors, maybe will be added in the future. See further down for selectors.

```javascript
$avac('div.className > [href]');
```

Selectors
-------------
This selector engine doesn't have all the selectors of the likes of Sizzle(jQuery) but it still has everything you'll need and more. Who really uses all these rediculous nth and of-type pseudo selectors? Not me. And this is for me ... mostly, but I may add them should I find others are using this selector engine.

#### Basics
You all know how to use these. http://www.w3schools.com/cssref/css_selectors.asp       
* ID's.    
* Classnames.    
* TagNames.  

#### Attributes
You can select using attributes inbetween the tradition square brackets. 
Eg `$avac('a[rel]')` Selects all a tags with a rel attribute.    

Specifying a value is optional too:
`$avac('a[rel=nofollow]')` Selects all a tags with a rel attribue of 'nofollow'.   

The conditional statement can also take on these roles: *=,~=,^=,|=,$=,!=,==
All talked about in the link above. != means not equals obviously.    

#### Regex Attribute Selectors
This is new and experimental, but I've added the ability to match attributes with a regexp.

It looks as follows:
```javascript
$avac('div[id/=^content]')
```
This matches all div's that have an ID attribute matching the regexp `/^content/`

To add modifiers to the regex, seperate them with a space at the end: `$avac('div[id/=^content i]')`
Now its case-insensitive.

#### Relative Selectors.
* The next sibling selector: '+'  `$avac('div + p');`   
* The preceded sibling selector: '~' `$avac('div ~ p');`    
* The direct child selector: '>'   `$avac('div > p');`    

#### Pseudo Selectors.
* __first-child__    
Eg. `$avac('div:first-child')` selects all divs which are the first child of its parent.
* __last-child__   
Eg. `$avac('div:last-child')` selects all divs which are the last child of its parent.
* __only-child__    
Eg. `$avac('div:only-child')` selects all divs which are the only child of its parent.
* __hidden__     
Eg. `$avac('div:hidden')` selects all hidden divs. Hidden by display or visibility property. Or an input of type hidden.
* __visible__    
Opposite of hidden.
* __contains( string )__
Selects all the elements which contain the given string. Please note, you should not contain any closing brackets in the string as it confuses matters. 
* __notcontains( string )__    
Opposite of contains. Selects elements which do not contain the string.
* __empty__     
Eg. `$avac('div:empty');` Selects all divs that have no children (including text nodes)
* __not( selector )__
Selects all elements that do not match the selector in the brackets. Its recommended to only use simple selectors inside the brackets. Again you should not contain ')' inside the brackets as it confuses things. 
Eg. `$avac('div:not([id])')` Selects all divs which do not have an ID attribute.
* __has( selector )__    
Selects all elements that have a descendant matching the selector in the brackets.
Eg. `$avac('div:has(.inner)')` Selects all divs which have a descendant with classname inner.
* __nothas(selector)__    
Opposite of has. Selects all elements which do not have a descendant matching the selector. 
* __selected__    
Selects elements which are selected. Eg `$avac('input[type=text]:selected')`
* __input__    
Selects all inputs, including textarea, selects, inputs and buttons
* __enabled__   
Selects all enabled elements. Mostly applying to form elements.
* __disabled__
Opposite of enabled. 
* __checkbox__  
selects all elements which are a checkbox.
* __text__ 
Selects all elements of type=text
* __radio__
Selects all elements of type 'radio'
* __checked__
Selects all checkbox/radio elements which are checked.
* __header__
Selects all elements which are a header element. h1, h2 etc...

#### Pseudos which change the current set
* __eq( n )__
Chooses the nth matching element. Eg `$avac('div:eq(1)');` Matches the second div.
This is useful for when you want to continue the search.
* __gt( n )__    
Selects all elements at an index greater than n. 
Eg `$avac('div:gt(2)');` Will return the 3rd div and onwards.
* __lt( n )__    
Selects all elements at an index less than n. 
Eg `$avac('div:lt(2)');` Will return the 3rd div and all before.
* __nth( n )__
Selects every nth element.
Eg `$avac('div:nth(3)');` will select the 3rd, 6th, 9th divs and so on.
* __first__ 
Selects the first matching element. Same as :eq(0)
* __last__    
Selects the last matching element. Eg `$avac('div:last')` .
* __odd__ 
This selects all elements at an odd index. 
* __even__
This is the opposite of odd obviously.


Context Parameter     
----------------------------
A second parameter (context) is accepted... obviously.
It can be an element node, nodelist or an array of nodes. It is 'document' by default.

`$avac('div.content', document.getElementById('main'))`
`$avac('a[href]', $avac('div.content'));`


Adding Custom Pseudo selectors.  
------------------------------
Avac Selector Engine can have more pesudo filters added to it using the `$avac.add_pseudo(name, func)` method.

#### Parameters
* __name__
The name of your pseudo. Don't include a colon. 

* __func__
The function should act as filter returning true or false if the element matches the pseudo conditions. 
It receives 2 arguments, a node to filter and any value specified for the pseudo (inbetween brackets). 

#### Example usage
```javascript
$avac.add_pseudo('external', function(elem, attr) {
	var val = elem.getAttribute(attr);
	return (val && /^http/.test(val));
});

$avac('a:external(href)'); //returns all external links
$avac('img:external(src)'); //returns all images hosted externally.

$avac.add_pseudo('src-has', function(elem, value) {
	return elem.src && elem.src.indexOf(value) != -1);
});

$avac('div img:src-has(thumb)'); //returns all images with 'thumb' in the src. 
```
Easy.


Other notes I'd like to make 
------------------------------------    
* querySelectorAll is supported if the browser supports it and the selector string can be handled by QSA.
* The selector engine supports a range of browsers but not as much as the likes of Sizzle. Any suggestions or improvements for browser support would be good. It will support IE7+ However I did not check any earlier. 
* Bug reports/improvements are more than welcome. 
* There is a shortcut for speed in the script available. Look through for the big comment. 
