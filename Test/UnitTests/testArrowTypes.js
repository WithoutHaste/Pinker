QUnit.test("ArrowTypes: testable", function( assert ) {
	assert.ok(pinker.ArrowTypes != undefined && pinker.ArrowTypes != null, "Passed");
});

function testSplitDoubleHeadedArrow(text, expected, assert) {
	const result = pinker.ArrowTypes.splitDoubleHeadedArrow(text);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("ArrowTypes.splitDoubleHeadedArrow");
QUnit.test("right arrow ->", function( assert ) {
	testSplitDoubleHeadedArrow("->", [null, "-", "->"], assert);
});
QUnit.test("right arrow =>", function( assert ) {
	testSplitDoubleHeadedArrow("=>", [null, "=", "=>"], assert);
});
QUnit.test("right arrow -->", function( assert ) {
	testSplitDoubleHeadedArrow("-->", [null, "--", "-->"], assert);
});
QUnit.test("right arrow *>", function( assert ) {
	testSplitDoubleHeadedArrow("*>", [null, "*", "*>"], assert);
});
QUnit.test("left arrow ->", function( assert ) {
	testSplitDoubleHeadedArrow("<-", ["->", "-", null], assert);
});
QUnit.test("left arrow <=", function( assert ) {
	testSplitDoubleHeadedArrow("<=", ["=>", "=", null], assert);
});
QUnit.test("left arrow <--", function( assert ) {
	testSplitDoubleHeadedArrow("<--", ["-->", "--", null], assert);
});
QUnit.test("left arrow <*", function( assert ) {
	testSplitDoubleHeadedArrow("<*", ["*>", "*", null], assert);
});
QUnit.test("plain line -", function( assert ) {
	testSplitDoubleHeadedArrow("-", [null, "-", null], assert);
});
QUnit.test("plain line =", function( assert ) {
	testSplitDoubleHeadedArrow("=", [null, "=", null], assert);
});
QUnit.test("plain line --", function( assert ) {
	testSplitDoubleHeadedArrow("--", [null, "--", null], assert);
});
QUnit.test("plain line *", function( assert ) {
	testSplitDoubleHeadedArrow("*", [null, "*", null], assert);
});
QUnit.test("double duplicate arrow <->", function( assert ) {
	testSplitDoubleHeadedArrow("<->", ["->", "-", "->"], assert);
});
QUnit.test("double duplicate arrow <=>", function( assert ) {
	testSplitDoubleHeadedArrow("<=>", ["=>", "=", "=>"], assert);
});
QUnit.test("double duplicate arrow <-->", function( assert ) {
	testSplitDoubleHeadedArrow("<-->", ["-->", "--", "-->"], assert);
});
QUnit.test("double duplicate arrow <*>", function( assert ) {
	testSplitDoubleHeadedArrow("<*>", ["*>", "*", "*>"], assert);
});
QUnit.test("double arrow mixed <-:>", function( assert ) {
	testSplitDoubleHeadedArrow("<-:>", ["->", "-", "-:>"], assert);
});
QUnit.test("double arrow mixed D=o", function( assert ) {
	testSplitDoubleHeadedArrow("D=o", ["=D", "=", "=o"], assert);
});
QUnit.test("double arrow mixed +--1", function( assert ) {
	testSplitDoubleHeadedArrow("+--1", ["--+", "--", "--1"], assert);
});
QUnit.test("double arrow mixed 11*N", function( assert ) {
	testSplitDoubleHeadedArrow("11*N", ["*11", "*", "*N"], assert);
});
QUnit.test("double arrow mixed 01-1N", function( assert ) {
	testSplitDoubleHeadedArrow("01-1N", ["-10", "-", "-1N"], assert);
});
QUnit.test("double arrow mixed 0N=>", function( assert ) {
	testSplitDoubleHeadedArrow("0N=>", ["=N0", "=", "=>"], assert);
});

