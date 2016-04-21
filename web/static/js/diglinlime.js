/**
 * Copyright (c) 2016 Radboud University Nijmegen
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

// var gl_userNum = "";    // User number --> replaced by sessionStorage
// var gl_arQuestion = []; // Global array
var sQuestionUrl = "http://cls.ru.nl/diglin/diglinlime.php";

// ==============================================================
// Name:  getUserNum
// Goal:  Given the userId, find out what the user number is
//        Each respondent receives a unique *code*
//        We use the last 3 digits of this code to get the number of the user
// History:
// 21/apr/2016  ERK  Created for DigLin
// ==============================================================
function getUserNum(sUserId) {
  if (sUserId === undefined) { return false; }
  // Get the last 3 digits of the userid
  sUserId = sUserId.trim();
  var iPos = sUserId.length - 3;
  // Validate
  if (iPos<0) {
    // This is a wrong number: take '0' as default
    // gl_userNum = "0";
    sessionStorage.setItem("gl_userNum", "0");
  } else {
    // Correct number -- take it
    // gl_userNum = String(parseInt(sUserId.substr(iPos), 10));
    sessionStorage.setItem("gl_userNum", String(parseInt(sUserId.substr(iPos), 10)));
  }
  // Return what we made
  // return gl_userNum;
  return sessionStorage.getItem("gl_userNum");
}

// ==============================================================
// Name:  makeSoundButton
// Goal:  Given the User/Question, create a button for playing the sound
//        This button appears within the <div> with @id = sTarget
// History:
// 21/apr/2016  ERK  Created for DigLin
// ==============================================================
function makeSoundButton(sQuestionId, sUserNum, sTarget) {
  // Validate the parameters
  if (sQuestionId === undefined || sUserNum === undefined) { return ""; }
  // We have a valid question and user id
  // Set the global user number if not yet done
  /* if (gl_userNum ==="") { gl_userNum = getUserNum(sUserNum); } */
  var sUserIdNum = sessionStorage.getItem("userNum");
  if (sUserIdNum === null || sUserIdNum === "") { getUserNum(sUserNum); }
  // Get a number for the question
  var sQuestionNum = getQuestionNum(sQuestionId);
  var sQuestionFile = sQuestionNum + ".wav";
  createQbutton(sTarget, sQuestionFile);
  return true;
}

// ==============================================================
// Name:  setSoundUrl
// Goal:  Given the User/Question, create a button for playing the sound
//        This button appears within the <div> with @id = sTarget
//        
// NOTE:  THIS DOES NOT WORK!!!!!
//        Reason is that limesurvey is on https, and the webservice on http
//        Calling a http service from https is not allowed...
//        
//        This method has been replaced by [makeSoundButton]
//        
// History:
// 21/apr/2016  ERK  Created for DigLin
// ==============================================================
function setSoundUrl(sQuestionId, sUserNum, sTarget) {
  // Validate the parameters
  if (sQuestionId === undefined || sUserNum === undefined) { return ""; }
  // We have a valid question and user id
  // Set the global user number if not yet done
  /* if (gl_userNum ==="") { gl_userNum = getUserNum(sUserNum); } */
  var sUserIdNum = getUserNum(sUserNum);
  // Combine into an object
  // Direct creation does not work in LimeSurvey:
  // var oArgs = {action: "qfile", args: {usernum: sUserNum, sgq: sQuestionId}};
  var oArgs = new Object(); oArgs.action = "qfile";
  var oInner = new Object(); oInner.usernum = sUserIdNum; oInner.sgq = sQuestionId;
  oArgs.args = oInner;
  var params = JSON.stringify(oArgs);
  // Issue the web-service request
  getWebserviceData(sQuestionUrl, params, processQfile, sTarget);
  return true;
}

// ==============================================================
// Name:  processQfile
// Goal:  Process the 'qfile' request to the web service
// 
// NOTE:  THIS DOES NOT WORK!!!!!
//        Reason is that limesurvey is on https, and the webservice on http
//        Calling a http service from https is not allowed...
//        
// History:
// 21/apr/2016  ERK  Created for DigLin
// ==============================================================
function processQfile(response, sTarget) {
  if (response !== null) {
    // The response object should have a status and a result
    var sStatus = response.status;
    var sResult = response.result;
    // Action depends on the status
    switch(sStatus) {
      case "completed": // All went fine
        createQbutton(sTarget, sResult);
        break;
      case "error":     // Some error occurred
        debug("error: " + sResult);
        break;
      default:
        debug("error: " + sResult);
        break;
    }
  }
}

// ==============================================================
// Name:  createQbutton
// Goal:  Construct a question button and position it on the 'target' div
// History:
// 21/apr/2016  ERK  Created for DigLin
// ==============================================================
function createQbutton(sTarget, fName) {
  var arHtml = [];
  var sAudioId = "sound_"+sTarget;
  var sButtonId = "button_"+sTarget;
  var sUserNum = sessionStorage.getItem("gl_userNum");
  var sLink = "http://cls.ru.nl/diglin/"+sUserNum+"/"+fName;

  // Create HTML code for the audio and the button
  // OVERT CONTROLS: arHtml.push("<audio id='"+sAudioId+"' controls=''>");
  arHtml.push("<audio id='"+sAudioId+"' >");
  arHtml.push(" <source src='"+sLink+"' type='audio/wav'>");
  arHtml.push("  Your browser does not support this audio");
  arHtml.push(" </source>");
  arHtml.push("</audio>");
  arHtml.push("<input type='button' value='Speel één keer af' id='"+sButtonId+"' />");
  // =============== DEBUG ==================
  // THIS SHOULD BE REMOVED before the final survey is done
  arHtml.push("<span>Controle:</span><span>"+sLink+"</span>");
  // ========================================

  // Add the code to the div
  $("#"+sTarget).html(arHtml.join("\n"));

  // Add jQuery code to react to pressing the button
  $("#"+sButtonId).on("click", function() {
    audioButtonClick(sButtonId, sAudioId);
  });
}

// ==============================================================
// Name:  audioButtonClick
// Goal:  Response to clicking a button: play audio and then disable button
// History:
// 21/apr/2016  ERK  Created for DigLin
// ==============================================================
function audioButtonClick(sButtonId, sAudioId) {
  // Play the audio
  $("#"+sAudioId).get(0).play();
  // Disable the button
  $("#"+sButtonId).off("click");
  // Change the text of the button
  $("#"+sButtonId).val("===");
} 

/* ====================================================================================
    Name: getWebserviceData
    Goal: Issue an AJAX request using jQuery
    History:
    21/apr/2016  ERK Created for DIGLIN survey
    ==================================================================================== */
 function getWebserviceData(requestUrl, sData, callback, target) {
   // Take over the URL of the intended web-service
   var urlSearch = requestUrl ;
   // Send the query /crpstudio for processing
   $.ajax({
     type: 'POST',           // Method: may be GET or POST
     url : urlSearch,       // Address to pass the request to
     dataType : 'jsonp',     // The kind of data I am expecting back
     data : sData,          // String data that I am sending packed in Json
     cache: false,
     store: false,
     // process query results
     success : function(responses) { 
       try {
         var oResp = JSON.parse(responses);        
         callback(oResp, target); 
       } catch (e) {
         // No need to do anything much here
         debug('response is not JSON');
       }
     },
     // Process any errors
     error : function(jqXHR, textStatus, errorThrown) {
       debug('The request did not succeed: ' + textStatus + 
                       ' Response=' + jqXHR.responseText);
     }
   });
   return (true);
  }

/* --------------------------------------------------------------------------
 * Name: debug
 * Goal: Issue a debugging message to the console
 * History:
 * jun/2015 ERK Copied from WhiteLab
 */
function debug(msg) {
  console.log(msg);
}

// ==============================================================
// Name:  getQuestionNum
// Goal:  Map the question id (string/name) to a number from 1 on
// History:
// 20/apr/2016  ERK  Created for DigLin
// ==============================================================
function getQuestionNum(sQuestionId) {
  // validate
  if (sQuestionId === undefined) { return "0"; }
  // Translate JSON string into array
  // var arQuestion = gl_arQuestion
  var arQuestion = [];
  var sGlVar = sessionStorage.getItem("gl_arQuestion");
  if (sGlVar !== null) { arQuestion = JSON.parse(sGlVar); }
  // 
  // Check if the name is in the array
  for (var i=0;i<arQuestion.length;i++) {
    // Is this the name?
    if (arQuestion[i] === sQuestionId) {
      // This is the name: return the correct string id
      return parseInt(i+1, 10);
    }
  }
  // User is not (yet) in the array: add it
  arQuestion.push(sQuestionId);
  sessionStorage.setItem("gl_arQuestion", JSON.stringify(arQuestion));
  // Return the correct id
  return parseInt(arQuestion.length,10);
}      

