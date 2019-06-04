# Pinker

A standalone JavaScript library for rendering code dependency diagrams on your web page.

Because Pinker pushes many of the layout decisions onto the user, it can render much more complicated diagrams than usual.

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