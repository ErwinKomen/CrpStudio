/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, erwin, Crpstudio, alert: false, */
var crpstudio = (function (crpstudio) {
  "use strict";
  crpstudio.config = {
    
    // Object defining the elements of Project, Query, Definition, DbFeat and Constructor
    // Perhaps also of Dbase??
    prj_access: [
      // Project
      {name: "project", id: "", listfield: "Name", descr: "project_description", prf: "crp",
        gen: "project_general", cur: "crp_current", divprf: "project", fields: [
            { field: "Name",        type: "txt", loc: "project_general_name"}, 
            { field: "Author",      type: "txt", loc: "project_general_author"}, 
            { field: "ProjectType", type: "txt", loc: "project_general_prjtype"}, 
            { field: "Comments",    type: "txt", loc: "project_general_comments"}, 
            { field: "Goal",        type: "txt", loc: "project_general_goal"}, 
            { field: "DbaseInput",  type: "txt", loc: "project_general_dbase"}, 
            { field: "Created",     type: "cap", loc: "project_general_datecreated"}, 
            { field: "Changed",     type: "cap", loc: "project_general_datechanged"}]},
      // Query
      {name: "query", id: "QueryId", listfield: "Name", descr: "query_description", prf: "qry",
        gen: "query_general", cur: "qry_current", divprf: "query", fields: [
            { field: "Name",        type: "txt", loc: "query_general_name"}, 
            { field: "File",        type: "txt", loc: ""}, 
            { field: "Goal",        type: "txt", loc: "query_general_goal"}, 
            { field: "Comment",     type: "txt", loc: "query_general_comment"}, 
            { field: "Text",        type: "txt", loc: "query_general_text"}, 
            { field: "Created",     type: "cap", loc: "query_general_datecreated"}, 
            { field: "Changed",     type: "cap", loc: "query_general_datechanged"}]},
      // Definition
      {name: "definition",id: "DefId", listfield: "Name", descr: "def_description",  prf: "def",
        gen: "def_general", cur: "def_current", divprf: "def", fields: [
            { field: "Name",        type: "txt", loc: "def_general_name"}, 
            { field: "File",        type: "txt", loc: ""}, 
            { field: "Goal",        type: "txt", loc: "def_general_goal"}, 
            { field: "Comment",     type: "txt", loc: "def_general_comment"}, 
            { field: "Text",        type: "txt", loc: "def_general_text"}, 
            { field: "Created",     type: "cap", loc: "def_general_datecreated"}, 
            { field: "Changed",     type: "cap", loc: "def_general_datechanged"}]},
      // DbFeat
      {name: "dbfeat", id: "DbFeatId", listfield: "Name", descr: "dbf_description",  prf: "dbf",
        gen: "dbf_general", cur: "dbf_current", divprf: "dbf", fields: [
            { field: "Name",        type: "txt", loc: "dbf_general_name"}, 
            { field: "Pre",         type: "txt", loc: "dbf_general_pre"}, 
            { field: "QCid",        type: "txt", loc: "dbf_general_qcid"}, 
            { field: "FtNum",       type: "txt", loc: "dbf_general_ftnum"}]},
      // Constructor
      {name: "constructor", id: "QCid", listfield: "Result", descr: "qc_description",  prf: "qc",
        gen: "qc_general", cur: "qc_current", divprf: "qc", fields: [
            { field: "Input",       type: "txt", loc: "qc_general_input"}, 
            { field: "Query",       type: "txt", loc: "qc_general_query"}, 
            { field: "Output",      type: "txt", loc: "qc_general_output"}, 
            { field: "Result",      type: "txt", loc: "qc_general_result"}, 
            { field: "Cmp",         type: "txt", loc: "qc_general_cmp"}, 
            { field: "Mother",      type: "txt", loc: "qc_general_mother"}, 
            { field: "Goal",        type: "txt", loc: "qc_general_goal"}, 
            { field: "Comment",     type: "txt", loc: "qc_general_comment"}]}
    ]
  };
  
  // Return this variable
  return crpstudio;
}(window.crpstudio || {}));

