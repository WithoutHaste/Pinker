
//render all sources onto new canvases
pinker.render = function(options={}) {
	let pinkerElements = document.getElementsByClassName("pinker");
	for(let i = 0; i < pinkerElements.length; i++)
	{
		let pinkerElement = pinkerElements[i];
		switch(pinkerElement.tagName)
		{
			case "PRE": renderFromPre(pinkerElement, options); break;
			default: displayError("unknown tag skipped (id:"+pinkerElement.id+")"); break;
		}
	}
};

function renderFromPre(preElement, options={}) {
	Object.assign(pinker.config, options);
	const sourceText = preElement.innerHTML;
	const canvasElement = document.createElement("canvas");
	if(preElement.id != null)
		canvasElement.id = "canvas-" + preElement.id;
	if(pinker.config.keepSource)
	{
		//insert canvas after pre element
		preElement.parentNode.insertBefore(canvasElement, preElement.nextSibling); //verified nextSibling doesn't have to exist
	}
	else
	{
		//insert canvas into pre element
		preElement.innerHTML = null;
		preElement.appendChild(canvasElement);
	}
	pinker.draw(canvasElement, sourceText);
}

//works in FireFox but fails in Chrome due to CORS (cross-site data access rules)
function renderFromObject(objectElement, options={}) {
	Object.assign(pinker.config, options);
	const sourceDocument = objectElement.contentDocument || objectElement.contentWindow.document;
	let container = sourceDocument.getElementsByTagName('body')[0];
	while(container.children.length > 0)
	{
		container = container.children[0];
	}
	const sourceText = container.innerHTML;
	const canvasElement = document.createElement("canvas");
	if(objectElement.id != null)
		canvasElement.id = "canvas-" + objectElement.id;
	if(pinker.config.keepSource)
	{
		//insert canvas after object element
		objectElement.parentNode.insertBefore(canvasElement, objectElement.nextSibling); //verified nextSibling doesn't have to exist
	}
	else
	{
		//replace object element with canvas
		objectElement.parentNode.insertBefore(canvasElement, objectElement);
		objectElement.parentNode.removeChild(objectElement);
	}
	pinker.draw(canvasElement, sourceText);
}

//draw on provided canvas with provided source
pinker.draw = function(canvasElement, sourceText, options={}) {
	Object.assign(pinker.config, options);
	sourceText = Source.decodeHtml(sourceText);
	const source = parseSource(sourceText);
	if(source.hasErrors)
	{
		source.errorMessages.forEach(function(errorMessage) {
			console.log(`Pinker Error on canvas '${canvasElement.id}': ${errorMessage}`);
		});
	}
	//displays what it can, despite errors
	updateCanvas(canvasElement, source);
};

function displayError(message) {
	console.log("Pinker Error: " + message);
}