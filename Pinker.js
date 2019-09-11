/*
* Pinker: A standalone JavaScript library for rendering code dependency diagrams on your web page.
* Github: https://github.com/WithoutHaste/Pinker
*/

var pinker = pinker || {};

pinker.testMode = true;

pinker.version = '1.4.0';

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
 
/*private scope*/ 
(function() { 

	//render all sources onto new canvases
	pinker.render = function(options={}) {
		let pinkerElements = document.getElementsByClassName("pinker");
		for(let i = 0; i < pinkerElements.length; i++)
		{
			let pinkerElement = pinkerElements[i];
			switch(pinkerElement.tagName)
			{
				case "PRE": renderFromPre(pinkerElement, options); break;
				default: displayError("unknown tag skipped (id:"+pinkerElement.id+")"); break;
			}
		}
	};

	function renderFromPre(preElement, options={}) {
		Object.assign(pinker.config, options);
		const sourceText = preElement.innerHTML;
		const canvasElement = document.createElement("canvas");
		if(preElement.id != null)
			canvasElement.id = "canvas-" + preElement.id;
		if(pinker.config.keepSource)
		{
			//insert canvas after pre element
			preElement.parentNode.insertBefore(canvasElement, preElement.nextSibling); //verified nextSibling doesn't have to exist
		}
		else
		{
			//insert canvas into pre element
			preElement.innerHTML = null;
			preElement.appendChild(canvasElement);
		}
		pinker.draw(canvasElement, sourceText);
	}

	//works in FireFox but fails in Chrome due to CORS (cross-site data access rules)
	function renderFromObject(objectElement, options={}) {
		Object.assign(pinker.config, options);
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
		if(pinker.config.keepSource)
		{
			//insert canvas after object element
			objectElement.parentNode.insertBefore(canvasElement, objectElement.nextSibling); //verified nextSibling doesn't have to exist
		}
		else
		{
			//replace object element with canvas
			objectElement.parentNode.insertBefore(canvasElement, objectElement);
			objectElement.parentNode.removeChild(objectElement);
		}
		pinker.draw(canvasElement, sourceText);
	}

	//draw on provided canvas with provided source
	pinker.draw = function(canvasElement, sourceText, options={}) {
		Object.assign(pinker.config, options);
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

	function displayError(message) {
		console.log("Pinker Error: " + message);
	}
	const Text = {
		//returns true for empty string, null, or undefined
		isBlank: function(text) {
			return (text == undefined || text == null || text.length == 0);
		},
		reverse: function(text) {
			if(text == null)
				return null;
			return text.split("").reverse().join("");
		},
		removeFromStart: function(text, start) {
			if(text.startsWith(start))
				return text.substring(start.length);
			return text;
		},
		removeEnclosingCharacters: function(text, startChar, endChar=null) {
			if(endChar == null)
				endChar = startChar;
			if(text == null || text.length == 0)
				return text;
			if(text[0] == startChar)
				text = text.substring(1);
			if(text.length == 0)
				return text;
			if(text[text.length-1] == endChar)
				text = text.substring(0, text.length-1);
			return text;
		}
	};

	const Source = {
		//returns the text, with all HTML character encodings converted to plain text
		decodeHtml: function(text) {
			var element = document.createElement("textarea");
			element.innerHTML = text;
			return element.value;
		},
		//returns the text, with all leading and trailing whitespace characters removed from each line
		trim: function(text) {
			let result = Source.removeLeadingWhitespace(text);
			result = Source.removeTrailingWhitespace(result);
			return result;
		},
		//returns the text, with all leading whitespace characters removed from each line
		removeLeadingWhitespace: function(text) {
			return text.replace(/^\s+/mg,"");
		},
		//returns the text, with all trailing whitespace characters removed from each line
		removeTrailingWhitespace: function(text) {
			return text.replace(/\s+$/mg,"");
		},
		//returns true if this is a section header
		isSectionHeader: function(term) {
			if(term == null)
				return false;
			return ((term.match(/^.+\:$/) != null) && !RelateRecord.isRelateRowEndingInColon(term));
		},
		//returns true if term is a scope
		isScope: function(term) {
			if(term == null)
				return false;
			return (term.match(/^\[.+\]$/) != null);
		},
		//returns true if term is an alias
		isAlias: function(term) {
			if(term == null)
				return false;
			return(term.match(/^\{.+\}$/) != null);
		},
		//returns true if term is a path that starts with an alias
		isAliasPath: function(term) {
			if(term == null)
				return false;
			return (this.isAlias(term) || term.match(/^\{.+\}\./) != null);
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
				getPathSegment: function() {
					return (this.alias == null) ? this.label : this.alias;
				},
				appendToPath: function(prefix=null) {
					if(prefix == null)
						return this.getPathSegment();
					if(this.alias != null)
						return this.getPathSegment();
					return prefix + "." + this.getPathSegment();
				},
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
				//returns the nested source with alias or label
				findSource: function(label, alias=null) {
					if(alias == null)
						return this.findLabeledSource(label);
					return this.findAliasedSource(alias);
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
					if(line == null || line.length == 0)
						return;
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
		//returns true for a line generally formatted like a Relate row with labels
		//main intention is to differentiate a Section Header from a Relate row that ends in a colon
		//ex [B1]->[B2] :"middle label":
		isRelateRowEndingInColon: function(line) {
			return (line.match(/\[.*\].*":/) != null || line.match(/\{.*\}.*":/) != null);
		},
		//returns true if source relate line starts with a scope
		startIsScope: function(line) {
			return (line.match(/^\[.+?\]/) != null);
		},
		//returns true if source relate line starts with an alias
		startIsAlias: function(line) {
			return (!this.startIsAliasPath(line) && line.match(/^\{.+?\}/) != null);
		},
		//returns true if source relate line starts with an alias path
		startIsAliasPath: function(line) {
			let matches = line.match(/^(\{.+?\})/);
			if(matches == null)
				return false;
			line = line.substring(matches[1].length);
			return line.match(/^\.\[.+?\]/);
		},
		trimSpacesAndCommas: function(line) {
			line = line.trim();
			while(line.length > 0 && line[0] == ',')
				line = line.substring(1).trim();
			return line;
		},
		//returns [[terms], remaining line]
		//returns array of comma-separated scopes or alias paths
		//stops when it hits something it doesn't recognize
		parseListOfTerms: function(partialLine) {
			let terms = [];
			partialLine = this.trimSpacesAndCommas(partialLine);
			while(partialLine.length > 0)
			{
				if(this.startIsAliasPath(partialLine))
				{
					let match = partialLine.match(/^\{.+?\}\.\[.+?\]/);
					terms.push(match[0]);
					partialLine = partialLine.substring(match[0].length);
				}
				else if(this.startIsAlias(partialLine))
				{
					let match = partialLine.match(/^\{.+?\}/);
					terms.push(match[0]);
					partialLine = partialLine.substring(match[0].length);
				}
				else if(this.startIsScope(partialLine))
				{
					let match = partialLine.match(/^\[.+?\]/);
					terms.push(match[0]);
					partialLine = partialLine.substring(match[0].length);
				}
				else
				{
					break;
				}
				partialLine = this.trimSpacesAndCommas(partialLine);
			}
			return [terms, partialLine];
		},
		//returns [lineLabelStart, lineLabelMiddle, lineLabelEnd] from the label section of a Relate line
		parseLabels: function(line) {
			line = line.trim();
			let match = null;
			match = line.match(/^\s*"(.+?)"\s*:\s*"(.+?)"\s*:\s*"(.+?)"\s*$/); //start:middle:end
			if(match != null)
				return [match[1].trim(), match[2].trim(), match[3].trim()];
			match = line.match(/^\s*"(.+?)"\s*:\s*:\s*"(.+?)"\s*$/); //start::end
			if(match != null)
				return [match[1].trim(), null, match[2].trim()];
			match = line.match(/^\s*"(.+?)"\s*:\s*"(.+?)"\s*$/); //start:end
			if(match != null)
				return [match[1].trim(), null, match[2].trim()];
			match = line.match(/^\s*:\s*"(.+?)"\s*:\s*"(.+?)"\s*$/); //:middle:end
			if(match != null)
				return [null, match[1].trim(), match[2].trim()];
			match = line.match(/^\s*:\s*"(.+?)"\s*:\s*$/); //:middle:
			if(match != null)
				return [null, match[1].trim(), null];
			match = line.match(/^\s*"(.+?)"\s*:\s*"(.+?)"\s*:\s*$/); //start:middle:
			if(match != null)
				return [match[1].trim(), match[2].trim(), null];
			match = line.match(/^\s*"(.+?)"\s*:\s*(:\s*)?$/); //start:: or start:
			if(match != null)
				return [match[1].trim(), null, null];
			match = line.match(/^(\s*:)?\s*:\s*"(.+?)"\s*$/); //::end or :end
			if(match != null)
				return [null, null, match[2].trim()];
			match = line.match(/^\s*"(.+?)"\s*$/); //middle
			if(match != null)
				return [null, match[1].trim(), null];
			return [null, null, null];
		},
		//returns [[startTerms], arrowType, [endTerms], remainingLine] from full Relate row
		parseRelation: function(line) {
			let startTerms = [];
			let arrowTerm = null;
			let endTerms = [];
			[startTerms, line] = this.parseListOfTerms(line);
			if(line != null)
			{
				let matches = line.match(/^(.+?)(\[|\{)/);
				if(matches == null)
				{
					arrowTerm = line;
					line = "";
				}
				else
				{
					arrowTerm = matches[1].trim();
					if(arrowTerm != null)
					{
						line = Text.removeFromStart(line, arrowTerm).trim();
					}
					[endTerms, line] = this.parseListOfTerms(line);
				}
			}
			return [startTerms, arrowTerm, endTerms, line];
		},
		//returns an array of Relate Record objects
		parseLine: function(line) {
			let [startTerms, arrowTerm, endTerms, lineB] = this.parseRelation(line);
			if(startTerms.length == 0 || arrowTerm == null || endTerms.length == 0)
				return [];
			let [lineLabelStart, lineLabelMiddle, lineLabelEnd] = this.parseLabels(lineB);
			let results = [];
			startTerms.forEach(function(startTerm) {
				endTerms.forEach(function(endTerm) {
					results.push(RelateRecord.create(Source.openScope(startTerm), arrowTerm, Source.openScope(endTerm), lineLabelStart, lineLabelMiddle, lineLabelEnd));
				});
			});
			return results;
		},
		//returns a relate record
		create: function(startLabel, arrowType, endLabel, lineLabelStart=null, lineLabelMiddle=null, lineLabelEnd=null) {
			return {
				startLabel: startLabel,
				arrowType: arrowType,
				endLabel: endLabel,
				lineLabelStart: lineLabelStart,
				lineLabelMiddle: lineLabelMiddle,
				lineLabelEnd, lineLabelEnd
			};
		}
	};
	//returns a "source" object
	function parseSource(sourceText) {
		const source = Source.create();
		sourceText = Source.trim(sourceText);
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
			line = line.trim();
			if(line == null || line.length == 0)
				return;
			if(line.startsWith(pipe))
			{
				defineSection.addLine(pipe);
				line = line.substring(pipe.length).trim();
			}
			if(line.endsWith(pipe))
			{
				line = line.substring(0, line.length - pipe.length).trim();
				defineSection.addLine(line);
				defineSection.addLine(pipe);
			}
			else
			{
				defineSection.addLine(line);
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
			let results = RelateRecord.parseLine(line);
			relateSection.records = relateSection.records.concat(results);
		});
		return relateSection;
	}
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
					{
						let nodeAreaDelta = newWidth - this.nodeArea.width;
						this.nodeArea.width = newWidth;
						this.nodeArea.paddingLeft += (nodeAreaDelta/2);
						this.nodeArea.paddingRight += (nodeAreaDelta/2);
					}
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
					{
						this.nodeArea.height += delta;
						this.nodeArea.paddingTop += (delta/2);
						this.nodeArea.paddingBottom += (delta/2);
					}
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
						nestedNode.setAbsoluteAreas(self.absoluteArea.x + self.nodeArea.x + self.nodeArea.paddingLeft, self.absoluteArea.y + self.nodeArea.y + self.nodeArea.paddingTop);
					});
				},
				pathPrefix: function() {
					return this.label + ".";
				},
				findPath: function(path) {
					if(path == null)
						return null;
					if(Source.isAlias(path))
						return this.findAlias(path);
					if(Source.isAliasPath(path))
					{
						let [alias, label] = Source.splitAliasFromPath(path);
						let node = this.findAlias(alias);
						if(node == null)
							return null;
						if(label == null)
							return node;
						return node.findNestedLabel(Source.openScope(label));
					}
					return this.findLabel(Source.openScope(path));
				},
				findNestedLabel: function(label) {
					for(let i=0; i<this.nodes.length; i++)
					{
						let result = this.nodes[i].findLabel(label);
						if(result != null)
							return result;
					}
					return null
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
				},
				//returns depth of nested diagrams
				//default of 1, for no nested diagrams
				getMaxDepth: function() {
					let maxDepth = 1;
					this.nodes.forEach(function(node) {
						maxDepth = Math.max(maxDepth, node.getMaxDepth() + 1);
					});
					return maxDepth;
				}
			};
		}
	};

	const FindNode = {
		//label = fully qualified alias/label/path being searched for from current node
		//labelPath = the path from root node to current node
		findNode: function(nodes, label, labelPath) {
			if(Source.isAliasPath(label))
				return FindNode.findNodeAliasPath(nodes, label);
			if(Source.pathStartsWithAlias(label))
			{
				let [alias, remainingPath] = Source.splitAliasFromPath(label);
				let node = FindNode.findNodeAlias(nodes, alias);
				if(node == null)
					return null;
				return node.findLabel(node.pathPrefix() + Source.openScope(remainingPath));
			}
			let node = FindNode.findNodeRelative(nodes, label, labelPath);
			if(node != null)
				return node;
			return FindNode.findNodeAbsolute(nodes, label);
		},
		findNodeRelative: function(nodes, label, path) {
			let startingNode = FindNode.findNodeAbsolute(nodes, path);
			if(startingNode == null)
				return null;
			return FindNode.findNodeAbsolute(startingNode.nodes, label);
		},
		findNodeAbsolute: function(nodes, labelOrPath) {
			for(let i=0; i<nodes.length; i++)
			{
				let node = nodes[i];
				let result = node.findPath(labelOrPath);
				if(result != null)
					return result;
			}
			return null;
		},
		findNodeAliasPath: function(nodes, aliasPath) {
			if(Source.isAlias(aliasPath))
				return FindNode.findNodeAlias(nodes, aliasPath);
			let [alias, path] = Source.splitAliasFromPath(aliasPath);
			let node = FindNode.findNodeAlias(nodes, alias);
			if(node == null)
				return null;
			return FindNode.findNodeAbsolute(node.nodes, Source.openScope(path));
		},
		findNodeAlias: function(nodes, alias) {
			for(let i=0; i<nodes.length; i++)
			{
				let node = nodes[i];
				let result = node.findAlias(alias);
				if(result != null)
					return result;
			}
			return null;
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
					let lineSpacing = pinker.config.lineSpacing();
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
				//draw lines on context (text lines and dividing lines)
				draw: function(point, areaMinX, areaMaxX, context) {
					context.fillStyle = pinker.config.lineColor;
					context.strokeStyle = pinker.config.lineColor;
					context.lineWidth = pinker.config.lineWeight / 2;
					let lineHeight = pinker.config.estimateFontHeight();
					let lineSpacing = pinker.config.lineSpacing();
					point.y += lineHeight;
					for(let i=0; i<this.lines.length; i++)
					{
						let line = this.lines[i];
						context.fillText(line, point.x, point.y);
						if(this.horizontalRuleIndexes.includes(i+1))
						{
							let lineY = point.y + (lineSpacing * 0.9);
							context.beginPath();
							context.moveTo(areaMinX, lineY);
							context.lineTo(areaMaxX, lineY);
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
				paddingLeft: 0,
				paddingRight: 0,
				paddingTop: 0,
				paddingBottom: 0,
				setPadding: function(padding) {
					this.paddingLeft = padding;
					this.paddingRight = padding;
					this.paddingTop = padding;
					this.paddingBottom = padding;
				},
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
				isBelowRightOf: function(otherNode) {
					return (!this.isBelow(otherNode) && !this.isRightOf(otherNode)
						&& this.left() > otherNode.left() && this.top() > otherNode.top());
				},
				isBelowLeftOf: function(otherNode) {
					return (!this.isBelow(otherNode) && !this.isLeftOf(otherNode)
						&& this.left() < otherNode.left() && this.top() > otherNode.top());
				},
				isAboveRightOf: function(otherNode) {
					return (!this.isAbove(otherNode) && !this.isRightOf(otherNode)
						&& this.left() > otherNode.left() && this.top() < otherNode.top());
				},
				isAboveLeftOf: function(otherNode) {
					return (!this.isAbove(otherNode) && !this.isLeftOf(otherNode)
						&& this.left() < otherNode.left() && this.top() < otherNode.top());
				},
				//returns array of area corner as Point objects
				//order: topLeft, topRight, bottomRight, bottomLeft
				corners: function() {
					return [
						Point.create(this.left(), this.top()),
						Point.create(this.right(), this.top()),
						Point.create(this.right(), this.bottom()),
						Point.create(this.left(), this.bottom())
					];
				},
				//returns array of area boundaries as Line objects
				//order: top, right, bottom, left
				edges: function() {
					const corners = this.corners();
					return [
						Line.create(corners[0], corners[1]),
						Line.create(corners[1], corners[2]),
						Line.create(corners[2], corners[3]),
						Line.create(corners[3], corners[0])
					];
				},
				//return intersection point between Area boundary and line
				//assumes exactly one intersection point, but returns NULL if none is found
				getIntersection: function(line) {
					const edges = this.edges();
					for(let i=0; i<edges.length; i++)
					{
						let intersection = edges[i].intersection(line);
						if(intersection != null)
							return intersection;
					}
					return null;
				},
				//returns true if point is on or within the boundaries of this area
				containsPoint: function(point) {
					return (this.left() <= point.x && this.right() >= point.x && this.top() <= point.y && this.bottom() >= point.y);
				},
				//draw background and outline of area
				fillAndOutline: function(relativePoint, backgroundColor, lineColor, lineWeight, context) {
					context.fillStyle = backgroundColor;
					context.fillRect(this.x + relativePoint.x, this.y + relativePoint.y, this.width, this.height);
					this.outline(relativePoint, lineColor, lineWeight, context);
				},
				//draw outline of area
				outline: function(relativePoint, lineColor, lineWeight, context) {
					context.strokeStyle = lineColor;
					context.lineWidth = lineWeight;
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

	const PossibleLine = {
		//returns base possible line object
		create: function(isHorizontal) {
			return {
				isHorizontal: isHorizontal,
				isVertical: !isHorizontal,
				isPossibleLine: true,
				rangeX: function() {
					if(this.isHorizontal)
						return Range.create(Math.min(this.startX, this.endX), Math.max(this.startX, this.endX));
					else
						return Range.create(this.minX, this.maxX)
				},
				rangeY: function() {
					if(this.isHorizontal)
						return Range.create(this.minY, this.maxY)
					else
						return Range.create(Math.min(this.startY, this.endY), Math.max(this.startY, this.endY));
				},
				//returns true if possible lines are partially coincident
				//note: possible lines that would currently end up not coincident, could still be pushed into coincidence by these changes
				//note: so checking for lines that have an intersecting range of possible positions
				isCoincident: function(otherLine) {
					if(this.isHorizontal != otherLine.isHorizontal)
						return false;
					const intersectX = this.rangeX().intersect(otherLine.rangeX());
					const intersectY = this.rangeY().intersect(otherLine.rangeY());
					return (intersectX != null && intersectY != null);
				},
				toLine: function() {
					let line = null;
					if(this.isHorizontal)
						line = Line.create(Point.create(this.startX, this.rangeY().middle()), Point.create(this.endX, this.rangeY().middle()));
					else
						line = Line.create(Point.create(this.rangeX().middle(), this.startY), Point.create(this.rangeX().middle(), this.endY));
					line.arrowLine = this.arrowLine;
					line.startLabel = this.startLabel;
					line.middleLabel = this.middleLabel;
					line.endLabel = this.endLabel;
					return line;
				}
			};
		},
		//returns possible line object
		createHorizontal: function(startX, endX, minY, maxY) {
			let possibleLine = PossibleLine.create(true);
			possibleLine.startX = startX;
			possibleLine.endX = endX;
			possibleLine.minY = minY;
			possibleLine.maxY = maxY;
			return possibleLine;
		},
		//returns possible line object
		createVertical: function(startY, endY, minX, maxX) {
			let possibleLine = PossibleLine.create(false);
			possibleLine.startY = startY;
			possibleLine.endY = endY;
			possibleLine.minX = minX;
			possibleLine.maxX = maxX;
			return possibleLine;
		}
	};

	const Line = {
		//returns length of line (absolute value)
		length: function(startPoint, endPoint) {
			return Math.sqrt(Math.pow((endPoint.x - startPoint.x),2) + Math.pow((endPoint.y - startPoint.y),2));
		},
		//returns the angle (radians) of the line (ex: 0 = horizontal to the right)
		//result is modulating into (0, Pi*2] range
		angle: function(startPoint, endPoint) {
			let result = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
			while(result > Math.PI*2)
				result -= Math.PI*2;
			while(result < 0)
				result += Math.PI*2;
			return result;
		},
		//returns new point that is LENGTH away from startPoint, towards endPoint
		getPointLengthAlong: function(startPoint, endPoint, length) {
			const angle = this.angle(startPoint, endPoint);
			const cosAngle = parseFloat(Math.cos(angle).toFixed(4));
			const sinAngle = parseFloat(Math.sin(angle).toFixed(4));
			return Point.create(
				startPoint.x + length * cosAngle,
				startPoint.y + length * sinAngle
			);
		},
		//returns intersection point between a vertical line and a horizontal line
		intersectionVerticalHorizontal: function(verticalLine, horizontalLine) {
			let intersect = Point.create(verticalLine.startPoint.x, horizontalLine.startPoint.y);
			if(!Range.ordered(horizontalLine.minX(), intersect.x, horizontalLine.maxX()))
				return null;
			if(!Range.ordered(verticalLine.minY(), intersect.y, verticalLine.maxY()))
				return null;
			return intersect;
		},
		//returns intersection point between a vertical line and an angled line (neither vertical nor horizontal)
		intersectionVerticalAngled: function(verticalLine, angledLine) {
			let intersect = Point.create(verticalLine.minX(), angledLine.solveY(verticalLine.minX()));
			if(!Range.ordered(verticalLine.minY(), intersect.y, verticalLine.maxY()))
				return null;
			if(!Range.ordered(angledLine.minX(), intersect.x, angledLine.maxX()))
				return null;
			if(!Range.ordered(angledLine.minY(), intersect.y, angledLine.maxY()))
				return null;
			return intersect;
		},
		//returns intersection point between a horizontal line and an angled line (neither vertical nor horizontal)
		intersectionHorizontalAngled: function(horizontalLine, angledLine) {
			let intersect = Point.create(angledLine.solveX(horizontalLine.minY()), horizontalLine.minY());
			if(!Range.ordered(horizontalLine.minX(), intersect.x, horizontalLine.maxX()))
				return null;
			if(!Range.ordered(angledLine.minX(), intersect.x, angledLine.maxX()))
				return null;
			if(!Range.ordered(angledLine.minY(), intersect.y, angledLine.maxY()))
				return null;
			return intersect;
		},
		//returns intersection point between two angled lines (neither vertical nor horizontal)
		intersectionAngledAngled: function(lineA, lineB) {
			let x = ((lineB.yIntercept() - lineA.yIntercept()) / (lineA.slope() - lineB.slope()));
			let y = lineA.solveY(x);
			let intersect = Point.create(x, y);
			if(!Range.ordered(lineA.minX(), intersect.x, lineA.maxX()))
				return null;
			if(!Range.ordered(lineA.minY(), intersect.y, lineA.maxX()))
				return null;
			if(!Range.ordered(lineB.minX(), intersect.x, lineB.maxX()))
				return null;
			if(!Range.ordered(lineB.minY(), intersect.y, lineB.maxX()))
				return null;
			return intersect;
		},
		//returns line object
		create: function(startPoint, endPoint) {
			return {
				startPoint: startPoint,
				endPoint: endPoint,
				isLine: true,
				slope: function() {
					return ((endPoint.y - startPoint.y) / (endPoint.x - startPoint.x));
				},
				yIntercept: function() {
					//y = mx + b
					//b = y - mx
					return (startPoint.y - (this.slope() * startPoint.x));
				},
				solveX: function(y) {
					return ((y - this.yIntercept()) / this.slope());
				},
				solveY: function(x) {
					return ((this.slope() * x) + this.yIntercept());
				},
				isVertical: function() {
					return (startPoint.x == endPoint.x);
				},
				isHorizontal: function() {
					return (startPoint.y == endPoint.y);
				},
				//up and down in relation to computer screen: "up" is lower "y"
				isDiagonalRightUp: function() {
					const angle = this.angle();
					return (angle > Math.PI*3/2 && angle < Math.PI*2); //270 to 360 degrees, exclusive
				},
				//up and down in relation to computer screen: "up" is lower "y"
				isDiagonalLeftUp: function() {
					const angle = this.angle();
					return (angle > Math.PI && angle < Math.PI*3/2); //180 to 270 degrees, exclusive
				},
				//up and down in relation to computer screen: "up" is lower "y"
				isDiagonalLeftDown: function() {
					const angle = this.angle();
					return (angle > Math.PI/2 && angle < Math.PI); //90 to 180 degrees, exclusive
				},
				//up and down in relation to computer screen: "up" is lower "y"
				isDiagonalRightDown: function() {
					const angle = this.angle();
					return (angle > 0 && angle < Math.PI/2); //0 to 90 degrees, exclusive
				},
				minX: function() {
					return Math.min(this.startPoint.x, this.endPoint.x);
				},
				maxX: function() {
					return Math.max(this.startPoint.x, this.endPoint.x);
				},
				minY: function() {
					return Math.min(this.startPoint.y, this.endPoint.y);
				},
				maxY: function() {
					return Math.max(this.startPoint.y, this.endPoint.y);
				},
				midPoint: function() {
					return Point.create(
						(this.startPoint.x + this.endPoint.x)/2,
						(this.startPoint.y + this.endPoint.y)/2
					);
				},
				length: function() {
					return Line.length(this.startPoint, this.endPoint);
				},
				angle: function() {
					return Line.angle(this.startPoint, this.endPoint);
				},
				//deep copy of line
				copy: function() {
					return Line.create(this.startPoint.copy(), this.endPoint.copy());
				},
				//returns true if start and end points are the same
				equals: function(otherLine) {
					return (this.startPoint.equals(otherLine.startPoint) && this.endPoint.equals(otherLine.endPoint));
				},
				//shorten this line, from start point, by length
				shortenFromStart: function(length) {
					this.startPoint = Line.getPointLengthAlong(this.startPoint, this.endPoint, length);
				},
				//shorten this line, from end point, by length
				shortenFromEnd: function(length) {
					this.endPoint = Line.getPointLengthAlong(this.endPoint, this.startPoint, length);
				},
				//returns overlap point of lines, or null
				intersection: function(otherLine) {
					if(this.isVertical())
					{
						if(otherLine.isVertical())
							return null;
						else if(otherLine.isHorizontal())
							return Line.intersectionVerticalHorizontal(this, otherLine);
						else
							return Line.intersectionVerticalAngled(this, otherLine);
					}
					else if(this.isHorizontal())
					{
						if(otherLine.isVertical())
							return Line.intersectionVerticalHorizontal(otherLine, this);
						else if(otherLine.isHorizontal())
							return null;
						else
							return Line.intersectionHorizontalAngled(this, otherLine);
					}
					else
					{
						if(otherLine.isVertical())
							return Line.intersectionVerticalAngled(otherLine, this);
						else if(otherLine.isHorizontal())
							return Line.intersectionHorizontalAngled(otherLine, this);
						else
							return Line.intersectionAngledAngled(this, otherLine);
					}
				},
				//returns list of nodes this line crossed into and out of again
				//does not include any nodes where line crosses an ancestor
				crossesNodes: function(topLevelNodes) {
					let results = [];
					let self = this;
					topLevelNodes.forEach(function(node) {
						if(self.crossesArea(node.absoluteArea))
							results.push(node);
						else if(node.nodes.length > 0)
							results = results.concat(self.crossesNodes(node.nodes));
					});
					return results;
				},
				//returns true if line crosses into and out of an area
				crossesArea: function(area) {
					if(area.containsPoint(this.startPoint))
						return false;
					if(area.containsPoint(this.endPoint))
						return false;
					const areaLines = area.edges();
					for(let i=0; i<areaLines.length; i++)
					{
						if(this.intersection(areaLines[i]) != null)
							return true;
					}
					return false;
				}
			};
		}
	};

	const Point = {
		//returns true if points are on horizontal line
		horizontal: function(pointA, pointB) {
			return (pointA.y == pointB.y);
		},
		//returns true if points are on vertical line
		vertical: function(pointA, pointB) {
			return (pointA.x == pointB.x);
		},
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
				},
				//deep copy of object
				copy: function() {
					return Point.create(this.x, this.y);
				},
				//returns true if coordinates are the same
				equals: function(otherPoint) {
					return (this.x == otherPoint.x && this.y == otherPoint.y);
				}
			};
		}
	};

	const Range = {
		//returns true if values are ordered min to max - equality is allowed
		ordered: function(a, b, c) {
			return (a <= b && b <= c);
		},
		//returns range object
		//will swap min/max to put them in correct order
		create: function(min, max=null) {
			if(max == null)
				max = min;
			else if(max < min)
			{
				const temp = max;
				max = min;
				min = temp;
			}
			return {
				min: min,
				max: max,
				//return middle of range
				middle: function() {
					return ((this.min + this.max) / 2);
				},
				span: function() {
					return (this.max - this.min);
				},
				//return true if value is within range
				includes: function(value) {
					return (this.min <= value && value <= this.max);
				},
				//returns the intersection between two ranges
				//returns null if there is no intersection
				intersect: function(otherRange) {
					let newMin = Math.max(this.min, otherRange.min);
					let newMax = Math.min(this.max, otherRange.max);
					if(newMin > newMax)
						return null;
					return Range.create(newMin, newMax);
				},
				//returns a range that covers everything in both ranges, even if they were not contiguous
				sum: function(otherRange) {
					return Range.create(
						Math.min(this.min, otherRange.min),
						Math.max(this.max, otherRange.max)
					);
				},
				//returns this range with the otherRange removed from it
				//if otherRange splits this range in twain, returns null
				minus: function(otherRange) {
					if(otherRange.min <= this.min && otherRange.max >= this.max)
						return null;
					if(otherRange.min <= this.min)
						return Range.create(otherRange.max + 1, this.max);
					if(otherRange.max >= this.max)
						return Range.create(this.min, otherRange.min - 1);
					return null;
				},
				//returns this range with the otherRange removed from it
				//if otherRange splits this range in twain, keep the part closest to neighborRange
				//if otherRange completely covers this range, returns null
				minusNear: function(otherRange, neighborRange) {
					let result = this.minus(otherRange);
					if(result != null)
						return result;
					//range is split
					if(Math.abs(this.min - neighborRange.middle()) < Math.abs(this.max - neighborRange.middle()))
						return Range.create(this.min, otherRange.min - 1);
					else
						return Range.create(otherRange.max + 1, this.max);
				},
				//returns this range with the otherRange removed from it
				//if otherRange splits this range in twain, keep the part farthest from neighborRange
				//if otherRange completely covers this range, returns null
				minusFar: function(otherRange, neighborRange) {
					let result = this.minus(otherRange);
					if(result != null)
						return result;
					//range is split
					if(Math.abs(this.min - neighborRange.middle()) > Math.abs(this.max - neighborRange.middle()))
						return Range.create(this.min, otherRange.min - 1);
					else
						return Range.create(otherRange.max + 1, this.max);
				},
				//returns true if min and max values are equal
				equals: function(otherRange) {
					return (this.min == otherRange.min && this.max == otherRange.max);
				},
				//returns true if this totally contains other
				//contains means otherRange sits inside this one - it does not match either boundary of this range
				contains: function(otherRange) {
					return (this.min < otherRange.min && this.max > otherRange.max);
				},
				clone: function() {
					return Range.create(this.min, this.max);
				}
			};
		}
	};

	const ArrowLine = {
		//returns ArrowLine object
		justLine: function(lineType) {
			return {
				leftArrowType: ArrowTypes.none,
				lineType: lineType,
				rightArrowType: ArrowTypes.none
			};
		},
		//parse raw arrow/line text and return ArrowLine object
		parse: function(text) {
			const [leftArrow, line, rightArrow] = ArrowTypes.splitDoubleHeadedArrow(text);
			return {
				leftArrowType: ArrowTypes.convert(leftArrow),
				lineType: LineTypes.convert(line),
				rightArrowType: ArrowTypes.convert(rightArrow)
			};
		}
	}

	const ArrowTypes = {
		none: 0,
		plainArrow: 1,
		filledArrow: 2,
		hollowArrow: 3,
		hollowDiamond: 4,
		filledDiamond: 5,
		singleBar: 6,
		doubleBar: 7,
		triTail: 8,
		cirleBar: 9,
		barTriTail: 10,
		circleTriTail: 11,
		//converts source arrow to arrow type
		convert: function(sourceArrow) {
			if(sourceArrow == null)
				return this.none;
			if(sourceArrow.length > 2)
				sourceArrow = sourceArrow.substring(sourceArrow.length-2);
			switch(sourceArrow)
			{
				case ":>": return this.hollowArrow;
				case "11": return this.doubleBar;
				case "01":
				case "10": return this.circleBar;
				case "1N": 
				case "N1": return this.barTriTail;
				case "0N": 
				case "N0": return this.circleTriTail;
			}
			if(sourceArrow.length > 1)
				sourceArrow = sourceArrow.substring(sourceArrow.length-1);
			switch(sourceArrow)
			{
				case ">": return this.filledArrow;
				case "D": return this.hollowArrow;
				case "o": return this.hollowDiamond;
				case "+": return this.filledDiamond;
				case "1": return this.singleBar;
				case "N": return this.triTail;
			}
			return this.none;
		},
		//return [arrow-to-left, arrow-to-right], but with both arrows pointing to the right now
		//return null in a slot if that arrow does not exist
		splitDoubleHeadedArrow: function(arrowText) {
			let left = null;
			let line = null;
			let right = null;
			if(arrowText.indexOf("--") > -1)
			{
				line = "--";
				[left, right] = arrowText.split("--");
			}
			else
			{
				let matches = arrowText.match(/^(.*)(\=|\*|\-)(.*)$/);
				if(matches != null)
				{
					left = matches[1];
					line = matches[2];
					right = matches[3];
				}
			}
			if(left == "")
				left = null;
			if(right == "")
				right = null;
			if(left != null)
				left = line + Text.reverse(left).replace("<", ">");
			if(right != null)
				right = line + right;
			return [left, line, right];
		}
	};

	const LineTypes = {
		solid: 1,
		dashed: 2,
		dotted: 3,
		//converts source arrow to line type
		convert: function(sourceArrow) {
			if(sourceArrow.length > 2)
				sourceArrow = sourceArrow.substring(0, 2);
			if(sourceArrow == "--")
				return this.dashed;
			if(sourceArrow.length > 1)
				sourceArrow = sourceArrow.substring(0, 1);
			switch(sourceArrow)
			{
				case "*": return this.dotted;
				case "=": return this.dashed;
				case "-": return this.solid;
			}
			return this.solid;
		}
	};
	function updateCanvas(canvasElement, source) {
		const context = canvasElement.getContext('2d');

		const nodes = convertLayoutToNodes(source, context);
		let maxDepth = 1;
		//calculate final locations
		//find max depth of diagram
		nodes.forEach(function(node) {
			node.setAbsoluteAreas(pinker.config.canvasPadding, pinker.config.canvasPadding);
			maxDepth = Math.max(maxDepth, node.getMaxDepth());
		});		

		let dimensions = calculateCanvasDimensions(nodes);
		dimensions.width += pinker.config.canvasPadding * 2;
		dimensions.height += pinker.config.canvasPadding * 2;
		canvasElement.setAttribute("width", dimensions.width);
		canvasElement.setAttribute("height", dimensions.height);
		
		//fill background
		context.fillStyle = pinker.config.backgroundColor;
		context.fillRect(0, 0, dimensions.width, dimensions.height);

		//draw nodes before causing errors with arrows
		drawNodes(nodes, maxDepth, context);

		//calculate and draw lines
		const lines = (pinker.config.useSmartArrows) ? SmartArrows.convertRelationsToLines(source, nodes) : convertRelationsToLines(source, nodes);
		drawLines(lines, context);
	}

	function drawLines(lines, context) {
		lines.forEach(function(line) {
			drawLine(line.startPoint, line.endPoint, line.arrowLine.lineType, context);
			drawArrows(line.startPoint, line.endPoint, line.arrowLine.leftArrowType, line.arrowLine.rightArrowType, context);
			StrategyPlaceLineLabels.apply(line, context);
		});
	}

	function drawNodes(nodes, maxDepth, context) {
		nodes.forEach(function(node) {
			drawNode(node, maxDepth, context);
		});
	}

	function drawNode(node, maxDepth, context) {
		const paddingPoint = Point.create(pinker.config.labelPadding);
		const doublePadding = pinker.config.labelPadding * 2;
		const lineWeight = pinker.config.lineWeight + ((maxDepth-1) * 0.33);
		
		//outline node
		node.absoluteArea.outline(null, pinker.config.lineColor, lineWeight, context);

		//label area
		switch(node.labelLayout.type)
		{
			case LabelLayout.types.text: 
				break;
			case LabelLayout.types.header:
				node.labelArea.fillAndOutline(node.absoluteArea.point(), pinker.config.shadeColor, pinker.config.lineColor, lineWeight, context);
				break;
		}
		context.font = pinker.config.font();
		const labelPoint = node.absoluteArea.point().plus(node.labelArea.point()).plus(paddingPoint);
		node.labelLayout.drawCentered(labelPoint, node.labelArea.width - doublePadding, node.labelArea.height - doublePadding, context);
		
		//define area
		if(node.defineLayout != null)
		{
			node.defineArea.outline(node.absoluteArea.point(), pinker.config.lineColor, lineWeight, context);
			const definePoint = node.absoluteArea.point().plus(node.defineArea.point()).plus(paddingPoint);
			const areaMinX = node.absoluteArea.x;
			const areaMaxX = areaMinX + node.defineArea.width;
			node.defineLayout.draw(definePoint, areaMinX, areaMaxX, context);
		}

		//node area
		drawNodes(node.nodes, maxDepth - 1, context);
	}

	function convertLayoutToNodes(source, context, path=null) {
		if(source.layout == null)
			return [];
		path = source.appendToPath(path);
		let rowIndex = 0;
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
				const doubleLabelPadding = pinker.config.labelPadding * 2;
				const doubleScopePadding = pinker.config.scopePadding * 2;
				const isRightAlign = (index >= leftAlignCount);
				
				let node = Node.create(layoutRecord.label, layoutRecord.alias, path, isRightAlign);
				node.rowIndex = rowIndex;

				const relatedSource = source.findSource(layoutRecord.label, layoutRecord.alias);
				let relatedDefine = null;
				let nestedNodes = [];
				if(relatedSource != null)
				{
					relatedDefine = relatedSource.define;
					nestedNodes = convertLayoutToNodes(relatedSource, context, path);
					nestedNodes.forEach(function(nestedNode) {
						nestedNode.parentNode = node;
					});
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
				let width = node.labelLayout.width + doubleLabelPadding;
				let height = node.labelLayout.height + doubleLabelPadding;
				node.setRelativeArea(x, y, width, height);
				node.labelArea = Area.create(0, 0, width, height);

				//add define area
				if(relatedDefine != null)
				{
					node.defineLayout = DefineLayout.parse(relatedDefine, context);
					node.updateWidth(node.defineLayout.width + doubleLabelPadding);
					node.defineArea = Area.create(0, node.relativeArea.height, node.relativeArea.width, node.defineLayout.height + doubleLabelPadding);
					node.relativeArea.height += node.defineArea.height;
				}

				//add node area
				if(nestedNodes.length > 0)
				{
					node.nodes = nestedNodes;
					const nodeDimensions = calculateCanvasDimensions(nestedNodes);
					node.updateWidth(nodeDimensions.width + doubleScopePadding);
					node.nodeArea = Area.create(0, node.relativeArea.height, node.relativeArea.width, nodeDimensions.height + doubleScopePadding);
					node.nodeArea.paddingLeft = node.nodeArea.paddingRight = ((node.nodeArea.width - nodeDimensions.width) / 2);
					node.nodeArea.paddingTop = node.nodeArea.paddingBottom = ((node.nodeArea.height - nodeDimensions.height) / 2);
					node.relativeArea.height += node.nodeArea.height;
				}

				nodes.push(node);

				x += node.relativeArea.width + pinker.config.scopeMargin;
				rowHeight = Math.max(rowHeight, node.relativeArea.height);
				index++;
			});
			y += rowHeight + pinker.config.scopeMargin;
			nodeRows.push(nodes);
			rowIndex++;
			allNodes = allNodes.concat(nodes);
		});
		//apply resizing rules
		if(pinker.config.favorUniformNodeSizes)
		{
			makeSiblingNodesUniformSizes(allNodes);
		}
		//apply right alignment
		let maxXs = allNodes.map(node => node.relativeArea.right());
		let maxX = Math.max(...maxXs);
		nodeRows.forEach(function(nodes) {
			let right = maxX;
			for(let i=nodes.length-1; i>=0; i--)
			{
				let node = nodes[i];
				if(!node.isRightAlign)
					break;
				node.relativeArea.x = right - node.relativeArea.width;
				right -= (node.relativeArea.width + pinker.config.scopeMargin);
			}
		});
		return allNodes;
	}

	//if nodes are close in size, make them all the same size - adjust placements
	//if nodes are wildly different in size, divide them into subsets of sizes
	function makeSiblingNodesUniformSizes(allNodes) {
		if(allNodes.length == 0)
			return;
		const variance = 0.3;
		//widths
		let nodesByWidth = allNodes.slice(0);
		nodesByWidth.sort(function(a, b) { return b.relativeArea.width - a.relativeArea.width; }); //sort into descending width order
		let maxWidth = nodesByWidth[0].relativeArea.width;
		for(let i=0; i<nodesByWidth.length; i++)
		{
			let node = nodesByWidth[i];
			let minWidth = node.relativeArea.width;
			if(1 - (minWidth / maxWidth) <= variance) //widen this node to match max
			{
				let delta = node.updateWidth(maxWidth);
				allNodes.forEach(function(otherNode) {
					if(otherNode.rowIndex != node.rowIndex)
						return;
					if(otherNode.relativeArea.left() <= node.relativeArea.left())
						return;
					otherNode.relativeArea.x += delta;
				});
			}
			else //set a new max width
			{
				maxWidth = minWidth;
			}
		}
		//heights
		let maxHeightsPerRow = []; //array[rowIndex] = max height of row
		let newMaxHeightsPerRow = [];
		allNodes.forEach(function(node) {
			while(maxHeightsPerRow.length <= node.rowIndex)
			{
				maxHeightsPerRow.push(0);
				newMaxHeightsPerRow.push(0);
			}
			maxHeightsPerRow[node.rowIndex] = Math.max(maxHeightsPerRow[node.rowIndex], node.relativeArea.height);
		});
		let nodesByHeight = allNodes.slice(0);
		nodesByHeight.sort(function(a, b) { return b.relativeArea.height - a.relativeArea.height; }); //sort into descending height order
		let maxHeight = nodesByHeight[0].relativeArea.height;
		for(let i=0; i<nodesByHeight.length; i++)
		{
			let node = nodesByHeight[i];
			let minHeight = node.relativeArea.height;
			if(1 - (minHeight / maxHeight) <= variance) //heighten this node to match max
			{
				node.updateHeight(maxHeight);
				newMaxHeightsPerRow[node.rowIndex] = Math.max(newMaxHeightsPerRow[node.rowIndex], node.relativeArea.height);
			}
			else //set a new max height
			{
				maxHeight = minHeight;
			}
		}
		for(let rowIndex=0; rowIndex<maxHeightsPerRow.length; rowIndex++)
		{
			if(maxHeightsPerRow[rowIndex] >= newMaxHeightsPerRow[rowIndex])
				continue;
			let delta = newMaxHeightsPerRow[rowIndex] - maxHeightsPerRow[rowIndex];
			allNodes.forEach(function(node) {
				if(node.rowIndex <= rowIndex)
					return;
				node.relativeArea.y += delta;
			});
		}
	}

	//returns array of lines, ready to be drawn
	function convertRelationsToLines(source, allNodes) {
		let lines = convertRelationsToPossibleLines(source, allNodes);
		lines = unCoincidePossibleLines(lines);
		return lines
	}

	//returns array of lines and possible lines
	function convertRelationsToPossibleLines(source, allNodes, path=null) {
		let lines = [];
		path = source.appendToPath(path);
		if(source.relate != null)
		{
			source.relate.records.forEach(function(relation) {
				const startNode = FindNode.findNode(allNodes, relation.startLabel, path);
				const endNode = FindNode.findNode(allNodes, relation.endLabel, path);
				if(startNode == null || endNode == null)
					return;
				const line = arrangeLineBetweenNodes(startNode, endNode, allNodes, relation);
				lines.push(line);
			});
		}
		source.nestedSources.forEach(function(nestedSource) {
			let nestedLines = convertRelationsToPossibleLines(nestedSource, allNodes, path);
			lines = lines.concat(nestedLines);
		});
		return lines;
	}

	//returns new array of lines - all possible lines have been converted to lines
	//horizontal/vertical lines that coincide have been separated
	//seeming-duplication of SmartArrow logic is intentional: feature is important enough to create simpler version here
	function unCoincidePossibleLines(lines) {
		const sets = getCoincidentPossibleLineSets(lines);
		sets.forEach(function(set) {
			//TODO: looks like if objects are generalized to start/end/min/max then this logic could be done just once
			if(set.length == 1)
				return;
			if(set[0].isHorizontal)
			{
				//all paths could have a different range of possible positions
				//for now, try the easiest math and just don't move the paths if that doesn't work
				let rangeY = set[0].rangeY();
				set.forEach(function(line) {
					rangeY = rangeY.sum(line.rangeY());
				});
				const unitSpan = (rangeY.span() / (set.length + 1));
				let y = rangeY.min + unitSpan;
				set.forEach(function(line) {
					if(!line.rangeY().includes(y))
						return;
					line.minY = line.maxY = y;
					y += unitSpan;
				});
			}
			else
			{
				let rangeX = set[0].rangeX();
				set.forEach(function(line) {
					rangeX = rangeX.sum(line.rangeX());
				});
				const unitSpan = (rangeX.span() / (set.length + 1));
				let x = rangeX.min + unitSpan;
				set.forEach(function(line) {
					if(!line.rangeX().includes(x))
						return;
					line.minX = line.maxX = x;
					x += unitSpan;
				});
			}
		});
		const simpleLines = [];
		lines.forEach(function(line) {
			if(line.isLine)
				simpleLines.push(line);
		});
		sets.forEach(function(set) {
			set.forEach(function(line) {
				simpleLines.push(line.toLine());
			});
		});
		return simpleLines;
	}

	//divide possible lines into sets where a set contains possible lines that are coincident
	//note: partially coincident paths count, so it is possible to have a set where not every pair of paths is coincident
	//TODO: looks like this particular function can be shared - filter before passing in list, and object must implement isCoincident
	function getCoincidentPossibleLineSets(lines) {
		const sets = []; //each element is an array representing one set
		lines.forEach(function(line) {
			if(!line.isPossibleLine)
				return;
			let foundMatch = false;
			for(let s=0; s<sets.length; s++)
			{
				const set = sets[s];
				for(let i=0; i<set.length; i++)
				{
					if(line.isCoincident(set[i]))
					{
						set.push(line);
						foundMatch = true;
						break;
					}
				}
				if(foundMatch)
					break;
			}
			if(!foundMatch)
			{
				sets.push([line]);
			}
		});
		return sets;
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

	//returns line or possible line connecting nodes
	//TODO: is allNodes being used anymore?
	function arrangeLineBetweenNodes(startNode, endNode, allNodes, relation) {
		const startArea = startNode.absoluteArea;
		const endArea = endNode.absoluteArea;

		let line = null;
		if(startArea.isAbove(endArea))
		{
			line = PossibleLine.createVertical(
				startArea.bottom(), 
				endArea.top(), 
				Math.max(startArea.left(), endArea.left()), 
				Math.min(startArea.right(), endArea.right())
				);
		}
		else if(startArea.isBelow(endArea))
		{
			line = PossibleLine.createVertical(
				startArea.top(), 
				endArea.bottom(), 
				Math.max(startArea.left(), endArea.left()), 
				Math.min(startArea.right(), endArea.right())
				);
		}
		else if(startArea.isLeftOf(endArea))
		{
			line = PossibleLine.createHorizontal(
				startArea.right(), 
				endArea.left(), 
				Math.max(startArea.top(), endArea.top()), 
				Math.min(
					(startNode.labelLayout.isHeader()) ? startNode.labelArea.bottom(startNode.absoluteArea.point()) : startArea.bottom(),
					(endNode.labelLayout.isHeader())   ? endNode.labelArea.bottom(endNode.absoluteArea.point())     : endArea.bottom()
					)
				);
		}
		else if(startArea.isRightOf(endArea))
		{
			line = PossibleLine.createHorizontal(
				startArea.left(), 
				endArea.right(), 
				Math.max(startArea.top(), endArea.top()), 
				Math.min(
					(startNode.labelLayout.isHeader()) ? startNode.labelArea.bottom(startNode.absoluteArea.point()) : startArea.bottom(),
					(endNode.labelLayout.isHeader())   ? endNode.labelArea.bottom(endNode.absoluteArea.point())     : endArea.bottom()
					)
				);
		}
		
		if(line == null)
			return simpleLineBetweenNodes(startNode, endNode, allNodes, relation);

		line.arrowLine = ArrowLine.parse(relation.arrowType);
		line.startLabel = relation.lineLabelStart;
		line.middleLabel = relation.lineLabelMiddle;
		line.endLabel = relation.lineLabelEnd;
		return line;
	}

	//returns simplest line connecting nodes
	function simpleLineBetweenNodes(startNode, endNode, allNodes, relation) {
		const startArea = startNode.absoluteArea;
		const endArea = endNode.absoluteArea;
		let start = startArea.center();
		let end = endArea.center();
		let referenceLine = Line.create(start, end);
		start = startNode.absoluteArea.getIntersection(referenceLine);
		end = endNode.absoluteArea.getIntersection(referenceLine);
		//stop-gap for errors - better to show some line than none
		if(start == null)
			start = startArea.center();
		if(end == null)
			end = endArea.center();
		const line = Line.create(start, end);
		line.arrowLine = ArrowLine.parse(relation.arrowType);
		line.startLabel = relation.lineLabelStart;
		line.middleLabel = relation.lineLabelMiddle;
		line.endLabel = relation.lineLabelEnd;
		return line;
	}
	const Triangle = {
		equilateralAngle: Math.PI/6, //half of top corner angle
		rightAngle: Math.PI/2, //90 degrees in radians
		rotateAroundPoint: function(center, length, startingAngle, deltaAngle) {
			return Point.create(
				center.x - length * Math.cos(startingAngle - deltaAngle), 
				center.y - length * Math.sin(startingAngle - deltaAngle)
			);
		},
		//returns isosceles triangle object
		createIsosceles: function(topPoint, angle, area) {
			const baseToHeightRatio = 1.5;
			const base = Math.sqrt((2 * area) / baseToHeightRatio);
			const height = base * baseToHeightRatio;
			const triangleSideLength = Math.sqrt(Math.pow(base/2, 2) + Math.pow(height, 2));
			const isoscelesAngle = Math.asin((base / 2) / triangleSideLength); //half of top corner angle
			const basePointA = this.rotateAroundPoint(topPoint, triangleSideLength, angle, isoscelesAngle*-1);
			const basePointB = this.rotateAroundPoint(topPoint, triangleSideLength, angle, isoscelesAngle);
			return {
				topPoint: topPoint,
				basePointA: basePointA,
				basePointB: basePointB,
				base: base,
				height: height,
				sideLength: triangleSideLength,
				centerAngle: angle
			};
		},
		getEquilateralSideLength: function(area) {
			return Math.sqrt(area * 4 / Math.sqrt(3));
		},
		//returns equilateral triangle object
		createEquilateral: function(topPoint, angle, area) {
			const triangleSideLength = this.getEquilateralSideLength(area);
			const basePointA = this.rotateAroundPoint(topPoint, triangleSideLength, angle, this.equilateralAngle*-1);
			const basePointB = this.rotateAroundPoint(topPoint, triangleSideLength, angle, this.equilateralAngle);
			return {
				topPoint: topPoint,
				basePointA: basePointA,
				basePointB: basePointB,
				base: triangleSideLength,
				height: (Math.sqrt(3) / 2) * triangleSideLength,
				sideLength: triangleSideLength,
				centerAngle: angle
			};
		},
		//returns equilateral triangle with base at topPoint
		createReverseEquilateral: function(topPoint, angle, area) {
			const triangleSideLength = this.getEquilateralSideLength(area);
			const basePointA = this.rotateAroundPoint(topPoint, triangleSideLength/2, angle, this.rightAngle*-1);
			const basePointB = this.rotateAroundPoint(topPoint, triangleSideLength/2, angle, this.rightAngle);
			const reverseTopPoint = this.rotateAroundPoint(basePointA, triangleSideLength, angle, this.equilateralAngle);
			return {
				topPoint: reverseTopPoint,
				basePointA: basePointA,
				basePointB: basePointB,
				base: triangleSideLength,
				height: (Math.sqrt(3) / 2) * triangleSideLength,
				sideLength: triangleSideLength,
				centerAngle: angle
			};
		}
	};

	const Diamond = {
		//returns diamond object
		create: function(topPoint, angle, area) {
			const triangle = Triangle.createEquilateral(topPoint, angle, area/2);
			const bottomPoint = Triangle.rotateAroundPoint(triangle.basePointA, triangle.sideLength, angle, Triangle.equilateralAngle);
			return {
				topPoint: topPoint,
				cornerA: triangle.basePointA,
				cornerB: triangle.basePointB,
				bottomPoint: bottomPoint,
				sideLength: triangle.sideLength,
				centerAngle: angle
			};
		}
	};

	const Draw = {
		setLineType: function(lineType, context) {
			switch(lineType)
			{
				case LineTypes.solid: 
					this.setSolidLine(context);
					return;
				case LineTypes.dashed: 
					this.setDashedLine(pinker.config.lineDashLength, pinker.config.lineDashSpacing, context); 
					return;
				case LineTypes.dotted: 
					this.setDottedLine(context); 
					return;
			}
		},
		setSolidLine: function(context) {
			context.setLineDash([]); 
		},
		setDashedLine: function(dashLength, dashSpacing, context) {
			context.setLineDash([dashLength, dashSpacing]); 
		},
		setDottedLine: function(context) {
			context.setLineDash([2, 3]); 
		},
		//will draw figure from start point through to end point - does not close figure
		fillAndOutlineShape: function(points, fillColor, lineColor, context) {
			this.fillShape(points, fillColor, context);
			this.outlineShape(points, lineColor, context);
		},
		fillShape: function(points, fillColor, context) {
			context.fillStyle = fillColor;
			this.makeContextPath(points, context);
			context.fill();
		},
		outlineShape: function(points, lineColor, context) {
			context.strokeStyle = lineColor;
			this.makeContextPath(points, context);
			context.stroke();
		},
		fillAndOutlineCircle: function(center, radius, fillColor, lineColor, context) {
			this.fillCircle(center, radius, fillColor, context);
			this.outlineCircle(center, radius, lineColor, context);
		},
		fillCircle: function(center, radius, fillColor, context) {
			context.fillStyle = fillColor;
			context.beginPath();
			context.arc(center.x, center.y, radius, 0, Math.PI*2);
			context.fill();
		},
		outlineCircle: function(center, radius, lineColor, context) {
			context.strokeStyle = lineColor;
			context.beginPath();
			context.arc(center.x, center.y, radius, 0, Math.PI*2);
			context.stroke();
		},
		//does not close figure
		makeContextPath: function(points, context) {
			context.beginPath();
			context.moveTo(points[0].x, points[0].y);
			for(let i=1; i<points.length; i++)
			{
				context.lineTo(points[i].x, points[i].y);
			}
		},
		//draw text left-aligned to and above point
		textLeftAlignedAbove: function(text, point, context) {
			context.fillStyle = pinker.config.lineColor;
			context.font = pinker.config.font();
			context.fillText(text, point.x, point.y);
		},
		//draw text left-aligned to and below point
		textLeftAlignedBelow: function(text, point, context) {
			this.textLeftAlignedAbove(text, Point.create(point.x, point.y + pinker.config.estimateFontHeight()), context);
		},
		//draw text right-aligned to and above point
		textRightAlignedAbove: function(text, point, context) {
			this.textLeftAlignedAbove(text, Point.create(point.x - context.measureText(text).width, point.y), context);
		},
		//draw text right-aligned to and below point
		textRightAlignedBelow: function(text, point, context) {
			this.textLeftAlignedBelow(text, Point.create(point.x - context.measureText(text).width, point.y), context);
		},
		//draw text middle-aligned to and above points
		textMiddleAlignedAbove: function(text, pointA, pointB, context) {
			const centerPoint = Point.create((pointA.x + pointB.x) / 2, (pointA.y + pointB.y) / 2);
			this.textLeftAlignedAbove(text, Point.create(centerPoint.x - context.measureText(text).width/2, centerPoint.y), context);
		},
		//draw text middle-aligned to and below points
		textMiddleAlignedBelow: function(text, pointA, pointB, context) {
			const centerPoint = Point.create((pointA.x + pointB.x) / 2, (pointA.y + pointB.y) / 2);
			this.textLeftAlignedBelow(text, Point.create(centerPoint.x - context.measureText(text).width/2, centerPoint.y), context);
		}
	};

	const StrategyPlaceLineLabels = {
		apply: function(line, context) {
			const hasStartLabel = !Text.isBlank(line.startLabel);
			const hasMiddleLabel = !Text.isBlank(line.middleLabel);
			const hasEndLabel = !Text.isBlank(line.endLabel);
			context.font = pinker.config.font();
			const startLength = context.measureText(line.startLabel).width;
			const middleLength = context.measureText(line.middleLabel).width;
			const endLength = context.measureText(line.endLabel).width;
			//no labels
			if(!hasStartLabel && !hasMiddleLabel && !hasEndLabel)
				return;
			
			if(line.isVertical())
			{
				this.applyToVertical(line, context);
				return;
			}
			if(line.isHorizontal())
			{
				this.applyToHorizontal(line, context);
				return;
			}
			this.applyToDiagonal(line, context);
		},
		//apply labels to vertical line
		applyToVertical: function(line, context) {
			textLine = this.getTextAreaLine(line);
			const margin = 5;
			textLine.startPoint.x += margin;
			textLine.endPoint.x += margin;

			if(!Text.isBlank(line.startLabel))
				if(textLine.startPoint.y < textLine.endPoint.y)
					Draw.textLeftAlignedBelow(line.startLabel, textLine.startPoint, context);
				else
					Draw.textLeftAlignedAbove(line.startLabel, textLine.startPoint, context);

			if(!Text.isBlank(line.middleLabel))
				Draw.textLeftAlignedAbove(line.middleLabel, textLine.midPoint(), context);

			if(!Text.isBlank(line.endLabel))
				if(textLine.endPoint.y < textLine.startPoint.y)
					Draw.textLeftAlignedBelow(line.endLabel, textLine.endPoint, context);
				else
					Draw.textLeftAlignedAbove(line.endLabel, textLine.endPoint, context);
		},
		//apply labels to horizontal line
		applyToHorizontal: function(line, context) {
			context.font = pinker.config.font();
			const margin = 5;
			let topLine = this.getTextAreaLine(line);
			let bottomLine = topLine.copy();
			topLine.startPoint.y -= margin;
			topLine.endPoint.y -= margin;
			bottomLine.startPoint.y += margin;
			bottomLine.endPoint.y += margin;
			if(topLine.startPoint.x < topLine.endPoint.x)
			{
				if(!Text.isBlank(line.startLabel))
				{
					Draw.textLeftAlignedAbove(line.startLabel, topLine.startPoint, context);
					topLine.startPoint.x += context.measureText(line.startLabel).width + margin;
				}
				if(!Text.isBlank(line.endLabel))
				{
					let endLength = context.measureText(line.endLabel).width;
					if(endLength <= Line.length(topLine.startPoint, topLine.endPoint))
					{
						Draw.textRightAlignedAbove(line.endLabel, topLine.endPoint, context);
						topLine.endPoint.x -= context.measureText(line.endLabel).width + margin;
					}
					else
					{
						Draw.textRightAlignedBelow(line.endLabel, bottomLine.endPoint, context);
						bottomLine.endPoint.x -= context.measureText(line.endLabel).width + margin;
					}
				}
				if(!Text.isBlank(line.middleLabel))
				{
					const middleLength = context.measureText(line.middleLabel).width;
					const topLength = topLine.length();
					const bottomLength = bottomLine.length();
					if(middleLength < topLength)
						Draw.textMiddleAlignedAbove(line.middleLabel, topLine.startPoint, topLine.endPoint, context);
					else if(middleLength < bottomLength)
						Draw.textMiddleAlignedBelow(line.middleLabel, bottomLine.startPoint, bottomLine.endPoint, context);
					else if(topLength >= bottomLength)
						Draw.textLeftAlignedAbove(line.middleLabel, topLine.startPoint, context);
					else
						Draw.textRightAlignedBelow(line.middleLabel, bottomLine.endPoint, context);
				}
			}
			else
			{
				if(!Text.isBlank(line.startLabel))
				{
					Draw.textRightAlignedAbove(line.startLabel, topLine.startPoint, context);
					topLine.startPoint.x -= context.measureText(line.startLabel).width + margin;
				}
				if(!Text.isBlank(line.endLabel))
				{
					let endLength = context.measureText(line.endLabel).width;
					if(endLength <= topLine.length())
					{
						Draw.textLeftAlignedAbove(line.endLabel, topLine.endPoint, context);
						topLine.endPoint.x += context.measureText(line.endLabel).width + margin;
					}
					else
					{
						Draw.textLeftAlignedBelow(line.endLabel, bottomLine.endPoint, context);
						bottomLine.endPoint.x += context.measureText(line.endLabel).width + margin;
					}
				}
				if(!Text.isBlank(line.middleLabel))
				{
					const middleLength = context.measureText(line.middleLabel).width;
					const topLength = topLine.length();
					const bottomLength = bottomLine.length();
					if(middleLength < topLength)
						Draw.textMiddleAlignedAbove(line.middleLabel, topLine.endPoint, topLine.startPoint, context);
					else if(middleLength < bottomLength)
						Draw.textMiddleAlignedBelow(line.middleLabel, bottomLine.endPoint, bottomLine.startPoint, context);
					else if(topLength >= bottomLength)
						Draw.textRightAlignedAbove(line.middleLabel, topLine.startPoint, context);
					else
						Draw.textLeftAlignedBelow(line.middleLabel, bottomLine.endPoint, context);
				}
			}
		},
		//apply labels to diagonal line
		applyToDiagonal: function(line, context) {
			const margin = 5;
			let textLine = this.getTextAreaLine(line);
			if(textLine.isDiagonalLeftUp() || textLine.isDiagonalRightDown())
			{
				//place labels to right of line, left aligned
				textLine.startPoint.x += margin;
				textLine.endPoint.x += margin;

				if(!Text.isBlank(line.startLabel))
					Draw.textLeftAlignedAbove(line.startLabel, textLine.startPoint, context);
				if(!Text.isBlank(line.middleLabel))
					Draw.textLeftAlignedAbove(line.middleLabel, textLine.midPoint(), context);
				if(!Text.isBlank(line.endLabel))
					Draw.textLeftAlignedAbove(line.endLabel, textLine.endPoint, context);
			}
			else
			{
				//place labels to left of line, right aligned
				textLine.startPoint.x -= margin;
				textLine.endPoint.x -= margin;

				if(!Text.isBlank(line.startLabel))
					Draw.textRightAlignedAbove(line.startLabel, textLine.startPoint, context);
				if(!Text.isBlank(line.middleLabel))
					Draw.textRightAlignedAbove(line.middleLabel, textLine.midPoint(), context);
				if(!Text.isBlank(line.endLabel))
					Draw.textRightAlignedAbove(line.endLabel, textLine.endPoint, context);
			}
		},
		//returns new line, shortened for arrow heads and margins
		getTextAreaLine: function(line) {
			const margin = 5;
			const estimateArrowHeadLength = Math.sqrt(pinker.config.arrowHeadArea);
			let newLine = line.copy();
			let shortenStart = margin;
			let shortenEnd = margin;
			if(line.arrowLine.leftArrowType > 0)
				shortenStart = estimateArrowHeadLength;
			if(line.arrowLine.rightArrowType > 0)
				shortenEnd = estimateArrowHeadLength;
			newLine.shortenFromStart(shortenStart);
			newLine.shortenFromEnd(shortenEnd);
			return newLine;
		}
	};

	function drawLine(start, end, lineType, context) {
		if(start == null || end == null)
		{
			displayError(`drawLine: start and/or end point is null. Start: ${start} End: ${end}.`);
			return;
		}
		context.lineWidth = pinker.config.lineWeight;
		Draw.setLineType(lineType, context);
		Draw.outlineShape([start, end], pinker.config.lineColor, context);
	}

	function drawArrows(start, end, leftArrowType, rightArrowType, context) {
		if(start == null || end == null)
		{
			displayError(`drawArrows: start and/or end point is null. Start: ${start} End: ${end}.`);
			return;
		}
		drawArrow(start, end, rightArrowType, context);
		drawArrow(end, start, leftArrowType, context);
	}

	function drawArrow(start, end, arrowType, context)
	{
		if(arrowType == ArrowTypes.none)
			return;

		const headArea = pinker.config.arrowHeadArea;
		const angle = Math.atan2(end.y - start.y, end.x - start.x);
		context.lineWidth = pinker.config.lineWeight;
		Draw.setSolidLine(context);
		
		let triangle = null;
		let diamond = null;
		let points = null;
		
		switch(arrowType)
		{
			case ArrowTypes.filledArrow:
				triangle = Triangle.createIsosceles(end, angle, pinker.config.arrowHeadArea);
				points = [end, triangle.basePointA, triangle.basePointB, end];
				Draw.fillShape(points, pinker.config.lineColor, context);
				break;
			case ArrowTypes.plainArrow:
				triangle = Triangle.createEquilateral(end, angle, pinker.config.arrowHeadArea);
				points = [end, triangle.basePointA, triangle.basePointB, end];
				Draw.fillShape(points, pinker.config.lineColor, context);
				break;
			case ArrowTypes.hollowArrow:
				triangle = Triangle.createEquilateral(end, angle, pinker.config.arrowHeadArea);
				points = [end, triangle.basePointA, triangle.basePointB, end];
				Draw.fillAndOutlineShape(points, pinker.config.backgroundColor, pinker.config.lineColor, context);
				break;
			case ArrowTypes.hollowDiamond:
				diamond = Diamond.create(end, angle, headArea);
				points = [end, diamond.cornerA, diamond.bottomPoint, diamond.cornerB, end];
				Draw.fillAndOutlineShape(points, pinker.config.backgroundColor, pinker.config.lineColor, context);
				break;
			case ArrowTypes.filledDiamond:
				diamond = Diamond.create(end, angle, headArea);
				points = [end, diamond.cornerA, diamond.bottomPoint, diamond.cornerB, end];
				Draw.fillShape(points, pinker.config.lineColor, context);
				break;
			case ArrowTypes.singleBar:
				drawHalfBarArrow(end, angle, context);
				break;
			case ArrowTypes.doubleBar:
				drawDoubleBarArrow(end, angle, context);
				break;
			case ArrowTypes.triTail:
				drawTriTailArrow(end, angle, context);
				break;
			case ArrowTypes.barTriTail:
				drawTriTailArrow(end, angle, context);
				drawBarArrow(end, angle, context);
				break;
			case ArrowTypes.circleBar:
				drawHalfBarArrow(end, angle, context);
				drawCircleArrow(end, angle, context);
				break;
			case ArrowTypes.circleTriTail:
				drawTriTailArrow(end, angle, context);
				drawCircleArrow(end, angle, context);
				break;
		}
	}

	function drawTriTailArrow(end, angle, context) {
		const reverseTriangle = Triangle.createReverseEquilateral(end, angle, pinker.config.arrowHeadArea);
		const points = [reverseTriangle.basePointA, reverseTriangle.topPoint, reverseTriangle.basePointB];
		Draw.outlineShape(points, pinker.config.lineColor, context);
	}

	function drawDoubleBarArrow(end, angle, context) {
		drawBarArrow(end, angle, context);
		drawHalfBarArrow(end, angle, context);
	}

	function drawBarArrow(end, angle, context) {
		const triangle = Triangle.createEquilateral(end, angle, pinker.config.arrowHeadArea);
		const points = [triangle.basePointA, triangle.basePointB];
		Draw.outlineShape(points, pinker.config.lineColor, context);
	}

	function drawHalfBarArrow(end, angle, context) {
		const triangle = Triangle.createEquilateral(end, angle, pinker.config.arrowHeadArea);
		const barPointA = Triangle.rotateAroundPoint(triangle.basePointA, triangle.height/2, angle, Triangle.rightAngle*2);
		const barPointB = Triangle.rotateAroundPoint(triangle.basePointB, triangle.height/2, angle, Triangle.rightAngle*2*-1);
		Draw.outlineShape([barPointA, barPointB], pinker.config.lineColor, context);
	}

	function drawCircleArrow(end, angle, context) {
		const triangle = Triangle.createEquilateral(end, angle, pinker.config.arrowHeadArea);
		const radius = triangle.sideLength*0.4;
		const center = Triangle.rotateAroundPoint(triangle.topPoint, triangle.height+radius, angle, 0);
		Draw.fillAndOutlineCircle(center, radius, pinker.config.backgroundColor, pinker.config.lineColor, context);
	}
	const PossiblePaths = {
		//returns possible paths object
		create: function() {
			return {
				paths: [],
				isPossiblePaths: true
			};
		}
	};

	const Path = {
		//classification of Path shapes
		//at least, how the shape started - may become more complicated to route around nodes
		types: {
			// vertical or horizontal
			straight: 1,
			// -- a "C" shape
			//  | curlLeft, curlRight, curlOver, or curlUnder
			// -- default curls proceed clockwise
			curl: 2,
			// --- an "L" shape
			//   | elbowRightDown, elbowRightUp, elbowLeftDown, or elbowLeftUp
			//   |
			elbow: 3,
			// --- a "Z" shape
			//   | zigzagRightDown, zigzagRightUp, zigzagLeftDown, or zigzagLeftUp
			//   ---
			zigzag: 4
		},
		//returns path object
		//all lines are vertical or horizontal
		create: function(pathType, arrowLine, startNode, endNode, startsHorizontal) {
			return {
				points: [], //array of potential point objects
				type: pathType,
				arrowLine: arrowLine,
				startNode: startNode,
				endNode: endNode,
				startsHorizontal: startsHorizontal,
				isPath: true,
				//returns list of all the nodes that this path could overlap (enters and then leaves)
				//does not include any descendants of a crossed node
				//topLevelNodes: parent-less nodes, linking to all lower level nodes
				mightCrossNodes: function(topLevelNodes)
				{
					let results = [];
					let self = this;
					topLevelNodes.forEach(function(node) {
						if(self.mightCrossArea(node.absoluteArea))
							results.push(node);
						else if(node.nodes.length > 0)
							results = results.concat(self.mightCrossNodes(node.nodes));
					});					
					return results;
				},
				//returns true if path MIGHT cross the area (enter and then leave)
				//assumes all lines are horizontal or vertical
				mightCrossArea: function(area) {
					const startsWithinArea = this.possiblePointInArea(this.points[0], area);
					if(startsWithinArea)
						return false; //can't cross over if it starts inside
					const endsWithinArea = this.possiblePointInArea(this.points[this.points.length-1], area);
					if(endsWithinArea)
						return false; //can't cross over if it ends inside
					let isHorizontal = this.startsHorizontal;
					let entersArea = false;
					for(let i=1; i<this.points.length; i++)
					{
						if(this.possiblePointInArea(this.points[i], area))
							return true;
						if(this.possibleLineMightCrossArea(this.points[i-1], this.points[i], area, isHorizontal))
							return true;
						isHorizontal = !isHorizontal;
					}
					return false;
				},
				//returns true if possible line might cross area (enter and leave)
				//assumes all lines are horizontal or vertical
				possibleLineMightCrossArea: function(pointA, pointB, area, isHorizontal) {
					if(isHorizontal)
					{
						return (
							Math.min(pointA.rangeX.min, pointB.rangeX.min) <= area.left() 
							&& Math.max(pointA.rangeX.max, pointB.rangeX.max) >= area.right()
							&& pointA.rangeY.intersect(Range.create(area.top(), area.bottom())) != null
						);
					}
					else
					{
						return (
							Math.min(pointA.rangeY.min, pointB.rangeY.min) <= area.top() 
							&& Math.max(pointA.rangeY.max, pointB.rangeY.max) >= area.bottom()
							&& pointA.rangeX.intersect(Range.create(area.left(), area.right())) != null
						);
					}
				},
				//returns list of all the nodes that this path completely crosses (enters and then leaves)
				//does not include any descendants of a crossed node
				//topLevelNodes: parent-less nodes, linking to all lower level nodes
				crossesNodes: function(topLevelNodes) {
					let results = [];
					let self = this;
					topLevelNodes.forEach(function(node) {
						if(self.crossesArea(node.absoluteArea))
							results.push(node);
						else if(node.nodes.length > 0)
							results = results.concat(self.crossesNodes(node.nodes));
					});					
					return results;
				},
				//returns true if path MUST cross entirely across the area
				//assumes all lines are horizontal or vertical
				crossesArea: function(area) {
					const startsWithinArea = this.possiblePointInArea(this.points[0], area);
					if(startsWithinArea)
						return false; //can't cross over if it starts inside
					const endsWithinArea = this.possiblePointInArea(this.points[this.points.length-1], area);
					if(endsWithinArea)
						return false; //can't cross over if it ends inside
					let isHorizontal = this.startsHorizontal;
					let entersArea = false;
					for(let i=1; i<this.points.length; i++)
					{
						if(this.possiblePointInArea(this.points[i], area))
							return true;
						if(this.possibleLineCrossesArea(this.points[i-1], this.points[i], area, isHorizontal))
							return true;
						isHorizontal = !isHorizontal;
					}
					return false;
				},
				//returns true if possible line crosses entirely across area
				//assumes all lines are horizontal or vertical
				possibleLineCrossesArea: function(pointA, pointB, area, isHorizontal) {
					if(isHorizontal)
					{
						return (
							Math.min(pointA.rangeX.min, pointB.rangeX.min) <= area.left() 
							&& Math.max(pointA.rangeX.max, pointB.rangeX.max) >= area.right()
							&& pointA.rangeY.min >= area.top() && pointA.rangeY.max <= area.bottom()
						);
					}
					else
					{
						return (
							Math.min(pointA.rangeY.min, pointB.rangeY.min) <= area.top() 
							&& Math.max(pointA.rangeY.max, pointB.rangeY.max) >= area.bottom()
							&& pointA.rangeX.min >= area.left() && pointA.rangeX.max <= area.right()
						);
					}
				},
				//returns true if a possible point may lie inside the area (not just on the boundary)
				//TODO the "minus 1" may be too broad - can I check for range-exclusive?
				possiblePointInArea: function(point, area) {
					const intersectX = point.rangeX.intersect(Range.create(area.left() + 1, area.right() - 1));
					const intersectY = point.rangeY.intersect(Range.create(area.top() + 1, area.bottom() - 1));
					return (intersectX != null && intersectY != null);
				},
				//shrink path ranges to avoid these nodes
				//if a range shrinks to zero, set it to null and quit the whole method
				//returns false on failure, true on success
				avoid: function(nodes) {
					for(let n=0; n<nodes.length; n++)
					{
						let node = nodes[n];
						const nodeRangeX = Range.create(node.absoluteArea.left(), node.absoluteArea.right());
						const nodeRangeY = Range.create(node.absoluteArea.top(), node.absoluteArea.bottom());
						let isHorizontal = this.startsHorizontal;
						for(let p=1; p<this.points.length; p++)
						{
							let point = this.points[p];
							if(!this.mightCrossArea(node.absoluteArea))
								break; //already bypassed the node
							let intersectX = point.rangeX.intersect(nodeRangeX);
							let intersectY = point.rangeY.intersect(nodeRangeY);
							if(intersectX == null && intersectY == null)
								continue; //no intersection remains
							else if(intersectX != null && intersectY != null)
							{
								if(point.rangeX.equals(intersectX) && point.rangeY.equals(intersectY)) //can't escape both constraints
								{
									point.rangeX = null;
									point.rangeY = null;
									return false;
								}
							}
							//take the little adjustments first
							if(intersectX != null && !point.rangeX.equals(intersectX) && !point.rangeX.contains(intersectX))
							{
								point.rangeX = point.rangeX.minus(intersectX);
								this.clean();
							}
							if(intersectY != null && !point.rangeY.equals(intersectY) && !point.rangeY.contains(intersectY))
							{
								point.rangeY = point.rangeY.minus(intersectY);
								this.clean();
							}
							//if a large adjustment remains, make it
							intersectX = point.rangeX.intersect(nodeRangeX);
							intersectY = point.rangeY.intersect(nodeRangeY);
							if(isHorizontal && intersectX != null)
							{
								if(intersectY == null)
									point.rangeX = point.rangeX.minusFar(intersectX, this.points[p-1].rangeX);
								else
									point.rangeX = point.rangeX.minusNear(intersectX, this.points[p-1].rangeX);
							}
							else if(!isHorizontal && intersectY != null)
							{
								if(intersectX == null)
									point.rangeY = point.rangeY.minusFar(intersectY, this.points[p-1].rangeY);
								else
									point.rangeY = point.rangeY.minusNear(intersectY, this.points[p-1].rangeY);
							}
							if(point.rangeX == null || point.rangeY == null)
								return false;
							this.clean();
							isHorizontal = !isHorizontal;
						}
						if(this.isInvalid())
							return false;
						if(this.crossesArea(node.absoluteArea)) //best guesses about avoiding node can result in still overlapping node
							return false;
					}
					return true;
				},
				//returns true if any point or range in path is null, or if any neighboring points cannot connect
				isInvalid: function() {
					let isHorizontal = this.startsHorizontal;
					for(let p=0; p<this.points.length; p++)
					{
						let point = this.points[p];
						if(point == null || point.rangeX == null || point.rangeY == null)
							return true;
						if(p == 0)
							continue;
						if(isHorizontal && point.rangeY.intersect(this.points[p-1].rangeY) == null)
							return true;
						if(!isHorizontal && point.rangeX.intersect(this.points[p-1].rangeX) == null)
							return true;
						isHorizontal = !isHorizontal;
					}
					return false;
				},
				//returns true if paths are partially coincident
				//TODO assumes both paths are just straight lines
				isCoincident: function(otherPath) {
					if(this.startsHorizontal != otherPath.startsHorizontal)
						return false;
					//possible paths that would currently end up not coincident, could still be pushed into coincidence by these changes
					//so checking for paths that have an intersecting range of possible positions
					if(this.startsHorizontal)
					{
						const intersectX = this.points[0].rangeX.sum(this.points[1].rangeX).intersect(otherPath.points[0].rangeX.sum(otherPath.points[1].rangeX));
						const intersectY = this.points[0].rangeY.intersect(otherPath.points[0].rangeY);
						return (intersectX != null && intersectY != null);
					}
					else
					{
						const intersectX = this.points[0].rangeX.intersect(otherPath.points[0].rangeX);
						const intersectY = this.points[0].rangeY.sum(this.points[1].rangeY).intersect(otherPath.points[0].rangeY.sum(otherPath.points[1].rangeY));
						return (intersectX != null && intersectY != null);
					}
				},
				//go through path, shrinking ranges on adjacent points to match each other
				//some ranges may shrink down to null
				clean: function() {
					if(this.points.length < 2)
						return;
					let horizontalLine = this.startsHorizontal;
					for(let i=1; i<this.points.length; i++)
					{
						let previousPoint = this.points[i-1];
						let currentPoint = this.points[i];
						if(horizontalLine)
						{
							let rangeIntersect = previousPoint.rangeY.intersect(currentPoint.rangeY);
							previousPoint.rangeY = rangeIntersect;
							currentPoint.rangeY = rangeIntersect;
						}
						else
						{
							let rangeIntersect = previousPoint.rangeX.intersect(currentPoint.rangeX);
							previousPoint.rangeX = rangeIntersect;
							currentPoint.rangeX = rangeIntersect;
						}
						horizontalLine = !horizontalLine;
					}
				},
				//returns array of normal points
				//turn potential points into points, taking the middle-path of potential paths
				stablePoints: function() {
					if(this.type == Path.types.curl)
					{
						return this.stablePointsCurl();
					}
					this.clean();
					let result = [];
					let previousStablePoint = null;
					let horizontalLine = this.startsHorizontal;
					for(let i=0; i<this.points.length; i++)
					{
						let point = this.points[i];
						let stablePoint = (horizontalLine) ? point.toStablePointHorizontal(previousStablePoint) : point.toStablePointVertical(previousStablePoint);
						result.push(stablePoint);
						previousStablePoint = stablePoint;
						if(i > 0)
							horizontalLine = !horizontalLine;
					}
					return result;
				},
				//returns array of normal points, specifically for curl-paths
				//expects exactly 4 points
				//converts 3-straight-lines into diagonal-straight-diagonal to give more space for arrows; these curls tend to be cramped
				stablePointsCurl: function() {
					this.clean();
					let result = [];
					let horizontalLine = this.startsHorizontal;
					if(this.startsHorizontal)
					{
						if(this.points[1].rangeY.middle() < this.points[2].rangeY.middle()) //curls downward
						{
							const pointA = Point.create(this.points[0].rangeX.middle(), this.points[0].rangeY.max);
							const verticalLineX = this.points[1].rangeX.middle();
							const offset = Math.abs(pointA.x - verticalLineX);
							const pointB = Point.create(verticalLineX, pointA.y + offset);
							const pointC = Point.create(verticalLineX, this.points[2].rangeY.min - offset);
							const pointD = Point.create(this.points[3].rangeX.middle(), this.points[2].rangeY.min);
							return [pointA, pointB, pointC, pointD];
						}
						else //curls upward
						{
							const pointA = Point.create(this.points[0].rangeX.middle(), this.points[0].rangeY.min);
							const verticalLineX = this.points[1].rangeX.middle();
							const offset = Math.abs(pointA.x - verticalLineX);
							const pointB = Point.create(verticalLineX, pointA.y - offset);
							const pointC = Point.create(verticalLineX, this.points[2].rangeY.max + offset);
							const pointD = Point.create(this.points[3].rangeX.middle(), this.points[2].rangeY.max);
							return [pointA, pointB, pointC, pointD];
						}
					}
					else
					{
						if(this.points[1].rangeX.middle() < this.points[2].rangeX.middle()) //curls rightward
						{
							const pointA = Point.create(this.points[0].rangeX.max, this.points[0].rangeY.middle());
							const horizontalLineY = this.points[1].rangeY.middle();
							const offset = Math.abs(pointA.y - horizontalLineY);
							const pointB = Point.create(pointA.x + offset, horizontalLineY);
							const pointC = Point.create(this.points[2].rangeX.min - offset, horizontalLineY);
							const pointD = Point.create(this.points[2].rangeX.min, this.points[3].rangeY.middle());
							return [pointA, pointB, pointC, pointD];
						}
						else //curls leftward
						{
							const pointA = Point.create(this.points[0].rangeX.min, this.points[0].rangeY.middle());
							const horizontalLineY = this.points[1].rangeY.middle();
							const offset = Math.abs(pointA.y - horizontalLineY);
							const pointB = Point.create(pointA.x - offset, horizontalLineY);
							const pointC = Point.create(this.points[2].rangeX.max + offset, horizontalLineY);
							const pointD = Point.create(this.points[2].rangeX.max, this.points[3].rangeY.middle());
							return [pointA, pointB, pointC, pointD];
						}
					}
				},
				//returns lines generated from stable points
				lines: function() {
					let stablePoints = this.stablePoints();
					let result = [];
					for(let i=1; i<stablePoints.length; i++)
					{
						result.push(Line.create(stablePoints[i-1], stablePoints[i]));
					}
					return result;
				}
			};
		}
	};

	const PotentialPoint = {
		create: function(rangeX, rangeY) {
			return {
				rangeX: rangeX,
				rangeY: rangeY,
				middleX: function() {
					return this.rangeX.middle();
				},
				middleY: function() {
					return this.rangeY.middle();
				},
				middlePoint: function() {
					return Point.create(this.middleX(), this.middleY());
				},
				stableX: function() {
					return (this.rangeX.min == this.rangeX.max);
				},
				stableY: function() {
					return (this.rangeY.min == this.rangeY.max);
				},
				//convert potential point to stable/normal point in relation to anchorPoint
				//anchorPoint to result will form a horizontal line
				toStablePointHorizontal: function(anchorPoint=null) {
					if(anchorPoint == null)
						return this.middlePoint();
					if(!this.rangeY.includes(anchorPoint.y))
						return null;
					return Point.create(this.middleX(), anchorPoint.y);
				},
				//convert potential point to stable/normal point in relation to anchorPoint
				//anchorPoint to result will form a vertical line
				toStablePointVertical: function(anchorPoint=null) {
					if(anchorPoint == null)
						return this.middlePoint();
					if(!this.rangeX.includes(anchorPoint.x))
						return null;
					return Point.create(anchorPoint.x, this.middleY());
				}
			};
		}
	};

	const Direction = {
		left: "left",
		right: "right",
		up: "up",
		down: "down"
	};
		
	const SmartArrows = {
		//return array of simple lines, ready to be drawn
		convertRelationsToLines: function(source, nodes) {
			const possiblePaths = this.convertRelationsToPossiblePaths(source, nodes);
			const paths = this.selectPathsFromPossibles(possiblePaths, nodes);
			this.unCoincidePaths(paths);
			const lines = this.convertPathsToLines(paths);
			return lines;
		},
		//convert paths to array of lines
		convertPathsToLines: function(paths) {
			let lines = [];
			paths.forEach(function(path) {
				if(path.isPath == true)
					lines = lines.concat(SmartArrows.convertPathToLines(path));
				else
					lines.push(path);
			});
			return lines;
		},
		//convert path to array of lines
		convertPathToLines: function(path) {
			let lines = path.lines();
			for(let i=0; i<lines.length; i++)
			{
				let line = lines[i];
				line.arrowLine = ArrowLine.justLine(path.arrowLine.lineType);
				if(i == 0)
				{
					line.arrowLine.leftArrowType = path.arrowLine.leftArrowType;
					line.startLabel = path.startLabel;
				}
				if(i == Math.floor(lines.length / 2))
				{
					line.middleLabel = path.middleLabel;
				}
				if(i == lines.length - 1)
				{
					line.arrowLine.rightArrowType = path.arrowLine.rightArrowType;
					line.endLabel = path.endLabel;
				}
			}
			return lines;
		},
		//returns mixed array of PossiblePaths and Lines
		convertRelationsToPossiblePaths: function(source, allNodes, path=null) {
			let result = [];
			path = source.appendToPath(path);
			if(source.relate != null)
			{
				source.relate.records.forEach(function(relation) {
					const startNode = FindNode.findNode(allNodes, relation.startLabel, path);
					const endNode = FindNode.findNode(allNodes, relation.endLabel, path);
					if(startNode == null || endNode == null)
						return;
					const possiblePaths = SmartArrows.arrangePossiblePathsBetweenNodes(startNode, endNode, allNodes, relation);
					result.push(possiblePaths);
				});
			}
			source.nestedSources.forEach(function(nestedSource) {
				let nestedResult = SmartArrows.convertRelationsToPossiblePaths(nestedSource, allNodes, path);
				result = result.concat(nestedResult);
			});
			return result;
		},
		//returns Possible Paths object from start to end
		//can return Line object for default angled lines
		arrangePossiblePathsBetweenNodes: function(startNode, endNode, allNodes, relation) {
			const startArea = startNode.absoluteArea;
			const endArea = endNode.absoluteArea;
			const arrowLine = ArrowLine.parse(relation.arrowType);
			
			const minBuffer = 2;
			const defaultSpan = Math.min(pinker.config.canvasPadding, pinker.config.scopePadding, pinker.config.scopeMargin / 2) - (2 * minBuffer); //space at edge of scope, or space between scopes (shared)

			const pathConfig = {
				arrowLine: arrowLine,
				startNode: startNode, 
				endNode: endNode, 
				minBuffer: minBuffer,
				defaultSpan: defaultSpan,
				relation: relation
			};

			let possiblePaths = PossiblePaths.create();
			
			if(startArea.isAbove(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.straight, pathConfig, Direction.down));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.right, Direction.down));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.left, Direction.down));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.curl, pathConfig, Direction.right, Direction.down, Direction.left));
				return possiblePaths;
			}
			if(startArea.isBelow(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.straight, pathConfig, Direction.up));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.left, Direction.up));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.right, Direction.up));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.curl, pathConfig, Direction.left, Direction.up, Direction.right));
				return possiblePaths;
			}
			if(startArea.isLeftOf(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.straight, pathConfig, Direction.right));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.up, Direction.right));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.down, Direction.right));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.curl, pathConfig, Direction.up, Direction.right, Direction.down));
				return possiblePaths;
			}
			if(startArea.isRightOf(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.straight, pathConfig, Direction.left));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.up, Direction.left));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.down, Direction.left));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.curl, pathConfig, Direction.down, Direction.left, Direction.up));
				return possiblePaths;
			}
			if(startArea.isAboveLeftOf(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.right, Direction.down));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.down, Direction.right));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.down, Direction.right, Direction.down));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.right, Direction.down, Direction.right));

				possiblePaths.simpleLine = simpleLineBetweenNodes(startNode, endNode, allNodes, relation);

				return possiblePaths;
			}
			if(startArea.isAboveRightOf(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.left, Direction.down));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.down, Direction.left));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.down, Direction.left, Direction.down));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.left, Direction.down, Direction.left));

				possiblePaths.simpleLine = simpleLineBetweenNodes(startNode, endNode, allNodes, relation);

				return possiblePaths;
			}
			if(startArea.isBelowLeftOf(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.right, Direction.up));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.up, Direction.right));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.up, Direction.right, Direction.up));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.right, Direction.up, Direction.right));

				possiblePaths.simpleLine = simpleLineBetweenNodes(startNode, endNode, allNodes, relation);

				return possiblePaths;
			}
			if(startArea.isBelowRightOf(endArea))
			{
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.left, Direction.up));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.elbow, pathConfig, Direction.up, Direction.left));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.up, Direction.left, Direction.up));
				possiblePaths.paths.push(this.createPossiblePath(Path.types.zigzag, pathConfig, Direction.left, Direction.up, Direction.left));

				possiblePaths.simpleLine = simpleLineBetweenNodes(startNode, endNode, allNodes, relation);

				return possiblePaths;
			}
			
			//fallback: straight line between nodes
			return simpleLineBetweenNodes(startNode, endNode, allNodes, relation);
		},
		//returns a possible path object generated based on getting from start to end by these directions
		//assumes elbow, curl, or zigzag path
		createPossiblePath: function(pathType, pathConfig, ...directions) {
			const startsHorizontal = (directions[0] == Direction.left || directions[0] == Direction.right);
			const path = Path.create(pathType, pathConfig.arrowLine, pathConfig.startNode, pathConfig.endNode, startsHorizontal);
			path.startLabel = pathConfig.relation.lineLabelStart;
			path.middleLabel = pathConfig.relation.lineLabelMiddle;
			path.endLabel = pathConfig.relation.lineLabelEnd;
						
			const startArea = pathConfig.startNode.absoluteArea;
			const endArea   = pathConfig.endNode.absoluteArea;
			const minBuffer = pathConfig.minBuffer;
			const defaultSpan = pathConfig.defaultSpan;
			let rangeX = null;
			let rangeY = null;
			if(pathType == Path.types.straight)
			{
				switch(directions[0])
				{
					case Direction.left:
						rangeY = Range.create(Math.max(startArea.top(), endArea.top()), Math.min(startArea.bottom(), endArea.bottom()));
						path.points.push(PotentialPoint.create(Range.create(startArea.left()), rangeY));
						path.points.push(PotentialPoint.create(Range.create(endArea.right()), rangeY));
						break;
					case Direction.right:
						rangeY = Range.create(Math.max(startArea.top(), endArea.top()), Math.min(startArea.bottom(), endArea.bottom()));
						path.points.push(PotentialPoint.create(Range.create(startArea.right()), rangeY));
						path.points.push(PotentialPoint.create(Range.create(endArea.left()), rangeY));
						break;
					case Direction.up:
						rangeX = Range.create(Math.max(startArea.left(), endArea.left()), Math.min(startArea.right(), endArea.right()));
						path.points.push(PotentialPoint.create(rangeX, Range.create(startArea.top())));
						path.points.push(PotentialPoint.create(rangeX, Range.create(endArea.bottom())));
						break;
					case Direction.down:
						rangeX = Range.create(Math.max(startArea.left(), endArea.left()), Math.min(startArea.right(), endArea.right()));
						path.points.push(PotentialPoint.create(rangeX, Range.create(startArea.bottom())));
						path.points.push(PotentialPoint.create(rangeX, Range.create(endArea.top())));
						break;
				}
				return path;
			}
			switch(directions[0])
			{
				case Direction.left:
					path.points.push(PotentialPoint.create(Range.create(startArea.left()), Range.create(startArea.top(), startArea.bottom())));
					break;
				case Direction.right:
					path.points.push(PotentialPoint.create(Range.create(startArea.right()), Range.create(startArea.top(), startArea.bottom())));
					break;
				case Direction.up:
					path.points.push(PotentialPoint.create(Range.create(startArea.left(), startArea.right()), Range.create(startArea.top())));
					break;
				case Direction.down:
					path.points.push(PotentialPoint.create(Range.create(startArea.left(), startArea.right()), Range.create(startArea.bottom())));
					break;
			}
			if(pathType == Path.types.curl)
			{
				switch(directions[0])
				{
					case Direction.left:
						path.points.push(PotentialPoint.create(Range.create(Math.min(startArea.left(), endArea.left()) - minBuffer - defaultSpan, Math.min(startArea.left(), endArea.left()) - minBuffer), path.points[0].rangeY));
						path.points.push(PotentialPoint.create(path.points[1].rangeX, Range.create(endArea.top(), endArea.bottom())));
						path.points.push(PotentialPoint.create(Range.create(endArea.left()), path.points[2].rangeY));
						break;
					case Direction.right:
						path.points.push(PotentialPoint.create(Range.create(Math.max(startArea.right(), endArea.right()) + minBuffer, Math.max(startArea.right(), endArea.right()) + minBuffer + defaultSpan), path.points[0].rangeY));
						path.points.push(PotentialPoint.create(path.points[1].rangeX, Range.create(endArea.top(), endArea.bottom())));
						path.points.push(PotentialPoint.create(Range.create(endArea.right()), path.points[2].rangeY));
						break;
					case Direction.up:
						path.points.push(PotentialPoint.create(path.points[0].rangeX, Range.create(Math.min(startArea.top(), endArea.top()) - minBuffer - defaultSpan, Math.min(startArea.top(), endArea.top()) - minBuffer)));
						path.points.push(PotentialPoint.create(Range.create(endArea.left(), endArea.right()), path.points[1].rangeY));
						path.points.push(PotentialPoint.create(path.points[2].rangeX, Range.create(endArea.top())));
						break;
					case Direction.down:
						path.points.push(PotentialPoint.create(path.points[0].rangeX, Range.create(Math.max(startArea.bottom(), endArea.bottom()) + minBuffer, Math.max(startArea.bottom(), endArea.bottom()) + minBuffer + defaultSpan)));
						path.points.push(PotentialPoint.create(Range.create(endArea.left(), endArea.right()), path.points[1].rangeY));
						path.points.push(PotentialPoint.create(path.points[2].rangeX, Range.create(endArea.bottom())));
						break;
				}
				return path;
			}			
			for(let i=1; i<directions.length-1; i++)
			{
				switch(directions[i])
				{
					case Direction.left:
					case Direction.right:
						if(directions[i+1] == Direction.down)
							rangeY = Range.create(startArea.bottom() + minBuffer, endArea.top() - minBuffer);
						else
							rangeY = Range.create(startArea.top() - minBuffer, endArea.bottom() + minBuffer);
						path.points.push(PotentialPoint.create(path.points[path.points.length-1].rangeX, rangeY));
						break;
					case Direction.up:
					case Direction.down:
						if(directions[i+1] == Direction.left)
							rangeX = Range.create(startArea.left() - minBuffer, endArea.right() + minBuffer);
						else if(directions[i+1] == Direction.right)
							rangeX = Range.create(startArea.right() + minBuffer, endArea.left() - minBuffer);
						path.points.push(PotentialPoint.create(rangeX, path.points[path.points.length-1].rangeY));
						break;
				}
			}
			switch(directions[directions.length-1])
			{
				case Direction.left:
					rangeY = Range.create(endArea.top(), endArea.bottom());
					path.points.push(PotentialPoint.create(path.points[path.points.length-1].rangeX, rangeY));
					path.points.push(PotentialPoint.create(Range.create(endArea.right()), rangeY));
					break;
				case Direction.right:
					rangeY = Range.create(endArea.top(), endArea.bottom());
					path.points.push(PotentialPoint.create(path.points[path.points.length-1].rangeX, rangeY));
					path.points.push(PotentialPoint.create(Range.create(endArea.left()), rangeY));
					break;
				case Direction.up:
					rangeX = Range.create(endArea.left(), endArea.right());
					path.points.push(PotentialPoint.create(rangeX, path.points[path.points.length-1].rangeY));
					path.points.push(PotentialPoint.create(rangeX, Range.create(endArea.bottom())));
					break;
				case Direction.down:
					rangeX = Range.create(endArea.left(), endArea.right());
					path.points.push(PotentialPoint.create(rangeX, path.points[path.points.length-1].rangeY));
					path.points.push(PotentialPoint.create(rangeX, Range.create(endArea.top())));
					break;
			}
			return path;
		},
		//returns mixed array of Paths and Lines
		selectPathsFromPossibles: function(possiblePaths, topLevelNodes) {
			const result = [];
			possiblePaths.forEach(function(possiblePath) {
				if(possiblePath.isPossiblePaths)
				{
					if(possiblePath.simpleLine != undefined && possiblePath.simpleLine != null) //if straight line doesn't cross anything, keep it
					{
						let crossedNodes = possiblePath.simpleLine.crossesNodes(topLevelNodes);
						if(crossedNodes.length == 0)
						{
							result.push(possiblePath.simpleLine);
							return;
						}						
					}
					for(let i=0; i<possiblePath.paths.length; i++) //take first path that doesn't cross over another node
					{
						let currentPath = possiblePath.paths[i];
						let crossedNodes = currentPath.mightCrossNodes(topLevelNodes);
						if(crossedNodes.length > 0 && currentPath.type == Path.types.straight) //don't edit the fallback path
							continue;
						if(!currentPath.avoid(crossedNodes))
							continue;
						result.push(currentPath);
						return;
					}
					//fallback on default line
					if(possiblePath.simpleLine != undefined && possiblePath.simpleLine != null)
					{
						result.push(possiblePath.simpleLine);
						return;
					}
					else
					{
						result.push(possiblePath.paths[0]);
					}
				}
				else
				{
					result.push(possiblePath);
				}
			});
			return result;
		},
		//check for coincident paths and separate them
		unCoincidePaths: function(paths) {
			const sets = this.getCoincidentPathSets(paths);
			sets.forEach(function(set) {
				if(set[0].startsHorizontal)
				{
					//all paths could have a different range of possible positions
					//for now, try the easiest math and just don't move the paths if that doesn't work
					let rangeY = set[0].points[0].rangeY;
					set.forEach(function(path) {
						rangeY = rangeY.sum(path.points[0].rangeY);
					});
					const unitSpan = (rangeY.span() / (set.length + 1));
					let y = rangeY.min + unitSpan;
					set.forEach(function(path) {
						if(!path.points[0].rangeY.includes(y))
							return;
						if(!path.points[1].rangeY.includes(y))
							return;
						path.points[0].rangeY = Range.create(y);
						path.points[1].rangeY = Range.create(y);
						y += unitSpan;
					});
				}
				else
				{
					let rangeX = set[0].points[0].rangeX;
					set.forEach(function(path) {
						rangeX = rangeX.sum(path.points[0].rangeX);
					});
					const unitSpan = (rangeX.span() / (set.length + 1));
					let x = rangeX.min + unitSpan;
					set.forEach(function(path) {
						if(!path.points[0].rangeX.includes(x))
							return;
						if(!path.points[1].rangeX.includes(x))
							return;
						path.points[0].rangeX = Range.create(x);
						path.points[1].rangeX = Range.create(x);
						x += unitSpan;
					});
				}
			});
		},
		//divide paths into sets where a set contains paths that are coincident
		//filters out lines
		getCoincidentPathSets: function(paths) {
			const sets = []; //each element is an array representing one set
			//partially coincident paths count, so it is possible to have a set where not every pair of paths is coincident
			//TODO only handles straight paths so far
			paths.forEach(function(path) {
				if(!path.isPath)
					return;
				if(path.points.length > 2)
					return;
				let foundMatch = false;
				for(let s=0; s<sets.length; s++)
				{
					const set = sets[s];
					for(let i=0; i<set.length; i++)
					{
						if(path.isCoincident(set[i]))
						{
							set.push(path);
							foundMatch = true;
							break;
						}
					}
					if(foundMatch)
						break;
				}
				if(!foundMatch)
				{
					sets.push([path]);
				}
			});
			return sets.filter(set => set.length > 1);
		}
	};
	if(pinker.testMode)
	{
		pinker.RelateRecord = RelateRecord;
		pinker.ArrowTypes = ArrowTypes;
		pinker.Line = Line;
		pinker.Point = Point;
		pinker.Source = Source;
		pinker.Node = Node;
		pinker.FindNode = FindNode;
	} 
})(); 
