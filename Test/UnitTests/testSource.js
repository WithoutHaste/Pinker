QUnit.test("Source: testable", function( assert ) {
	assert.ok(pinker.Source != undefined && pinker.Source != null, "Passed");
});

function testSourceAppendToPath(source, prefix, expected, assert) {
	const result = source.appendToPath(prefix);
	assert.equal(result, expected, "Passed");
}
QUnit.module("Source.appendToPath");
QUnit.test("source has no alias, no prefix", function( assert ) {
	let source = pinker.Source.create("Label-A");
	source.alias = null;
	testSourceAppendToPath(source, null, "Label-A", assert);
});
QUnit.test("source has alias, no prefix", function( assert ) {
	let source = pinker.Source.create("Label-A");
	source.alias = "{Alias-A}";
	testSourceAppendToPath(source, null, "{Alias-A}", assert);
});
QUnit.test("source has no alias, alias prefix", function( assert ) {
	let source = pinker.Source.create("Label-A");
	source.alias = null;
	testSourceAppendToPath(source, "{Alias-Top}", "{Alias-Top}.Label-A", assert);
});
QUnit.test("source has alias, alias prefix", function( assert ) {
	let source = pinker.Source.create("Label-A");
	source.alias = "{Alias-A}";
	testSourceAppendToPath(source, "{Alias-Top}", "{Alias-A}", assert);
});
QUnit.test("source has no alias, label prefix", function( assert ) {
	let source = pinker.Source.create("Label-A");
	source.alias = null;
	testSourceAppendToPath(source, "Label-Top", "Label-Top.Label-A", assert);
});
QUnit.test("source has alias, label prefix", function( assert ) {
	let source = pinker.Source.create("Label-A");
	source.alias = "{Alias-A}";
	testSourceAppendToPath(source, "Label-Top", "{Alias-A}", assert);
});
