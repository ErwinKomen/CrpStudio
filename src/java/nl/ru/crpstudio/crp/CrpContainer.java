/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package nl.ru.crpstudio.crp;

import java.io.File;
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import nl.ru.crpstudio.response.LoadResponse;
import nl.ru.crpx.dataobject.DataObject;
import nl.ru.crpx.dataobject.DataObjectList;
import nl.ru.crpx.dataobject.DataObjectMapElement;
import nl.ru.crpx.project.CorpusResearchProject;
import nl.ru.crpx.tools.ErrHandle;
import nl.ru.util.FileUtil;
import nl.ru.util.json.JSONObject;

/**
 * CrpContainer
 *    Storage of CRP information objects including user info
 * 
 * @author Erwin R. Komen
 */
public class CrpContainer {
  // ================ Local variables ==========================================
  ErrHandle logger;            // The error handler we are using
  // ================ Static variables =========================================
  static List<CrpInfo> loc_crpUserList; // List of CrpInfo elements
  static int loc_id;                    // the Id of each CrpInfo element
  // ================ Class initializer ========================================
  public CrpContainer(ErrHandle errHandle) {
    // Initialize the id
    this.loc_id = -1;
    // Set the error handler
    this.logger = errHandle;
    // Initialise the list
    loc_crpUserList = new ArrayList<>();
  }
  
  /**
   * getCrpInfo
   *    Either get an existing CrpInfo object, or get a CRP from /crpp
   *    and create a new CrpInfo object
   * 
   * @param br
   * @param sProjectName
   * @param sUserId
   * @return 
   */
  public CrpInfo getCrpInfo(LoadResponse br, String sProjectName, String sUserId) {
    try {
      // Check if this combination already exists in the list
      for (CrpInfo oCrpInfo : loc_crpUserList) {
        // Check if this has the correct project name, language index and user id
        if (oCrpInfo.prjName.equals(sProjectName) && oCrpInfo.userId.equals(sUserId)
                /* && oCrpInfo.lngIndex.equals(sLngIndex) */) {
          // Return this object
          return oCrpInfo;
        } 
      } 
      // Getting here means that we need to create a new entry
      CrpInfo oNewCrpInfo = new CrpInfo(br, sProjectName, sUserId, logger);
      // Add this to the list
      loc_crpUserList.add(oNewCrpInfo);
      logger.debug("adding CrpInfo in getCrpInfo: [" + sProjectName + 
              ", " + sUserId + "]", CrpContainer.class);
      // Return this newly created one
      return oNewCrpInfo;
    } catch (Exception ex) {
      logger.DoError("Could not load or retrieve CRP", ex, CrpContainer.class);
      return null;
    }
  }
  
  /**
   * getCrp
   *    Load from memory or fetch from /crpp
   *    the CRP belonging to the indicated project name and user
   * 
   * @param br            - 
   * @param sProjectName  - 
   * @param sUserId       - 
   * @return 
   */
  public CorpusResearchProject getCrp(LoadResponse br, String sProjectName, String sUserId) {
    try {
      CrpInfo oCrpInfo= getCrpInfo(br, sProjectName, sUserId);
      // Check what we get back
      if (oCrpInfo == null)
        return null;
      else
        return oCrpInfo.prjThis;
    } catch (Exception ex) {
      logger.DoError("Could not load or retrieve CRP", ex, CrpContainer.class);
      return null;
    }
  }
  
  /**
   * getCrpList - get a list of the CRPs for the indicated user
   *              If no user is given: provide all users and all CRPs
   * 
   * @param sUserId
   * @param sFilter
   * @return 
   */
  public DataObject getCrpList(String sUserId, String sFilter) {
    return getCrpList(sUserId, sFilter, "*.crpx");
  }
  public DataObject getCrpList(String sUserId, String sFilter, String sFileName) {
    String sUserPath;     // Where the users are stored
    List<String> lUsers;  // List of crpx
    
    try {
      // Create a list to reply
      DataObjectList arList = new DataObjectList("crplist");
      
      // Get a path to the users
      sUserPath = FileUtil.nameNormalize(CrpInfo.sProjectBase);
      if (sUserPath.isEmpty()) return arList;
      // Initialise
      lUsers = new ArrayList<>();
      Path dir = Paths.get(sUserPath);
      // Get all the items inside "dir"
      try(DirectoryStream<Path> streamUser = Files.newDirectoryStream(dir)) {
        // Walk all these items
        for (Path pathUser : streamUser) {
          // Add the directory to the list of users
          lUsers.add(pathUser.toAbsolutePath().toString());
          // Get the user
          String sUser = pathUser.getFileName().toString();
          // Is this the user we are looking for?
          if (sUserId.isEmpty() || sUser.equals(sUserId)) {
            // Get all the CRP files in the user's directory
            DirectoryStream<Path> streamCrp = Files.newDirectoryStream(pathUser, sFileName);
            for (Path pathCrp : streamCrp) {
              // Get the name of this crp
              String sCrp = pathCrp.getFileName().toString();
              // Check its status
              boolean bLoaded = hasCrpInfo(sCrp, sUser);
              boolean bInclude;
              switch (sFilter) {
                case "loaded":
                  bInclude = bLoaded; break;
                case "not loaded": case "notloaded":
                  bInclude = !bLoaded; break;
                default:
                  bInclude = true; break;
              }
              if (bInclude) {
                // Okay, create a reply object
                DataObjectMapElement oData = new DataObjectMapElement();
                oData.put("userid", sUser);
                oData.put("crp", sCrp);
                oData.put("loaded", bLoaded);
                String sCrpPath = pathCrp.toString();
                oData.put("file", sCrpPath);
                // Include the object here
                arList.add(oData);
              }
            }
          }
        }
      } catch(IOException ex) {
        logger.DoError("Could not get a list of CRP-User objects", ex, CrpContainer.class);
      }
      // Return the array
      return arList;
    } catch (Exception ex) {
      logger.DoError("Could not get a list of CRP-User objects", ex, CrpContainer.class);
      return null;
    }
  }
  
  /**
   * hasCrpInfo - does user @sUserId have the project named @sProjectName
   * 
   * @param sProjectFile
   * @param sUserId
   * @return 
   */
  public boolean hasCrpInfo(String sProjectFile, String sUserId) {
    try {
      // Walk the list
      for (CrpInfo oCrpInfo : loc_crpUserList) {
        // Does this belong to the indecated user?
        if (sUserId.isEmpty() || sUserId.equals(oCrpInfo.userId)) {
          // Is this the correct project?
          if (oCrpInfo.prjName.equals(sProjectFile)) {
            // Yes, return positively
            return true;
          }
        }
      }
      // Failure
      return false;
    } catch (Exception ex) {
      logger.DoError("Could not check existence of Crp/User combination", ex, CrpContainer.class);
      return false;
    }
  }
  
  /**
   * removeCrpInfo
   * Remove the CrpInfo object satisfying the indecated conditions
   * 
   * @param sProjectName
   * // @param sLngIndex
   * @param sUserId
   * @return 
   */
  public boolean removeCrpInfo(String sProjectName, /* String sLngIndex, */ 
          String sUserId) {
    try {
      // Check if this combination already exists in the list
      for (CrpInfo oCrpInfo : loc_crpUserList) {
        // Check if this has the correct project name, language index and user id
        if (oCrpInfo.prjName.equals(sProjectName) && oCrpInfo.userId.equals(sUserId)) {
          // We found it: now remove it
          logger.debug("removing CrpInfo: [" + sProjectName + 
              ", " + sUserId + "]", CrpContainer.class);
          loc_crpUserList.remove(oCrpInfo);
          // Return positively
          return true;
        } 
      } 
      // Return failure: we didn't find it
      return false;
    } catch (Exception ex) {
      logger.DoError("Could not remove CRP-User object", ex, CrpContainer.class);
      return false;
    }
  }          

}
class CrpInfo {
  // ========================= Constants =======================================
  static String sProjectBase = "/etc/crpstudio/"; // Base directory where user-spaces are stored
  // ==================== Variables belonging to one CrpUser object ============
  CorpusResearchProject prjThis;  // The CRP to which the user has access
  String prjName;                 // The name of this CRP
  String userId;                  // The user that has access to this CRP
  ErrHandle logger;               // Information and logging
  // ================ Initialisation of a new class element ===================
  public CrpInfo(LoadResponse br, String sProjectName, String sUserId, ErrHandle errHandle) {
    // Set our error handler
    this.logger = errHandle;
    // Make sure errors are treated well
    try {
      this.prjName = sProjectName;
      this.userId = sUserId;
      // Load the project
      if (!initCrp(br)) {
        logger.DoError("CrpInfo: Could not load project [" + sProjectName + "]");
        return;
      }
    } catch (Exception ex) {
      logger.DoError("CrpInfo: error while loading project [" + sProjectName + 
              "]", ex, CrpInfo.class);
    }
    
  }
  /* ---------------------------------------------------------------------------
   Name: initCrp
   Goal: Initialize CRP-related parameters for this requesthandler
   Parameters:  @sProjectPath - HTTP request object
   History:
   7/nov/2014   ERK Created
   --------------------------------------------------------------------------- */
  public final boolean initCrp(LoadResponse br) {
    try {
      // Create room for a corpus research project
      CorpusResearchProject crpThis = new CorpusResearchProject();
      // Set the project path straight
      String sProjectPath = getCrpPath();
      // Is the project there?
      File fProjectPath = new File(sProjectPath);
      if (!fProjectPath.exists()) {
        // Fetch the project from /crpp
        String sResp = br.getCrppResponse(userId, prjName, null);
        if (sResp.isEmpty() || !sResp.startsWith("{")) return false;
        // Convert the response to JSON
        JSONObject oResp = new JSONObject(sResp);
        // Get the status
        if (!oResp.has("status")) return false;
        // Decypher the status
        JSONObject oStat = oResp.getJSONObject("status");
        if (oStat)

      }
      // Try to load the project from the place where it 
      if (!crpThis.Load(sProjectPath, "", "", "")) {
        logger.DoError("Could not load project " + this.prjName);
        // Try to show the list of errors, if there is one
        String sMsg = crpThis.errHandle.getErrList().toString();
        logger.DoError("List of errors:\n" + sMsg);
        return false;
      }


      // Get my copy of the project
      this.prjThis = crpThis;
      // Return positively
      return true;
    } catch (Exception ex) {
      logger.DoError("There's a problem initializing the CRP", ex, CrpInfo.class);
      // Return failure
      return false;
    }
  }
  /**
   * Given the name of a CRP stored in this CrpInfo, get its full path
   * 
   * @return 
   */
  public String getCrpPath() {
    try {
      String sProjectPath = this.prjName;
      
      // Set the project path straight
      if (!sProjectPath.contains("/")) {
        sProjectPath = FileUtil.nameNormalize(sProjectBase + "/" + this.userId + "/" + sProjectPath);
        if (!sProjectPath.contains(".")) {
          sProjectPath += ".crpx";
        }
      }
      // Return our findings
      return sProjectPath;
    } catch (Exception ex) {
      logger.DoError("Could not get CRP path", ex, CrpInfo.class);
      return "";
    }
  }  
}
