/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, erwin, Crpstudio, alert: false, */
var Crpstudio = (function ($, crpstudio) {
  "use strict";
  crpstudio.item = (function ($, config) {
    // Methods that are local to [crpstudio.item]
    var private_methods = {
      priv_test: function(a,b) {return a+b;}
    };
    // Methods that are exported by [crpstudio.project] for others
    return {
      /**
       * init -- initialisation of this 'class' 
       * 
       * @returns {undefined}
       */
      init: function() { 
        var i = 1;
      },
      
      /**
        * createItem
        *    Create a new qry/def/dbf/ and so on
        * 
        * @param {type} sItemType
        * @param {type} sAction
        * @returns {undefined}
        */
      createItem : function(sItemType, sAction) {
        var bOkay = false;
        var oDescr = Crpstudio.project.getItemDescr(sItemType);
        var sDivPrf = oDescr.divprf;
        // Reset any previous naming
        $("#"+sDivPrf+"_new_name_error").removeClass("error");
        $("#"+sDivPrf+"_new_name_error").addClass("hidden");
        // First look at the action
        switch(sAction) {
          case "new":
            // Check the information provided
            var sItemName = $("#"+sDivPrf+"_new_name").val();
            var sItemGoal = $("#"+sDivPrf+"_new_goal").val();
            var sItemComment = $("#"+sDivPrf+"_new_comment").val();

            // Only the item NAME is obligatory + check the NAME item
            if (sItemName !=="") {
              // Validate: check 
              if (!Crpstudio.project.itemNameCheck(sItemType, sItemName)) {
                // Signal that the name is not correct
                $("#"+sDivPrf+"_new_name_error").html("Duplicate: "+sItemName)
                $("#"+sDivPrf+"_new_name_error").addClass("error");
                $("#"+sDivPrf+"_new_name_error").removeClass("hidden");
                return;
              }
              // Create a new item
              var iItemId = Crpstudio.project.createListItem(sItemType, 
                {Name: sItemName, Goal: sItemGoal, Comment: sItemComment, Text: "-"});

              // Hide the form
              switch(sItemType) {
               case "query":
                 $("#query_new_create").addClass("hidden");
                 $("#query_general_editor").removeClass("hidden");
                 break;
               case "definition":
                 $("#def_new_create").addClass("hidden");
                 $("#def_general_editor").removeClass("hidden");
                 break;
              }

              // Make sure the list is re-drawn
              // Fill the query/definition list, but switch off 'selecting'
              var bSelState = Crpstudio.project.bIsSelecting;
              Crpstudio.project.bIsSelecting = true;
              Crpstudio.project.showlist(sItemType);
              // Get the <a> element of the newly to be selected item
              var targetA = Crpstudio.project.getCrpItem(sItemType, iItemId);
              // Call setCrpItem() which will put focus on the indicated item
              Crpstudio.project.setCrpItem(targetA, sItemType, iItemId);
              // Indicate all went well
              // bOkay = true;
              Crpstudio.project.bIsSelecting = bSelState;
            }
            break;
          case "cancel":
            // Return to the current item
            bOkay = true;
            break;
        }
        // Hide the form if all is well
        if (bOkay) {
          switch(sItemType) {
            case "query":
              $("#query_new_create").addClass("hidden");
              $("#query_general_editor").removeClass("hidden");
              break;
            case "definition":
              $("#def_new_create").addClass("hidden");
              $("#def_general_editor").removeClass("hidden");
              break;
          }
        }
      },      
      ext_test: function(a,b) { var x = private_methods.priv_test(a,b); return "ext_test is okay+"+x; }
    };
  }($, crpstudio.config));
  
  // return Crpstudio;
  
}(jQuery, crpstudio || {}));