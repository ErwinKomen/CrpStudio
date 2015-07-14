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
import java.util.HashMap;
import java.util.Map;
import javax.servlet.ServletOutputStream;
import nl.ru.util.FileUtil;
import nl.ru.util.json.JSONArray;
import nl.ru.util.json.JSONObject;

public class ExportResponse extends BaseResponse {
	private String project;
	private SecureRandom random = new SecureRandom();

	@Override
	protected void completeRequest() {
    String fileName = "";
    try {
      // Get the name of the project
      project = this.request.getParameter("project");
      if (project.isEmpty()) {
        // Provide some kind of warning/error??
        logger.DoError("ExportResponse: the parameter [project] is empty");
        return;
      }
      if (project.endsWith(".crpx")) {
        project = project.substring(0,project.lastIndexOf("."));
      }
      
      // Fetch the CSV information into a string
			String result = this.jobToCSV();
			
      switch (servlet.getRequestMethod()) {
        case "GET":
          // Make a filename for the file to be exported (tab-separated)
          fileName = project + "-" + new BigInteger(130, random).toString(32) + ".txt";
          // Save the string into a file that is returned as attachment to the user
          sendFileResponse(result, fileName);
          break;
        case "POST":
          fileName = "/" + servlet.getUserId() +"/"+project+"-export.txt" ;
          // Save the string into a file locally, and return the URL to the user
          sendFileLocResponse(result, fileName);
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
   * @return - String containing the tab-separated table representation
   */
	public String jobToCSV() {
		StringBuilder result = new StringBuilder();
    JSONArray arTable;
    
    try {
      // Get the "table" parameter
      String sTable = this.request.getParameter("table");
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
      
      // Return the resulting CSV table
  		return result.toString();
    } catch (Exception ex) {
      logger.DoError("CorporaResponse: could not complete", ex);
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
