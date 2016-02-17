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
import nl.ru.util.ByRef;
import nl.ru.util.FileUtil;
import nl.ru.util.StringUtil;

/**
 * UserFile -- Holds all information pertaining to a file that is
 *             being uploaded in chunks
 * @author Erwin
 */
public class UserFile {
  // ========================= Constants =======================================
  static String sProjectBase = "/etc/crpstudio/"; // Base directory where user-spaces are stored
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
      oChunk.fileChunk = FileUtil.nameNormalize(sProjectBase  + this.userId + "/" + sChunkFile) ;
      synchronized(chunk) {
        // Add this chunk to the list of chunks
        this.chunk.add(oChunk);
      }
      // =============== DEBUG =========
      // errHandle.debug("AddChunk ["+iChunk+"] size = " + this.chunk.size());
      // ===============================
      // Read the chunk
      if (!getFileUpload(oPart, oChunk.fileChunk)) return false;
      // Return positively
      return true;
    } catch (Exception ex) {
      errHandle.DoError("UserFile/AddChunk: ", ex);
      return false;
    }    
  }
  /**
   * CompressChunk -- Add one chunk to the list in a compressed form
   * 
   * @param oPart
   * @param iChunk
   * @param iTotal
   * @return 
   */
  public boolean CompressChunk(Part oPart, int iChunk, int iTotal) {
    try {
      // Create a new chunk
      FileChunk oChunk = new FileChunk();
      oChunk.number = iChunk;
      oChunk.total = iTotal;
      oChunk.fileName = this.name;
      String sChunkFile = this.name + "." + iChunk + ".tmp";
      oChunk.fileChunk = FileUtil.nameNormalize(sProjectBase  + this.userId + "/" + sChunkFile) ;
      if (!getFileUploadCompressed(oPart, oChunk.fileChunk)) return false;
      synchronized(chunk) {
        // Add this chunk to the list of chunks
        this.chunk.add(oChunk);
      }
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
  
  /**
   * SetSent -- Indicate that the chunk numbered @iChunk has been sent
   * 
   * @param iChunk 
   */
  public synchronized void SetSent(int iChunk) {
    try {
      // Get the chunk with the correct number
      for (int i=0;i<this.chunk.size(); i++) {
        FileChunk oChunk = this.chunk.get(i);
        if (oChunk.number == iChunk) {
          oChunk.sent = true;
          return;
        }
      }
    } catch (Exception ex) {
      errHandle.DoError("UserFile/SetSent: ", ex);
    }   
  }

  /**
   * IsSent -- Check if the chunk numbered @iChunk has been sent
   * 
   * @param iChunk 
   * @return  
   */
  public boolean IsSent(int iChunk) {
    try {
      // Get the chunk with the correct number
      for (int i=0;i<this.chunk.size(); i++) {
        FileChunk oChunk = this.chunk.get(i);
        return oChunk.sent;
      }
      return false;
    } catch (Exception ex) {
      errHandle.DoError("UserFile/IsSent: ", ex);
      return false;
    }   
  }

  /**
   * Clear -- Clear the current list of file chunks
   * 
   * @return 
   */
  public synchronized boolean Clear() {
    try {
      for (int i=0;i< chunk.size();i++) {
        File fChunk = new File(chunk.get(i).fileChunk);
        if (!fChunk.delete()) return false;
      }
      chunk.clear();
      // Check if the size of the list equals the total expected number
      return (this.total == chunk.size());
    } catch (Exception ex) {
      errHandle.DoError("UserFile/IsReady: ", ex);
      return false;
    }   
  }
  
  /**
   * getChunk -- get the chunk with the indicated chunk number (starting at 1)
   * 
   * @param i
   * @return 
   */
  public String getChunk(int i) {
    try {
      // Validate
      if (i > this.total) return "";
      // Get the name of the chunk file
      String sFileName = this.chunk.get(i-1).fileChunk;
      // Check if it exists
      File fFile = new File(sFileName);
      if (!fFile.exists()) return "";
      // Read the chunk and return it
      return (new FileUtil()).readFile(fFile);
    } catch (Exception ex) {
      errHandle.DoError("UserFile/getChunk: ", ex);
      return "";
    }
  }
  
  /**
   * getChunkFileLoc -- get the location of the compressed chunk file
   * 
   * @param i
   * @return 
   */
  public String getChunkFileLoc(int iChunk) {
    try {
      // Validate
      if (iChunk > this.total) return "";
      // Look for the chunk with this number
      for (int i=0;i<this.chunk.size();i++) {
        FileChunk oChunk = this.chunk.get(i);
        if (oChunk.number == iChunk) {
          // Func the chunk
          return oChunk.fileChunk;
        }
      }
      // Did not find it
      return "";
    } catch (Exception ex) {
      errHandle.DoError("UserFile/getChunkFileLoc: ", ex);
      return "";
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
  /**
   * getFileUploadCompressed -- Upload a file into memory and compress it
   * 
   * @param part        - the part we are uploading
   * @return
   * @throws IOException 
   */
  private boolean getFileUploadCompressed(Part part, String sFile) throws IOException {
    String sContent = "";
    
    try {
      StringBuilder value;
      try (BufferedReader reader = new BufferedReader(new InputStreamReader(
            part.getInputStream(), "UTF-8"))) {
        value = new StringBuilder();
        char[] buffer = new char[1024];
        for (int length = 0; (length = reader.read(buffer)) > 0;) {
          value.append(buffer, 0, length);
        } // Close writer
      }
      // Compress the result
      sContent = StringUtil.compressSafe(value.toString());
      // sContent = value.toString();
      // Save it to the indicated file
      FileUtil.writeFile(sFile, sContent, "UTF-8");
      return true;
    } catch (Exception ex) {
      errHandle.DoError("UserFile/getFileUploadCompressed: ", ex);
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
  public String compress;   // Content of the file in a compressed form
  public boolean sent;      // Indicates chunk has been sent
  public FileChunk() {
    this.sent = false;
  }
}
