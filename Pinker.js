/*
* Pinker: A standalone JavaScript library for rendering code dependency diagrams on your web page.
* Github: https://github.com/WithoutHaste/Pinker
*/

var pinker = pinker || {};

(function() { //private scope

	pinker.version = '1.0.0';

	pinker.config = {
		fontSize: 14 //font size in pixels
		,fontFamily: "Georgia"
		,scopeMargin: 30 //minimum space around each scope
		,scopePadding: 10 //minimum space between scope boundary and scope contents
		,canvasPadding: 15 //minimum space between canvas boundary and scopes
		,backgroundColor: "#FFFFFF" //white
		,shadeColor: "#EEEEEE" //pale gray
		,lineColor: "#000000" //black
		,lineDashLength: 5 //length of a dash in pixels
		,lineDashSpacing: 3 //length of space between dashes in pixels
		,font: function() {
			return this.fontSize + "px " + this.fontFamily;
		}
		,estimateFontHeight: function() {
			return this.fontSize;
		}
	};

	//render all sources onto new canvases
	pinker.render = function() {
		let pinkerElements = document.getElementsByClassName("pinker");
		for(let i = 0; i < pinkerElements.length; i++)
		{
			let pinkerElement = pinkerElements[i];
			switch(pinkerElement.tagName)
			{
				case "PRE": renderFromPre(pinkerElement); break;
				case "OBJECT": pinkerElement.onload = function() { renderFromObject(pinkerElement); }; break;
			}
		}
	};
	
	function renderFromPre(preElement) {
		const sourceText = preElement.innerHTML;
		const canvasElement = document.createElement("canvas");
		if(preElement.id != null)
			canvasElement.id = "canvas-" + preElement.id;
		//insert canvas into pre element
		preElement.innerHTML = null;
		preElement.appendChild(canvasElement);
		pinker.draw(canvasElement, sourceText);
	}
	
	//works in FireFox but fails in Chrome due to CORS (cross-site data access rules)
	function renderFromObject(objectElement) {
		const sourceDocument = objectElement.contentDocument || objectElement.contentWindow.document;
		let container = sourceDocument.getElementsByTagName('body')[0];
		while(container.children.length > 0)
		{
			container = container.children[0];
		}
		const sourceText = container.innerHTML;
		const canvasElement = document.createElement("canvas");
		if(objectElement.id != null)
			canvasElement.id = "canvas-" + objectElement.id;
		//replace object element with canvas
		objectElement.parentNode.insertBefore(canvasElement, objectElement);
		objectElement.parentNode.removeChild(objectElement);
		pinker.draw(canvasElement, sourceText);
	}

	//draw on provided canvas with provided source
	pinker.draw = function(canvasElement, sourceText) {
		sourceText = Source.decodeHtml(sourceText);
		const source = parseSource(sourceText);
		if(source.hasErrors)
		{
			source.errorMessages.forEach(function(errorMessage) {
				console.log(`Pinker Error on canvas '${canvasElement.id}': ${errorMessage}`);
			});
		}
		//displays what it can, despite errors
		updateCanvas(canvasElement, source);
	};
	
	//########################################
	//## Parsing source data structures
	//########################################
	
	const Source = {
		//returns the text, with all HTML character encodings converted to plain text
		decodeHtml: function(text) {
			var element = document.createElement("textarea");
			element.innerHTML = text;
			return element.value;
		},
		//returns the text, with all leading whitespace characters removed from each line
		unIndent: function(text) {
			return text.replace(/^\s+/mg,"");
		},
		//returns true if this is a section header
		isSectionHeader: function(term) {
			return (term.match(/^.+\:$/) != null);
		},
		//returns true if term is a scope
		isScope: function(term) {
			return (term.match(/^\[.+\]$/) != null);
		},
		//returns true if term is an alias
		isAlias: function(term) {
			return(term.match(/^\{.+\}$/) != null);
		},
		//extracts the header from a section header
		parseHeader: function(line) {
			const matches = line.match(/^(.+)\:$/);
			if(matches == null)
				return line;
			return matches[1].trim();
		},
		//returns a scope without the enclosing [], if they exist
		openScope: function(scope) {
			const matches = scope.match(/^\[(.+)\]$/);
			if(matches == null)
				return scope;
			return matches[1].trim();

		},
		//returns a new source object
		create: function(label=null) {
			return {
				label: label, //Level 1 has no label
				alias: null,
				hasErrors: false,
				errorMessages: [],
				layout: null,
				relations: null,
				nestedSources: [],
				validate: function() {
					if(this.layout == null)
					{
						this.hasErrors = true;
						this.errorMessages.push("No layout section.");
					}
					let self = this;
					this.nestedSources.forEach(function(nestedSource) {
						nestedSource.validate();
						if(nestedSource.hasErrors)
						{
							self.hasErrors = true;
							nestedSource.errorMessages.forEach(function(errorMessage) {
								self.errorMessages.push(`${errorMessage} Section: '${nestedSource.label}'.`);
							});
						}
					});
				},
				addSections: function(sections) {
					let self = this;
					sections.forEach(function(section) {
						if(section.isReferenceSection)
						{
							let isAlias = (section.reference.match(/^\{.+\}$/) != null);
							if(isAlias)
							{
								let success = self.addAliasedNestedSource(section.reference, section.sections);
								if(!success)
								{
									self.hasErrors = true;
									self.errorMessages.push(`Cannot find alias '${section.reference}' in any Layouts.`);
								}
							}
							else
							{
								self.addNestedSource(section.reference, section.sections);
							}
						}
						else
						{
							self.addSection(section);
						}
					});
				},
				addSection: function(section) {
					switch(section.header)
					{
						case "layout":
						case "Layout": 
							if(this.layout != null)
								return;
							this.layout = parseLayoutSection(section); 
							break;
						case "relations":
						case "Relations": 
							if(this.relations != null)
								return;
							this.relations = parseRelationsSection(section); 
							break;
					}
				},
				addNestedSource: function(label, sections) {
					if(label.length == 0)
						return; //invalid label
					
					const isAlias = (label.match(/^\{.+\}$/) != null);
					for(let i=0; i < this.nestedSources.length; i++)
					{
						let nestedSource = this.nestedSources[i];
						if(nestedSource.label == label)
							return; //skip it, it belongs here but we already have one
						let labelStart = nestedSource.label + ".";
						if(label.startsWith(labelStart))
						{
							let subLabel = label.substring(labelStart.length);
							nestedSource.addNestedSource(subLabel, sections);
							return;
						}
					}
					let nestedSource = Source.create(label);
					nestedSource.addSections(sections);
					this.nestedSources.push(nestedSource);
				},
				//returns true when alias is found
				addAliasedNestedSource: function(alias, sections) {
					if(this.alias == alias)
						return true; //skip it, we already have one
					let layoutRecord = this.layout.findAlias(alias);
					if(layoutRecord != null)
					{
						let nestedSource = Source.create(layoutRecord.label);
						nestedSource.alias = alias;
						nestedSource.addSections(sections);
						this.nestedSources.push(nestedSource);
						return true;
					}
					for(let i=0; i<this.nestedSoures.length; i++)
					{
						let nestedSource = this.nestedSources[i];
						let result = nestedSource.addAliasesNestedSource(alias, sections);
						if(result)
							return true;
					}
					return false;
				}
			};
		}
	};
	
	const Section = {
		//returns normal section object
		create: function(header) {
			return {
				header: header,
				body: [],
				isReferenceSection: false
			};
		},
		//returns reference section object
		createReference: function(reference) {
			return {
				reference: reference,
				sections: [],
				isReferenceSection: true
			};
		},
		//returns layout section object
		createLayout: function() {
			return {
				rows: [],
				//returns the matching LayoutRecord, or null
				findAlias: function(alias) {
					for(let i=0; i<this.rows.length; i++)
					{
						let row = this.rows[i];
						let result = row.findAlias(alias);
						if(result != null)
							return result;
					}
					return null;
				}
			};
		},
		//returns relation section object
		createRelation: function() {
			return {
				records: []
			};
		}
	};
	
	const LayoutRow = {
		//returns array of opened-scopes from source layout row
		parseScopes: function(line) {
			if(line == null || line.length == 0)
				return [];
			return line.match(/\[(.)+?\]/g);
		},
		//returns layout row object
		create: function() {
			return {
				leftAlign: [], //arrays of LayoutRecords
				rightAlign: [],
				//returns both left and right aligned LayoutRecords
				all: function() {
					return this.leftAlign.concat(this.rightAlign);
				},
				//returns the matching LayoutRecord, or null
				findAlias: function(alias) {
					let layoutRecords = this.all();
					for(let i=0; i<layoutRecords.length; i++)
					{
						let layoutRecord = layoutRecords[i];
						if(layoutRecord.alias == alias)
							return layoutRecord;
					}
					return null;
				}
			};
		}
	};
		
	const LayoutRecord = {
		//returns true if a source layout label has an alias
		hasAlias: function(label) {
			return (label.match(/^\{.+\}/) != null);
		},
		//returns [alias, label], alias may be null
		parseAliasFromLabel: function(label) {
			if(!this.hasAlias(label))
				return [null, label];
			const matches = label.match(/^(\{.+\})(.*)$/);
			return [matches[1], matches[2].trim()];
		},
		//returns parsed layout record
		parse: function(fullLabel) {
			fullLabel = Source.openScope(fullLabel);
			const [alias, label] = this.parseAliasFromLabel(fullLabel);
			return this.create(label, alias);
		},
		//returns a layout record
		create: function(label, alias=null) {
			return {
				label: label,
				alias: alias
			};
		}
	};

	const RelationRecord = {
		//returns true if source relations line starts with a scope
		startIsScope: function(line) {
			return (line.match(/^\[.+?\]/) != null);
		},
		//returns true if source relations line starts with an alias
		startIsAlias: function(line) {
			return (line.match(/^\{.+?\}/) != null);
		},
		//returns the starting scope or alias from a source relations line
		parseStartTerm: function(line) {
			if(this.startIsAlias(line))
				return line.match(/^(\{.+?\})/)[1];
			else if(this.startIsScope(line))
				return line.match(/^(\[.+?\])/)[1];
			else
				return null;
		},
		//returns array of ending scopes or alias from the part of a source relations line after the arrow
		parseEndTerms: function(partialLine) {
			let endTerms = [];
			const fields = partialLine.split(',');
			fields.forEach(function(field) {
				field = field.trim();
				if(Source.isScope(field) || Source.isAlias(field))
					endTerms.push(field);
			});
			return endTerms;
		},
		//returns [startScope, arrowType, [endScope,...]] from source relations line
		parseTerms: function(line) {
			const startTerm = this.parseStartTerm(line);
			if(startTerm != null)
				line = line.substring(startTerm.length);
			const arrowTerm = line.match(/^(.+?)(\[|\{)/)[1].trim();
			if(arrowTerm != null)
				line = line.substring(arrowTerm.length).trim();
			const endTerms = this.parseEndTerms(line);
			return [startTerm, arrowTerm, endTerms];
		},
		//returns a relation record
		create: function(startLabel, arrowType, endLabel) {
			return {
				startLabel: startLabel,
				arrowType: arrowType,
				endLabel: endLabel
			};
		}
	};
	
	//########################################
	//## Parsing source functions
	//########################################
	
	//returns a "source" object
	function parseSource(sourceText) {
		const source = Source.create();
		sourceText = Source.unIndent(sourceText);
		const sections = parseSections(sourceText);
		source.addSections(sections);
		source.validate();
		return source;
	}
	
	//breaks text into sections, keeping all section headers
	//returns an array of "section" objects
	function parseSections(sourceText) {
		const lines = sourceText.split("\n");
		let sections = [];
		let inSection = false;
		let currentSection = null;
		//find all sections
		for(let i=0; i<lines.length; i++)
		{
			let line = lines[i];
			if(line.length == 0)
				continue;
			if(Source.isSectionHeader(line))
			{
				const header = Source.parseHeader(line);
				currentSection = Section.create(header);
				sections.push(currentSection);
				inSection = true;
			}
			else
			{
				if(inSection)
				{
					currentSection.body.push(line);
				}
			}
		}
		//collapse reference sections
		let collapsedSections = [];
		let inReferenceSection = false;
		let currentReferenceSection = null;
		sections.forEach(function(section) {
			if(Source.isScope(section.header))
			{
				let header = Source.openScope(section.header);
				currentReferenceSection = Section.createReference(header);
				collapsedSections.push(currentReferenceSection);
				inReferenceSection = true;
			}
			else if(Source.isAlias(section.header))
			{
				currentReferenceSection = Section.createReference(section.header);
				collapsedSections.push(currentReferenceSection);
				inReferenceSection = true;
			}
			else
			{
				if(inReferenceSection)
					currentReferenceSection.sections.push(section);
				else
					collapsedSections.push(section);
			}
		});		
		
		return collapsedSections;
	}
	
	function parseLayoutSection(section) {
		let layoutSection = Section.createLayout();
		section.body.forEach(function(line) {
			if(line.length == 0)
				return;
			layoutSection.rows.push(parseLayoutRow(line));
		});
		return layoutSection;
	}
	
	function parseLayoutRow(line) {
		let layoutRow = LayoutRow.create();
		let leftRight = line.split("...");
		let left = LayoutRow.parseScopes(leftRight[0]);
		left.forEach(function(label) {
			layoutRow.leftAlign.push(LayoutRecord.parse(label));
		});
		if(leftRight.length > 1)
		{
			let right = LayoutRow.parseScopes(leftRight[1]);
			right.forEach(function(label) {
				layoutRow.rightAlign.push(LayoutRecord.parse(label));
			});
		}
		return layoutRow;
	}
	
	function parseRelationsSection(section) {
		let relationsSection = Section.createRelation();
		section.body.forEach(function(line) {
			const [startTerm, arrowTerm, endTerms] = RelationRecord.parseTerms(line);
			if(startTerm == null || arrowTerm == null || endTerms.length == 0)
				return;
			endTerms.forEach(function(endTerm) {
				relationsSection.records.push(RelationRecord.create(Source.openScope(startTerm), arrowTerm, Source.openScope(endTerm)));
			});
		});
		return relationsSection;
	}
	
	//########################################
	//## Drawing data structures
	//########################################

	const Node = {
		//returns node object
		create: function(label, alias=null, path=null, isRightAlign=false) {
			return {
				x: null,
				y: null,
				width: null,
				height: null,
				path: path, //full path from root to parent scope
				label: label, //simple label of node within scope
				alias: alias,
				labelLayout: null,
				contentArea: null,
				nodes: [],
				isRightAlign: isRightAlign,
				setLocation: function(x, y, width, height) {
					this.x = x;
					this.y = y;
					this.width = width;
					this.height = height;
					this.contentArea = ContentArea.createWithPadding(0, 0, width, height, pinker.config.scopePadding);
				},
				pathLabel: function() {
					if(path == null || path.length == 0)
						return label;
					return path + "." + label;
				},
				center: function() {
					return {
						x: this.x + (this.width / 2),
						y: this.y + (this.height / 2)
					};
				},
				absoluteCenter: function() {
					return {
						x: this.absoluteX + (this.width / 2),
						y: this.absoluteY + (this.height / 2)
					};
				},
				setAbsoluteLocations: function(deltaX=0, deltaY=0) {
					this.absoluteX = this.x + deltaX;
					this.absoluteY = this.y + deltaY;
					let self = this;
					this.nodes.forEach(function(nestedNode) {
						nestedNode.setAbsoluteLocations(self.absoluteX + self.contentArea.x, self.absoluteY + self.contentArea.y);
					});
				},
				isAbove: function(otherNode) {
					return (this.absoluteY + this.height < otherNode.absoluteY);
				},
				isBelow: function(otherNode) {
					return (this.absoluteY > otherNode.absoluteY + otherNode.height);
				},
				isLeftOf: function(otherNode) {
					return (this.absoluteX + this.width < otherNode.absoluteX);
				},
				isRightOf: function(otherNode) {
					return (this.absoluteX > otherNode.absoluteX + otherNode.width);
				},
				pathPrefix: function() {
					return this.label + ".";
				},
				findLabel: function(label) {
					if(label == null)
						return null;
					if(this.label == label)
						return this;
					if(!label.startsWith(this.pathPrefix()))
						return null;
					label = label.substring(this.pathPrefix().length);
					for(let i=0; i<this.nodes.length;i++)
					{
						let node = this.nodes[i];
						let result = node.findLabel(label);
						if(result != null)
							return result;
					}
					return null;
				},
				findAlias: function(alias) {
					if(alias == null)
						return null;
					if(this.alias == alias)
						return this;
					for(let i=0; i<this.nodes.length;i++)
					{
						let node = this.nodes[i];
						let result = node.findAlias(alias);
						if(result != null)
							return result;
					}
					return null;
				}
			};
		}
	};
	
	const LabelLayout = {
		types: {
			text: 1, //plain text
			header: 2 //header above content
		},
		//returns label layout object, relative to enclosing node
		create: function(x, y, width, height, type, lines) {
			return {
				x: x, //top-left corner of text area
				y: y,
				width: width, //size of text area
				height: height,
				padding: pinker.config.scopePadding,
				type: type,
				lines: lines,
				//draw text centered in space
				drawCentered: function(deltaX, deltaY, context) {
					let lineHeight = pinker.config.estimateFontHeight();
					let spaceX = this.x + deltaX + this.padding;
					let spaceY = this.y + deltaY + this.padding + lineHeight;
					let spaceWidth = this.width - (this.padding * 2);
					this.lines.forEach(function(line) {
						let lineWidth = context.measureText(line).width;
						context.fillText(line, spaceX + ((spaceWidth - lineWidth)/2), spaceY);
						spaceY += lineHeight;
					});
				}
			};
		},
		//returns text-type label layout object
		createText: function(x, y, width, height, lines) {
			return this.create(x, y, width, height, this.types.text, lines);
		},
		//returns header-type label layout object
		createHeader: function(x, y, width, height, line) {
			return this.create(x, y, width, height, this.types.header, [line]);
		},
		//returns text-type label layout object
		calculateText: function (label, context) {
			context.font = pinker.config.font();
			let wordHeight = pinker.config.estimateFontHeight();
			let width = 0;
			let height = 0;
			let words = label.split(" ");
			words.forEach(function(word) {
				width = Math.max(width, context.measureText(word).width);
				height += wordHeight;
			});
			return this.createText(0, 0, width + (2 * pinker.config.scopePadding), height + (2 * pinker.config.scopePadding), words);
		},
		//returns header-type label layout object
		calculateHeader: function (label, context) {
			context.font = pinker.config.font();
			let height = pinker.config.estimateFontHeight();
			let width = context.measureText(label).width;
			return this.createHeader(0, 0, width + (2 * pinker.config.scopePadding), height + (2 * pinker.config.scopePadding), label);
		}
	};
	
	const ContentArea = {
		//returns content area object, relative to enclosing node
		create: function(x, y, width, height) {
			return {
				x: x,
				y: y,
				width: width,
				height: height
			};
		},
		//returns content area inset with padding all around
		createWithPadding: function(x, y, width, height, padding) {
			return this.create(
				x + padding,
				y + padding,
				width - (padding * 2),
				height - (padding * 2)
			);
		}
	};
	
	const Dimension = {
		//returns dimension object
		create: function(width, height) {
			return {
				width: width,
				height: height
			};
		}
	};
	
	const Point = {
		//returns point object
		create: function(x, y) {
			return {
				x: x,
				y: y
			};
		}
	};
	
	const ArrowTypes = {
		none: 0,
		plainArrow: 1,
		hollowArrow: 2,
		hollowDiamond: 3,
		filledDiamond: 4,
		//converts source arrow to arrow type
		convert: function(sourceArrow) {
			if(sourceArrow.length > 2)
				sourceArrow = sourceArrow.substring(sourceArrow.length-2);
			switch(sourceArrow)
			{
				case "=>":
				case "->": return this.plainArrow;
				case "-D":
				case ":>": return this.hollowArrow;
				case "-o": return this.hollowDiamond;
				case "-+": return this.filledDiamond;
			}
			return this.none;
		}
	};
	
	const LineTypes = {
		solid: 1,
		dashed: 2,
		//converts source arrow to line type
		convert: function(sourceArrow) {
			if(sourceArrow.length > 2)
				sourceArrow = sourceArrow.substring(0, 2);
			switch(sourceArrow)
			{
				case "=":
				case "=>":
				case "--": return this.dashed;
				case "-":
				case "->": 
				case "-:": 
				case "-o": 
				case "-+": return this.solid;
			}
			return this.solid;
		}
	};
		
	//########################################
	//## Drawing functions
	//########################################
	
	function updateCanvas(canvasElement, source) {
		let context = canvasElement.getContext('2d');
		const nodes = convertLayoutToNodes(source, context);
		const dimensions = calculateCanvasDimensions(nodes);
		canvasElement.setAttribute("width", dimensions.width);
		canvasElement.setAttribute("height", dimensions.height);
		
		//fill background
		context.fillStyle = pinker.config.backgroundColor;
		context.fillRect(0, 0, dimensions.width, dimensions.height);
		
		drawNodes(nodes, context);
		drawRelations(source, nodes, context);
	}
	
	function drawNodes(nodes, context) {
		nodes.forEach(function(node) {
			context.strokeStyle = pinker.config.lineColor;
			context.strokeRect(node.absoluteX, node.absoluteY, node.width, node.height);

			context.font = pinker.config.font();
			let x = node.absoluteX + node.labelLayout.x;
			let y = node.absoluteY + node.labelLayout.y;
			let width = node.labelLayout.width;
			let height = node.labelLayout.height;
			switch(node.labelLayout.type)
			{
				case LabelLayout.types.text: 
					context.fillStyle = pinker.config.lineColor;
					node.labelLayout.drawCentered(node.absoluteX, node.absoluteY, context);
					break;
				case LabelLayout.types.header:
					context.fillStyle = pinker.config.shadeColor;
					context.strokeStyle = pinker.config.lineColor;
					context.fillRect(x, y, width, height);
					context.strokeRect(x, y, width, height);
					context.fillStyle = pinker.config.lineColor;
					node.labelLayout.drawCentered(node.absoluteX, node.absoluteY, context);
					break;
			}

			drawNodes(node.nodes, context);
		});
	}
	
	function drawRelations(source, allNodes, context, path=null) {
		if(path == null || path.length == 0)
			path = source.label;
		else
			path += "." + source.label;
		if(source.relations != null)
		{
			source.relations.records.forEach(function(relation) {
				const startNode = findNode(allNodes, relation.startLabel, path);
				const endNode = findNode(allNodes, relation.endLabel, path);
				if(startNode == null || endNode == null)
					return;
				drawArrowBetweenNodes(startNode, endNode, ArrowTypes.convert(relation.arrowType), LineTypes.convert(relation.arrowType), context);
			});
		}
		source.nestedSources.forEach(function(nestedSource) {
			drawRelations(nestedSource, allNodes, context, path);
		});
	}
	
	function convertLayoutToNodes(source, context, path=null) {
		if(path == null || path.length == 0)
			path = source.label;
		else
			path += "." + source.label;
		let nodeRows = [];
		let allNodes = [];
		let y = pinker.config.canvasPadding; //top margin
		let maxX = 0;
		//layout as if all are left aligned
		source.layout.rows.forEach(function(row) {
			let nodes = []
			let x = pinker.config.canvasPadding; //left margin
			let rowHeight = 0;
			const leftAlignCount = row.leftAlign.length;
			let index = 0;
			row.all().forEach(function(layoutRecord) {
				const isRightAlign = (index >= leftAlignCount);
				let node = Node.create(layoutRecord.label, layoutRecord.alias, path, isRightAlign);

				let nestedNodes = [];
				for(let i=0; i<source.nestedSources.length; i++)
				{
					let nestedSource = source.nestedSources[i];
					if(nestedSource.label == layoutRecord.label)
					{
						nestedNodes = convertLayoutToNodes(nestedSource, context, path);
						break;
					}
				}
				if(nestedNodes.length > 0)
				{
					node.nodes = nestedNodes;
					node.labelLayout = LabelLayout.calculateHeader(node.label, context);
					const nodeDimensions = calculateCanvasDimensions(nestedNodes);
					const width = Math.max(node.labelLayout.width, nodeDimensions.width) + (pinker.config.scopePadding * 2);
					const height = node.labelLayout.height + nodeDimensions.height + (pinker.config.scopePadding * 2);
					node.setLocation(x, y, width, height);
					node.contentArea = ContentArea.createWithPadding(0, node.labelLayout.height, node.width, node.height - node.labelLayout.height, pinker.config.scopePadding);
					node.labelLayout.width = width;
				}
				else
				{
					node.labelLayout = LabelLayout.calculateText(node.label, context);
					node.setLocation(x, y, node.labelLayout.width, node.labelLayout.height);
				}
				nodes.push(node);
				
				x += node.width + pinker.config.scopeMargin;
				rowHeight = Math.max(rowHeight, node.height);
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
			let right = maxX;
			nodes.forEach(function(node) {
				if(!node.isRightAlign)
					return;
				node.x = right - node.width;
				right -= node.width - pinker.config.scopeMargin;
			});
		});
		//calculate final locations
		allNodes.forEach(function(node) {
			node.setAbsoluteLocations();
		});
		return allNodes;
	}
	
	function findNode(nodes, label, labelPath) {
		let isAlias = (label.match(/^\{.+\}$/) != null);
		if(isAlias)
			return findNodeAlias(nodes, label);
		let node = findNodeRelative(nodes, label, labelPath);
		if(node != null)
			return node;
		return findNodeAbsolute(nodes, label);
	}
	
	function findNodeRelative(nodes, label, path) {
		let startingNode = findNodeAbsolute(nodes, path);
		if(startingNode == null)
			return null;
		return findNodeAbsolute(startingNode.nodes, label);
	}
	
	function findNodeAbsolute(nodes, label) {
		for(let i=0; i<nodes.length; i++)
		{
			let node = nodes[i];
			let result = node.findLabel(label);
			if(result != null)
				return result;
		}
		return null;
	}
	
	function findNodeAlias(nodes, alias) {
		for(let i=0; i<nodes.length; i++)
		{
			let node = nodes[i];
			let result = node.findAlias(alias);
			if(result != null)
				return result;
		}
		return null;
	}
	
	function calculateCanvasDimensions(nodes) {
		let width = 0;
		let height = 0;
		nodes.forEach(function(node) {
			width = Math.max(width, node.x + node.width);
			height = Math.max(height, node.y + node.height);
		});
		width += pinker.config.canvasPadding; //right margin
		height += pinker.config.canvasPadding; //bottom margin
		return Dimension.create(width, height);
	}
	
	function drawArrowBetweenNodes(startNode, endNode, arrowType, lineType, context) {
		let start = startNode.absoluteCenter();
		let end = endNode.absoluteCenter();
		if(startNode.isAbove(endNode))
			start.y = startNode.absoluteY + startNode.height;
		else if(startNode.isBelow(endNode))
			start.y = startNode.absoluteY;
		if(startNode.isLeftOf(endNode))
			start.x = startNode.absoluteX + startNode.width;
		else if(startNode.isRightOf(endNode))
			start.x = startNode.absoluteX;
		if(endNode.isAbove(startNode))
			end.y = endNode.absoluteY + endNode.height;
		else if(endNode.isBelow(startNode))
			end.y = endNode.absoluteY;
		if(endNode.isLeftOf(startNode))
			end.x = endNode.absoluteX + endNode.width;
		else if(endNode.isRightOf(startNode))
			end.x = endNode.absoluteX;
		drawArrow(start, end, arrowType, lineType, context);
	}
	
	function drawArrow(start, end, arrowType, lineType, context) {
		var headlen = 10; // length of head in pixels TODO move to config calculation based on scopeMargin
		var angle = Math.atan2(end.y - start.y, end.x - start.x);
		//line
		context.beginPath();
		switch(lineType)
		{
			case LineTypes.solid: context.setLineDash([]); break;
			case LineTypes.dashed: context.setLineDash([pinker.config.lineDashLength, pinker.config.lineDashSpacing]); break;
		}
		context.moveTo(start.x, start.y);
		context.lineTo(end.x, end.y);
		context.stroke();
		//arrow
		context.setLineDash([]); //solid line
		const arrowCornerA = Point.create(end.x - headlen * Math.cos(angle - Math.PI/6), end.y - headlen * Math.sin(angle - Math.PI/6));
		const arrowCornerB = Point.create(end.x - headlen * Math.cos(angle + Math.PI/6), end.y - headlen * Math.sin(angle + Math.PI/6));
		const diamondCornerC = Point.create(arrowCornerA.x - headlen * Math.cos(angle + Math.PI/6), arrowCornerA.y - headlen * Math.sin(angle + Math.PI/6));
		switch(arrowType)
		{
			case ArrowTypes.none:
				break;
			case ArrowTypes.plainArrow:
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.stroke();
				break;
			case ArrowTypes.hollowArrow:
				//hollow center covers line
				context.fillStyle = pinker.config.backgroundColor;
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.lineTo(end.x, end.y);
				context.fill();
				//arrow outline
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.lineTo(end.x, end.y);
				context.stroke();
				break;
			case ArrowTypes.hollowDiamond:
				//hollow center covers line
				context.fillStyle = pinker.config.backgroundColor;
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.lineTo(diamondCornerC.x, diamondCornerC.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.lineTo(end.x, end.y);
				context.fill();
				//arrow outline
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.lineTo(diamondCornerC.x, diamondCornerC.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.lineTo(end.x, end.y);
				context.stroke();
				break;
			case ArrowTypes.filledDiamond:
				//solid center covers line
				context.fillStyle = pinker.config.lineColor;
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.lineTo(diamondCornerC.x, diamondCornerC.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.lineTo(end.x, end.y);
				context.fill();
				//arrow outline
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.lineTo(diamondCornerC.x, diamondCornerC.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.lineTo(end.x, end.y);
				context.stroke();
				break;
		}
	}	

})();