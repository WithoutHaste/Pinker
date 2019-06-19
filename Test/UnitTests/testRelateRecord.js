QUnit.test("RelateRecord: testable", function( assert ) {
	assert.ok(pinker.RelateRecord != undefined && pinker.RelateRecord != null, "Passed");
});
// parseEndTerms
QUnit.test("RelateRecord: one scope", function( assert ) {
	const text = "[A]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: one scope path", function( assert ) {
	const text = "[A.B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A.B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: one alias", function( assert ) {
	const text = "{A}";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["{A}"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: one alias path", function( assert ) {
	const text = "{A}.[B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["{A}.[B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: one alias path, longer", function( assert ) {
	const text = "{A}.[B.C]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["{A}.[B.C]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: spaces in label", function( assert ) {
	const text = "[A B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: commas in label", function( assert ) {
	const text = "[A,B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A,B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: hyphens in label", function( assert ) {
	const text = "[A-B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A-B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: underscores in label", function( assert ) {
	const text = "[A_B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A_B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: open curly braces in label", function( assert ) {
	const text = "[A{B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A{B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: close curly braces in label", function( assert ) {
	const text = "[A}B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A}B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: full curly braces in label", function( assert ) {
	const text = "[A{B}]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A{B}]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: leading space ignored", function( assert ) {
	const text = " [A]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: leading comma ignored", function( assert ) {
	const text = ",[A]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: trailing space ignored", function( assert ) {
	const text = "[A] ";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: trailing comma ignored", function( assert ) {
	const text = "[A],";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: multiple terms: scope, scope", function( assert ) {
	const text = "[A],[B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]","[B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: multiple terms: scope, scope path", function( assert ) {
	const text = "[A],[B.C]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]","[B.C]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: multiple terms: scope path, scope", function( assert ) {
	const text = "[A.B],[C]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A.B]","[C]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: multiple terms: scope, alias", function( assert ) {
	const text = "[A],{B}";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]","{B}"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: multiple terms: scope, alias path", function( assert ) {
	const text = "[A],{B}.[C]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]","{B}.[C]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: multiple terms: alias, scope", function( assert ) {
	const text = "{A},[B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["{A}","[B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: multiple terms: alias path, scope", function( assert ) {
	const text = "{A}.[B],[C]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["{A}.[B]","[C]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: inner spaces ignored", function( assert ) {
	const text = "[A], [B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]","[B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: inner spaces ignored", function( assert ) {
	const text = "[A] ,[B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]","[B]"];
	assert.deepEqual(result, expected, "Passed");
});
QUnit.test("RelateRecord: inner spaces ignored", function( assert ) {
	const text = "[A] , [B]";
	const result = pinker.RelateRecord.parseEndTerms(text);
	const expected = ["[A]","[B]"];
	assert.deepEqual(result, expected, "Passed");
});
