<?xml version="1.0" encoding="UTF-8"?>

<!--
  Document   : crplist.xsl
  Created on : 22 juni 2015, 10:15
  Author     : Erwin R. Komen
  Description:
    Transform XML output of this request into HTML:
      http://server/crpp/crplist?{'user': 'xx'}&outputformat=xml
-->

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
  <xsl:output method="html"/>

  <!-- TODO customize transformation rules 
       syntax recommendation http://www.w3.org/TR/xslt 
  -->
  <xsl:template match="/">
    <html>
      <head>
        <title>crplist.xsl</title>
      </head>
      <body>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
