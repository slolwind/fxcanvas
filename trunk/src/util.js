/*
 * util.js
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */
$Package("buz.util", function(__group__){
  __group__["updateObject"] = function (obj, addMe) {
    for(var x in addMe) {
      if(!(x in Object.prototype)) { // filter out prototype additions from other potential libraries
        if(x != "__w3c_fake" && x != "toString" && x != "valueOf") {// ... and some internals
          obj[x] = addMe[x];
        }
      }
    }
  }; 
  // hello -> Hello
  __group__["capitalize"] = function (word) {
    return word.substr(0, 1).toUpperCase() + word.substr(1);
  };

  var that = $Import({}, "browser");

__group__.propertyChangeListener = function(el, property, func)
{
    var handler = function(evt){
        //trace("changed:" + evt.attrName, property, evt.target.tagName, evt.target.id)
        if(evt.attrName == property)
            func(evt)
    }

    if(that.browser.webkit) {
        var prevValue = el[property]
        var newValue
        setInterval(function(){
            newValue = el[property]
            if(prevValue != newValue) {
                handler({
                    target : el,
                    attrName: property, 
                    prevValue: prevValue,
                    newValue: newValue
                })
                prevValue = newValue
            }
        }, 10 + Math.round(Math.random() * 100))
    } else {
        el.addEventListener("DOMAttrModified", handler, false);
    }
}

});
