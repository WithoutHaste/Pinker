QUnit.test("RelateRecord: testable", function( assert ) {
	assert.ok(pinker.RelateRecord != undefined && pinker.RelateRecord != null, "Passed");
});

function testParseListOfTerms(text, expected, assert) {
	const result = pinker.RelateRecord.parseListOfTerms(text);
	assert.deepEqual(result[0], expected, "Passed");
}
QUnit.module("RelateRecord.parseListOfTerms");
QUnit.test("one scope", function( assert ) {
	testParseListOfTerms("[A]", ["[A]"], assert);
});
QUnit.test("one scope path", function( assert ) {
	testParseListOfTerms("[A.B]", ["[A.B]"], assert);
});
QUnit.test("one alias", function( assert ) {
	testParseListOfTerms("{A}", ["{A}"], assert);
});
QUnit.test("one alias path", function( assert ) {
	testParseListOfTerms("{A}.[B]", ["{A}.[B]"], assert);
});
QUnit.test("one alias path, longer", function( assert ) {
	testParseListOfTerms("{A}.[B.C]", ["{A}.[B.C]"], assert);
});
QUnit.test("spaces in label", function( assert ) {
	testParseListOfTerms("[A B]", ["[A B]"], assert);
});
QUnit.test("commas in label", function( assert ) {
	testParseListOfTerms("[A,B]", ["[A,B]"], assert);
});
QUnit.test("hyphens in label", function( assert ) {
	testParseListOfTerms("[A-B]", ["[A-B]"], assert);
});
QUnit.test("underscores in label", function( assert ) {
	testParseListOfTerms("[A_B]", ["[A_B]"], assert);
});
QUnit.test("open curly braces in label", function( assert ) {
	testParseListOfTerms("[A{B]", ["[A{B]"], assert);
});
QUnit.test("close curly braces in label", function( assert ) {
	testParseListOfTerms("[A}B]", ["[A}B]"], assert);
});
QUnit.test("full curly braces in label", function( assert ) {
	testParseListOfTerms("[A{B}]", ["[A{B}]"], assert);
});
QUnit.test("leading space ignored", function( assert ) {
	testParseListOfTerms(" [A]", ["[A]"], assert);
});
QUnit.test("leading comma ignored", function( assert ) {
	testParseListOfTerms(",[A]", ["[A]"], assert);
});
QUnit.test("trailing space ignored", function( assert ) {
	testParseListOfTerms("[A] ", ["[A]"], assert);
});
QUnit.test("trailing comma ignored", function( assert ) {
	testParseListOfTerms("[A],", ["[A]"], assert);
});
QUnit.test("multiple terms: scope, scope", function( assert ) {
	testParseListOfTerms("[A],[B]", ["[A]","[B]"], assert);
});
QUnit.test("multiple terms: scope, scope path", function( assert ) {
	testParseListOfTerms("[A],[B.C]", ["[A]","[B.C]"], assert);
});
QUnit.test("multiple terms: scope path, scope", function( assert ) {
	testParseListOfTerms("[A.B],[C]", ["[A.B]","[C]"], assert);
});
QUnit.test("multiple terms: scope, alias", function( assert ) {
	testParseListOfTerms("[A],{B}", ["[A]","{B}"], assert);
});
QUnit.test("multiple terms: scope, alias path", function( assert ) {
	testParseListOfTerms("[A],{B}.[C]", ["[A]","{B}.[C]"], assert);
});
QUnit.test("multiple terms: alias, scope", function( assert ) {
	testParseListOfTerms("{A},[B]", ["{A}","[B]"], assert);
});
QUnit.test("multiple terms: alias path, scope", function( assert ) {
	testParseListOfTerms("{A}.[B],[C]", ["{A}.[B]","[C]"], assert);
});
QUnit.test("inner spaces ignored", function( assert ) {
	testParseListOfTerms("[A], [B]", ["[A]","[B]"], assert);
});
QUnit.test("inner spaces ignored", function( assert ) {
	testParseListOfTerms("[A] ,[B]", ["[A]","[B]"], assert);
});
QUnit.test("inner spaces ignored", function( assert ) {
	testParseListOfTerms("[A] , [B]", ["[A]","[B]"], assert);
});

function testParseRelation(text, expected, assert) {
	const result = pinker.RelateRecord.parseRelation(text);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("RelateRecord.parseRelation");
QUnit.test("scope - arrow - scope", function( assert ) {
	testParseRelation("[A]->[B]", [["[A]"], "->", ["[B]"], ""], assert);
});
QUnit.test("scope - arrow - scope path", function( assert ) {
	testParseRelation("[A]->[B.C]", [["[A]"], "->", ["[B.C]"], ""], assert);
});
QUnit.test("alias - arrow - scope", function( assert ) {
	testParseRelation("{A}->[B]", [["{A}"], "->", ["[B]"], ""], assert);
});
QUnit.test("alias - arrow - alias", function( assert ) {
	testParseRelation("{A}->{B}", [["{A}"], "->", ["{B}"], ""], assert);
});
QUnit.test("alias - arrow - alias path", function( assert ) {
	testParseRelation("{A}->{B}.[C]", [["{A}"], "->", ["{B}.[C]"], ""], assert);
});
QUnit.test("scope - arrow - scope,scope", function( assert ) {
	testParseRelation("[A]->[B],[C]", [["[A]"], "->", ["[B]","[C]"], ""], assert);
});
QUnit.test("scope,scope - arrow - scope,scope", function( assert ) {
	testParseRelation("[A],[B]->[C],[D]", [["[A]","[B]"], "->", ["[C]","[D]"], ""], assert);
});
QUnit.test("scope,alias - arrow - alias,scope", function( assert ) {
	testParseRelation("[A],{B}->{C},[D]", [["[A]","{B}"], "->", ["{C}","[D]"], ""], assert);
});
QUnit.test("scope path,scope path - arrow - scope path,scope path", function( assert ) {
	testParseRelation("[A.B],[C.D]->[E.F],[G.H]", [["[A.B]","[C.D]"], "->", ["[E.F]","[G.H]"], ""], assert);
});
QUnit.test("commas in labels", function( assert ) {
	testParseRelation("{A,A}->[B,B]", [["{A,A}"], "->", ["[B,B]"], ""], assert);
});
QUnit.test("curly braces in labels", function( assert ) {
	testParseRelation("[A{A}]->[{B{B],[}C}C]", [["[A{A}]"], "->", ["[{B{B]","[}C}C]"], ""], assert);
});
QUnit.test("multiple arrows together", function( assert ) {
	testParseRelation("[A]->->[B]", [["[A]"], "->->", ["[B]"], ""], assert);
});
QUnit.test("multiple arrows spread out", function( assert ) {
	testParseRelation("[A]->[B]->[C]", [["[A]"], "->", ["[B]"], "->[C]"], assert);
});
QUnit.test("no start term", function( assert ) {
	testParseRelation("->[B]", [[], "->", ["[B]"], ""], assert);
});
QUnit.test("no end term", function( assert ) {
	testParseRelation("[A]->", [["[A]"], "->", [], ""], assert);
});
QUnit.test("extra delimiter spaces", function( assert ) {
	testParseRelation("[A] , [B] -> [C] , [D]", [["[A]","[B]"], "->", ["[C]","[D]"], ""], assert);
});
QUnit.test("extra delimiter commas", function( assert ) {
	testParseRelation(",[A], , [B] ->[C],, , [D],,", [["[A]","[B]"], "->", ["[C]","[D]"], ""], assert);
});
QUnit.test("labels after relation", function( assert ) {
	testParseRelation("[A]->[B] \"middle label\"", [["[A]"], "->", ["[B]"], "\"middle label\""], assert);
});

function testParseLabels(text, expected, assert) {
	const result = pinker.RelateRecord.parseLabels(text);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("RelateRecord.parseLabels");
QUnit.test("just middle label", function( assert ) {
	testParseLabels("\"middle label\"", [null, "middle label", null], assert);
});
QUnit.test("fully delimited middle label", function( assert ) {
	testParseLabels(":\"middle label\":", [null, "middle label", null], assert);
});
QUnit.test("all three labels", function( assert ) {
	testParseLabels("\"start label\":\"middle label\":\"end label\"", ["start label", "middle label", "end label"], assert);
});
QUnit.test("fully delimited middle and end labels", function( assert ) {
	testParseLabels(":\"middle label\":\"end label\"", [null, "middle label", "end label"], assert);
});
QUnit.test("fully delimited start and middle labels", function( assert ) {
	testParseLabels("\"start label\":\"middle label\":", ["start label", "middle label", null], assert);
});
QUnit.test("fully delimited start and end labels", function( assert ) {
	testParseLabels("\"start label\"::\"end label\"", ["start label", null, "end label"], assert);
});
QUnit.test("partially delimited start and end labels", function( assert ) {
	testParseLabels("\"start label\":\"end label\"", ["start label", null, "end label"], assert);
});
QUnit.test("partially delimited start label", function( assert ) {
	testParseLabels("\"start label\":", ["start label", null, null], assert);
});
QUnit.test("fully delimited start label", function( assert ) {
	testParseLabels("\"start label\"::", ["start label", null, null], assert);
});
QUnit.test("partially delimited end label", function( assert ) {
	testParseLabels(":\"end label\"", [null, null, "end label"], assert);
});
QUnit.test("fully delimited end label", function( assert ) {
	testParseLabels("::\"end label\"", [null, null, "end label"], assert);
});
QUnit.test("no match", function( assert ) {
	testParseLabels("->[C]", [null, null, null], assert);
});
QUnit.test("extra spaces between labels", function( assert ) {
	testParseLabels("  \"start label\" :  \"middle label\" :  \"end label\" ", ["start label", "middle label", "end label"], assert);
});
QUnit.test("extra spaces within labels", function( assert ) {
	testParseLabels("\"  start label \":\"  middle label \":\"  end label \"", ["start label", "middle label", "end label"], assert);
});

function testParseLine(text, expected, assert) {
	const result = pinker.RelateRecord.parseLine(text);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("RelateRecord.parseLine");
QUnit.test("single relation, no labels", function( assert ) {
	testParseLine("[A]->[B]", [pinker.RelateRecord.create("A", "->", "B")], assert);
});
QUnit.test("single relation, middle label", function( assert ) {
	testParseLine("[A]->[B] \"middle label\"", [pinker.RelateRecord.create("A", "->", "B", null, "middle label", null)], assert);
});
QUnit.test("single relation, all labels", function( assert ) {
	testParseLine("[A]->[B] \"start label\":\"middle label\":\"end label\"", [pinker.RelateRecord.create("A", "->", "B", "start label", "middle label", "end label")], assert);
});
QUnit.test("single relation, extra spaces around label", function( assert ) {
	testParseLine("[A]->[B]    \"middle label\"  ", [pinker.RelateRecord.create("A", "->", "B", null, "middle label", null)], assert);
});
QUnit.test("single relation, plus junk", function( assert ) {
	testParseLine("[A]->[B]->[C]", [pinker.RelateRecord.create("A", "->", "B", null, null, null)], assert);
});
