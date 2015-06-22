/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

Crpstudio.search = {
  // Local variables within Crpstudio.search
  tab : "project",
  /* ---------------------------------------------------------------------------
   * Name: execute
   * Goal: execute a search function
   * History:
   * 22/jun/2015  ERK Created
   */
  execute : function() {
    
  },
  
  /* ---------------------------------------------------------------------------
   * Name: switchtab
   * Goal: switch the tab within the [Search] page
   * History:
   * 22/jun/2015  ERK Created
   */
	switchTab : function(target) {
		Crpstudio.debug("switching to search tab "+target+" from "+Crpstudio.search.tab);
		if (target !== Crpstudio.search.tab) {
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
			
			Crpstudio.search.tab = target;
		}
	},
  /* ---------------------------------------------------------------------------
   * Name: setSizes
   * Goal: set the size of the ?? window
   * History:
   * 22/jun/2015  ERK Created
   */
	setSizes : function() {
		var sh = ($(window).innerHeight() - 135) / 2 - 130;
		if (sh < 100) {
			sh = 100;
		}
		$("#project").css("margin-top",sh+"px");
	}
	  
}
