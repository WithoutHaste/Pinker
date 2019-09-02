
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