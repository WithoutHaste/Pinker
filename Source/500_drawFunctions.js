
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
		node.defineLayout.draw(definePoint, (node.defineArea.width - node.defineLayout.width)/2, context);
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
			const startNode = findNode(allNodes, relation.startLabel, path);
			const endNode = findNode(allNodes, relation.endLabel, path);
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

function findNode(nodes, label, labelPath) {
	if(Source.isAliasPath(label))
		return findNodeAliasPath(nodes, label);
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

function findNodeAbsolute(nodes, labelOrPath) {
	for(let i=0; i<nodes.length; i++)
	{
		let node = nodes[i];
		let result = node.findPath(labelOrPath);
		if(result != null)
			return result;
	}
	return null;
}

function findNodeAliasPath(nodes, aliasPath) {
	if(Source.isAlias(aliasPath))
		return findNodeAlias(nodes, aliasPath);
	let [alias, path] = Source.splitAliasFromPath(aliasPath);
	let node = findNodeAlias(nodes, alias);
	if(node == null)
		return null;
	return findNodeAbsolute(node.nodes, Source.openScope(path));
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