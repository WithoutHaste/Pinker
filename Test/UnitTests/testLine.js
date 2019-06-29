QUnit.test("Line: testable", function( assert ) {
	assert.ok(pinker.Line != undefined && pinker.Line != null, "Passed");
});

function testGetPointLengthAlong(startPoint, endPoint, length, expected, assert) {
	let result = pinker.Line.getPointLengthAlong(startPoint, endPoint, length);
	assert.propEqual(
		{x: result.x, y: result.y}, 
		{x: expected.x, y: expected.y}, 
		"Passed"
	);
}
QUnit.module("Line.getPointLengthAlong");
QUnit.test("horizontal line to right", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(0, 0), pinker.Point.create(10, 0), 
		3, 
		pinker.Point.create(3, 0), 
		assert
	);
});
QUnit.test("horizontal line to left", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(10, 0), pinker.Point.create(0, 0), 
		3, 
		pinker.Point.create(7, 0), 
		assert
	);
});
QUnit.test("vertical line down", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(0, 0), pinker.Point.create(0, 10), 
		3, 
		pinker.Point.create(0, 3), 
		assert
	);
});
QUnit.test("vertical line up", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(0, 10), pinker.Point.create(0, 0), 
		3, 
		pinker.Point.create(0, 7), 
		assert
	);
});
QUnit.test("diagonal line right-down", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(0, 0), pinker.Point.create(10, 10), 
		3, 
		pinker.Point.create(2.1212999999999997, 2.1212999999999997), 
		assert
	);
});
QUnit.test("diagonal line left-down", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(10, 0), pinker.Point.create(0, 10), 
		3, 
		pinker.Point.create(7.8787, 2.1212999999999997), 
		assert
	);
});
QUnit.test("diagonal line right-up", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(0, 10), pinker.Point.create(10, 0), 
		3, 
		pinker.Point.create(2.1212999999999997, 7.8787), 
		assert
	);
});
QUnit.test("diagonal line left-up", function( assert ) {
	testGetPointLengthAlong(
		pinker.Point.create(10, 10), pinker.Point.create(0, 0), 
		3, 
		pinker.Point.create(7.8787, 7.8787), 
		assert
	);
});

function testShortenFromStart(line, length, expected, assert) {
	line.shortenFromStart(length);
	assert.propEqual(
		{startPoint: line.startPoint, endPoint: line.endPoint}, 
		{startPoint: expected.startPoint, endPoint: expected.endPoint}, 
		"Passed"
	);
}
QUnit.module("Line.shortenFromStart");
QUnit.test("horizontal line to right", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(3, 0), pinker.Point.create(10, 0)), 
		assert
	);
});
QUnit.test("horizontal line to left", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(7, 0), pinker.Point.create(0, 0)), 
		assert
	);
});
QUnit.test("vertical line down", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(0, 10)), 
		3, 
		pinker.Line.create(pinker.Point.create(0, 3), pinker.Point.create(0, 10)), 
		assert
	);
});
QUnit.test("vertical line up", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(0, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(0, 7), pinker.Point.create(0, 0)), 
		assert
	);
});
QUnit.test("diagonal line right-down", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 10)), 
		3, 
		pinker.Line.create(pinker.Point.create(2.1212999999999997, 2.1212999999999997), pinker.Point.create(10, 10)), 
		assert
	);
});
QUnit.test("diagonal line left-down", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 10)), 
		3, 
		pinker.Line.create(pinker.Point.create(7.8787, 2.1212999999999997), pinker.Point.create(0, 10)), 
		assert
	);
});
QUnit.test("diagonal line right-up", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(10, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(2.1212999999999997, 7.8787), pinker.Point.create(10, 0)), 
		assert
	);
});
QUnit.test("diagonal line left-up", function( assert ) {
	testShortenFromStart(
		pinker.Line.create(pinker.Point.create(10, 10), pinker.Point.create(0, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(7.8787, 7.8787), pinker.Point.create(0, 0)), 
		assert
	);
});

function testShortenFromEnd(line, length, expected, assert) {
	line.shortenFromEnd(length);
	assert.propEqual(
		{startPoint: line.startPoint, endPoint: line.endPoint}, 
		{startPoint: expected.startPoint, endPoint: expected.endPoint}, 
		"Passed"
	);
}
QUnit.module("Line.shortenFromEnd");
QUnit.test("horizontal line to right", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(7, 0)), 
		assert
	);
});
QUnit.test("horizontal line to left", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(3, 0)), 
		assert
	);
});
QUnit.test("vertical line down", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(0, 10)), 
		3, 
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(0, 7)), 
		assert
	);
});
QUnit.test("vertical line up", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(0, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(0, 3)), 
		assert
	);
});
QUnit.test("diagonal line right-down", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 10)), 
		3, 
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(7.8787, 7.8787)), 
		assert
	);
});
QUnit.test("diagonal line left-down", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 10)), 
		3, 
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(2.1212999999999997, 7.8787)), 
		assert
	);
});
QUnit.test("diagonal line right-up", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(10, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(7.8787, 2.1212999999999997)), 
		assert
	);
});
QUnit.test("diagonal line left-up", function( assert ) {
	testShortenFromEnd(
		pinker.Line.create(pinker.Point.create(10, 10), pinker.Point.create(0, 0)), 
		3, 
		pinker.Line.create(pinker.Point.create(10, 10), pinker.Point.create(2.1212999999999997, 2.1212999999999997)), 
		assert
	);
});

function testMidPoint(line, expected, assert) {
	const result = line.midPoint();
	assert.propEqual(
		{x: result.x, y: result.y}, 
		{x: expected.x, y: expected.y}, 
		"Passed"
	);
}
QUnit.module("Line.midPoint");
QUnit.test("horizontal line to right", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 0)), 
		pinker.Point.create(5, 0), 
		assert
	);
});
QUnit.test("horizontal line to left", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 0)), 
		pinker.Point.create(5, 0), 
		assert
	);
});
QUnit.test("vertical line down", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(0, 10)), 
		pinker.Point.create(0, 5), 
		assert
	);
});
QUnit.test("vertical line up", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(0, 0)), 
		pinker.Point.create(0, 5), 
		assert
	);
});
QUnit.test("diagonal line right-down", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 10)), 
		pinker.Point.create(5, 5), 
		assert
	);
});
QUnit.test("diagonal line left-down", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 10)), 
		pinker.Point.create(5, 5), 
		assert
	);
});
QUnit.test("diagonal line right-up", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(10, 0)), 
		pinker.Point.create(5, 5), 
		assert
	);
});
QUnit.test("diagonal line left-up", function( assert ) {
	testMidPoint(
		pinker.Line.create(pinker.Point.create(10, 10), pinker.Point.create(0, 0)), 
		pinker.Point.create(5, 5), 
		assert
	);
});

function testIsDiagonalRightUp(line, expected, assert) {
	const result = line.isDiagonalRightUp();
	assert.equal(result, expected, "Passed");
}
function testIsDiagonalRightDown(line, expected, assert) {
	const result = line.isDiagonalRightDown();
	assert.equal(result, expected, "Passed");
}
function testIsDiagonalLeftUp(line, expected, assert) {
	const result = line.isDiagonalLeftUp();
	assert.equal(result, expected, "Passed");
}
function testIsDiagonalLeftDown(line, expected, assert) {
	const result = line.isDiagonalLeftDown();
	assert.equal(result, expected, "Passed");
}
QUnit.module("Line.isDiagonal-");
QUnit.test("diagonal line right-up", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(10, 0));
	testIsDiagonalRightUp(line, true, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line right-up, upper limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(1, 0));
	testIsDiagonalRightUp(line, true, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line right-up, lower limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(0, 10), pinker.Point.create(9, 9));
	testIsDiagonalRightUp(line, true, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line right-down", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 10))
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, true, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line right-down, upper limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(10, 1))
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, true, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line right-down, lower limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(0, 0), pinker.Point.create(1, 10))
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, true, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line left-up", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(10, 10), pinker.Point.create(0, 0));
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, true, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line left-up, upper limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(10, 10), pinker.Point.create(0, 1));
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, true, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line left-up, lower limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(10, 10), pinker.Point.create(9, 0));
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, true, assert);
	testIsDiagonalLeftDown(line, false, assert);
});
QUnit.test("diagonal line left-down", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 10));
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, true, assert);
});
QUnit.test("diagonal line left-down, upper limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(9, 10));
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, true, assert);
});
QUnit.test("diagonal line left-down, lower limit", function( assert ) {
	const line = pinker.Line.create(pinker.Point.create(10, 0), pinker.Point.create(0, 1));
	testIsDiagonalRightUp(line, false, assert);
	testIsDiagonalRightDown(line, false, assert);
	testIsDiagonalLeftUp(line, false, assert);
	testIsDiagonalLeftDown(line, true, assert);
});
