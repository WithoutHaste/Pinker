
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
	findNode: function(nodes, label, labelPath) {
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
	},
	findNodeRelative: function(nodes, label, path) {
		let startingNode = findNodeAbsolute(nodes, path);
		if(startingNode == null)
			return null;
		return findNodeAbsolute(startingNode.nodes, label);
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
			return findNodeAlias(nodes, aliasPath);
		let [alias, path] = Source.splitAliasFromPath(aliasPath);
		let node = findNodeAlias(nodes, alias);
		if(node == null)
			return null;
		return findNodeAbsolute(node.nodes, Source.openScope(path));
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
			//draw lines on context
			draw: function(point, lineWidthPadding, context) {
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
						context.moveTo(point.x - lineWidthPadding, lineY);
						context.lineTo(point.x + this.width + lineWidthPadding, lineY);
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