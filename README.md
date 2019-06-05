# Pinker

A standalone JavaScript library for rendering code/class diagrams on your web page.

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
			Relations:
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
			Relations:
				[A]->[B]
		</pre>
	</body>
</html>
<script type='text/javascript'>
	pinker.render();
</script>
```

You can also separate your diagram sources into text files and include them in your web page. _In testing, this worked in FireFox, but did not work in Chrome._ [Demo](Demo/RenderSyntax_FromFile.html)

```
<html>
	<head>
		<script src='Pinker.js'></script>
	</head>
	<body>
		<object id='Source01' type="text/plain" data="Diagram01.txt" class="pinker"></object>
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

### Line Types

Solid line: `->`

Dashed line: `=>` or `-->`

Any kind of line can be combined with any kind of arrow. Leave off the arrow-head for a plain line.

### Single-Level Diagram

In a single-level diagram, all scopes are at the same level of detail.

The source is made up of a **Layout** section and a **Relations** section. Each section header ends with a colon and an end-line.

```
Layout:
	[A][B][C]
	[D]...[E]
Relations:
	[A]->[B],[D]
	[B]->[C]
	[C]->[E]
```

The **Layout** section defines the basic visual relationship of the scopes.

All layouts are divided into horizontal rows. In this example, row 1 is made up of scopes `[A]`, `[B]`, and `[C]` laid out left to right. Row 2 is made up of scope `[D]` aligned to the left and scope `[E]` aligned to the right. The ellipses **...** indicate the alignment change from left (the default) to right.

The **Relations** section defines connections between scopes. Each line in this section starts with 1 scope and an arrow type, followed by a comma-delimited list of other scopes. An arrow will be drawn from the starting scope to each of the other scopes.

The **Relations** section is optional.

### Multi-Level Diagram

In a multi-level diagram, scopes can be nested inside scopes. You can create any level of nesting.

To nest a diagram within a scope, create a **section** with the same label as the enclosing scope. 

To reference a nested scope, specify the entire path to the scope using period-delimiters. For example, `[D]` is nested inside `[A]` so it is referenced as `[A.D]`. 

```
Layout:
	[A][B]
Relations:
	[A]->[B]
[A]:
	Layout:
		[C][D]
	Relations:
		[C]->[D]
		[C]->[D.G]
[B]:
	Layout:
		[E][F]
	Relations:
		[E]->[F]
[A.D]:
	Layout:
		[G]
		[H]
		[I]
	Relations:
		[H]->[G],[I]
```

Relations can be made across scopes. For example, `[C]` has a relation to `[A.D.G]`. Since `[C]` and `[D]` exist in the same scope, the relative reference `[D.G]` is sufficient. Relative references will be checked before global references.

### Aliases

Since some labels can be very long, Pinker supports **aliases**.

**Aliases** are labels surrounded by curly braces **{}**. They are defined at the very beginning of a scope label. An alias can include any characters except curly braces, square braces, and end-lines.

When referencing an aliased scope in either a section header or a relation, write `{A}` instead of `[A]`.

**Aliases** are all global and must be unique to a diagram. When you use an alias in a relation, you never include the full path to the alias. For example, `[D]->{C}` instead of `[D]->[A].{C}`.

```
Layout:
	[{A}Some Very Long Label][{B}Another Very Long Label]
Relations:
	{A}->{B}
{A}:
	Layout:
		[{C}More Long Labels]
{B}:
	Layout:
		[D]
	Relations:
		[D]->{C}
	
```

## Configuration

```
pinker.config.attribute = value;
```

| Attribute | Data Type | Description |
| --------- | --------- | ----------- |
|**fontSize**|integer or float|font size in pixels|
|**fontFamily**|string|font family|
|**scopeMargin**|integer or float|minimum space around each scope|
|**scopePadding**|integer or float|minimum space between scope boundary and scope contents|
|**canvasPadding**|integer or float|minimum space between canvas boundary and scopes|
|**backgroundColor**|string, like "#FFFFFF"|diagram background color|
|**shadeColor**|string, like "#FFFFFF"|accent color|
|**lineColor**|string, like "#000000"|line and text color|
|**lineDashLength**|integer or float|length of a dash in pixels|
|**lineDashSpacing**|integer or float|length of space between dashes in pixels|
|**estimateFontHeight**|function()|returns height of font in pixels|
