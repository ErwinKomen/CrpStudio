/**
 * Copyright (c) 2010, 2012 Institute for Dutch Lexicology.
 * All rights reserved.
 *
 * @author VGeirnaert
 */
package nl.ru.crpstudio.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.net.URLEncoder;
import java.util.LinkedHashMap;
import java.util.Map;


/**
 *
 */
public class QueryServiceHandler {

	private String webservice;
	private Map<Map<String, String[]>, String> requestsCache;
	public final int maxCacheSize;

	@SuppressWarnings("serial")
	public QueryServiceHandler(String url, int cacheSize) {
		maxCacheSize = cacheSize;
		webservice = url;

		// create a new linkedhashmap with an initial size of the maximum size it's allowed to be
		// a loadfactor of 0.75 and access-order (most recently accessed first) as ordering mode
		// also a remove eldest entry method to remove the last-accessed entry when we
		// reach our size limit
		requestsCache = new LinkedHashMap<Map<String, String[]>, String>(maxCacheSize, 0.75f, true ){
			@Override
			protected boolean removeEldestEntry(java.util.Map.Entry<Map<String, String[]>, String> eldest) {
				return size() > maxCacheSize;
			}
		};
	}

	public String makeRequest(Map<String, String[]> params) throws IOException {
		// if the same request has already been cached, return that
		if(requestsCache.containsKey(params))
			return getResponseFromCache(params);

		String requestUrl = webservice;

		System.out.println("Request: " + requestUrl);

		// if not, send a request to the webserver
		URL webserviceRequest = new URL(requestUrl);
		BufferedReader reader = new BufferedReader(new InputStreamReader(webserviceRequest.openStream(), "utf-8"));

		// make url parameter string
		StringBuilder builder = new StringBuilder();
		String line;

		// read the response from the webservice
		while( (line = reader.readLine()) != null )
			builder.append(line);

		reader.close();

		String response = builder.toString();

		// also, cache this request
		cacheRequest(params, response);

		return response;
	}
  
  /**
   * postRequest
   *    Where 'makeRequest'  issues a GET one, this method uses a POST one
   * 
   * @param params
   * @return        String with the response from the service
   * @author        Erwin R. Komen
   */
  public String postRequest(Map<String, String[]> params, String sParamString) throws IOException {
		// if the same request has already been cached, return that
		if(requestsCache.containsKey(params))
			return getResponseFromCache(params);

		String requestUrl = webservice;

		System.out.println("Request: " + requestUrl);

		// if not, send a POST request to the webserver
		URL postRequest = new URL(requestUrl);
    byte[] postDataBytes = sParamString.getBytes("UTF-8");
    
    HttpURLConnection conn = (HttpURLConnection) postRequest.openConnection();
    conn.setRequestMethod("POST");
    conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
    conn.setRequestProperty("Content-Length", String.valueOf(postDataBytes.length));
    conn.setDoOutput(true);
    conn.getOutputStream().write(postDataBytes);
    
    // Read the reply
    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
    
		// make url parameter string
		StringBuilder builder = new StringBuilder();
		String line;

		// read the response from the webservice
		while( (line = reader.readLine()) != null )
			builder.append(line);

		reader.close();

		String response = builder.toString();

		// also, cache this request
		cacheRequest(params, response);

		return response;
  }

  /**
   * fileRequest
   *    Where 'makeRequest'  issues a GET one, this method uses a POST one
   *    This variant issues a 'multipart' POST request
   *    1 - a parameter string
   *    2 - data (in a string)
   * 
   * @param params
   * @param sParamString
   * @param sData
   * @return        String with the response from the service
   * @author        Erwin R. Komen
   */
  public String fileRequest(Map<String, String[]> params, String sParamString, 
          String sData) throws IOException {
		// if the same request has already been cached, return that
		if(requestsCache.containsKey(params))
			return getResponseFromCache(params);

		String requestUrl = webservice;

		System.out.println("Request: " + requestUrl);

		// if not, send a POST request to the webserver
		URL postRequest = new URL(requestUrl);
    

    // Set some other necessary parameters for the multi-part POST
    String boundary = Long.toHexString(System.currentTimeMillis()); // A unique random value as separator.
    String CRLF = "\r\n"; // Line separator required by multipart/form-data.

    // Open a connection and signal that it is a multi-part request
    URLConnection conn = (URLConnection) postRequest.openConnection();
    conn.setDoOutput(true);
    conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

    // Open an output stream + writer to write to
    OutputStream output = conn.getOutputStream();
    PrintWriter writer = new PrintWriter(new OutputStreamWriter(output, "UTF-8"), true);

    // Send normal param.
    writer.append("--" + boundary).append(CRLF);
    writer.append("Content-Disposition: form-data; name=\"query\"").append(CRLF);
    writer.append("Content-Type: text/plain; charset=UTF-8").append(CRLF);
    writer.append(CRLF).append(sParamString).append(CRLF).flush();

    // Send the string data (XML file contents)
    writer.append("--" + boundary).append(CRLF);
    writer.append("Content-Disposition: form-data; name=\"file\"").append(CRLF);
    writer.append("Content-Type: text/plain; charset=UTF-8").append(CRLF); // Text file itself must be saved in this charset!
    writer.append(CRLF).flush();
    writer.append(sData);
    output.flush(); // Important before continuing with writer!
    writer.append(CRLF).flush(); // CRLF is important! It indicates end of boundary.
    
    // End of multipart/form-data.
    writer.append("--" + boundary + "--").append(CRLF).flush();    

    // Read the reply
    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
    
		// make url parameter string
		StringBuilder builder = new StringBuilder();
		String line;

		// read the response from the webservice
		while( (line = reader.readLine()) != null )
			builder.append(line);

		reader.close();

		String response = builder.toString();

		// also, cache this request
		cacheRequest(params, response);

		return response;
  }

  
  private void cacheRequest(Map<String, String[]> params, String response) {
		requestsCache.put(params, response);
	}

	/**
	 * Get the response string from the cache, may return null
	 *
	 * @param params
	 * @return String
	 */
	private String getResponseFromCache(Map<String, String[]> params) {
		return requestsCache.get(params);
	}

	/**
	 * Remove a request from the cache
	 *
	 * @param params
	 */
	public void removeRequestFromCache(Map<String, String[]> params) {
		requestsCache.remove(params);
	}

	public String getUrl() {
		return this.webservice;
	}
}
