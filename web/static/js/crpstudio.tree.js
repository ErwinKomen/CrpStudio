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
        shadowDepth = 5,      // How thick the shadow is
        bDebug = false,       // Debugging set or not
        level = 0,            // Recursion level of vertical draw tree
        graphAbstract = {},   // Representation of the total
        width = 1025,         // Initial canvas width
        height = 631,         // Initial canvas height
        root = null;          // Root of the tree

    // Methods that are local to [crpstudio.dbase]
    var private_methods = {
      /**
       * centerRoot
       *    Set the [root] in the center of [width] and [height]
       * 
       * @param {type} el
       * @returns {undefined}
       */
      centerRoot : function(el) {
        // Validate: exist and must be <g> with class "lithium-root"
        if (el === undefined) return false;
        if (!$(el).is(".lithium-tree")) return false;
        var oRect = {x: Math.ceil(width/2),
                     y: Math.ceil(height/2),
                     width: parseInt($(el).attr("width"), 10),
                     height: parseInt($(el).attr("height"), 10)};
        private_methods.setLocation(el, oRect);
      },
      getText : function(el) {
        // Validate
        if (el === undefined) return "";
        if (!$(el).is(".lithium-tree")) return "";
        return $(el).children(".lithium-node").children("text").first().text();
      },
      classAdd : function(el, sClass) {
        var arClass=[], idx, sList;
        sList = $(el).attr("class");
        if (sList !== undefined && sList !== "") {
          arClass = sList.split(" ");
        }
        idx = arClass.indexOf(sClass);
        if (idx <0) { arClass.push(sClass);}
        $(el).attr("class", arClass.join(" "));            
      },
      classRemove : function(el, sClass) {
        var arClass=[], idx, sList;
        sList = $(el).attr("class");
        if (sList !== undefined && sList !== "") {
          arClass = sList.split(" ");
        }
        idx = arClass.indexOf(sClass);
        if (idx >=0) { arClass.splice(idx,1); }
        $(el).attr("class", arClass.join(" "));
      },
      /**
       * setLocation
       *    If this is a <g> element from 'lithium-tree', then
       *    set the x,y,width,height attributes according to oRect
       * 
       * @param {type} el
       * @param {type} oRect
       * @returns {Boolean}
       */
      setLocation : function(el, oRect) {
        // Validate: exist and must be <g> with class "lithium-tree"
        if (el === undefined) return false;
        if (!$(el).is(".lithium-tree")) return false;
        $(el).attr("x", oRect['x']);
        $(el).attr("y", oRect['y']);
        $(el).attr("width",  oRect['width']);
        $(el).attr("height", oRect['height']);
        // Debugging: immediately apply this location
        private_methods.applyOneLocation(el);
        return true;
      },
      /**
       * getLocation
       *    If this is a <g> element from 'lithium-root', then
       *    set the x,y,width,height attributes according to oRect
       *        
       * @param {type} el
       * @returns {crpstudio_tree_L9.crpstudio_tree_L11.private_methods.getLocation.oRect}
       */
      getLocation : function(el) {
        var oRect = {};
        // Validate: exist and must be <g> with class "lithium-root"
        if (el === undefined) return oRect;
        if (!$(el).is(".lithium-tree")) return oRect;
        oRect['x'] = parseInt($(el).attr("x"), 10);
        oRect['y'] = parseInt($(el).attr("y"), 10);
        oRect['width'] = parseInt($(el).attr("width"), 10);
        oRect['height'] = parseInt($(el).attr("height"), 10);
        oRect['expanded'] = private_methods.isVisible(el);
        return oRect;
      },
      /**
       * applyLocations
       *    Visit each .lithium-tree element and apply the position changes
       *    to its <rect>, <text> and <line> elements
       * 
       * @param {type} el
       * @param {string} sType
       * @returns {undefined}
       */
      applyLocations : function(el, sType) {
        var gParent, sPath;
        
        // Validate
        if (el === undefined) return false;
        switch(sType) {
          case "loc":
            // Visit all lithium-tree elements
            $(el).find(".lithium-tree").each(function() {
              private_methods.applyOneLocation(this);
            });
            break;
          case "conn":
            // Visit all lithium-tree elements
            $(el).find(".lithium-tree").each(function() {
              // Re-create the [conn] to go from me to my parent
              gParent = $(this).parent();
              if ($(gParent).is(".lithium-tree")) {
                sPath = private_methods.svgConn(this, gParent);
                $(this).children(".lithium-conn").first().html(sPath);
              }
            });
            break;
        }
        
        // Return positively
        return true;
      },
      /**
       * applyOneLocation
       *    Apply changes to this one location
       * 
       * @param {type} gThis
       * @returns {undefined}
       */
      applyOneLocation : function(gThis) {
        // Validate
        if (gThis === undefined) return false;
        if (!$(gThis).is(".lithium-tree")) return false;
        // Get my main components
        var node = $(gThis).children(".lithium-node").first();
        // The [node] contains: [rect], [shadow] and [text]
        var mainRect = $(node).children("rect").first();
        var shadowRect = $(node).children(".lithium-shadow").children("rect").first();
        var mainText = $(node).children("text").first();
        // Calculate the shift
        var shift_x = parseInt($(gThis).attr("x"), 10) - parseInt($(mainRect).attr("x"), 10);
        var shift_y = parseInt($(gThis).attr("y"), 10) - parseInt($(mainRect).attr("y"), 10);
        var new_w = parseInt($(gThis).attr("width"), 10) ;
        var new_h = parseInt($(gThis).attr("height"), 10);
        // Apply the shift to the rect-elements
        private_methods.applyRectShiftSize(mainRect, shift_x, shift_y, new_w, new_h);
        private_methods.applyRectShiftSize(shadowRect, shift_x, shift_y, new_w, new_h);
        // Apply the rect-like shift to the <text> element
        //   (but do not change its size)
        private_methods.applyRectShiftSize(mainText, shift_x, shift_y, -1, -1);
        // Do we have a toggle?
        var toggle = $(gThis).children(".lithium-toggle");
        if ($(toggle).length > 0) {
          // Treat the [toggle]
          var toggleRect = $(toggle).children("rect").first();
          var toggleLines = $(toggle).children("line");
          // Calculate the toggle position
          var oToggle = private_methods.getRectSize(toggleRect);
          oToggle['x'] = parseInt($(mainRect).attr("x"), 10) + 
               Math.ceil((parseInt($(mainRect).attr("width"), 10) - 
                                   oToggle['width'])/2);
          oToggle['y'] = Math.ceil(parseInt($(mainRect).attr("y"), 10) + new_h);
          // Now clear the entire toggle contents
          $(toggle).empty();
          // Start building up again: add the correct rect
          var sRect = private_methods.svgRect(oToggle);
          
          // The visibility of the vertical bar depends on whether one or more children are invisible
          var bPlus = private_methods.isVisible($(gThis).children(".lithium-tree").first());
          
          // Create new content
          var sLines = private_methods.crossInRect(oToggle, bPlus);
          // Add this content
          $(toggle).html(sRect + sLines);
        }
        // Connections: special case TODO: adapt
        var connPart = $(gThis).children(".lithium-conn");
        if ($(connPart).length>0) $(connPart).empty();
        return true;
      },
      /**
       * svgConn
       *    Create the SVG text of a path from src to dst
       *    where these are <g> elements of class 'lithium-tree'
       * 
       * @param {type} gSrc
       * @param {type} gDst
       * @param {type} oParams
       * @returns {undefined}
       */
      svgConn : function(gSrc, gDst, oParams) {
        // Validate
        if (!$(gSrc).is(".lithium-tree") || !$(gSrc).is(".lithium-tree")) return "";
        // Get the start and end rectangles
        var oSrc = private_methods.getRectSize(gSrc, ".lithium-tree");
        var oDst = private_methods.getRectSize(gDst, ".lithium-tree");
        if (oSrc === null || oDst === null) return "";
        // Set default values
        var sStroke = "black";
        var sStrokeWidth = "0.5";
        if (oParams !== undefined) {
          if (oParams.hasOwnProperty("stroke")) sStroke = oParams["stroke"];
          if (oParams.hasOwnProperty("stroke-width")) sStrokeWidth = oParams["stroke-width"];
        }
        // Calculate three points
        var iHalfWsrc = Math.ceil(oSrc['width']/2);
        var iHalfWdst = Math.ceil(oDst['width']/2);
        var p1 = {x: oSrc['x'] + iHalfWsrc,
                  y: oSrc['y']};
        var p2 = {x: p1['x'], 
                  y: Math.ceil((oDst['y'] + oSrc['y'] + oDst['height'])/2)};
        var p3 = {x: oDst['x'] + iHalfWdst,
                  y: p2['y']};
        var p4 = {x: p3['x'],
                  y: oDst['y'] + oDst['height']};
        // Small 1-pixel rectifications
        if ( Math.abs(p2['x']- p3['x']) === 1) {
          // Adjust p1 and p2
          p1['x'] = p3['x'];
          p2['x'] = p3['x'];
        }
        // Start building the correct path
        var sHtml = [];
        // Start: supply starting point [p1]
        sHtml.push("<path d='M" + p1['x'] + " " + p1['y']);
        // vertical line from p1 to p2
        sHtml.push("L" + p2['x'] + " " + p2['y']);
        // horizontal line from p2 - p3
        sHtml.push("L" + p3['x'] + " " + p3['y']);
        // vertical line from p3 - p4
        sHtml.push("L" + p4['x'] + " " + p4['y']);        
        // Finish the path
        sHtml.push("'"); // sHtml.push("Z'");
        // Supply the other parameters
        sHtml.push("stroke='" + sStroke + "'");
        sHtml.push("stroke-width='" + sStrokeWidth + "'");
        sHtml.push("fill='none' />");
        // Return what we have made
        return sHtml.join(" ");
      },
      /**
       * svgRect
       *    Construct a rectangle according to the parameters in [oRect]
       * 
       * @param {type} oRect
       * @returns {undefined}
       */
      svgRect : function(oRect) {
        // Validate
        if (!oRect.hasOwnProperty("x") || !oRect.hasOwnProperty("y") ||
            !oRect.hasOwnProperty("width") || !oRect.hasOwnProperty("height")) return "[RECT-ERROR]";
        // Add default arguments if  needed
        if (!oRect.hasOwnProperty("stroke")) oRect['stroke'] = "black";
        if (!oRect.hasOwnProperty("stroke-width")) oRect['stroke-width'] = "0.5";
        if (!oRect.hasOwnProperty("fill")) oRect['fill'] = "white";
        // Now create the svg stuff
        var sBack = "<rect x='" + oRect['x'] + 
                        "' y='" + oRect['y'] + 
                        "' width='" + oRect['width'] + 
                        "' height='" + oRect['height'] + 
                        "' fill='" + oRect['fill'] + 
                        "' stroke='" + oRect['stroke'] + 
                        "' stroke-width='" + oRect['stroke-width'] + "' />";
        // Return what we made
        return sBack;
      },      
      /**
       * crossInRect
       *    Make the SVG (string) for a vertical and horizontal bar within [oRect]
       * 
       * @param {type} oRect
       * @param {type} bPlus
       * @returns {undefined}
       */
      crossInRect : function(oRect, bPlus) {
        var lHtml = [];
        // Horizontal line: not hidden
        lHtml.push(private_methods.svgLine(oRect['x']+1, 
            oRect['y'] + Math.ceil(oRect['height']/2),
            oRect['x'] + oRect['width']-1,
            oRect['y'] + Math.ceil(oRect['height']/2), 
            false));
        // Vertical line: hidden (initially)
        lHtml.push(private_methods.svgLine(
            oRect['x'] + Math.ceil(oRect['width']/2), 
            oRect['y'] + 1,
            oRect['x'] + Math.ceil(oRect['width']/2),
            oRect['y'] + oRect['height'] - 1, 
            bPlus));
        // Return the combination
        return lHtml.join("\n");
      },
      /**
       * svgLine
       *    Make the SVG code for a line from [x1,y1] to [x2,y2]
       *    Add class "hidden" if [bHidden] is true
       * 
       * @param {type} x1
       * @param {type} y1
       * @param {type} x2
       * @param {type} y2
       * @param {type} bHidden
       * @returns {undefined}
       */
      svgLine : function(x1, y1, x2, y2, bHidden) {
        var sLine = "<line x1='" + x1 + 
                    "' y1='" + y1 + "' x2='" + x2 + 
                    "' y2='" + y2 + "' stroke='black' stroke-width='0.5' />";
        if (bHidden) {
          sLine = "<g class='lithium-vbar hidden'>" +
                  sLine + "</g>";
        }
        return sLine;
      },
      applyRectShiftSize : function(el, shift_x, shift_y, new_w, new_h) {
          // Apply the shift to the rect-elements
          $(el).attr("x", parseInt($(el).attr("x"), 10) + shift_x);
          $(el).attr("y", parseInt($(el).attr("y"), 10) + shift_y);
          if (new_w > 0) parseInt($(el).attr("width", new_w), 10);
          if (new_h > 0) parseInt($(el).attr("height", new_h), 10);
      },
      applyLineShift : function(el, shift_x, shift_y) {
          // Apply the shift to the rect-elements
          $(el).attr("x1", parseInt($(el).attr("x1"), 10) + shift_x);
          $(el).attr("y1", parseInt($(el).attr("y1"), 10) + shift_y);
          $(el).attr("x2", parseInt($(el).attr("x2"), 10) + shift_x);
          $(el).attr("y2", parseInt($(el).attr("y2"), 10) + shift_y);
      },
      /**
       * verticalDrawTree
       *    Position everything under <g class='lithium-root'> node [el] 
       *    and then return the total width of the children under me
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
        var parWidth = 0;
        var shiftAdd = 0;
        var space = " ";
        
        // Adapt the recursion level
        level+= 1;
        
        // Get the text of this element
        var sElText = private_methods.getText(el);
        
        // =========== Debugging ========================
        if (bDebug) console.log(level + ":" + space.repeat(level) + sElText + " sl=" + shiftLeft);
        // ==============================================
        
        // Fit node around text and get its width/height
        var containerNode = private_methods.fitRectangle(el);
        
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
                    shiftTop + verticalDelta);                    
            // Add the returned value
            childrenWidth += returned;
          }
          // Check: is length of the containerNode bigger than the total length of the children
          if (childrenWidth > 0 && containerNode['expanded']) {
            // Adapt the width of the children
            childrenWidth = Math.max(
                    // Was: childrenWidth + (containerNode['width']-childrenWidth)/2,
                    childrenWidth + Math.ceil((containerNode['width']-childrenWidth)/2),
                    // containerNode['width'],
                    childrenWidth);
          }
        });
        
        // Terminal nodes: Rectify zero
        if (childrenWidth === 0) {
          shiftAdd = 0;
          // Terminal nodes: calculate [shiftAdd] if parent is wider
          if ($(el).parent().is(".lithium-tree")) {
            // Find out what the width of the <g> 'lithium-tree' parent is
            parWidth = parseInt($(el).parent().attr("width"), 10);
            // Compare this width with 'my' original container width
            if (parWidth >= childrenWidth && parWidth >= containerNode['width']) {
              shiftAdd = (parWidth - containerNode['width'])/2 + shadowDepth;
            }
          }
          // Terminal nodes need to have 'wordSpacing' added for beauty...
          childrenWidth = containerNode['width'] + wordSpacing; //  + shiftAdd;
        }
        
        // =========== Debugging ========================
        if (bDebug) console.log(level + ":" + space.repeat(level) + sElText + " cw=" + childrenWidth);
        // ==============================================
        
        // Rectify large containers
        if (containerNode['width'] > childrenWidth) {
          childrenWidth = containerNode['width'] + shadowDepth;
        }
        
        // ========== Positioning ===============
        thisY = shiftTop;
        // Find out exactly how many children there are
        var iChildNodes = $(el).children(".lithium-tree").length;
        // Are there any children and if the containerNode  is actually visible...
        if (iChildNodes > 0 && containerNode['expanded']) {
          // Get the parameters of the FIRST child
          var first = $(el).children(".lithium-tree").first();
          var firstLoc = private_methods.getLocation(first);
          // Action depends on the #number of children
          if (iChildNodes === 1) {
            // There is only one child
            // get this child
            thisX = firstLoc['x'] + Math.ceil((firstLoc['width'] - containerNode['width'])/2) + shiftAdd;
          } else {
            var firstCenter = firstLoc['x'] + Math.ceil(firstLoc['width']/2);
            var last = $(el).children(".lithium-tree").last();
            var lastLoc = private_methods.getLocation(last);
            var lastCenter = lastLoc['x'] + Math.ceil(lastLoc['width']/2);
            thisX = Math.max(firstCenter,
              firstCenter + Math.ceil((lastCenter - firstCenter - containerNode['width'])/2));
            // NOTE: the following is not good; it causes the connection not to center.
            // thisX -= Math.ceil(firstLoc['width']/2);
            thisX += shiftAdd;
          }
        } else {
          thisX = shiftLeft + shiftAdd;
        }

        // =========== Debugging ========================
        if (bDebug) console.log(level + ":" + space.repeat(level) + sElText + " thisX=" + thisX);
        // ==============================================

        // Set the new position of the container node
        containerNode['x'] = thisX;
        containerNode['y'] = thisY;
        private_methods.setLocation(el, containerNode);

        // Adapt the recursion level
        level-= 1;
       
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
        var oRect = {};
        var textWidth =0;
        // Validate
        if (el === undefined) return oRect;
        if ( $(el).is(".lithium-tree")) {
          // Get the node element
          var node = $(el).children(".lithium-node").first();
          // Is it visible?
          if (!private_methods.isVisible(el)) {
            // Get to the text
            var sText = $(node).children("text").first().text();
            textWidth = sText.length * 4;
          } else {
            textWidth = $(node).children("text").first().get(0).getBBox().width;
          }
          // var textWidth = $(node).children("text").first().get(0).getBBox().width;
          // Continue
          textWidth += 8;
          var myHeight = 0;
          // Set the width of the box to the correct value 
          $(node).find("rect").each(function() {
            $(this).attr("width", textWidth.toString());  
            var h = parseInt($(this).attr("height"), 10);
            if (h > myHeight) myHeight = h;
          });
          oRect['width'] = textWidth;
          oRect['height'] = myHeight;
          oRect['expanded'] = private_methods.getExpanded(el);
          // Set these parameters in the <g> 
          $(el).attr("width", oRect['width']);
          $(el).attr("height", oRect['height']);
        }
        // Return the rectangle
        return oRect;
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
        var sDisplay = $(el).css("display");
        // && sDisplay !== "inline" && sDisplay !== ""
        return (sDisplay !== "none" );
      },
      
      getExpanded : function(el) {
        // Validate
        if (!$(el).is(".lithium-tree")) return false;
        // Do I have the feature?
        if ($(el).hasOwnProperty("expanded")) {
          // Get its value
          return $(el).attr("expanded");
        } else {
          // Are my children visible?
          var oChildren = $(el).children(".lithium-tree");
          if (oChildren.length === 0) {
            // No children, so not expanded?
            return false;
          } else {
            // REturn the invisibility of the first child
            return private_methods.isVisible($(oChildren).first());
          }
        }
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
        $(el).find(".lithium-tree").each(function() {
          $(this).attr("x", parseInt($(this).attr("x"), 10) + oMove['x']);
          $(this).attr("y", parseInt($(this).attr("y"), 10) + oMove['y']);
          // Debugging: immediately apply this location
          private_methods.applyOneLocation(this);
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
            oRect['x'] = parseInt($(rect).attr("x"),10);
            oRect['y'] = parseInt($(rect).attr("y"),10);
            oRect['width'] = parseInt($(rect).attr("width"),10);
            oRect['height'] = parseInt($(rect).attr("height"),10);
            oRect['expanded'] = private_methods.isVisible(el);
            return oRect;
          }
        }
        return null;
      },
      getRectSize : function(el, sType) {
        if (sType === undefined || sType === "")
          sType = "rect";
        // validate
        if (el !== undefined) {
          // Must be a rect
          if ($(el).is(sType)) {
            // Create structure with x,y etc
            var oRect = {};
            oRect['x'] = parseInt($(el).attr("x"),10);
            oRect['y'] = parseInt($(el).attr("y"),10);
            oRect['width'] = parseInt($(el).attr("width"),10);
            oRect['height'] = parseInt($(el).attr("height"),10);
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
       * @param {element} svgDiv
       * @returns {undefined}
       */
      drawTree : function(svgDiv) {
        var oMove = {x: 0, y: 0};
        
        // Validate
        if (svgDiv === undefined) return false;
        // Find the root: the top <g> node
        root = $(svgDiv).find("g.lithium-root").first();
        if (root === undefined || root === null) return false;
        // Center the <g> coordinates of the root
        private_methods.fitRectangle(root);
        private_methods.centerRoot(root);
        // Store the location of the root
        var p = private_methods.getLocation(root);
        if (p !== undefined && p !== null) {
          var parent = $(root).parent();
          // Set the graphabstract to the root
          graphAbstract['root'] = p;
          // Perform a re-drawing, starting from the root downwards
          level = 0;
          private_methods.verticalDrawTree(root, marginLeft, p['y']);
          // Calculate how much must be moved
          oMove['x'] = p['x'] - parseInt($(root).attr('x'), 10);
          oMove['y'] = p['y'] - parseInt($(root).attr('y'), 10);
          // Move the whole
          private_methods.moveDiagram(parent, oMove);
          
          // Calculate maxY
          var maxY = 0;
          $(parent).find(".lithium-tree").each(function() {
            if ((private_methods.isVisible(this)) && 
                    $(this).children(".lithium-tree").length === 0) {
              var this_y = parseInt($(this).attr("y"),10);
              if (this_y > maxY) maxY = this_y;
            }
          });
          // Move all items in the y-direction
          $(parent).find(".lithium-tree").each(function() {
            if ( (private_methods.isVisible(this)) && 
                    $(this).children(".lithium-tree").length === 0) {
              $(this).attr("y", maxY);
              // Debugging: immediately apply this location
              private_methods.applyOneLocation(this);
            }
          });
          
          // Calculate a minPoint
          var minPoint = {x:1000000, y:1000000};
          var maxSize = {width:0, height:0};
          // Walk over all shapes
          $(parent).find(".lithium-tree").each(function() {
            if (private_methods.isVisible(this)) {
              var oThisRect = private_methods.getLocation(this);
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
          oMove['x'] = 50 - minPoint['x'];
          oMove['y'] = 50 - minPoint['y'];
          private_methods.moveDiagram(parent, oMove);
          
          // Apply the changes in x,y,w,h to all elements
          private_methods.applyLocations(parent, "loc");
          
          // Apply the changes in x,y,w,h to all elements
          private_methods.applyLocations(parent, "conn");
          
          // Adapt maxSize again
          maxSize['width'] = maxSize['width'] - minPoint['x'] + 100;
          maxSize['height'] = maxSize['height'] - minPoint['y'] + 100;
          // Also adapt the SVG's width and height
          var svg = $(svgDiv).find("svg").first();
          $(svg).attr("width", maxSize['width'].toString() + 'px');
          $(svg).attr("height", maxSize['height'].toString()  + 'px');
          
          // Attach an event handler to all the toggles
          $(svg).find(".lithium-toggle rect, line").click(function() {crpstudio.tree.toggle(this);});
        }
        // All went well
        return true;
      },
      
      /**
       * toggle
       *    Behaviour when I am toggled
       * 
       * @param {element} elRect
       * @returns {undefined}
       */
      toggle : function(elRect) {
        var bVisible,   // VIsibility
          elSvg,        // The SVG root of the tree
          elToggle,     // The .lithium-toggle element
          elVbar,       // My own vertical bar
          elTree;       // The tree I am in
  
        // Get vertical bar and my tree
        elToggle = $(elRect).parent();
        elVbar = $(elToggle).children(".lithium-vbar");
        elTree = $(elToggle).parent();
        elSvg = $(elRect).closest("svg");
        // Get my status
        bVisible = private_methods.isVisible(elVbar);
        // Action depends on visibility
        if (bVisible) {
          // Bar is visible: close it
          private_methods.classAdd(elVbar, "hidden"); 
          // Make all children visible again
          $(elTree).find(".lithium-tree").each(function() {
            private_methods.classRemove(this, "hidden");            
          });
          // Adapt [expanded] state
          $(elTree).attr("expanded", true);
        } else {
          // Bar is invisible: show it
          private_methods.classRemove(elVbar, "hidden"); 
          // Make all children invisible
          $(elTree).find(".lithium-tree").each(function() {
            private_methods.classAdd(this, "hidden");            
          });
          // Adapt [expanded] state
          $(elTree).attr("expanded", false);
        }
        // Now make sure the whole tree is re-drawn
        crpstudio.tree.drawTree($(elSvg).parent());
      }
      
    };
  }($, crpstudio.config));
  
  return crpstudio;
  
}(jQuery, window.crpstudio || {}));
