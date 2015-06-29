/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
Crpstudio.result = {
  // Local variables
  loc_arTable : null,   // Local copy of the table
  loc_iCurrentQc : 0,   // Currently selected QC line
  loc_iCurrentSub : 0,  // Currently selected QC sub category
  
  /* ---------------------------------------------------------------------------
   * Name: makeOviewTable
   * Goal: Make a table with an overview of the results
   * History:
   * 29/jun/2015  ERK Created
   */
  makeOviewTable : function(arTable) {
    Crpstudio.result.loc_arTable = arTable;
    // The 'table' is an array of QC elements
    for (var i=0; i< arTable.length; i++) {
      // Get this QC element
      var oQC = arTable[i];
      // Get the QC elements
      var arSubs = oQC.subcats;     // Sub-category names/labels
      var iQC = oQC.qc;             // Number of this QC
      var sQcLabel = oQC.result;    // Label for this QC line
      var arHits = oQC.hits;        // Array with 'hit' elements
      var iTotal = oQC.total;       // Total count for this QC
      var arSubCount = oQC.counts;  // Totals per sub-category
      // Add a row for this QC item
      Crpstudio.result.addQCline(iQC, sQcLabel, iTotal, arSubs, arSubCount);
    }
  },
  /* ---------------------------------------------------------------------------
   * Name: addQCline
   * Goal: add a QC line to the result table viewer
   * History:
   * 29/jun/2015  ERK Created
   */
  addQCline : function(iQC, sQcLabel, iTotal, arSubNames, arSubCounts) {
    // Calculate which index this is
    var idxQc = iQC-1;
    // Prepare a string for this row
    //   NB: each row contains: # (number), QC-label, subcat-name, count-for-this-row
    var qcRow = "<tr onclick=\"Crpstudio.result.switchToQc("+iQC+")\" id=\"qcline_"+iQC+"\" class=\"qc-line\">"
      +"<td>"+iQC+"</td>"
      +"<td id=\"qc_"+iQC+"\">"+sQcLabel+"</td>"
      +"<td id=\"qc_"+iQC+"\">(all together)</td>"
      +"<td id=\"total_"+iQC+"\">"+iTotal+"</td>"
      +"<td class=\"control\"><button onclick=\"Crpstudio.project.editQC("+iQC+")\" class=\"edit\">EDIT</button></td>"
      +"</tr>";
    // Add the row to the appropriate table
    $("#queries > tbody").append(qcRow);
    // Add lines for all sub categories
    for (var i=0; i<arSubNames.length;i++) {
      // Allow switching to a sub-category of a QC
      qcRow = "<tr onclick=\"Crpstudio.result.switchToQcSub("+iQC+",'"+i+"')\" id=\"qcsub_"+iQC+"_"+i+"\" class=\"qc-sub-line hidden\">"
        +"<td>"+iQC+"</td>"
        +"<td id=\"qc_"+iQC+"_"+i+"\">"+sQcLabel+"</td>"
        +"<td id=\"sub_"+iQC+"_"+i+"\">"+arSubNames[i]+"</td>"
        +"<td id=\"total_"+iQC+"_"+i+"\">"+arSubCounts[i]+"</td>"
        +"</tr>";
      // Add the row to the appropriate table
      $("#queries > tbody").append(qcRow);
    }
  },
  
  /* ---------------------------------------------------------------------------
   * Name: switchToQc
   * Goal: Action when user clicks this QC line in the results overview table
   * History:
   * 29/jun/2015  ERK Created
   */
  switchToQc : function(iQC) {
    // Get the correct index
    var idxQc = iQC-1;
    // Get the number of QCs
    var iQCcount = Crpstudio.result.loc_arTable.length;
    // Get the number of sub-categories for this one
    var iSubCount = Crpstudio.result.loc_arTable[idxQc].subcats.length;
    // Clear and set the "active" state of the QC rows appropriately
    if ($("#queries #qcline_"+iQC).hasClass("active")) {
      // User is already active here. Click means: remove all tables
      // (1) hide the 'result_qc' lines
      // $("#result_table .result-qc").addClass("hidden");
      // (2) hide the 'result-qc-sub' lines
      $("#result_table .result-qc-sub").addClass("hidden");
      // (3) toggle the 'hidden' class for this QC line table
      $("#result_qc"+iQC).toggleClass("hidden");
    } else {
      // Right: we need to switch the active state
      // (1) remove the "active" state for all QC rows
			$("#queries .qc-line").removeClass("active");
      // (2) remove the 'active' state for all QC subcategory rows
			$("#queries .qc-sub-line").removeClass("active");
      // (3) set the 'hidden' state for all QC subcategory rows
			$("#queries .qc-sub-line").addClass("hidden");
      // (4) set the 'active' state for the correct QC row
			$("#queries #qcline_"+iQC).addClass("active");
      // (5) remove the 'hidden' state for the QC subcategory rows under the current QC line
      // $("#queries #qcline_"+iQC+" .qc-sub-line").removeClass("hidden");
      for (var i=0;i<iSubCount;i++) {
        $("#queries #qcsub_"+iQC+"_"+i).removeClass("hidden");
      }
      // (6) set all results to 'hidden'
      $("#result_table .result-qc").addClass("hidden");
      // (7) Show the results for this QC line
      $("#result_qc"+iQC).removeClass("hidden");
      // (8) hide the 'result-qc-sub' lines
      $("#result_table .result-qc-sub").addClass("hidden");
    }
      
  },
  
  /* ---------------------------------------------------------------------------
   * Name: switchToQcSub
   * Goal: Action when user clicks this QC-sub-cat line in the results overview table
   * History:
   * 29/jun/2015  ERK Created
   */
  switchToQcSub : function(iQC, idxSub) {
    // Get the correct index
    var idxQc = iQC-1;
    // Get the number of QCs
    var iQCcount = Crpstudio.result.loc_arTable.length;
    // Get the number of sub-categories for this one
    var iSubCount = Crpstudio.result.loc_arTable[idxQc].subcats.length;
    // Clear and set the "active" state of the QC rows appropriately
    if ($("#queries #qcsub_"+iQC+"_"+idxSub).hasClass("active")) {
      // User is active here. Clicking means: de-activate
      // (1) remove the 'active' state for all QC subcategory rows
			$("#queries .qc-sub-line").removeClass("active");
      // (2) hide the 'result_qc' lines
      $("#result_table .result-qc").addClass("hidden");
      // (3) hide the 'result-qc-sub' lines
      // $("#result_table .result-qc-sub").addClass("hidden");
      // (4) toggle the chosen result-qc-sub line
      $("#result_qcsub_"+iQC+"_"+idxSub).toggleClass("hidden");
    } else {
      // User is NOT active here. Click means: activate this subcat
      // (1) remove the 'active' state for all QC subcategory rows
			$("#queries .qc-sub-line").removeClass("active");
      // (2) set the 'active' state of this particular QC subcat row
      $("#queries #qcsub_"+iQC+"_"+idxSub).addClass("active");
      // (3) hide the 'result_qc' lines
      $("#result_table .result-qc").addClass("hidden");
      // (4) hide the 'result-qc-sub' lines
      $("#result_table .result-qc-sub").addClass("hidden");
      // (5) show the chosen result-qc-sub line
      $("#result_qcsub_"+iQC+"_"+idxSub).removeClass("hidden");
    }
  }
  
};

