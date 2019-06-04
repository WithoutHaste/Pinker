/*
* Pinker: A standalone JavaScript library for rendering code dependency diagrams on your web page.
* Github: https://github.com/WithoutHaste/Pinker
*/

var pinker = pinker || {};

pinker.version = '1.0.0';

pinker.config = {
	fontSize: 14 //font size in pixels
	,fontFamily: "Georgia"
	,scopeMargin: 30 //minimum space around each scope
	,scopePadding: 10 //minimum space between scope boundary and scope contents
	,backgroundColor: "#CAFFF6" //sea foam
	,lineColor: "#000000" //black
	,font: function() {
		return this.fontSize + "px " + this.fontFamily;
	}
	,estimateFontHeight: function() {
		return this.fontSize;
	}
};

(function() { //private scope
	
	pinker.draw = function(canvasElement, sourceText) {
		const source = parseSource(sourceText);
		//console.log(source);
		updateCanvas(canvasElement, source);
	};
	
	//returns a "source" object
	function parseSource(sourceText) {
		const source = createEmptySource();
		sourceText = removeIndentation(sourceText);
		const sections = parseSections(sourceText);
		source.addSections(sections);
		source.validate();
		return source;
	}
	
	//breaks text into sections, keeping all section headers
	//returns an array of "section" objects
	function parseSections(sourceText) {
		const lines = sourceText.split("\n");
		let inSection = false;
		let currentSection = null;
		let sections = [];
		for(let i=0; i<lines.length; i++)
		{
			let line = lines[i];
			if(line.length == 0)
				continue;
			if(line.match(/\w+\:/) == null) //not a header
			{
				if(inSection)
				{
					currentSection.body.push(line);
				}
			}
			else
			{
				currentSection = createSection(line.replace(":",""));
				sections.push(currentSection);
				inSection = true;
			}
		}
		return sections;
		//console.log(sections.length);
		//console.log(sections);
	}
	
	//returns the text, with all leading whitespace characters removed
	function removeIndentation(text) {
		return text.replace(/^\s+/mg,"");
	}
	
	function createEmptySource() {
		return {
			hasErrors: false,
			errorMessages: [],
			layout: null,
			relations: null,
			validate: function() {
				if(this.layout == null)
				{
					this.hasErrors = true;
					this.errorMessages.push("No layout section.");
				}
			},
			addSections: function(sections) {
				let self = this;
				sections.forEach(function(section) {
					self.addSection(section);
				});
			},
			addSection: function(section) {
				switch(section.header)
				{
					case "layout":
					case "Layout": this.layout = parseLayoutSection(section); break;
					case "relations":
					case "Relations": this.relations = parseRelationsSection(section); break;
				}
			}
		};
	}
	
	function parseLayoutSection(section) {
		let layoutSection = createLayoutSection();
		section.body.forEach(function(line) {
			if(line.length == 0)
				return;
			layoutSection.rows.push(parseLayoutRow(line));
		});
		return layoutSection;
	}
	
	function parseLayoutRow(line) {
		let layoutRow = createLayoutRow();
		let leftRight = line.split("...");
		let left = leftRight[0].match(/\[(.)+?\]/g);
		left.forEach(function(label) {
			layoutRow.leftAlign.push(label.replace(/[\[\]]/g, ""));
		});
		if(leftRight.length > 1)
		{
			let right = leftRight[1].match(/\[(.)+?\]/g);
			right.forEach(function(label) {
				layoutRow.rightAlign.push(label.replace(/[\[\]]/g, ""));
			});
		}
		return layoutRow;
	}
	
	function parseRelationsSection(section) {
		let relationsSection = createRelationsSection();
		section.body.forEach(function(line) {
			let match = line.match(/\[(.*?)\](.*?)(\[.*\])/);
			if(match == null)
				return;
			let start = match[1];
			let arrowType = match[2];
			let ends = match[3].match(/\[.*?\]/g);
			ends.forEach(function(end) {
				end = end.replace(/[\[\]]/g, "");
				relationsSection.relations.push(createRelation(start, arrowType, end));
			});
		});
		return relationsSection;
	}
	
	function createSection(header) {
		return {
			header: header,
			body: []
		};
	}
	
	function createLayoutSection() {
		return {
			rows: []
		};
	}
	
	function createLayoutRow() {
		return {
			leftAlign: [], //arrays of strings/labels
			rightAlign: [],
			all: function() {
				return this.leftAlign.concat(this.rightAlign);
			}
		};
	}
	
	function createRelationsSection() {
		return {
			relations: []
		};
	}
	
	function createRelation(startLabel, arrowType, endLabel) {
		return {
			startLabel: startLabel,
			arrowType: arrowType,
			endLabel: endLabel
		};
	}
	
	function updateCanvas(canvasElement, source) {
		let context = canvasElement.getContext('2d');
		const nodes = convertLayoutToNodes(source.layout, context);
		console.log(nodes);
		const dimensions = calculateCanvasDimensions(nodes);
		canvasElement.setAttribute("width", dimensions.width);
		canvasElement.setAttribute("height", dimensions.height);
		
		//fill background
		context.fillStyle = pinker.config.backgroundColor;
		context.fillRect(0, 0, dimensions.width, dimensions.height);
		
		//layout
		context.strokeStyle = pinker.config.lineColor;
		context.fillStyle = pinker.config.lineColor;
		nodes.forEach(function(node) {
			context.strokeRect(node.x, node.y, node.width, node.height);
			//label
			//TODO save label layout instead of redoing it
			context.font = pinker.config.font();
			let wordHeight = pinker.config.estimateFontHeight();
			let y = node.y + pinker.config.scopePadding + wordHeight;
			let words = node.label.split(" ");
			words.forEach(function(word) {
				let width = context.measureText(word).width;
				context.fillText(word, node.x + ((node.width - width)/2), y);
				y += wordHeight;
			});
			
		});
		
		//relations
	}
	
	function convertLayoutToNodes(layout, context) {
		let nodeRows = [];
		let allNodes = [];
		let y = pinker.config.scopeMargin; //top margin
		let maxX = 0;
		//layout as if all are left aligned
		layout.rows.forEach(function(row) {
			let nodes = []
			let x = pinker.config.scopeMargin; //left margin
			let rowHeight = 0;
			const leftAlignCount = row.leftAlign.length;
			let index = 0;
			row.all().forEach(function(label) {
				const isRightAlign = (index >= leftAlignCount);
				const labelDimensions = calculateLabelDimensions(label, context);
				nodes.push(createNode(x, y, labelDimensions.width, labelDimensions.height, label, isRightAlign));
				x += labelDimensions.width + pinker.config.scopeMargin;
				rowHeight = Math.max(rowHeight, labelDimensions.height);
				index++;
			});
			maxX = Math.max(maxX, x - pinker.config.scopeMargin);
			y += rowHeight + pinker.config.scopeMargin;
			nodeRows.push(nodes);
			allNodes = allNodes.concat(nodes);
		});
		//apply right alignment
		nodeRows.forEach(function(nodes) {
			nodes.reverse();
			let x = maxX;
			nodes.forEach(function(node) {
				if(!node.isRightAlign)
					return;
				node.x = x;
				x += node.width + pinker.config.scopeMargin;
			});
		});
		return allNodes;
	}
	
	function createNode(x, y, width, height, label=null, isRightAlign=false) {
		return {
			x: x,
			y: y,
			width: width,
			height: height,
			label: label,
			isRightAlign: isRightAlign
		};
	}
	
	function calculateCanvasDimensions(nodes) {
		let width = 0;
		let height = 0;
		nodes.forEach(function(node) {
			width = Math.max(width, node.x + node.width);
			height = Math.max(height, node.y + node.height);
		});
		width += pinker.config.scopeMargin; //right margin
		height += pinker.config.scopeMargin; //bottom margin
		return createDimensions(width, height);
	}
/*	
	function calculateCanvasDimensions(source, context) {
		let width = 0;
		let height = 0;
		source.layout.rows.forEach(function(row) {
			let rowDimensions = calculateRowDimensions(row, context);
			width = Math.max(width, rowDimensions.width);
			height += rowDimensions.height;
		});
		width += pinker.config.scopeMargin * 2;
		height += pinker.config.scopeMargin * 2;
		return createDimensions(width, height);
	}
	
	function calculateRowDimensions(row, context) {
		let width = 0;
		let height = 0;
		row.all().forEach(function(label) {
			let labelDimensions = calculateLabelDimensions(label, context);
			width += labelDimensions.width;
			height = Math.max(height, labelDimensions.height);
		});
		width += pinker.config.scopeMargin * (row.all().length - 1);
		return createDimensions(width, height);
	}
*/	
	function calculateLabelDimensions(label, context) {
		context.font = pinker.config.font();
		let wordHeight = pinker.config.estimateFontHeight();
		let width = 0;
		let height = 0;
		let words = label.split(" ");
		words.forEach(function(word) {
			width = Math.max(width, context.measureText(word).width);
			height += wordHeight;
		});
		width += pinker.config.scopePadding * 2;
		height += pinker.config.scopePadding * 2;
		return createDimensions(width, height);
	}
	
	function createDimensions(width, height) {
		return {
			width: width,
			height: height
		};
	}

})();