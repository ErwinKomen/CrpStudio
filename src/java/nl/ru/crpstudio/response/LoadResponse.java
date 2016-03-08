/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import nl.ru.util.json.JSONObject;

/**
 * LoadResponse
 *    Not only for loading a project (CRP), but this has several functions, 
 *    depending on the "type" parameter:
 * 
 *    info    - Loading a CRP and getting all relevant information about it
 *    corpora - Retrieve information about the available corpora and groupings
 *    init    - 
 *    dbases  - List of currently available databases
 * 
 * @author Erwin R. Komen
 */
public class LoadResponse extends BaseResponse {
	private String project;   // Name of the project to be loaded
  private String loadType;  // Type of information to be loaded
  private String corpus;    // name of the corpus we are looking at

	@Override
	protected void completeRequest() {
    JSONObject oContent = new JSONObject();

    try {
      // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("userid"))  { sendErrorResponse("LoadResponse: missing @userid");   return;}
      if (!oQuery.has("type"))    { sendErrorResponse("LoadResponse: missing @type");     return;}
      
      // There are three parameters: project, userid, type
      loadType  = oQuery.getString("type");
      sUserId   = oQuery.getString("userid");

      // Validate: all two must be there
      if (loadType.isEmpty()) { sendErrorResponse("Specify type of information needed");  return;}
      if (sUserId.isEmpty())  { sendErrorResponse("The userid is not specified");         return; }
      
      // The actual reply depends on the @loadType
      switch(loadType) {
        case "init":  // No project is specified, we just want to have the list of projects
          oContent.put("crplist", this.makeListOfCrps(sUserId, null));
          /*
          // Get a list of tagsets
          oContent.put("tagsetlist", this.getTagsetSpecsList());
                  */
          // Get the list in the "metavar" section of crp-info.json
          oContent.put("metavarstart", servlet.getMetavarStart());
          // Get a list of metadata information
          oContent.put("metalist", this.getCorpusMetaInfo());
          // Get a list of the constituent definitions
          oContent.put("constituents", servlet.getConstituents());
          // Get the groupings defined by the user
          oContent.put("groupinglist", this.getGroupings(sUserId));
          // Get a specification of query-types
          oContent.put("qryrelationlist", this.getQryRelationList());
          // Get a specification of query positions
          oContent.put("qrypositionlist", this.getQryPositionList());
          // Get a specification of query positions
          oContent.put("qryunicitylist", this.getQryUnicityList());
          // Get the table with corpora information -- see crp-info.json
          if (!this.makeCorpusParts()) { sendErrorResponse("LoadResponse: could not makeCorpusParts()");  return;}
          oContent.put("corpuslist", servlet.getCorpusParts());
          break;
        case "corpora":
          // Get the table with corpora information -- see crp-info.json
          if (!this.makeCorpusParts()) { sendErrorResponse("LoadResponse: could not makeCorpusParts()");  return;}
          oContent.put("corpuslist", servlet.getCorpusParts());
          // Get the list of groupings defined for this particular user
          oContent.put("groupinglist", this.getGroupings(sUserId));
          // Get the table containing corpus-dependant metavar definitions -- see crp-info.json
          if (!this.makeMetaVarList()) { sendErrorResponse("LoadResponse: could not makeMetaVarList()");  return;}
          oContent.put("metavarlist", servlet.getMetavars());
          // Get the list of comparisons (JSON array with JSON objects)
          oContent.put("comparisonlist", this.getComparisons());
          break;
        case "dbases":
          // TODO: Pass on a list of databases and information about them
          oContent.put("dbaselist", this.getDbaseList(sUserId));
          break;
        case "info":
          // Validate "project" parameter
          if (!oQuery.has("project")) { sendErrorResponse("LoadResponse: missing @project");  return;}
          project   = oQuery.getString("project");
          // Project may be empty...
          if (project.isEmpty()) { sendErrorResponse("Name of project not specified"); return;}
      
          // Either load the project from /crpp or fetch it from the internal storage
          crpThis = crpContainer.getCrp(this, project, sUserId, false);
          if (crpThis == null) { sendErrorResponse("Could not load CRP:\n" + 
                  logger.getErrList().toString()); return;}
          // Get the CrpId of this project
          int iCrpId = crpContainer.getCrpId(this, project, sUserId);
          // Place the 'general CRP parameters in a JSONObject
          oContent.put("CrpId", iCrpId);
          oContent.put("dbaseinput", crpThis.getDbaseInput());
          oContent.put("language", crpThis.getLanguage());
          oContent.put("part", crpThis.getPart());
          oContent.put("rules", crpThis.getRules());
          oContent.put("xqinput", crpThis.getXqInput());
          oContent.put("dbase", crpThis.getSource());
          oContent.put("showsyntax", crpThis.getShowPsd());
          oContent.put("deflist", crpThis.getListDef());
          oContent.put("qrylist", crpThis.getListQuery());
          oContent.put("qclist", crpThis.getListQC());
          oContent.put("dbflist", crpThis.getListDbFeat());
          oContent.put("crplist", this.makeListOfCrps(sUserId, crpThis));
          oContent.put("querysellist", this.getQueryList(crpThis));
          oContent.put("input_set", this.labels.getString("input.selection.set"));
          oContent.put("input_clr", this.labels.getString("input.selection.clr"));
          break;
        default:
          sendErrorResponse("Unknown loadtype["+loadType+"]");
          return;
      }
      
      // Send a standard mapped response to the JavaScript caller
  		this.servlet.log("LoadResponse - sendStandardResponse 'completed'...");
      sendStandardResponse("completed", "CRP has been loaded", oContent);
    } catch (Exception ex) {
      sendErrorResponse("LoadResponse: could not complete: "+ ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("LoadResponse - logRequest");
	}

	@Override
	public LoadResponse duplicate() {
		return new LoadResponse();
	}

 
}
