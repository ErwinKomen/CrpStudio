/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

package nl.ru.crpstudio.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.util.ArrayList;
import java.util.List;
import javax.servlet.http.Part;

/**
 * UserFile -- Holds all information pertaining to a file that is
 *             being uploaded in chunks
 * @author Erwin
 */
public class UserFile {
  // ================ Private variables ==============
  private ErrHandle errHandle;
  // ================ Public variables ===============
  public String userId;     // ID for the user of this file
  public String name;       // Name of this file
  public int total;        // Total number of expected chunks
  public List<FileChunk> chunk = new ArrayList<>();
  // ================ Class initialization ============
  public UserFile(String sUser, String sName, int iTotal, ErrHandle oErr) {
    this.userId = sUser;
    this.name = sName;
    this.errHandle = oErr;
    this.total = iTotal;
  }
  
  // ================ Public methods ==================
  /**
   * AddChunk -- Add one chunk to the list
   * 
   * @param oPart
   * @param iChunk
   * @param iTotal
   * @return 
   */
  public boolean AddChunk(Part oPart, int iChunk, int iTotal) {
    try {
      // Create a new chunk
      FileChunk oChunk = new FileChunk();
      oChunk.number = iChunk;
      oChunk.total = iTotal;
      oChunk.fileName = this.name;
      String sChunkFile = this.name + "." + iChunk + ".tmp";
      oChunk.fileChunk = sChunkFile;
      // Add this chunk to the list of chunks
      this.chunk.add(oChunk);
      // Read the chunk
      if (!getFileUpload(oPart, sChunkFile)) return false;
      // Return positively
      return true;
    } catch (Exception ex) {
      errHandle.DoError("UserFile/AddChunk: ", ex);
      return false;
    }    
  }
  
  /**
   * IsReady -- Check if all the chunks have been read
   * 
   * @return 
   */
  public boolean IsReady() {
    try {
      // Check if the size of the list equals the total expected number
      return (this.total == chunk.size());
    } catch (Exception ex) {
      errHandle.DoError("UserFile/IsReady: ", ex);
      return false;
    }   
  }
  
  // ================ Private methods =================
  
  /**
   * getFileAsValue -- Read a file into a string
   * 
   * @param part
   * @return
   * @throws IOException 
   */
  private String getFileAsValue(Part part) throws IOException {
    try {
      BufferedReader reader = new BufferedReader(new InputStreamReader(
          part.getInputStream(), "UTF-8"));
      StringBuilder value = new StringBuilder();
      char[] buffer = new char[1024];
      for (int length = 0; (length = reader.read(buffer)) > 0;) {
        value.append(buffer, 0, length);
      }
      return value.toString();
    } catch (Exception ex) {
      errHandle.DoError("UserFile/getFileAsValue: ", ex);
      return "";
    }    
  }  
   
  /**
   * getFileUpload -- Upload a file into a location
   * 
   * @param part        - the part we are uploading
   * @param sFileChunk  - location where part is to be stored
   * @return
   * @throws IOException 
   */
  private boolean getFileUpload(Part part, String sFileChunk) throws IOException {
    try {
      StringBuilder value;
      try (BufferedReader reader = new BufferedReader(new InputStreamReader(
              part.getInputStream(), "UTF-8"))) {
        File file = new File(sFileChunk);
        try (FileOutputStream foThis = new FileOutputStream(file); 
          OutputStreamWriter osThis = new OutputStreamWriter(foThis, "UTF-8"); 
          BufferedWriter writer = new BufferedWriter(osThis)) {
          value = new StringBuilder();
          char[] buffer = new char[1024];
          for (int length = 0; (length = reader.read(buffer)) > 0;) {
            writer.write(buffer, 0, length);
          } // Close writer
        }
      }
      return true;
    } catch (Exception ex) {
      errHandle.DoError("UserFile/getFileUpload: ", ex);
      return false;
    }    
  }  
  
}
/**
 * FileChunk -- one chunk in a file
 * 
 * @author Erwin
 */
class FileChunk {
  public int number;        // Number of this chunk
  public int total;         // Total number of chunks
  public String fileName;   // Name of the file this belongs to
  public String fileChunk;  // Name of the file where this chunk is stored
}
