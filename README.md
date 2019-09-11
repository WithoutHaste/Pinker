# Pinker

A standalone JavaScript library for rendering code/class diagrams on your web page. [View Examples](http://withouthaste.com/pinker/index.html)

Pinker gives the user control over the layout of the diagram, so you can render more complicated diagrams.

Supports: UML diagrams, nested scopes, arrows crossing scopes, and aliases.

Since Pinker has a plain-text format, it is version-control-friendly.

## Using Pinker in a Web Page

### Draw-Syntax

Specify exactly when and how Pinker diagrams should be drawn. [Demo](Demo/DrawSyntax.html)

```
<html>
	<head>
		<script src='Pinker.js'></script>
	</head>
	<body>
		<pre id='Source01'>
			Layout:
				[A][B]
			Relate:
				[A]->[B]
		</pre>
		<canvas id='Canvas01'></canvas>
		<script>
			var canvas = document.getElementById("Canvas01");
			var source = document.getElementById("Source01").innerHTML;
			pinker.draw(canvas, source);
		</script>
	</body>
</html>
```

### Render-Syntax

Every `<pre class='pinker'>` element will be rendered as a Pinker diagram. The diagram source will be replaced with the resulting `<canvas>` element. [Demo](Demo/RenderSyntax.html)

```
<html>
	<head>
		<script src='Pinker.js'></script>
	</head>
	<body>
		<pre id='Source01' class='pinker'>
			Layout:
				[A][B]
			Relate:
				[A]->[B]
		</pre>
	</body>
</html>
<script type='text/javascript'>
	pinker.render();
</script>
```

## Pinker Syntax

Indentation is not important; you can use indentation to make the source more legible.

End-lines are important.

Pinker will render as much of a diagram as it can make sense of. If parts of the source conflict with each other, Pinker will render the first/earlier part of the source.

### Source

The **source** is the text/string that describes your diagram.

Most of the examples below are of **sources**.

### Scope

A **scope** is an enclosing rectangle/shape around zero or more scopes. Scopes cannot partially overlap.

Scopes are delimited by square brackets **[]**.

The simplest scope just contains a label. Labels can be made of any characters except square brackets and end-lines.

```
[Scope Label]
```

### Arrow Types

Plain arrow, for associations: `->`

Hollow arrow, for inheritance: `-D` or `-:>` (upper case letter D)

Hollow diamond, for aggregation: `-o` (lower case letter O)

Filled diamond, for composition: `-+`

Quantity 1: `-1`

Quantity Mandatory 1: `-11`

Quantity Many: `-N`

Quantity 0 or 1: `-01`

Quantity 1 to Many: `-1N`

Quantity 0 to Many: `-0N`

Arrows can point right or left, and can be double-headed, such as `<:->`.

### Line Types

Solid line: `->`

Dashed line: `=>` or `-->`

Dotted line: `*>`

Any kind of line can be combined with any kind of arrow. Leave off the arrow-head for a plain line.

### Single-Level Diagram

In a single-level diagram, all scopes are at the same level of detail.

The source is made up of a **Layout** section and a **Relate** section. Each section header ends with a colon and an end-line.

```
Layout:
	[A][B][C]
	[D]...[E]
Relate:
	[A]->[B],[D]
	[B]->[C]
	[C],[D]->[E]
```

The **Layout** section defines the basic visual relationship of the scopes.

All layouts are divided into horizontal rows. In this example, row 1 is made up of scopes `[A]`, `[B]`, and `[C]` laid out left to right. Row 2 is made up of scope `[D]` aligned to the left and scope `[E]` aligned to the right. The ellipses **...** indicate the alignment change from left (the default) to right.

The **Relate** section defines connections between scopes. Each line in this section starts with 1 scope and an arrow type, followed by a comma-delimited list of other scopes. An arrow will be drawn from the starting scope to each of the other scopes.

The **Relate** section is optional.

### Multi-Level Diagram

In a multi-level diagram, scopes can be nested inside scopes. You can create any level of nesting.

To nest a diagram within a scope, create a **section** with the same label as the enclosing scope. 

To reference a nested scope, specify the entire path to the scope using period-delimiters. For example, `[D]` is nested inside `[A]` so it is referenced as `[A.D]`. 

```
Layout:
	[A][B]
Relate:
	[A]->[B]
[A]:
	Layout:
		[C][D]
	Relate:
		[C]->[D]
		[C]->[D.G]
[B]:
	Layout:
		[E][F]
	Relate:
		[E]->[F]
[A.D]:
	Layout:
		[G]
		[H]
		[I]
	Relate:
		[H]->[G],[I]
```

Relations can be made across scopes. For example, `[C]` has a relation to `[A.D.G]`. Since `[C]` and `[D]` exist in the same scope, the relative reference `[D.G]` is sufficient. Relative references will be checked before global references.

### Labels on Lines

A line between two scopes can be labeled at the start, in the middle, and/or at the end. 

Labels are defined on the same source row as the relationship, after a whitespace. Labels are surrounded by double-quotes and are separated by colons.

```
Relate:
	[A1]->[A2] "middle label"
	[B1]->[B2] :"middle label":
	[C1]->[C2] "start label":"middle label":"end label"
	[D1]->[D2] "start label"::"end label"
	[E1]->[E2] "start label":"end label"
	[F1]->[F2] "start label":
	[G1]->[G2] :"end label"
```

An arrow that points to the left, such as `[A]<-[B]`, still "starts" at `[A]` and "ends" at `[B]`.

### Aliases

Since some labels can be very long, Pinker supports **aliases**.

**Aliases** are labels surrounded by curly braces **{}**. They are defined at the very beginning of a scope label. An alias can include any characters except curly braces, square braces, and end-lines.

When referencing an aliased scope in either a section header or a relation, write `{A}` instead of `[A]`.

**Aliases** are all global and must be unique to a diagram. When you use an alias in a relation, you never include the full path to the alias. For example, `[D]->{C}` instead of `[D]->[A].{C}`.

```
Layout:
	[{A}Some Very Long Label][{B}Another Very Long Label]
Relate:
	{A}->{B}
{A}:
	Layout:
		[{C}More Long Labels]
{B}:
	Layout:
		[D]
	Relate:
		[D]->{C}
	
```

A relative reference may start from any **alias**. The syntax is `{A}.[B.C]` where `{A}` is the global alias and `[B.C]` is the rest of the path from that point, with scope `[C]` nested in scope `[B]`.

### Definitions

To include more than a label in a scope, add a **Define** section. This section is optional.

A definition can contain any number of lines of text. This text will be displayed as-is, with no line-wrapping. Empty lines, leading space, and trailing space will be ignored.

The pipe **|** character inserts a horizontal rule between lines of text. It can appear at the end of the previous line, the beginning of the next line, or on its own line.

```
Layout:
	[A][B]
Relate:
	[B]->[A]
[A]:
	Define:
		+ field01
		+ field02
		|+ method01
		- method02
[B]:
	Define:
		+ field01
```

## Configuration

Changing individual configuration settings: `pinker.config.attribute = value;`  

Passing multiple configuration settings:  
`pinker.draw(canvasElement, sourceText, options);`  
`pinker.render(options);`  

| Attribute | Data Type | Description |
| --------- | --------- | ----------- |
|**fontSize**|integer or float|font size in pixels|
|**fontFamily**|string|font family|
|**scopeMargin**|integer or float|minimum space around each scope|
|**scopePadding**|integer or float|minimum space between scope boundary and nested scopes|
|**labelPadding**|integer or float|minimum space between scope boundary and text areas|
|**canvasPadding**|integer or float|minimum space between canvas boundary and scopes|
|**backgroundColor**|string, like "#FFFFFF"|diagram background color|
|**shadeColor**|string, like "#FFFFFF"|accent color|
|**lineColor**|string, like "#000000"|line and text color|
|**lineWeight**|integer or float|line weight of lowest-level scopes in pixels|
|**lineDashLength**|integer or float|length of a dash in pixels|
|**lineDashSpacing**|integer or float|length of space between dashes in pixels|
|**arrowHeadArea**|integer or float|pixels-squared area of an arrow head|
|**estimateFontHeight**|function()|returns height of font in pixels|
|**lineSpacing**|function()|returns padding distance between lines of text in pixels|
|**favorGoldenRatioLabelSize**|boolean|should multi-line labels be arranged with a width:height ratio close to 1.6?|
|**favorUniformNodeSizes**|boolean|should sibling-nodes be resized to appear similar?|
|**useSmartArrows**|boolean|instead of drawing straight lines between scopes, draw arrows to route around scopes|
|**keepSource**|boolean|on render(), add the diagram next to the source instead of overwriting the source|

## License

[MIT License](https://github.com/WithoutHaste/Pinker/blob/master/LICENSE)

## Donate

[Become a patron](https://www.patreon.com/withouthaste) of this and other Without Haste open source projects.

## Version Notes

Uses [Semantic Versioning 2.0.0](https://semver.org/).

To see what version you are using: `let v = pinker.version;`

In Progress - v1.4.0
- bug fix #7: dividing line (from Define section) sometimes not centered in node
- bug fix #6: trailing whitespace in source cause parsing errors
- bug fix #4: Relate fails to find local address under non-first-level alias
- bug fix: removed CORS render option which is no longer supported in FireFox

[Labels and Relations - v1.3.0](https://github.com/WithoutHaste/Pinker/releases/tag/v1.3.0)  
- support labels on relationship lines/arrows
- support passing multiple options into render() and draw()
- support arrows pointing right or left; support double-headed arrows
- support lists on both sides of a Relate line
- support dotted lines
- support quantitative arrows
- bug fix: parsing Relate row when label contains a comma
- refactoring
- test cases

[Smart Arrows - v1.2.0](https://github.com/WithoutHaste/Pinker/releases/tag/v1.2.0)  
- support for curl, elbow, and zigzag SmartArrows
- spread out coincident paths (vertical, horizontal) with or without SmartArrows
- additional option for .render() and .draw(): do not overwrite the source
- config option: "useSmartArrows" turns SmartArrows on/off
- config option: "labelPadding" for padding around text blocks
- bug fix: finding scopes by relative paths
- bug fix: finding scopes by aliased paths
- bug fix: aliased scopes

[Improved Layout - v1.1.0](https://github.com/WithoutHaste/Pinker/releases/tag/v1.1.0)  
- favor horizontal/vertical lines over angled lines
- favor golden-ratio labels
- favor more homogeneous scope sizes
- update plain arrow head for visibility
- update arrow head sizes to be more regular
- clean up define-section layout
- center sub-diagrams in each scope
- move more layout control into `pinker.config`
- refactoring

[Initial Release - v1.0.0](https://github.com/WithoutHaste/Pinker/releases/tag/v1.0.0)  
- single-file JavaScript library with no dependencies
- generate code/UML diagrams from plain text
- supports nested scopes to any level
- supports arrows across scopes
- supports aliases
