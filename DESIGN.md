# Design of Pinker

This document records design decisions and why they were made.

## Path Finding

Pinker prioritizes speed over perfection. 

The first priority is to get a legible diagram in front of the user as fast as possible. 'Legible' here means that all the information they specified is visible. For instance, every relationship specified is shown with an arrow, even if the arrow is cutting straight across the diagram in an ugly way.

The second priority is elegant display. That means that arrows don't overlap boxes, they route around them.

To achieve speed over perfection, the standard path-finding algorithms are not used. Instead, a series of common use-cases are checked for. If one suffices, it is used. If none suffice, a straight arrow is drawn across the diagram.

## 3rd Party Code

This project does not depend on any 3rd party code. All code used by Pinker is in the control of the Pinker programmers.

This avoids the problem of being limited by the limits of the 3rd party tools.

## Source Code Organization

Pinker is deployed as a single file with no dependencies. This is the easiest format for a client to use; they just need to include one js file in their website.

Therefore, Pinker does not use Modules. There is no import/export because everything is in one file, and that design pattern is for organization across multiple files.

However, there is still great value in dividing source code into multiple files, both for ease of searching and to enforce separation of concerns. Thus, Pinker's source is literally sliced into multiple files, for ease of development, and is concatenated back together for deployment. 

(There is a little more logic than just concatenation, to enclose as much logic as possible in a private scope.)

## CORS Load and Render

Ideally, I wanted the text source files to be separate from the HTML rendering. This would have been better organized (from a source control standpoint) and would have enabled multiple HTML pages referencing the same source.

This render option worked briefly in FireFox, but it doesn't anymore. You can see the loaded document in the browser and inspector, but JavaScript is not given access to it.

So this option has been removed:
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