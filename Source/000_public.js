/*
* Pinker: A standalone JavaScript library for rendering code dependency diagrams on your web page.
* Github: https://github.com/WithoutHaste/Pinker
*/

var pinker = pinker || {};

//pinker.testMode = true;

pinker.version = '1.3.0';

pinker.config = {
	fontSize: 14 //font size in pixels
	,fontFamily: "Georgia"
	,scopeMargin: 30 //minimum space around each scope
	,scopePadding: 15 //minimum space between scope boundary and nested scopes
	,labelPadding: 10 //minimum space between scope boundary and text areas
	,canvasPadding: 15 //minimum space between canvas boundary and scopes
	,backgroundColor: "#FFFFFF" //white
	,shadeColor: "#EEEEEE" //pale gray
	,lineColor: "#000000" //black
	,lineWeight: 1 //line weight in pixels
	,lineDashLength: 6 //length of a dash in pixels
	,lineDashSpacing: 4 //length of space between dashes in pixels
	,arrowHeadArea: 50 //pixels-squared area of an arrow head
	,font: function() {
		return this.fontSize + "px " + this.fontFamily;
	}
	,estimateFontHeight: function() {
		return this.fontSize;
	}
	,lineSpacing: function() {
		return this.estimateFontHeight() * 0.4;
	}
	,favorGoldenRatioLabelSize: true
	,favorUniformNodeSizes: true
	,useSmartArrows: true
	,keepSource: false
};