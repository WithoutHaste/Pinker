
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