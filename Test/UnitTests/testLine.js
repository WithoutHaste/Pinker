QUnit.test("Line: testable", function( assert ) {
	assert.ok(pinker.Line != undefined && pinker.Line != null, "Passed");
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
