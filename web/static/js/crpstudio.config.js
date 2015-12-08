/**
 * Copyright (c) 2015 CLARIN-NL.
 * All rights reserved.
 *
 * @author Erwin R. Komen
 */

/*globals jQuery, crpstudio, erwin, Crpstudio, alert: false, */
/*jslint browser: true, indent: 2 */
var crpstudio = (function (crpstudio) {
  "use strict";
  crpstudio.config = {
    
    baseUrl: null,              // Base URL for crpstudio
    blsUrl:  null,              // Address of the Black Lab Server
    crppUrl: null,              // Address for Corpus Research Project Processor requests
    language: null,             // UI language currently used
    defPrjType: "Folia-Xml",    // Default project type for new projects
    // Object that makes the link between a project type and the tags used in that type
    prj_tags: [
      {prjtype: "folia-xml",   main: "FoLiA",     sent: "s",      const: "su",    word: "w",    pos: "class"},
      {prjtype: "alpino-xml",  main: "alpino_ds", sent: "node",   const: "node",  word: "node", pos: "postag"},
      {prjtype: "xquery-psdx", main: "TEI",       sent: "forest", const: "eTree", word: "eLeaf",pos: "Label"}
    ],
    // Object defining the elements of Project, Query, Definition, DbFeat and Constructor
    // Perhaps also of Dbase??
    // Object defining the elements of Query, Definition, DbFeat and Constructor
    prj_access: [
      {name: "project", id: "CrpId", listfield: "Name", sortfield: "Name", sorttype: "txt", 
        descr: "project_description", prf: "crp", 
        before: function(sType, iItemId) { return crpstudio.project.setCrpItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.project.setCrpItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "project_general", cur: "crp_current", divprf: "project", fields: [
            { field: "Name",        type: "txt", loc: "project_general_name"}, 
            { field: "Author",      type: "txt", loc: "project_general_author"}, 
            { field: "ProjectType", type: "txt", loc: "project_general_prjtype"}, 
            { field: "Comments",    type: "txt", loc: "project_general_comments"}, 
            { field: "Goal",        type: "txt", loc: "project_general_goal"}, 
            { field: "DbaseInput",  type: "chk", loc: "project_general_dbase"}, 
            { field: "Created",     type: "cap", loc: "project_general_datecreated"}, 
            { field: "Changed",     type: "cap", loc: "project_general_datechanged"}]},
      {name: "query", id: "QueryId", listfield: "Name", sortfield: "Name",  sorttype: "txt", 
        descr: "query_description", prf: "qry", 
        before: function(sType, iItemId) { return crpstudio.project.setCrpItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.project.setCrpItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "query_general", cur: "qry_current", divprf: "query", fields: [
            { field: "Name",        type: "txt", loc: "query_general_name"}, 
            { field: "File",        type: "txt", loc: ""}, 
            { field: "Goal",        type: "txt", loc: "query_general_goal"}, 
            { field: "Comment",     type: "txt", loc: "query_general_comment"}, 
            { field: "Text",        type: "txt", loc: "query_general_text"}, 
            { field: "Created",     type: "cap", loc: "query_general_datecreated"}, 
            { field: "Changed",     type: "cap", loc: "query_general_datechanged"}]},
      {name: "definition",id: "DefId", listfield: "Name", sortfield: "Name",  sorttype: "txt", 
        descr: "def_description",  prf: "def", 
        before: function(sType, iItemId) { return crpstudio.project.setCrpItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.project.setCrpItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "def_general", cur: "def_current", divprf: "def", fields: [
            { field: "Name",        type: "txt", loc: "def_general_name"}, 
            { field: "File",        type: "txt", loc: ""}, 
            { field: "Goal",        type: "txt", loc: "def_general_goal"}, 
            { field: "Comment",     type: "txt", loc: "def_general_comment"}, 
            { field: "Text",        type: "txt", loc: "def_general_text"}, 
            { field: "Created",     type: "cap", loc: "def_general_datecreated"}, 
            { field: "Changed",     type: "cap", loc: "def_general_datechanged"}]},
      {name: "dbfeat", id: "DbFeatId", listfield: "Name", sortfield: "FtNum",  sorttype: "int", 
        descr: "dbf_description",  prf: "dbf", 
        before: function(sType, iItemId) { return crpstudio.project.setCrpItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.project.setCrpItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "dbf_general", cur: "dbf_current", divprf: "dbf", fields: [
            { field: "Name",        type: "txt", loc: "dbf_general_name"}, 
            { field: "Pre",         type: "chk", loc: "dbf_general_pre"}, 
            { field: "QCid",        type: "txt", loc: "dbf_general_qcid"}, 
            { field: "FtNum",       type: "txt", loc: "dbf_general_ftnum"}]},
      {name: "constructor", id: "QCid", listfield: "Result", sortfield: "QCid",  sorttype: "int", 
        descr: "qc_description",  prf: "qc", 
        before: function(sType, iItemId) { return crpstudio.project.setCrpItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.project.setCrpItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "qc_general", cur: "qc_current", divprf: "qc", fields: [
            { field: "Input",       type: "txt", loc: "qc_general_input"}, 
            { field: "Query",       type: "txt", loc: "qc_general_query"}, 
            { field: "Output",      type: "txt", loc: "qc_general_output"}, 
            { field: "OutFeat",     type: "txt", loc: ""}, 
            { field: "Result",      type: "txt", loc: "qc_general_result"}, 
            { field: "Cmp",         type: "chk", loc: "qc_general_cmp"}, 
            { field: "Mother",      type: "txt", loc: "qc_general_mother"}, 
            { field: "Goal",        type: "txt", loc: "qc_general_goal"}, 
            { field: "Comment",     type: "txt", loc: "qc_general_comment"}]},
      {name: "corpus", id: "CorpusId", listfield: "part", sortfield: "part",  sorttype: "txt", 
        descr: "corpus_description", prf: "cor", 
        before: function(sType, iItemId) { return crpstudio.corpora.setCorItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.corpora.setCorItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "corpus_general", cur: "cor_current", divprf: "corpus", fields: [
            { field: "part",        type: "txt", loc: "corpus_general_part"}, 
            { field: "dir",         type: "txt", loc: "corpus_general_dir"}, 
            { field: "lng",         type: "txt", loc: "corpus_general_lng"}, 
            { field: "lngName",     type: "txt", loc: "corpus_general_lngname"}, 
            { field: "lngEth",      type: "txt", loc: "corpus_general_lngeth"}, 
            { field: "descr",       type: "txt", loc: "corpus_general_descr"}, 
            { field: "url",         type: "txt", loc: "corpus_general_url"}, 
            { field: "metavar",     type: "txt", loc: "corpus_general_metavar"}]},
      {name: "grouping", id: "GrpId", listfield: "Name", sortfield: "Name",  sorttype: "txt", 
        descr: "grouping_description", prf: "grp", 
        before: function(sType, iItemId) { return crpstudio.corpora.setCorItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.corpora.setCorItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "grouping_general", cur: "grp_current", divprf: "grouping", fields: [
            { field: "Name",        type: "txt", loc: "grouping_general_name"},
            { field: "Comment",     type: "txt", loc: "grouping_general_comment"}, 
            { field: "Text",        type: "txt", loc: "grouping_general_text"}]},
      {name: "group", id: "GroId", listfield: "Name", sortfield: "Name",  sorttype: "txt", 
        descr: "group_description", prf: "gro", 
        before: function(sType, iItemId) { return crpstudio.corpora.setCorItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.corpora.setCorItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "group_general", cur: "gro_current", divprf: "group", fields: [
            { field: "name",        type: "txt", loc: "group_general_name"}, 
            { field: "MtvId",       type: "txt", loc: ""}, 
            { field: "constr",      type: "txt", loc: "group_general_constr"}, 
            { field: "var",         type: "txt", loc: "group_general_var"}, 
            { field: "comp",        type: "txt", loc: "group_general_comp"}, 
            { field: "value",       type: "txt", loc: "group_general_value"}, 
            { field: "comment",     type: "txt", loc: "group_general_comment"}]},
      {name: "metavar", id: "MtvId", listfield: "name", sortfield: "name",  sorttype: "txt", 
        descr: "metavar_description", prf: "mtv", 
        before: function(sType, iItemId) { return crpstudio.corpora.setCorItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.corpora.setCorItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "metavar_general", cur: "mtv_current", divprf: "metavar", fields: [
            { field: "mtvName",     type: "txt", loc: "metavar_general_mtvname"}, 
            { field: "name",        type: "txt", loc: "metavar_general_name"}, 
            { field: "descr",       type: "txt", loc: "metavar_general_descr"}, 
            { field: "loc",         type: "txt", loc: "metavar_general_loc"}, 
            { field: "value",       type: "txt", loc: "metavar_general_value"}]},
      {name: "dbase", id: "DbaseId", listfield: "Name", sortfield: "Name",  sorttype: "txt", 
        descr: "dbase_description", prf: "db", 
        before: function(sType, iItemId) { return crpstudio.dbase.setDbsItemBefore(sType, iItemId);}, 
        after: function(sType, iItemId, bSelLocal, oArgs) { crpstudio.dbase.setDbsItemAfter(sType, iItemId, bSelLocal, oArgs);},
        gen: "dbase_general", cur: "dbs_current", divprf: "dbase", fields: [
            { field: "Name",        type: "txt", loc: "dbase_general_name"}, 
            { field: "File",        type: "txt", loc: ""}, 
            { field: "Goal",        type: "txt", loc: "dbase_general_goal"}, 
            { field: "Comment",     type: "txt", loc: "dbase_general_comment"}, 
            { field: "Text",        type: "txt", loc: "dbase_general_text"}, 
            { field: "Created",     type: "cap", loc: "dbase_general_datecreated"}, 
            { field: "Changed",     type: "cap", loc: "dbase_general_datechanged"}]}
    ],
    // Define Xquery highlighting styles
    cmStyle1 : {            
      lineNumbers: true,     matchBrackets: true,  continuousScanning: false, 
      lineWrapping: true,    indentUnit: 2,        tabSize: 2,
      cursorScrollMargin: 2, resetSelectionOnContextMenu: false,
      theme: "xq-light2"
    },
    cmStyle2 : {
      lineNumbers: true,     matchBrackets: true,  continuousScanning: false, 
      lineWrapping: true,    indentUnit: 2,        tabSize: 2,
      cursorScrollMargin: 2, resetSelectionOnContextMenu: false,
      theme: "xq-light"
    }    
    
  };
  
  // Return this variable
  return crpstudio;
  
}(window.crpstudio || {}));

