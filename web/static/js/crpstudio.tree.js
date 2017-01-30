/**
 * Copyright (c) 2017 Radboud University Nijmegen.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, Crpstudio, alert: false, */
var crpstudio = (function ($, crpstudio) {
  "use strict";
  crpstudio.tree = (function ($, config) {
    // Local variables within crpstudio.tree
    var marginLeft = 10,      // Margin of whole figure
        wordSpacing = 12,     // Space between nodes
        branchHeight = 70,    // Height between branches
        graphAbstract = {},   // Representation of the total
        root = null;          // Root of the tree

    // Methods that are local to [crpstudio.dbase]
    var private_methods = {
      /**
       * verticalDrawTree
       *    Position everything under node [el] and then return the total width
       *    of the children under me
       * 
       * @param {type} el
       * @param {type} shiftLeft
       * @param {type} shiftTop
       * @returns {undefined}
       */
      verticalDrawTree : function(el, shiftLeft, shiftTop) {
        // Validate
        if (el === undefined || shiftLeft === undefined || shiftTop === undefined) return -1;
        
        // Applied vertical shift of the child depends on the Height of the containernode
        var verticalDelta = branchHeight;
        var childrenWidth = 0;
        var returned = 0;
        var thisX = 0;
        var thisY = 0;
        
        // Fit this node afresh
        private_methods.fitRectangle(el);
        
        // Get the parameters of this node
        var containerNode = private_methods.getRect(el);
        
        // ========== children's WIDTH ==========
        $(el).children(".lithium-tree").each(function() {
          // Is this node visible?
          if (private_methods.isVisible(this)) {
            if (branchHeight - containerNode['height'] <30) {
              // If too close to the child: shift 40 units
              verticalDelta = containerNode['height'] + 40;
            }
            // Call myself, but now with this child
            returned = private_methods.verticalDrawTree(
                    this,
                    shiftLeft + childrenWidth,
                    shiftTop + verticalDelta );                    
            // Add the returned value
            childrenWidth += returned;
          }
          // Check: is length of the containerNode bigger than the total length of the children
          if (childrenWidth > 0 && containerNode['expanded']) {
            // Calculate the max length
            childrenWidth = Math.max(
                    childrenWidth + (containerNode['width']-childrenWidth)/2,
                    childrenWidth);
          }
        });
        
        // Rectify zero
        if (childrenWidth === 0) {
          childrenWidth = containerNode['width'] + wordSpacing;
        }
        
        // ========== Positioning ===============
        thisY = shiftTop;
        var iChildNodes = $(el).children(".lithium-tree").length;
        if (iChildNodes > 0 && containerNode['expanded']) {
          // We should always get to the FIRST child
          var first = private_methods.getRect($(el).children(".lithium-tree").first());
          // Action depends on the #number of children
          if (iChildNodes === 1) {
            // There is only one child: get this child
            thisX = first['x'] + first['width']/2 -containerNode['width']/2;
          } else {
            var firstChild = first['x'] + first['width']/2;
            var last = private_methods.getRect($(el).children(".lithium-tree").last());
            var lastChild = last['x'] + last['width']/2;
            thisX = Math.max(firstChild,
              firstChild + (lastChild - firstChild - containerNode['width'])/2);
          }
        } else {
          thisX = shiftLeft;
        }
        
        // Set the new position of the container node
        containerNode['x'] = thisX;
        containerNode['y'] = thisY;
        private_methods.setRectangle(el, containerNode);
        
        // Return the calculated childrenwidth
        return childrenWidth;
      },
      
      /**
       * fitRectangle
       *    Make sure the WIDTH of the rectangle fits to the text inside it
       * 
       * @param {type} el
       * @returns {undefined}
       */
      fitRectangle : function(el) {
        // Validate
        if (el === undefined) return;
        if ( $(el).is(".lithium-tree")) {
          // Get the node element
          var node = $(el).children(".lithium-node").first();
          // Get to the text element
          var textWidth = $(node).children("text").first().get(0).getBBox().width;
          textWidth += 20;
          // Set the width of the box to the correct value 
          $(node).find("rect").each(function() {
            $(this).attr("width", textWidth.toString());            
          });
        }
      },
      
      /**
       * setRectangle
       *    Set the elements associated with this rectangle to
       *    the indicated X and Y values
       * 
       * @param {type} el
       * @param {type} oRect
       * @returns {undefined}
       */
      setRectangle : function(el, oRect) {
        // Validate
        if (el === undefined) return;
        if ( $(el).is(".lithium-tree")) {
          // Get the current coordinates
          var oCurrent = private_methods.getRect(el);
          // Calculate how much x and y need to be moved
          var move_x = parseInt(oCurrent['x'],10) - parseInt(oRect['x'], 10);
          var move_y = parseInt(oCurrent['y'],10) - parseInt(oRect['y'], 10);
          // Adjust this node's elements:
          // (1) this node's [node]
          $(el).children(".lithium-node").find("rect").each(function() {
            $(this).attr("x", parseInt($(this).attr("x"), 10) + move_x);
            $(this).attr("y", parseInt($(this).attr("y"), 10) + move_y);
          });
          // (2) this node's [toggle element
          $(el).children(".lithium-toggle").find("rect").each(function() {
            $(this).attr("x", parseInt($(this).attr("x"), 10) + move_x);
            $(this).attr("y", parseInt($(this).attr("y"), 10) + move_y);
          });
          $(el).children(".lithium-toggle").find("line").each(function() {
            $(this).attr("x1", parseInt($(this).attr("x1"),10) + move_x);
            $(this).attr("y1", parseInt($(this).attr("y1"),10) + move_y);
            $(this).attr("x2", parseInt($(this).attr("x2"),10) + move_x);
            $(this).attr("y2", parseInt($(this).attr("y2"),10) + move_y);
          });
          // (3) this node's connector
          $(el).children(".lithium-conn").find("line").each(function() {
            $(this).attr("x1", parseInt($(this).attr("x1"),10) + move_x);
            $(this).attr("y1", parseInt($(this).attr("y1"),10) + move_y);
            $(this).attr("x2", parseInt($(this).attr("x2"),10) + move_x);
            $(this).attr("y2", parseInt($(this).attr("y2"),10) + move_y);
          });
        }
      },
      
      isVisible : function(el) {
        return ($(el).css("display") !== "none");
      },
      
      /**
       * moveDiagram
       *    Move the whole diagram in the proposed direction
       * 
       * @param {type} el
       * @param {type} oMove
       * @returns {undefined}
       */
      moveDiagram : function(el, oMove) {
        // Select all the <rect> elements under me
        $(el).find("text,rect").each(function() {
          $(this).attr("x", parseInt($(this).attr("x"), 10) + oMove['x']);
          $(this).attr("y", parseInt($(this).attr("y"), 10) + oMove['y']);
        });
        // Select all the <line> elements under me
        $(el).find("line").each(function() {
          $(this).attr("x1", parseInt($(this).attr("x1"), 10) + oMove['x']);
          $(this).attr("y1", parseInt($(this).attr("y1"), 10) + oMove['y']);
          $(this).attr("x2", parseInt($(this).attr("x2"), 10) + oMove['x']);
          $(this).attr("y2", parseInt($(this).attr("y2"), 10) + oMove['y']);
        });
      },
      
      /**
       * getRect
       *    Get the x,y,w,h coordinates of this element
       * 
       * @param {type} el
       * @returns {RECT object}
       */
      getRect : function(el) {
        // Validate
        if (el !== undefined) {
          // Find first lithium-node under me
          var rect = $(root).find(".lithium-node rect").first();
          if (rect !== undefined) {
            // Create structure with x,y etc
            var oRect = {};
            oRect['x'] = parseInt(rect.attr("x"),10);
            oRect['y'] = parseInt(rect.attr("y"),10);
            oRect['width'] = parseInt(rect.attr("width"),10);
            oRect['height'] = parseInt(rect.attr("height"),10);
            oRect['expanded'] = private_methods.isVisible(el);
            return oRect;
          }
        }
        return null;
      }
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      /**
       * drawTree
       *    Mimic the LithiumControl.DrawTree() method, starting at [el]
       * 
       * @param {type} el
       * @returns {undefined}
       */
      drawTree : function(el) {
        // Validate
        if (el === undefined) return false;
        // Find the root: the top <g> node
        root = $(el).find("g.lithium-root").first();
        if (root === undefined || root === null) return false;
        // Store the location of the root
        var p = private_methods.getRect(root);
        if (p !== undefined && p !== null) {
          // Create the location of the root
          // (This is equivalent to "CenterRoot")
          p['x'] = 500; p['y'] = 300;
          // Set the graphabstract
          graphAbstract['root'] = p;
          // Perform a re-drawing, starting from the root downwards
          private_methods.verticalDrawTree(root, marginLeft, p['y']);
          // Calculate how much must be moved
          var oMove = {x : p['x'] - graphAbstract['root']['x'],
                       y : p['y'] - graphAbstract['root']['y']};
          // Move the whole
          private_methods.moveDiagram(root, oMove);
          
          // Calculate maxY
          var maxY = 0;
          $(root).find("rect,text").each(function() {
            if (private_methods.isVisible(this)) {
              var this_y = parseInt($(this).attr("y"),10);
              if (this_y > maxY) maxY = this_y;
            }
          });
          $(root).find("line").each(function() {
            if (private_methods.isVisible(this)) {
              var this_y = parseInt($(this).attr("y1"),10);
              if (this_y > maxY) maxY = this_y;
              this_y = parseInt($(this).attr("y2"),10);
              if (this_y > maxY) maxY = this_y;
            }
          });
          // Move all items in the y-direction
          $(root).find("rect,text").each(function() {
            if (private_methods.isVisible(this)) {
              $(this).attr("y", maxY - parseInt($(this).attr("y"),10));
            }
          });
          $(root).find("line").each(function() {
            if (private_methods.isVisible(this)) {
              $(this).attr("y1", maxY - parseInt($(this).attr("y1"),10));
              $(this).attr("y2", maxY - parseInt($(this).attr("y2"),10));
            }
          });
          
          // Calculate a minPoint
          var minPoint = {x:1000000, y:1000000};
          var maxSize = {width:0, height:0};
          // Walk over all shapes
          $(root).find("rect,text").each(function() {
            if (private_methods.isVisible(this)) {
              var oThisRect = private_methods.getRect(this);
              var iNewWidth = oThisRect['x'] + oThisRect['width'];
              var iNewHeight = oThisRect['y'] + oThisRect['height'];
              
              // Look for max width / max height
              maxSize['width'] = Math.max(iNewWidth, maxSize['width']);
              maxSize['height'] = Math.max(iNewHeight, maxSize['height']);
              
              // Look for minimum size
              minPoint['x'] = Math.min(minPoint['x'], oThisRect['x']);
              minPoint['y'] = Math.min(minPoint['y'], oThisRect['y']);
            }
          });
          
          // Move the whole diagram, teking into account [minPoint]
          var oMove = {x: 50 - minPoint['x'],
                       y: 50 - minPoint['y']};
          private_methods.moveDiagram(root, oMove);
          
          // Adapt maxSize again
          maxSize['width'] = maxSize['width'] - minPoint['x'] + 100;
          maxSize['height'] = maxSize['height'] - minPoint['y'] + 100;
        }
        // All went well
        return true;
      }
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));
