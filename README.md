Avac Selector Engine 
===============================

This is basically the same as the rest of them, a CSS Selector Engine, but its also very fast and lightweight.  
Try it out, you might like it.

```javascript
$avac('div.className > [href]');
```

Documentation
-------------
#### What CSS Selectors can I use?
This selector engine doesn't have all the selectors of the likes of Sizzle(jQuery) but it has everything you'll need at least.  
Who really uses all these rediculous pseudo selectors? Not me. And this is for me ... mostly.    
* ID's.    
* Classnames.    
* TagNames.    
* direct child selector '>'    
* Next sibling selector '+'    
* Attributes. Can have optional value. Supports conditions: '*=' '^=' '$=' and '!='     
* :first-child, :last-child, :only-child pseudo selectors.    
* :not(selector) matches elements not matching the selector. .nav:not(div) matches .nav's that are not divs.     
* :has(selector) matches elements that have descendants matching selector. :has(div) , all elements that have divs.   

####What can I not use?
* sibling selector '~'   
* all the horrible -of-type selectors.   
* All the daft jQuery :button,:input selectors.   
* :empty   
* and all the horrible nth-of-type and things.   

####What can I expect to see in the future?
* MAYBE sibling selector '~'     
* MAYBE :empty pseudo class.   
* MAYBE a :nothas() selector since no one has done it I don't think.   


#### Context Parameter   
A second parameter (context) is accepted... obviously.   
It can be either an Element Object, an Array of Element Objects, a Node collection object, or a string.   
A string will be assumed as a another selector. `$avac('div.content',document.getElementById('main'))`


#### Changing Priority Order. 
*Hopefully this makes sense.*  
When dealing with what I call 'multi tokens' this selector engine will prioritise in which order to execute them.   
Multi tokens are more than one rule like 'div.class' or 'a[title="hello"]' or '.class.content' , just things with more than one rule. 

So for example with 'div.content' instead of getting all the DIV tags, and going through them all to check if they match '.class'   
The engine will instead take the className as the higher priority. This means it will get the elements with className 'class' and check if they're a div. So we're noy looping through loads of elements. 

However, you may be in a situation where this isn't great. I'll demonstrate with an example, take this HTML: 
            <div id="test"> 
            
                <div class="test"></div>   
                <div class="test"></div>     
                <div class="test"></div>   
                <div></div>  
                <div></div>    
                <span class="test"></span>   
                <span class="test"></span>   
            </div> 

Take this selector: 'span.test'   
Looping through all the elements with classname of test here wouldn't be the best.   
What would be best would be getting the SPANS's first and *then* checking if they match '.test'

This example isn't great since it wouldn't make much speed difference. But there can be occasions.  
Which is why this selector engine allows you to change the priority of how things are dealt with. By specifying it in an array as the third parameter.

`$avac('#test span.test', false, ['t','.',':','['])`   
Doing this means it will get the SPANS first then filter the classnames, then pseudos then filter the attributes.  
Hence executing and returning the nodes faster.   

The default order is 'class','tag','pseudo','attr'
Specifying any less or more than 4 will result in it not being set.    
You can set it using an array containing t for tag, . for class, : for pseudo and [ for attr. Or just put the words tag, class etc...

#### Fourth Parameter - Yes a fourth?
There's a random 4th parameter that isn't too important but you may need to use at time to time.
If you pass a selector like this 'div div#foo .bar', the selector will be cut to this '#foo .bar' since ID's should be unique.
If you wish for the selector not to be cut, set the fourth parameter as true.   
`$avac('div.foo span#bar > a',0,0,1)`

#### Other notes I'd like to make
* querySelectorAll is supported. But not if you use :not() or has() obviously.
* Like explained above, multi tokens will be prioritised and take the predicted fastest path, which is currently making this selector engine nice and fast.
* The selector engine supports a range of browsers but not as much as the likes of Sizzle. Any suggestions or improvements for browser support would be good.
* There are shortcuts in the script for optimization. SUCH AS when the specified attribute is 'href' it will only get A tags. 
* Another is when the specified attribute is 'name' it will check getElementsByName support and use that.
* The third parameter can actually make a massive difference. It may not seem like it, but it can do. use it wisely, this is something no other selector has provided.
* Will I ever offer an API for adding more pseudo's or selectors? Probably not. If you need to add more, your doing something wrong IMO.