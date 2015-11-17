/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */
package nl.ru.crpstudio.response;

import java.io.IOException;
import java.math.BigInteger;
import java.security.SecureRandom;
import javax.servlet.ServletOutputStream;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class ExportResponse extends BaseResponse {
	private String project;
	private SecureRandom random = new SecureRandom();

	@Override
	protected void completeRequest() {
    String fileName = "";
    try {
      // Collect the JSON from our POST caller
      JSONObject oQuery = new JSONObject(request.getParameter("args"));
      if (!oQuery.has("project")) { sendErrorResponse("RemoveResponse: missing @project"); return;}
      if (!oQuery.has("table")) { sendErrorResponse("RemoveResponse: missing @table"); return;}
      if (!oQuery.has("view")) { sendErrorResponse("RemoveResponse: missing @view"); return;}
      
      // There are three parameters: project, userid, type
      project = oQuery.getString("project");
      String sView = String.valueOf(oQuery.getInt("view"));
      String sTable = oQuery.getString("table");    // This is a stringified JSON object

      // Get the name of the project
      // project = this.request.getParameter("project");
      if (project.isEmpty()) {
        // Provide some kind of warning/error??
        logger.DoError("ExportResponse: the parameter [project] is empty");
        return;
      }
      if (project.endsWith(".crpx"))  project = project.substring(0,project.lastIndexOf("."));
      // Get the view number
      // String sView = this.request.getParameter("view");
      
      // Fetch the CSV information into a string
			String result = this.jobToCSV(sView, sTable);
			
      switch (servlet.getRequestMethod()) {
        case "GET":
          // Make a filename for the file to be exported (tab-separated)
          fileName = project + "-" + new BigInteger(130, random).toString(32)+"-v"+sView + ".txt";
          // Save the string into a file that is returned as attachment to the user
          sendFileResponse(result, fileName);
          // NOTE: if GET sends a file, then the "view" must be derived from the filename
          break;
        case "POST":
          fileName = "/" + servlet.getUserId() +"/"+project+"-v"+sView+"-export.txt" ;
          // Save the string into a file locally, and return the URL to the user
          sendFileLocResponse(result, fileName, sView);
          break;
        default:
          return;
      }
			
			

    } catch (Exception ex) {
      logger.DoError("ExportResponse: could not complete", ex);
      this.displayError("ExportResponse error: " + ex.getMessage());
    }
	}

	@Override
	protected void logRequest() {
		this.servlet.log("ExportResponse");
	}

	@Override
	public ExportResponse duplicate() {
		return new ExportResponse();
	}

  /**
   * jobToCSV
   *    Fetch the "table" that has been passed on to /export?table={}
   *    Check what kind of table this is (the table only contains the
   *    information selected by the user to be shown), and then convert
   *    this information into a tab-separated String.
   * 
   *    The information returned is view-dependent:
   *    5 - general overview of the numbers per qc and subcat
   *    1 - per-hit results for the indicated number of hits
   *    2 - detailed numbers per file for the indicated qc/sub
   * 
   * @param sView - View number 1-4 or 5 (overview)
   * @return      - String containing the tab-separated table representation
   */
	public String jobToCSV(String sView, String sTable) {
		StringBuilder result = new StringBuilder();
    JSONArray arTable;
    
    try {
      // Get the "table" parameter
      // String sTable = this.request.getParameter("table");
      if (sTable.isEmpty()) return "";
      // Start making table
      result.append("date:\t"+getCurrentTimeStamp()+"\n");
      result.append("\n");

      // Check if this is a JSONArray
      try {
        arTable = new JSONArray(sTable);
      } catch (Exception ex) {
        arTable = new JSONArray();
        arTable.put(new JSONObject(sTable));
      }
      // Action depends on the particular view
      switch (sView) {
        case "1": // Take the contents from this.arUpdateContent
          JSONArray arUpdateContent = this.servlet.getUpdateContent();
          if (arUpdateContent != null && arUpdateContent.length()>0) {
            // Yes, there is content
            result.append("n\tfile\tlocS\tlocW\tpreC\thitC\tfolC\thitS\n");
            // Get info row-by-row
            for (int k=0;k<arUpdateContent.length();k++) {
              JSONObject oOneRow = arUpdateContent.getJSONObject(k);
              int n = oOneRow.getInt("n");
              String sFile = oOneRow.getString("file");
              String sLocs = oOneRow.getString("locs");
              String sLocw = oOneRow.getString("locw");
              String sPreC = oOneRow.getString("preC");
              String sHitC = oOneRow.getString("hitC");
              String sFolC = oOneRow.getString("folC");
              String sHitS = getSyntax(oOneRow.getJSONObject("hitS"));
              // Produce the row
              result.append(n+"\t"+sFile+"\t"+sLocs+"\t"+sLocw+"\t"+
                      sPreC+"\t"+sHitC+"\t"+sFolC+"\t"+sHitS+"\n");
            }
          }
          break;
        case "2": // Look carefully at the table
          // Work through all the QC lines contained in the arTable
          for (int k=0;k<arTable.length(); k++) {
            // Get this table
            JSONObject oTable = arTable.getJSONObject(k);
            // Check what kind of object we have
            if (oTable.has("qc")) {
              // Get the result label (=name) of this QC
              String sResLabel = oTable.getString("result");
              result.append("QC line:\t"+sResLabel+"\n");
              // This is the result of just one QC -- is it only one subcat?
              if (oTable.has("subcats")) {
                // There are more than one subcats
                JSONArray arSubCat = oTable.getJSONArray("subcats");
                // Create row with sub-categories
                result.append("file\ttotal");
                for (int i=0;i<arSubCat.length();i++) {
                  result.append("\t"+arSubCat.getString(i));
                }
                result.append("\n");
                // Get the total counts per sub-category
                JSONArray arCounts = oTable.getJSONArray("counts");
                // Create a row with these counts
                result.append("(all)\t"+oTable.getInt("total"));
                for (int i=0;i<arCounts.length();i++) {
                  result.append("\t"+arCounts.getInt(i));
                }
                result.append("\n");
                // Create row with counts
                JSONArray arHits = oTable.getJSONArray("hits");
                for (int i=0;i<arHits.length(); i++) {
                  JSONObject oHit = arHits.getJSONObject(i);
                  JSONArray arSubs = oHit.getJSONArray("subs");
                  result.append(oHit.getString("file")+"\t"+oHit.getInt("count"));
                  for (int j=0;j<arSubs.length(); j++) {
                    result.append("\t"+arSubs.getInt(j));
                  }
                  result.append("\n");
                }
              } else {
                // There should be one "subcat"
                String sSubCat = oTable.getString("subcat");
                int iCount = oTable.getInt("count");
                result.append("Sub category:\t"+sSubCat+"\n");
                result.append("Count:\t"+iCount+"\n");
                JSONArray arHits = oTable.getJSONArray("hits");
                for (int i=0;i<arHits.length(); i++) {
                  JSONObject oHit = arHits.getJSONObject(i);
                  result.append(oHit.getString("file")+"\t"+oHit.getInt("count")+"\t"+oHit.getInt("subcount")+"\n");
                }
              }
            } else {
              // The whole structure should be copied -- how??
            }
          }
          break;
        case "3": // Not implemented
        case "4": // Not implemented
          break;
        case "5": // Provide general information from the table
          // Start with preliminaries
          result.append("overview table\n\n");
          result.append("QC\tResult Label\tCategory\tNumber\n");
          // Work through all the QC lines contained in the arTable
          for (int k=0;k<arTable.length(); k++) {
            // Get this table
            JSONObject oTable = arTable.getJSONObject(k);
            // This should be a QC object
            if (oTable.has("qc")) {
              // Gather all necessary information
              int iQC = oTable.getInt("qc");
              String sLabel = oTable.getString("result");
              int iTotal = oTable.getInt("total");
              // Issue one line for the total
              result.append(iQC+"\t"+sLabel+"\t(all together)\t"+iTotal+"\n");
              // Walk through all sub-category lines
              if (oTable.has("subcats")) {
                // There are more than one subcats
                JSONArray arSubCat = oTable.getJSONArray("subcats");
                JSONArray arSubCount = oTable.getJSONArray("counts");
                for (int i=0;i<arSubCat.length();i++) {
                  result.append(iQC+"\t"+sLabel+"\t"+arSubCat.getString(i)+"\t"+arSubCount.getInt(i)+"\n");
                }
              }
            }
          }
          break;
      }
      
      // Return the resulting CSV table
  		return result.toString();
    } catch (Exception ex) {
      logger.DoError("ExportResponse: could not complete", ex);
      return "";
    }
	}
  
  /**
   * getSyntax
   *    Given a syntax object, transform it into a string
   * 
   * @param oSyntax
   * @return 
   */
  private String getSyntax(JSONObject oSyntax) {
    StringBuilder sBack = new StringBuilder();
    try {
      String sMain = oSyntax.getString("main");
      sBack.append("["+sMain+" ");
      JSONArray aChildren = oSyntax.getJSONArray("children");
      if (aChildren.length() == 0) {
        sBack.append(oSyntax.getString("txt"));
      } else {
        for (int i=0;i<aChildren.length();i++) {
          JSONObject oChild = aChildren.getJSONObject(i);
          sBack.append("["+oChild.getString("pos") + " " +
                  oChild.getString("txt") + "] ");
        }
      }
      sBack.append("]");
      // Return the result
      return sBack.toString();
    } catch (Exception ex) {
      logger.DoError("getSyntax: could not complete", ex);
      return "";
    }
  }
  
  /**
   * sendFileResponse
   *    Create a file named [fileName] from the data in [contents]
   *    As soon as "outStream.close()" is issued, the user
   *      is presented with a menu asking  him where he wants to save it
   * 
   * @param contents
   * @param fileName 
   */
	private void sendFileResponse(String contents, String fileName) {
    // Set HTTP headers
    // Note: this only works when the request is GET
    response.setHeader("Access-Control-Allow-Methods", "GET");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setContentType("application/octet-stream");
    response.setContentLength(contents.length());
    response.setHeader("Content-Type", "text/csv");
    response.setHeader("Content-Disposition", "attachment; filename=\"crpstudio_" + fileName + "\"");

    ServletOutputStream outStream = null;
    try {
      outStream = response.getOutputStream();
      try {
        outStream.write(contents.getBytes("utf-8"));
      } finally {
        outStream.close();
      }
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

  
}
