
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
	//returns the text, with all leading whitespace characters removed from each line
	unIndent: function(text) {
		return text.replace(/^\s+/mg,"");
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