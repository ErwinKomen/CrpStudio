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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import nl.ru.crpstudio.response.BaseResponse;
import nl.ru.crpstudio.util.ErrHandle;
import nl.ru.crpx.dataobject.DataObject;
import nl.ru.crpx.dataobject.DataObjectList;
import nl.ru.crpx.dataobject.DataObjectMapElement;
import nl.ru.crpx.project.CorpusResearchProject;
import nl.ru.util.FileUtil;
import nl.ru.util.json.JSONArray;
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
   * @param br            - 
   * @param sProjectName  - 
   * @param sUserId       - 
   * @param bForce        - Re-download forcefully
   * @return 
   */
  public CrpInfo getCrpInfo(BaseResponse br, String sProjectName, 
          String sUserId, boolean bForce) {
    try {
      // Check if this combination already exists in the list
      for (CrpInfo oCrpInfo : loc_crpUserList) {
        // Check if this has the correct project name, language index and user id
        if (oCrpInfo.prjName.equals(sProjectName) && oCrpInfo.userId.equals(sUserId) 
                && oCrpInfo.prjThis != null ) {
          // The CRP is already 'in store', but has it been downloaded yet?
          if (bForce) {
            // Make sure it is re-downloaded
            oCrpInfo.refresh();
          }
          // Return this object
          return oCrpInfo;
        } 
      } 
      // Getting here means that we need to create a new entry
      CrpInfo oNewCrpInfo = new CrpInfo(br, sProjectName, sUserId, logger);
      // Check if any errors were produced
      if (logger.hasErr()) return null;
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
   * @param bForce        - 
   * @return 
   */
  public CorpusResearchProject getCrp(BaseResponse br, String sProjectName, 
          String sUserId, boolean bForce) {
    try {
      CrpInfo oCrpInfo= getCrpInfo(br, sProjectName, sUserId, bForce);
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
   * getCrpId - Get the numerical id of the CRP for the indicated user
   * 
   * @param br
   * @param sProjectName  - Name of the Corpus Research Project
   * @param sUserId       - Name of the user
   * @return 
   */
  public int getCrpId(BaseResponse br, String sProjectName, String sUserId) {
    try {
      // Get a list of all projects for this user
      JSONArray arPrjList = br.getProjectList(sUserId);
      String sCrpName = (sProjectName.endsWith(".crpx")) ? sProjectName : sProjectName + ".crpx";
      // Walk the list until we find the @sProjectName
      for (int i=0;i<arPrjList.length(); i++) {
        // Is this the one?
        JSONObject oOneItem = arPrjList.getJSONObject(i);
        if (oOneItem.getString("crp").equals(sCrpName)) {
          // We found it
          return oOneItem.getInt("CrpId");
        }
      }
      // Getting here means failure...
      return -1;
    } catch (Exception ex) {
      logger.DoError("Could not get CrpId", ex, CrpContainer.class);
      return -1;
    }
  }
  
  /**
   * getCrpFile
   *    Get a FILE handle to the actual CRP file on the local /crpstudio server
   * 
   * @param sProjectName
   * @param sUserId
   * @return 
   */
  public File getCrpFile(String sProjectName, String sUserId) {
    try {
      // Check if this combination already exists in the list
      for (CrpInfo oCrpInfo : loc_crpUserList) {
        // Check if this has the correct project name, language index and user id
        if (oCrpInfo.prjName.equals(sProjectName) && oCrpInfo.userId.equals(sUserId) 
                && oCrpInfo.prjThis != null) {
          // Get the location
          String sLoc = oCrpInfo.prjThis.getLocation();
          // Return a handle to it
          return new File(sLoc);
        } 
      } 
      // There is no combination in the list, but it may still be there...
      String sCrpLoc = CrpInfo.sProjectBase + sUserId + "/" + sProjectName;
      if (!sCrpLoc.endsWith(".crpx")) sCrpLoc += ".crpx";
      return new File(sCrpLoc);
      // Return failure
      // return null;
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
   * Remove the CrpInfo object satisfying the indicated conditions
   * 
   * @param sProjectName
   * // @param sLngIndex
   * @param sUserId
   * @return 
   */
  public boolean removeCrpInfo(String sProjectName, String sUserId) {
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
/**
 * CrpInfo
 *    One combination of CRP-User
 *    The CRPs are 'personal': 
 *    - one userid can have one or more CRPs loaded
 *    - the same CRP can never belong to more than one userid
 *      (since they are stored physically inside the domain of a particular user)
 * 
 *    TODO:
 *    - What if one userid is open in more than one computer, and each one
 *      attempts to load the same CRP?
 * 
 * @author Erwin R. Komen
 */
class CrpInfo {
  // ========================= Constants =======================================
  static String sProjectBase = "/etc/crpstudio/"; // Base directory where user-spaces are stored
  // ==================== Variables belonging to one CrpUser object ============
  CorpusResearchProject prjThis;  // The CRP to which the user has access
  BaseResponse br;
  String prjName ;                // The name of this CRP
  String userId;                  // The user that has access to this CRP
  int crpId;                      // Numerical id for this combination of CRP and userid
  ErrHandle logger;               // Information and logging
	Map<String,Object> params;      // Parameters for the Crpp call
  // ================ Initialisation of a new class element ===================
  public CrpInfo(BaseResponse br, String sProjectName, String sUserId, ErrHandle errHandle) {
    // Set our error handler
    this.logger = errHandle;
    this.prjThis = null;
    this.br = br;
    // Make sure errors are treated well
    try {
      this.prjName = sProjectName;
      this.userId = sUserId;
      this.params = new HashMap<>();
      // Load the project
      if (!initCrp()) {
        logger.DoError("CrpInfo: Could not load project [" + sProjectName + "]");
        return;
      }
    } catch (Exception ex) {
      logger.DoError("CrpInfo: error while loading project [" + sProjectName + 
              "]", ex, CrpInfo.class);
    }
  }
  
  /**
   * refresh
   *    Re-load the CRP, provided it is already there
   * 
   * @return 
   */
  public final boolean refresh() {
    try {
      // Validate
      if (this.prjName.isEmpty() || this.prjThis == null) return false;
      // Download the project
      if (!getCrp(this.prjThis, true)) return false;
      
      // Return positively
      return true;
    } catch (Exception ex) {
      logger.DoError("refresh: error while refreshing project [" + this.prjName + 
              "]", ex, CrpInfo.class);
      return false;
    }
  }
  /* ---------------------------------------------------------------------------
   Name: initCrp
   Goal: Given the CRP named in [CrpInfo] and the user for this CRP,
          either load the CRP from the /etc/crpstudio/{user}/ domain,
          or fetch it from http://server/crpp, store it in the user domain,
          and load it from there.
   Parameters:  @br - the LoadResponse object from which [getCrppResponse]
                      can be executed
   History:
   7/nov/2014   ERK Created
   --------------------------------------------------------------------------- */
  public final boolean initCrp() {
    try {
      // Create room for a corpus research project
      CorpusResearchProject crpThis = new CorpusResearchProject(false);
      // Download the project
      if (!getCrp(crpThis, false)) return false;

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
   * getCrp
   *    Perform the actual job of downloading the project
   * 
   * @param crpThis
   * @return 
   */
  public boolean getCrp(CorpusResearchProject crpThis, boolean bForce) {
    try {
      // Set the project file name + path straight
      String sProjectPath = getCrpPath();
      // Is the project there?
      File fProjectPath = new File(sProjectPath);
      if (!fProjectPath.exists() || bForce) {
        // Fetch the project from /crpp
        this.params.put("userid", userId);
        this.params.put("name", prjName);
        String sResp = this.br.getCrppResponse("crpget", "", this.params, null);
        if (sResp.isEmpty() || !sResp.startsWith("{")) return false;
        // Convert the response to JSON
        JSONObject oResp = new JSONObject(sResp);
        // Get the status
        if (!oResp.has("status")) return false;
        if (!oResp.has("content")) return false;
        // Decypher the status
        JSONObject oStat = oResp.getJSONObject("status");
        JSONObject oContent = oResp.getJSONObject("content");
        switch (oStat.getString("code")) {
          case "completed":
            // Get the crp
            String sCrpText = oContent.getString("crp");
            // Save this CRP on the right place
            FileUtil.writeFile(sProjectPath, sCrpText, "utf-8");
            break;
          case "error":
            // Cannot receive a CRP if there was an error on a /crpp request
            logger.DoError("Could not load project " + this.prjName +
                    "There was a /crpp error: " + oContent.getString("message"));
            return false;
          default:
            // Unknown state to work with
            logger.DoError("Could not load project " + this.prjName+ 
                    ". unknown status ["+oStat.getString("code")+"].");
            return false;
        }

      }
      // Try to load the project from the place where it should be
      if (!crpThis.Load(sProjectPath, "", "", "")) {
        logger.DoError("Could not load project " + this.prjName);
        // Try to show the list of errors, if there is one
        String sMsg = crpThis.errHandle.getErrList().toString();
        logger.DoError("List of errors:\n" + sMsg);
        return false;
      }
      // Return positively
      return true;
    } catch (Exception ex) {
      logger.DoError("Could not download the CRP", ex, CrpInfo.class);
      return false;
    }
  }
  
  /**
   * getCrpPath
   *    Given the name of a CRP stored in this CrpInfo, get its full path
   * 
   * @return string with the full path to the CRP in the user domain
   */
  public String getCrpPath() {
    try {
      String sProjectPath = this.prjName;
      
      // Set the project path straight
      if (!sProjectPath.contains("/")) {
        sProjectPath = FileUtil.nameNormalize(sProjectBase  + this.userId + "/" + sProjectPath);
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
