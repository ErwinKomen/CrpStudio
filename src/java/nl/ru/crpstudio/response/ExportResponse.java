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
      project = "";
      
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
		this.servlet.log("CorporaResponse");
	}

	@Override
	public ExportResponse duplicate() {
		return new ExportResponse();
	}

	public String jobToCSV() {
		StringBuilder result = new StringBuilder();
    try {
      
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
