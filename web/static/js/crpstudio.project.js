/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

Crpstudio.project = {
  // Local variables within Crpstudio.project
  tab : "project",
  currentPrj: "",
  /* ---------------------------------------------------------------------------
   * Name: execute
   * Goal: execute the currently set project
   * History:
   * 22/jun/2015  ERK Created
   */
  execute : function() {
    var sPrjName = Crpstudio.project.currentPrj;
    var sUserName = Crpstudio.currentUser;
    // Validate project and user
    if (sPrjName ==="" ) {
      Crpstudio.debug("project is not defined");
    } else if (sUserName === "") {
      Crpstudio.debug("user is not defined");
    } else {
      // debugging: show where the status appears
      $("#project_status").text("js: project status: " + sPrjName);
      $("#result_status").text("js: result status: " + sPrjName);
      // switch to the result tab
      Crpstudio.project.switchTab("result");
      $("#result_status").text("js: switched to result status: " + sPrjName);
    }
  },
  
  /* ---------------------------------------------------------------------------
   * Name: switchtab
   * Goal: switch the tab within the [Search] page
   * History:
   * 22/jun/2015  ERK Created
   */
	switchTab : function(target) {
		Crpstudio.debug("switching to search tab "+target+" from "+Crpstudio.project.tab);
		if (target !== Crpstudio.project.tab) {
			$("#search .content").removeClass("active");
			$("#"+target).addClass("active");
			$("#subnav dd").removeClass("active");
			$("#"+target+"_link").addClass("active");
      // When should the metadata selector be shown
			if (target === "execute" ) {
				$("#metadata").show();
			} else {
				$("#metadata").hide();
			}
			// What to do if the [target] equals [result] or [document]
			if (target === "result") {
				$(".sub-nav dd").removeClass("active");
				$("#result_link").removeClass("hide");
				$("#result_link").addClass("active");
			} else if (target === "document") {
				$(".sub-nav dd").removeClass("active");
				$("#document").removeClass("hide");
				$("#document_link").removeClass("hide");
				$("#document_link").addClass("active");
			}
			
      // When to show the spacer before [result] and [document]
			if (!$("#result_link").hasClass("hide") || !$("#document_link").hasClass("hide")) {
				$("#link-spacer").removeClass("hide");
			}
			
			Crpstudio.project.tab = target;
		}
	},
  
  /* ---------------------------------------------------------------------------
   * Name: setProject
   * Goal: the user chooses a project, so act on this
   * History:
   * 23/jun/2015  ERK Created
   */
  setProject : function(target) {
    // Get the <li>
    var listItem = $(target).parent();
    var strProject = $(target).text();
    // Look at all the <li> children of <ul>
    var listHost = listItem.parent();
    listHost.children('li').each(function() { $(this).removeClass("active")});
    // Set the "active" class for the one the user has selected
    $(listItem).addClass("active");
    // Make sure the active class is selected
    Crpstudio.project.currentPrj = strProject;
    // Also set the name of the currently selected project in a div
    $("#project_current").text(strProject);
    // And set the name of the project in the top-bar div
    $("#top_bar_current_project").text(strProject);
    // Adapt the text of the project description
    $("#project_description").html("<p>You have chosen: <b>" + strProject + "</b></p>");
  },
  /* ---------------------------------------------------------------------------
   * Name: createManual
   * Goal: manually create a project
   * History:
   * 23/jun/2015  ERK Created
   */
  createManual : function(target) {
    // Get the <li>
    var listItem = $(target).parent();
    // Look at all the <li> children of <ul>
    var listHost = listItem.parent();
    listHost.children('li').each(function() { $(this).removeClass("active")});
    // Set the "active" class for the one the user has selected
    $(listItem).addClass("active");
    // Make sure the new project is being selected
    var strProject = "...name of this project";
    Crpstudio.project.currentPrj = strProject;
    // And set the name of the project in the top-bar div
    $("#top_bar_current_project").text("new...");
    // Adapt the text of the project description
    $("#project_description").html("<p>You have chosen: <b>" + strProject + "</b></p>");
  },
  /* ---------------------------------------------------------------------------
   * Name: createWizard
   * Goal: create a project through a wizard
   * History:
   * 23/jun/2015  ERK Created
   */
  createWizard : function(target) {
    // Get the <li>
    var listItem = $(target).parent();
    // Look at all the <li> children of <ul>
    var listHost = listItem.parent();
    listHost.children('li').each(function() { $(this).removeClass("active")});
    // Set the "active" class for the one the user has selected
    $(listItem).addClass("active");
    // Make sure the new project is being selected
    var strProject = "...name of this project (wizard)";
    Crpstudio.project.currentPrj = strProject;
    // And set the name of the project in the top-bar div
    $("#top_bar_current_project").text("wizard...");
    // Adapt the text of the project description
    $("#project_description").html("<p>You have chosen: <b>" + strProject + "</b></p>");
  },
  /* ---------------------------------------------------------------------------
   * Name: setSizes
   * Goal: set the size of the id="project" window
   * History:
   * 22/jun/2015  ERK Created
   */
	setSizes : function() {
    // Calculate sh
		var sh = ($(window).innerHeight() - 135) / 2 - 130;
    // Set the minimal height
    var minHeight = 50;
    // Make sure we have a minimal height
		if (sh < minHeight) { sh = minHeight; }
		$("#project").css("margin-top",sh+"px");
	}
	  
}
