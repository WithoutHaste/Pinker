/*
* Pinker: A standalone JavaScript library for rendering code dependency diagrams on your web page.
* Github: https://github.com/WithoutHaste/Pinker
*/

var pinker = pinker || {};

(function() { //private scope

	pinker.version = '1.1.0';

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
		,arrowHeadLength: 15 //length of arrow head in pixels
		,favorGoldenRatioLabelSize: true
		,favorUniformNodeSizes: true
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
		//returns true if the first term in the path is an alias
		//returns false if the entire path is one alias
		pathStartsWithAlias: function(path) {
			return (path.match(/^\{.+?\}\./) != null);
		},
		//returns [alias, remainingPath]
		splitAliasFromPath: function(path) {
			if(!this.pathStartsWithAlias(path))
				return path;
			let matches = path.match(/^(\{.+?\})\.(.*)$/);
			return [matches[1], matches[2]];
		},
		//returns a new source object
		create: function(label=null) {
			return {
				label: label, //Level 1 has no label
				alias: null,
				hasErrors: false,
				errorMessages: [],
				define: null,
				layout: null,
				relate: null,
				nestedSources: [],
				validate: function() {
					if(this.layout == null && this.define == null)
					{
						this.hasErrors = true;
						this.errorMessages.push("No layout OR define section.");
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
							if(Source.isAlias(section.reference))
							{
								let success = self.addAliasedNestedSource(section.reference, section.sections);
								if(!success)
								{
									self.hasErrors = true;
									self.errorMessages.push(`Cannot find alias '${section.reference}'.`);
								}
							}
							else if(Source.pathStartsWithAlias(section.reference))
							{
								let [alias, label] = Source.splitAliasFromPath(section.reference);
								let aliasedSource = self.findAliasedSource(alias);
								if(aliasedSource == null)
								{
									self.hasErrors = true;
									self.errorMessages.push(`Cannot find alias '${alias}'.`);
								}
								else
								{
									section.reference = Source.openScope(label);
									aliasedSource.addSections([section]);
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
						case "define":
						case "Define":
						case "DEFINE":
							if(this.define != null)
								return;
							this.define = parseDefineSection(section); 
							break;
						case "layout":
						case "Layout": 
						case "LAYOUT":
							if(this.layout != null)
								return;
							this.layout = parseLayoutSection(section); 
							break;
						case "relate":
						case "Relate": 
						case "RELATE":
							if(this.relate != null)
								return;
							this.relate = parseRelateSection(section); 
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
					for(let i=0; i<this.nestedSources.length; i++)
					{
						let nestedSource = this.nestedSources[i];
						let result = nestedSource.addAliasedNestedSource(alias, sections);
						if(result)
							return true;
					}
					return false;
				},
				//returns the nested source with this alias
				findAliasedSource: function(alias) {
					if(this.alias == alias)
						return this;
					for(let i=0; i<this.nestedSources.length; i++)
					{
						let nestedSource = this.nestedSources[i];
						let result = nestedSource.findAliasedSource(alias);
						if(result != null)
							return result;
					}
					return null;
				},
				//returns the nested source with this label (searches current level only)
				findLabeledSource: function(label) {
					for(let i=0; i<this.nestedSources.length; i++)
					{
						let nestedSource = this.nestedSources[i];
						if(nestedSource.label == label)
						{
							return nestedSource;
						}
					}
					return null;
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
		//returns define section object
		createDefine: function() {
			return {
				pipe: "|",
				lines: [],
				//append line, do not allow two pipes in a row
				addLine: function(line) {
					if(line == this.pipe && this.lines.length > 0 && this.lines[this.lines.length-1] == this.pipe)
						return;
					this.lines.push(line);
				}
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
		//returns relate section object
		createRelate: function() {
			return {
				records: []
			};
		}
	};
	
	const LayoutRow = {
		//returns array of opened-scopes or closed-aliases from source layout row
		parseScopes: function(line) {
			if(line == null || line.length == 0)
				return [];
			let results = [];
			while(line.length > 0)
			{
				let matches = line.match(/^\[.+?\]/);
				if(matches != null)
				{
					let scope = matches[0];
					line = line.substring(scope.length);
					results.push(Source.openScope(scope));
					continue;
				}
				matches = line.match(/^\{.+?\}/);
				if(matches != null)
				{
					let alias = matches[0];
					line = line.substring(alias.length);
					results.push(alias);
					continue;
				}
				break; //unknown term found
			}
			return results;
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
			if(Source.isAlias(fullLabel))
			{
				return this.create(null, fullLabel);
			}
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

	const RelateRecord = {
		//returns true if source relate line starts with a scope
		startIsScope: function(line) {
			return (line.match(/^\[.+?\]/) != null);
		},
		//returns true if source relate line starts with an alias
		startIsAlias: function(line) {
			return (line.match(/^\{.+?\}/) != null);
		},
		//returns the starting scope or alias from a source relate line
		parseStartTerm: function(line) {
			if(this.startIsAlias(line))
				return line.match(/^(\{.+?\})/)[1];
			else if(this.startIsScope(line))
				return line.match(/^(\[.+?\])/)[1];
			else
				return null;
		},
		//returns array of ending scopes or alias from the part of a source relate line after the arrow
		parseEndTerms: function(partialLine) {
			let endTerms = [];
			const fields = partialLine.split(',');
			fields.forEach(function(field) {
				field = field.trim();
				if(Source.isScope(field) || Source.isAlias(field) || Source.pathStartsWithAlias(field))
					endTerms.push(field);
			});
			return endTerms;
		},
		//returns [startScope, arrowType, [endScope,...]] from source relate line
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
		//returns a relate record
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
			else if(Source.isAlias(section.header) || Source.pathStartsWithAlias(section.header))
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
	
	function parseDefineSection(section) {
		let defineSection = Section.createDefine();
		const pipe = defineSection.pipe;
		section.body.forEach(function(line) {
			if(line == null || line.length == 0)
				return;
			if(line.startsWith(pipe))
			{
				defineSection.addLine(pipe);
				line = line.substring(pipe.length).trim();
			}
			if(line.endsWith(pipe))
			{
				line = line.substring(0, line.length - pipe.length);
				defineSection.addLine(line);
				defineSection.addLine(pipe);
			}
			else
			{
				defineSection.lines.push(line);
			}
		});
		return defineSection;
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
	
	function parseRelateSection(section) {
		let relateSection = Section.createRelate();
		section.body.forEach(function(line) {
			const [startTerm, arrowTerm, endTerms] = RelateRecord.parseTerms(line);
			if(startTerm == null || arrowTerm == null || endTerms.length == 0)
				return;
			endTerms.forEach(function(endTerm) {
				relateSection.records.push(RelateRecord.create(Source.openScope(startTerm), arrowTerm, Source.openScope(endTerm)));
			});
		});
		return relateSection;
	}
	
	//########################################
	//## Drawing data structures
	//########################################

	const Node = {
		//returns node object
		create: function(label, alias=null, path=null, isRightAlign=false) {
			return {
				relativeArea: null, //location and dimensions relative to parent node
				absoluteArea: null, //location and dimensions on canvas
				label: label, //simple label of node within scope
				alias: alias,
				path: path, //full path from root to parent scope
				labelLayout: null,
				labelArea: null, //location and dimensions relative to this node
				defineLayout: null,
				defineArea: null, //location and dimensions relative to this node
				nodeArea: null, //location and dimensions relative to this node
				nodes: [],
				isRightAlign: isRightAlign, //TODO this temporary data should not be stored here
				setRelativeArea: function(x, y, width, height) {
					this.relativeArea = Area.create(x, y, width, height);
				},
				//expand node width as needed to fit content
				//expands all areas as needed, too
				//returns the delta
				updateWidth(newWidth) {
					if(this.relativeArea.width >= newWidth)
						return 0;
					const delta = newWidth - this.relativeArea.width;
					this.relativeArea.width = newWidth;
					if(this.labelArea != null)
						this.labelArea.width = newWidth;
					if(this.defineArea != null)
						this.defineArea.width = newWidth;
					if(this.nodeArea != null)
						this.nodeArea.width = newWidth;
					return delta;
				},
				//expand node height as needed to fit content
				//expands all areas as needed, too
				//returns the delta
				updateHeight(newHeight) {
					if(this.relativeHeight >= newHeight)
						return 0;
					const delta = newHeight - this.relativeArea.height;
					this.relativeArea.height = newHeight;
					if(this.nodeArea != null)
						this.nodeArea.height += delta;
					else if(this.defineArea != null)
						this.defineArea.height += delta;
					else if(this.labelArea != null)
						this.labelArea.height += delta;
					return delta;
				},
				pathLabel: function() {
					if(path == null || path.length == 0)
						return label;
					return path + "." + label;
				},
				setAbsoluteAreas: function(deltaX=0, deltaY=0) {
					this.absoluteArea = Area.create(this.relativeArea.x + deltaX, this.relativeArea.y + deltaY, this.relativeArea.width, this.relativeArea.height);
					let self = this;
					this.nodes.forEach(function(nestedNode) {
						nestedNode.setAbsoluteAreas(self.absoluteArea.x + self.nodeArea.x + pinker.config.scopePadding, self.absoluteArea.y + self.nodeArea.y + pinker.config.scopePadding);
					});
				},
				pathPrefix: function() {
					return this.label + ".";
				},
				//returns label based on next part of path matching this
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
	
	const DefineLayout = {
		//returns define layout object based on define section
		parse: function(defineSection, context) {
			let defineLayout = this.create();
			defineSection.lines.forEach(function(line) {
				if(line == defineSection.pipe)
					defineLayout.addHorizontalRule();
				else
					defineLayout.addLine(line);
			});
			defineLayout.calculateDimensions(context);
			return defineLayout;
		},
		//returns define layout object
		create: function() {
			return {
				width: null,
				height: null,
				lines: [],
				horizontalRuleIndexes: [], //correlates to lines array
				addLine: function(line) {
					this.lines.push(line);
				},
				addHorizontalRule: function() {
					this.horizontalRuleIndexes.push(this.lines.length);
				},
				//calculates and set dimensions
				calculateDimensions: function(context) {
					let lineHeight = pinker.config.estimateFontHeight();
					let lineSpacing = lineHeight / 3; //TODO move to config
					this.width = 0;
					this.height = 0;
					context.font = pinker.config.font();
					for(let i=0; i<this.lines.length; i++)
					{
						let line = this.lines[i];
						this.width = Math.max(this.width, context.measureText(line).width);
						this.height += lineHeight + lineSpacing;
					}
				},
				//draw lines on context
				draw: function(point, context) {
					context.fillStyle = pinker.config.lineColor;
					context.strokeStyle = pinker.config.lineColor;
					let lineHeight = pinker.config.estimateFontHeight();
					let lineSpacing = lineHeight / 3; //TODO move to config
					point.y += lineHeight;
					for(let i=0; i<this.lines.length; i++)
					{
						let line = this.lines[i];
						context.fillText(line, point.x, point.y);
						if(this.horizontalRuleIndexes.includes(i+1))
						{
							context.beginPath();
							context.moveTo(point.x, point.y + (lineSpacing * 0.85)); //TODO better definition of where line should be, also make it thinner?
							context.lineTo(point.x + this.width, point.y + (lineSpacing * 0.85));
							context.closePath();
							context.stroke();
						}
						point.y += lineHeight + lineSpacing;
					}
				}
			};
		}
	};
	
	const LabelLayout = {
		types: {
			text: 1, //plain text
			header: 2 //header above content
		},
		//returns label layout object
		create: function(width, height, type, lines) {
			return {
				width: width,
				height: height,
				type: type,
				lines: lines,
				isHeader: function() {
					return (this.type == LabelLayout.types.header);
				},
				widthHeightRatio: function() {
					return (width/height);
				},
				whToGoldenRatio: function() {
					return Math.abs(1.6 - this.widthHeightRatio());
				},
				//draw text centered in space (local width/height may be overridden)
				drawCentered: function(point, width, height, context) {
					context.fillStyle = pinker.config.lineColor;
					let self = this;
					let lineHeight = pinker.config.estimateFontHeight();
					let extraHeight = height - this.height;
					point.y += lineHeight + (extraHeight/2);
					this.lines.forEach(function(line) {
						let lineWidth = context.measureText(line).width;
						context.fillText(line, point.x + ((width - lineWidth)/2), point.y);
						point.y += lineHeight;
					});
				}
			};
		},
		//returns an empty text-type label layout object
		createEmptyText: function() {
			return this.create(5, 5, this.types.text, []);
		},
		//returns text-type label layout object
		createText: function(width, height, lines) {
			return this.create(width, height, this.types.text, lines);
		},
		//returns header-type label layout object
		createHeader: function(width, height, line) {
			return this.create(width, height, this.types.header, [line]);
		},
		//returns text-type label layout object
		calculateText: function (label, context) {
			if(label == null || label.length == 0)
				return this.createEmptyText();
			if(pinker.config.favorGoldenRatioLabelSize)
				return this.calculateTextToGoldenRatio(label, context);
			
			const wordCount = label.split(" ").length;
			let layoutLabel = null;
			for(let wordsPerLine=1; wordsPerLine<=wordCount; wordsPerLine++)
			{
				labelLayout = this.calculateWordsPerLine(label, wordsPerLine, context);
				if(labelLayout.width > labelLayout.height)
				{
					return labelLayout;
				}
			}
			return labelLayout;
		},
		//returns text-type label layout object, arranged to have a width:height ratio close to 1.6
		calculateTextToGoldenRatio: function(label, context) {
			//don't process every possibility - could be a lot
			//get as close to golden ratio as possible, strongly favoring width > height
			const wordCount = label.split(" ").length;
			let selectedLabelLayout = null;
			let nextLayoutLabel = null;
			for(let wordsPerLine=1; wordsPerLine<=wordCount; wordsPerLine++)
			{
				nextLabelLayout = this.calculateWordsPerLine(label, wordsPerLine, context);
				if(selectedLabelLayout == null || selectedLabelLayout.whToGoldenRatio() > nextLabelLayout.whToGoldenRatio() || selectedLabelLayout.widthHeightRatio() < 1.2) //1.2 found to be a pleasing tipping point during testing
				{
					selectedLabelLayout = nextLabelLayout;
					continue;
				}
				break;
			}
			return selectedLabelLayout;
		},
		//returns text-type label layout object, with a specific number of words per line
		calculateWordsPerLine: function(label, wordsPerLine, context) {
			context.font = pinker.config.font();
			let wordHeight = pinker.config.estimateFontHeight();
			let width = 0;
			let height = 0;
			let lines = this.splitIntoWordsPerLine(label, wordsPerLine);
			lines.forEach(function(line) {
				width = Math.max(width, context.measureText(line).width);
				height += wordHeight;
			});
			return this.createText(width, height, lines);
		},
		//divide text into units of size wordsPerLine
		//fills lines from last to first
		splitIntoWordsPerLine: function(text, wordsPerLine) {
			let words = text.split(" ");
			let results = [];
			while(words.length > 0)
			{
				if(words.length <= wordsPerLine)
				{
					results.unshift(words.join(" "));
					break;
				}
				let segment = words.splice(words.length - wordsPerLine, wordsPerLine);
				results.unshift(segment.join(" "));
			}
			return results;
		},
		//returns header-type label layout object
		calculateHeader: function (label, context) {
			context.font = pinker.config.font();
			let height = pinker.config.estimateFontHeight();
			let width = context.measureText(label).width;
			return this.createHeader(width, height, label);
		}
	};
	
	const Area = {
		//returns area object
		create: function(x, y, width, height) {
			return {
				x: x,
				y: y,
				width: width,
				height: height,
				point: function() {
					return Point.create(this.x, this.y);
				},
				top: function(relativePoint=null) {
					if(relativePoint == null)
						return this.y;
					return this.y + relativePoint.y;
				},
				bottom: function(relativePoint=null) {
					if(relativePoint == null)
						return this.y + this.height;
					return this.y + relativePoint.y + this.height;
				},
				left: function(relativePoint=null) {
					if(relativePoint == null)
						return this.x;
					return this.x + relativePoint.x;
				},
				right: function(relativePoint=null) {
					if(relativePoint == null)
						return this.x + this.width;
					return this.x + relativePoint.x + this.width;
				},
				center: function(relativePoint=null) {
					if(relativePoint == null)
						return Point.create(this.x + (this.width / 2), this.y + (this.height / 2));
					return Point.create(
						this.x + relativePoint.x + (this.width / 2),
						this.y + relativePoint.y + (this.height / 2)
					);
				},
				//one area does not extend left or right past the other area
				isVerticallyCongruent: function(otherNode) {
					return ((this.left() >= otherNode.left() && this.right() <= otherNode.right())
						|| (otherNode.left() >= this.left() && otherNode.right() <= this.right()));
				},
				//one area does not extend up or down past the other area
				isHorizontallyCongruent: function(otherNode) {
					return ((this.top() >= otherNode.top() && this.bottom() <= otherNode.bottom())
						|| (otherNode.top() >= this.top() && otherNode.bottom() <= this.bottom()));
				},
				hasVerticalOverlap: function(otherNode) {
					let minY = Math.max(this.top(), otherNode.top());
					let maxY = Math.min(this.bottom(), otherNode.bottom());
					return (minY < maxY);
				},
				hasHorizontalOverlap: function(otherNode) {
					let minX = Math.max(this.left(), otherNode.left());
					let maxX = Math.min(this.right(), otherNode.right());
					return (minX < maxX);
				},
				isAbove: function(otherNode) {
					return (this.hasHorizontalOverlap(otherNode)
						&& this.bottom() < otherNode.top());
				},
				isBelow: function(otherNode) {
					return (this.hasHorizontalOverlap(otherNode)
						&& this.top() > otherNode.bottom());
				},
				isLeftOf: function(otherNode) {
					return (this.hasVerticalOverlap(otherNode)
						&& this.right() < otherNode.left());
				},
				isRightOf: function(otherNode) {
					return (this.hasVerticalOverlap(otherNode)
						&& this.left() > otherNode.right());
				},
				//draw background and outline of area
				fillAndOutline: function(relativePoint, backgroundColor, lineColor, context) {
					context.fillStyle = backgroundColor;
					context.fillRect(this.x + relativePoint.x, this.y + relativePoint.y, this.width, this.height);
					this.outline(relativePoint, lineColor, context);
				},
				//draw outline of area
				outline: function(relativePoint, lineColor, context) {
					context.strokeStyle = lineColor;
					if(relativePoint == null)
						context.strokeRect(this.x, this.y, this.width, this.height);
					else
						context.strokeRect(this.x + relativePoint.x, this.y + relativePoint.y, this.width, this.height);
				}

			};
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
		create: function(x, y=null) {
			if(y == null)
				y = x;
			return {
				x: x,
				y: y,
				//return new point = this + deltas
				plus: function(deltaPoint) {
					return Point.create(this.x + deltaPoint.x, this.y + deltaPoint.y);
				}
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
		const context = canvasElement.getContext('2d');

		const nodes = convertLayoutToNodes(source, context);
		//calculate final locations
		nodes.forEach(function(node) {
			node.setAbsoluteAreas(pinker.config.canvasPadding, pinker.config.canvasPadding);
		});

		let dimensions = calculateCanvasDimensions(nodes);
		dimensions.width += pinker.config.canvasPadding * 2;
		dimensions.height += pinker.config.canvasPadding * 2;
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
			drawNode(node, context);
		});
	}
	
	function drawNode(node, context) {
		const paddingPoint = Point.create(pinker.config.scopePadding);
		const doublePadding = pinker.config.scopePadding * 2;
		
		//outline node
		node.absoluteArea.outline(null, pinker.config.lineColor, context);

		//label area
		switch(node.labelLayout.type)
		{
			case LabelLayout.types.text: 
				break;
			case LabelLayout.types.header:
				node.labelArea.fillAndOutline(node.absoluteArea.point(), pinker.config.shadeColor, pinker.config.lineColor, context);
				break;
		}
		context.font = pinker.config.font();
		const labelPoint = node.absoluteArea.point().plus(node.labelArea.point()).plus(paddingPoint);
		node.labelLayout.drawCentered(labelPoint, node.labelArea.width - doublePadding, node.labelArea.height - doublePadding, context);
		
		//define area
		if(node.defineLayout != null)
		{
			node.defineArea.outline(node.absoluteArea.point(), pinker.config.lineColor, context);
			const definePoint = node.absoluteArea.point().plus(node.defineArea.point()).plus(paddingPoint);
			node.defineLayout.draw(definePoint, context);
		}

		//node area
		drawNodes(node.nodes, context);
	}
	
	function drawRelations(source, allNodes, context, path=null) {
		if(path == null || path.length == 0)
			path = source.label;
		else
			path += "." + source.label;
		if(source.relate != null)
		{
			source.relate.records.forEach(function(relation) {
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
		if(source.layout == null)
			return [];

		if(path == null || path.length == 0)
			path = source.label;
		else
			path += "." + source.label;

		let nodeRows = [];
		let allNodes = [];
		let y = 0;
		//layout as if all are left aligned
		source.layout.rows.forEach(function(row) {
			let nodes = []
			let x = 0;
			let rowHeight = 0;
			const leftAlignCount = row.leftAlign.length;
			let index = 0;
			row.all().forEach(function(layoutRecord) {
				const doublePadding = pinker.config.scopePadding * 2;
				const isRightAlign = (index >= leftAlignCount);
				
				let node = Node.create(layoutRecord.label, layoutRecord.alias, path, isRightAlign);

				const relatedSource = source.findLabeledSource(layoutRecord.label);
				let relatedDefine = null;
				let nestedNodes = [];
				if(relatedSource != null)
				{
					nestedNodes = convertLayoutToNodes(relatedSource, context, path);
					relatedDefine = relatedSource.define;
				}
				
				//start with just a label filling entire node
				if(relatedDefine != null || nestedNodes.length > 0)
				{
					node.labelLayout = LabelLayout.calculateHeader(node.label, context);
				}
				else
				{
					node.labelLayout = LabelLayout.calculateText(node.label, context);
				}
				let width = node.labelLayout.width + doublePadding;
				let height = node.labelLayout.height + doublePadding;
				node.setRelativeArea(x, y, width, height);
				node.labelArea = Area.create(0, 0, width, height);

				//add define area
				if(relatedDefine != null)
				{
					node.defineLayout = DefineLayout.parse(relatedDefine, context);
					node.updateWidth(node.defineLayout.width + doublePadding);
					node.defineArea = Area.create(0, node.relativeArea.height, node.relativeArea.width, node.defineLayout.height + doublePadding);
					node.relativeArea.height += node.defineArea.height;
				}

				//add node area
				if(nestedNodes.length > 0)
				{
					node.nodes = nestedNodes;
					const nodeDimensions = calculateCanvasDimensions(nestedNodes);
					node.updateWidth(nodeDimensions.width + doublePadding);
					node.nodeArea = Area.create(0, node.relativeArea.height, node.relativeArea.width, nodeDimensions.height + doublePadding);
					node.relativeArea.height += node.nodeArea.height;
				}

				nodes.push(node);

				x += node.relativeArea.width + pinker.config.scopeMargin;
				rowHeight = Math.max(rowHeight, node.relativeArea.height);
				index++;
			});
			y += rowHeight + pinker.config.scopeMargin;
			nodeRows.push(nodes);
			allNodes = allNodes.concat(nodes);
		});
		//apply resizing rules
		if(pinker.config.favorUniformNodeSizes)
		{
			makeSiblingNodesUniformSizes(allNodes, nodeRows);
		}
		//apply right alignment
		let maxXs = allNodes.map(node => node.relativeArea.right());
		let maxX = Math.max(...maxXs);
		nodeRows.forEach(function(nodes) {
			nodes.reverse();
			let right = maxX;
			nodes.forEach(function(node) {
				if(!node.isRightAlign)
					return;
				node.relativeArea.x = right - node.relativeArea.width;
				right -= node.relativeArea.width - pinker.config.scopeMargin;
			});
		});
		return allNodes;
	}
	
	//if nodes are close in size, make them all the same size - adjust placements
	//TODO: NOT IMPLEMENTED if nodes are widely different in size, divide them into subsets of sizes
	function makeSiblingNodesUniformSizes(allNodes, nodeRows) {
		const variance = 0.3;
		//widths
		let widths = allNodes.map(node => node.relativeArea.width);
		let minWidth = Math.min(...widths);
		let maxWidth = Math.max(...widths);
		if(1 - (minWidth / maxWidth) <= variance)
		{
			nodeRows.forEach(function(row) {
				for(let i=0; i<row.length; i++)
				{
					let node = row[i];
					let delta = node.updateWidth(maxWidth);
					if(delta == 0)
						continue;
					for(let j=i+1; j<row.length; j++) //push right-hand row-siblings to the right
					{
						row[j].relativeArea.x += delta;
					}
				}
			});
		}
		//heights
		let heights = allNodes.map(node => node.relativeArea.height);
		let minHeight = Math.min(...heights);
		let maxHeight = Math.max(...heights);
		if(1 - (minHeight / maxHeight) <= variance)
		{
			for(let r=0; r<nodeRows.length; r++)
			{
				let row = nodeRows[r];
				const rowHeight = Math.max(...row.map(node => node.relativeArea.height));
				const rowHeightDelta = maxHeight - rowHeight;
				for(let i=0; i<row.length; i++)
				{
					let node = row[i];
					node.updateHeight(maxHeight);
				}
				for(let r2=r+1; r2<nodeRows.length; r2++) //push all lower rows down
				{
					let row2 = nodeRows[r2];
					row2.forEach(function(node) {
						node.relativeArea.y += rowHeightDelta;
					});
				}
			}
		}
	}
	
	function findNode(nodes, label, labelPath) {
		if(Source.isAlias(label))
			return findNodeAlias(nodes, label);
		if(Source.pathStartsWithAlias(label))
		{
			let [alias, remainingPath] = Source.splitAliasFromPath(label);
			let node = findNodeAlias(nodes, alias);
			if(node == null)
				return null;
			return node.findLabel(node.pathPrefix() + Source.openScope(remainingPath));
		}
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
			width = Math.max(width, node.relativeArea.right());
			height = Math.max(height, node.relativeArea.bottom());
		});
		return Dimension.create(width, height);
	}
	
	function drawArrowBetweenNodes(startNode, endNode, arrowType, lineType, context) {
		const [startPoint, endPoint] = arrangeLineBetweenNodes(startNode, endNode);
		drawLine(startPoint, endPoint, lineType, context);
		drawArrow(startPoint, endPoint, arrowType, context);
	}
	
	//returns [startPoint, endPoint]
	function arrangeLineBetweenNodes(startNode, endNode) {
		const startArea = startNode.absoluteArea;
		const endArea = endNode.absoluteArea;
		let start = startArea.center();
		let end = endArea.center();
		
		if(startArea.isAbove(endArea))
		{
			const minX = Math.max(startArea.left(), endArea.left());
			const maxX = Math.min(startArea.right(), endArea.right());
			const middleX = (minX + maxX) / 2;
			start = Point.create(middleX, startArea.bottom());
			end = Point.create(middleX, endArea.top());
			return [start, end];
		}
		if(startArea.isBelow(endArea))
		{
			const minX = Math.max(startArea.left(), endArea.left());
			const maxX = Math.min(startArea.right(), endArea.right());
			const middleX = (minX + maxX) / 2;
			start = Point.create(middleX, startArea.top());
			end = Point.create(middleX, endArea.bottom());
			return [start, end];
		}
		if(startArea.isLeftOf(endArea))
		{
			const minY = Math.max(startArea.top(), endArea.top());
			const maxY = Math.min(
				(startNode.labelLayout.isHeader()) ? startNode.labelArea.bottom(startNode.absoluteArea.point()) : startArea.bottom(),
				(endNode.labelLayout.isHeader())   ? endNode.labelArea.bottom(endNode.absoluteArea.point())     : endArea.bottom()
			);
			const middleY = (minY + maxY) / 2;
			start = Point.create(startArea.right(), middleY);
			end = Point.create(endArea.left(), middleY);
			return [start, end];
		}
		if(startArea.isRightOf(endArea))
		{
			const minY = Math.max(startArea.top(), endArea.top());
			const maxY = Math.min(
				(startNode.labelLayout.isHeader()) ? startNode.labelArea.bottom(startNode.absoluteArea.point()) : startArea.bottom(),
				(endNode.labelLayout.isHeader())   ? endNode.labelArea.bottom(endNode.absoluteArea.point())     : endArea.bottom()
			);
			const middleY = (minY + maxY) / 2;
			start = Point.create(startArea.left(), middleY);
			end = Point.create(endArea.right(), middleY);
			return [start, end];
		}

		if(startArea.isAbove(endArea))
			start.y = startArea.bottom();
		else if(startArea.isBelow(endArea))
			start.y = startArea.top();

		if(startArea.isLeftOf(endArea))
			start.x = startArea.right();
		else if(startArea.isRightOf(endArea))
			start.x = startArea.left();

		if(endArea.isAbove(startArea))
			end.y = endArea.bottom();
		else if(endArea.isBelow(startArea))
			end.y = endArea.top();

		if(endArea.isLeftOf(startArea))
			end.x = endArea.right();
		else if(endArea.isRightOf(startArea))
			end.x = endArea.left();

		return [start, end];
	}
	
	function drawLine(start, end, lineType, context) {
		context.beginPath();
		context.strokeStyle = pinker.config.lineColor;
		switch(lineType)
		{
			case LineTypes.solid: 
				context.setLineDash([]); 
				break;
			case LineTypes.dashed: 
				context.setLineDash([pinker.config.lineDashLength, pinker.config.lineDashSpacing]); 
				break;
		}
		context.moveTo(start.x, start.y);
		context.lineTo(end.x, end.y);
		context.stroke();
	}
	
	function drawArrow(start, end, arrowType, context) {
		const headLength = pinker.config.arrowHeadLength;
		const angle = Math.atan2(end.y - start.y, end.x - start.x);
		
		if(arrowType == ArrowTypes.none)
			return;
		
		context.setLineDash([]); //solid line
		if(arrowType == ArrowTypes.plainArrow || arrowType == ArrowTypes.hollowArrow)
		{
			const triangleSideLength = headLength * 2 / Math.sqrt(3); //see equilateral triangle geometry
			const arrowCornerA = Point.create(end.x - triangleSideLength * Math.cos(angle - Math.PI/6), end.y - triangleSideLength * Math.sin(angle - Math.PI/6));
			const arrowCornerB = Point.create(end.x - triangleSideLength * Math.cos(angle + Math.PI/6), end.y - triangleSideLength * Math.sin(angle + Math.PI/6));
			if(arrowType == ArrowTypes.plainArrow)
			{
				context.beginPath();
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerA.x, arrowCornerA.y);
				context.moveTo(end.x, end.y);
				context.lineTo(arrowCornerB.x, arrowCornerB.y);
				context.stroke();
			}
			else if(arrowType == ArrowTypes.hollowArrow)
			{
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
			}
		}
		else if(arrowType == ArrowTypes.hollowDiamond || arrowType == ArrowTypes.filledDiamond)
		{
			const triangleSideLength = (headLength/2) * 2 / Math.sqrt(3); //see equilateral triangle geometry
			const arrowCornerA = Point.create(end.x - triangleSideLength * Math.cos(angle - Math.PI/6), end.y - triangleSideLength * Math.sin(angle - Math.PI/6));
			const arrowCornerB = Point.create(end.x - triangleSideLength * Math.cos(angle + Math.PI/6), end.y - triangleSideLength * Math.sin(angle + Math.PI/6));
			const diamondCornerC = Point.create(arrowCornerA.x - triangleSideLength * Math.cos(angle + Math.PI/6), arrowCornerA.y - triangleSideLength * Math.sin(angle + Math.PI/6));
			if(arrowType == ArrowTypes.hollowDiamond)
			{
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
			}
			else if(arrowType == ArrowTypes.filledDiamond)
			{
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
			}
		}
	}	

})();