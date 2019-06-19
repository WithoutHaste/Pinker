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

function testParseLine(text, expected, assert) {
	const result = pinker.RelateRecord.parseLine(text);
	assert.deepEqual(result, expected, "Passed");
}
QUnit.module("RelateRecord.parseLine");
QUnit.test("scope - arrow - scope", function( assert ) {
	testParseLine("[A]->[B]", [["[A]"], "->", ["[B]"]], assert);
});
QUnit.test("scope - arrow - scope path", function( assert ) {
	testParseLine("[A]->[B.C]", [["[A]"], "->", ["[B.C]"]], assert);
});
QUnit.test("alias - arrow - scope", function( assert ) {
	testParseLine("{A}->[B]", [["{A}"], "->", ["[B]"]], assert);
});
QUnit.test("alias - arrow - alias", function( assert ) {
	testParseLine("{A}->{B}", [["{A}"], "->", ["{B}"]], assert);
});
QUnit.test("alias - arrow - alias path", function( assert ) {
	testParseLine("{A}->{B}.[C]", [["{A}"], "->", ["{B}.[C]"]], assert);
});
QUnit.test("scope - arrow - scope,scope", function( assert ) {
	testParseLine("[A]->[B],[C]", [["[A]"], "->", ["[B]","[C]"]], assert);
});
QUnit.test("scope,scope - arrow - scope,scope", function( assert ) {
	testParseLine("[A],[B]->[C],[D]", [["[A]","[B]"], "->", ["[C]","[D]"]], assert);
});
QUnit.test("scope,alias - arrow - alias,scope", function( assert ) {
	testParseLine("[A],{B}->{C},[D]", [["[A]","{B}"], "->", ["{C}","[D]"]], assert);
});
QUnit.test("scope path,scope path - arrow - scope path,scope path", function( assert ) {
	testParseLine("[A.B],[C.D]->[E.F],[G.H]", [["[A.B]","[C.D]"], "->", ["[E.F]","[G.H]"]], assert);
});
QUnit.test("commas in labels", function( assert ) {
	testParseLine("{A,A}->[B,B]", [["{A,A}"], "->", ["[B,B]"]], assert);
});
QUnit.test("curly braces in labels", function( assert ) {
	testParseLine("[A{A}]->[{B{B],[}C}C]", [["[A{A}]"], "->", ["[{B{B]","[}C}C]"]], assert);
});
QUnit.test("multiple arrows together", function( assert ) {
	testParseLine("[A]->->[B]", [["[A]"], "->->", ["[B]"]], assert);
});
QUnit.test("multiple arrows spread out", function( assert ) {
	testParseLine("[A]->[B]->[C]", [["[A]"], "->", ["[B]"]], assert);
});
QUnit.test("no start term", function( assert ) {
	testParseLine("->[B]", [[], "->", ["[B]"]], assert);
});
QUnit.test("no end term", function( assert ) {
	testParseLine("[A]->", [["[A]"], "->", []], assert);
});
QUnit.test("extra delimiter spaces", function( assert ) {
	testParseLine("[A] , [B] -> [C] , [D]", [["[A]","[B]"], "->", ["[C]","[D]"]], assert);
});
QUnit.test("extra delimiter commas", function( assert ) {
	testParseLine(",[A], , [B] ->[C],, , [D],,", [["[A]","[B]"], "->", ["[C]","[D]"]], assert);
});
