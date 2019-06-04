# Pinker

A standalone JavaScript library for rendering code dependency diagrams on your web page.

Pinker gives the user control over the layout of the diagram, which enables it to render more complicated diagrams.

## Syntax

Indentation is not important; you can use indentation to make the source more legible.

End-lines are important.

### Source

The **source** is the text/string that describes your diagram.

Most of the examples below are of **sources**.

### Scope

A **scope** is an enclosing rectangle/shape around zero or more scopes. Scopes cannot partially overlap.

Scopes are delimited by square brackets **[]**.

The simplest scope just contains a label.

```
[Scope Label]
```

Pinker defaults to displaying labels as center-aligned single words.

### Arrow Types

Plain arrow, for associations: `->`

Hollow arrow, for inheritance: `-:>`

Hollow diamond, for aggregation: `-o` (lower case letter O)

Filled diamond, for composition: `-+`

### Line Types

Solid line: `->`

Dashed line: `-->`

Any kind of line can be combined with any kind of arrow.

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