QUnit.test("NodeObject: testable", function( assert ) {
	assert.ok(pinker.Node != undefined && pinker.Node != null, "Passed");
});

function testNodeFindAlias(rootNode, alias, expected, assert) {
	const result = rootNode.findAlias(alias);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("NodeObject.findAlias");
QUnit.test("alias is null", function( assert ) {
	let root = pinker.Node.create("Label", "Alias");
	testNodeFindAlias(root, null, null, assert);
});
QUnit.test("alias matches root node", function( assert ) {
	let root = pinker.Node.create("Label", "Alias");
	testNodeFindAlias(root, "Alias", root, assert);
});
QUnit.test("alias matches child node, 1 remove", function( assert ) {
	let root = pinker.Node.create("Label", "Alias-A");
	let child = pinker.Node.create("Label", "Alias-B");
	root.nodes.push(child);
	testNodeFindAlias(root, "Alias-B", child, assert);
});
QUnit.test("alias matches child node, 1 remove, root no alias", function( assert ) {
	let root = pinker.Node.create("Label", null);
	let child = pinker.Node.create("Label", "Alias-B");
	root.nodes.push(child);
	testNodeFindAlias(root, "Alias-B", child, assert);
});
