Avac Selector Engine 
===============================

This is basically the same as the rest of them, a CSS Selector Engine, but its also pretty fast and lightweight.  
Try it out, you might like it.

```javascript
$avac('div.className > [href]');
```

Documentation
-------------
#### What CSS Selectors can I use?
This is not a finished project as of now, and so is not yet capable of CSS3 Selectors, however its capable with a large amount of CSS2.  
Here's a list of things already done, and what I plan on adding.
* ID's.   
* Classnames.  
* TagNames.  
* direct child selector '>'  
* Next sibling selector '+'  
* Attributes. Can have optional value. Supports conditions: '*=' '^=' '$=' and '!='  

###### Still to add.
* previous sibling selector '~'
* :first-Child
* :first-of-type
* :last-of-type
* :only-of-type
* :only-child
* :last-child
* :empty
* :not()
* :first
* :last
... I'll probably not do anything else. I hate nth-of-type and such things lol.


#### Context Parameter   
A second parameter (context) is accepted.   
It can be either an Element Object, an Array of Element Objects, a Node collection object, or a string.   
A string will be assumed as a another selector. `$avac('div.content',document.getElementById('main'))`


#### Changing Priority Order. 
*Hopefully this makes sense.*  
When dealing with what I call 'multi tokens' this selector engine will prioritise in which order to execute them.   
Multi tokens are more than one rule like 'div.class' or 'a[title="hello"]' or '.class.content' , just things with more than one rule. 

So for example with 'div.content' instead of getting all the DIV tags, and going through them all to check if they match '.class'   
The engine will instead take the className as the higher priority. This means it will get the elements with className 'class' and check if they're a div. So we're no looping through loads of elements. 

However, you may be in a situation where this isn't great. I'll demonstrate with an example, take this HTML: 
```javascript
<div id="test">    
  <div class="test"></div>    
  <div></div>   
  <div></div> 
  <div></div>
  <div></div>  
  <span class="test"></span>   
  <span class="test"></span>     
</div>  
```

And this selector: '#test div.test'  
The selector engine when it comes to div.post it will normally find all elements with classname of 'test' first.   
Thus giving us 3 elements. It then checks those 3 elements if they are DIV. In this case, that would be the faster route.  

However, take this selector: '#test span.test'   
Looping through all the elements with classname of test here wouldn't be the best.   
What would be best would be getting the SPANS's first and *then* checking if they match '.test'

This example isn't great since it wouldn't make much speed difference. But there can be occasions.  
Which is why this selector engine allows you to change the priority of how things are dealt with. By specifying it in an array as the third parameter.

```javascript
$avac('#test span.test', false, ['tag','class','attr']);
```
Doing this means it will get the SPANS first then filter the classnames then filter the attributes.  
Hence executing and returning the nodes faster.   

The default order is 'tag','class','attr'
Specifying any less or more than 3 will result in it not being set. Specifying any other words will result in it likely breaking the script. So be wise haha.   

So yeah enjoy :)
The list above of what is supported will be updated every now and then when things have been updated obviously.