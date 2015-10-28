/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, erwin, Crpstudio, alert: false, */
var Crpstudio = (function ($, Crpstudio) {
  "use strict";
  Crpstudio.test = (function ($, config) {
    // Methods tdbahat are local to [crpstudio.project]
    var private_methods = {
      priv_test: function(a,b) {return a+b;}
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      init: function() { var i = 1;},
      ext_test: function(a,b) { var x = private_methods.priv_test(a,b); return "ext_test is okay+"+x; }
    };
  }($, Crpstudio.config));
  
  // return Crpstudio;
  
}(jQuery, Crpstudio || {}));

Crpstudio.test


var testModule = (function () {
 
  var counter = 0;
 
  return {
 
    incrementCounter: function () {
      return counter++;
    },
 
    resetCounter: function () {
      console.log( "counter value prior to reset: " + counter );
      counter = 0;
    }
  };
 
})();
 
// Usage:

 
// Increment our counter
testModule.incrementCounter();
 
// Check the counter value and reset
// Outputs: counter value prior to reset: 1
testModule.resetCounter();
