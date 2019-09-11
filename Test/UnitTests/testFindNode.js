QUnit.test("FindNode: testable", function( assert ) {
	assert.ok(pinker.Node != undefined && pinker.Node != null, "Passed");
	assert.ok(pinker.FindNode != undefined && pinker.FindNode != null, "Passed");
});

function testFindNode(nodeArray, searchPath, currentPath, expected, assert) {
	const result = pinker.FindNode.findNode(nodeArray, searchPath, currentPath);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("FindNode.findNode");
QUnit.test("relative address under top-level alias", function( assert ) {
	let root = pinker.Node.create("Label-A", "{Alias-A}");
	let child = pinker.Node.create("Label-B", null);
	root.nodes.push(child);
	testFindNode([root, child], "[Label-B]", "{Alias-A}", child, assert);
});
QUnit.test("relative address under second-level alias", function( assert ) {
	let root = pinker.Node.create("Label-A", null);
	let child = pinker.Node.create("Label-B", "{Alias-B}");
	let grandChild = pinker.Node.create("Label-C", null);
	root.nodes.push(child);
	child.nodes.push(grandChild);
	testFindNode([root, child, grandChild], "[Label-C]", "{Alias-B}", grandChild, assert);
});

function testFindNodeAliasPath(rootNode, aliasPath, expected, assert) {
	const result = pinker.FindNode.findNodeAliasPath(rootNode, aliasPath);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("FindNode.findNodeAliasPath");
QUnit.test("alias matches root", function( assert ) {
	let root = pinker.Node.create("Label", "{Alias}");
	testFindNodeAliasPath([root], "{Alias}", root, assert);
});
QUnit.test("alias matches child (1st generation)", function( assert ) {
	let root = pinker.Node.create("Label", "{Alias-A}");
	let child = pinker.Node.create("Label", "{Alias-B}");
	root.nodes.push(child);
	testFindNodeAliasPath([root, child], "{Alias-B}", child, assert);
});
QUnit.test("alias matches root, path matches child (1st generation)", function( assert ) {
	let root = pinker.Node.create("Label-A", "{Alias-A}");
	let child = pinker.Node.create("Label-B", "{Alias-B}");
	root.nodes.push(child);
	testFindNodeAliasPath([root, child], "{Alias-A}.[Label-B]", child, assert);
});
QUnit.test("alias matches child (1st generation), path matches child (2nd generation)", function( assert ) {
	let root = pinker.Node.create("Label-A", "{Alias-A}");
	let child = pinker.Node.create("Label-B", "{Alias-B}");
	let grandChild = pinker.Node.create("Label-C", "{Alias-C}");
	root.nodes.push(child);
	child.nodes.push(grandChild);
	testFindNodeAliasPath([root, child, grandChild], "{Alias-B}.[Label-C]", grandChild, assert);
});
