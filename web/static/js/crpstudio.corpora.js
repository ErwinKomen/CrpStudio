/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

Crpstudio.corpora = {
  
  /* --------------------------------------------------------------
   * Name: showDescr
   * Goal: show a fuller description of the corpus
   * 
   * @element - the id of the element that needs to be made unhidden
   * History:
   * 18/jun/2015  ERK Created
   */
  showDescr : function(element) {
    Crpstudio.debug("showDescr("+element+")");
    if ($(element).parent().parent().hasClass("hidden")) {
      $(element).parent().parent().removeClass("hidden");
    } else {
			$(element).parent().parent().addClass("hidden");
		}
  }
  
}