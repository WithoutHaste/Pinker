
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
				const startNode = findNode(allNodes, relation.startLabel, path);
				const endNode = findNode(allNodes, relation.endLabel, path);
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