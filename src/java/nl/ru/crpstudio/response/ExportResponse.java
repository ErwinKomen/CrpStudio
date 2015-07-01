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
    try {
      // Get the name of the project
      project = "dum";
      
      // Make a filename for the file to be exported (tab-separated)
			String fileName = project + "-" + new BigInteger(130, random).toString(32) + ".csv";
			
      // Fetch the CSV information into a string
			String result = this.jobToCSV();
			
      // Save the string into a file
			sendFileResponse(result, fileName);
			

    } catch (Exception ex) {
      logger.DoError("ExportResponse: could not complete", ex);
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

	public String jobToCSV() {
		StringBuilder result = new StringBuilder();
    try {
      // Get the "table" parameter
      String sTable = this.request.getParameter("table");
      if (sTable.isEmpty()) return "";
      // Start making table
      result.append("date:\t"+getCurrentTimeStamp()+"\n");
      result.append("\n");

      // Transform the json string into an object
      JSONObject oTable = new JSONObject(sTable);
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
      
      // Return the resulting CSV table
  		return result.toString();
    } catch (Exception ex) {
      logger.DoError("CorporaResponse: could not complete", ex);
      return "";
    }
	}
	private void sendFileResponse(String contents, String fileName) {
    // Set HTTP headers
		response.setContentType("application/octet-stream");
    response.setContentLength(contents.length());
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
