// main test for fixVisAscii
// (c) 2021 Sébastien Bloc [sbloc@hotmail.com]
// released under the MIT license

function showError(message) {
	errorMessage.textContent=" /!\\ Error: " + message;
}

function dot2Svg(dot) {
	try {
		return Viz(dot, "svg");
	}
	catch(e) {
		showError(e.message);
		console.error(dot2Svg, e);
		return "<svg><text x='50' y='50'>ERROR</text></svg>";
	}
	//return "<svg><text x='50' y='50'>test</text></svg>"; // for test
}

// append svg fixed from dot
function dot2SvgFixed(dot) {
	var id = 0;
	var fix = new GraphvizUnicodeFix;	
	var dom = dotParse(dot);								// 1) parse original dot
	var dotFixed = dotSerialize(dom, (label, isHTML) => {	// 2) create a fixed dot (serialize with encoding label)
		id++;
		return {
			id: id,
			out: fix.parse(label, "id" + id, isHTML)
		};
	});
	var svgFixed = dot2Svg(dotFixed);						// 3) show svg with fixed dot
	document.body.appendChild(createNodeHtml(svgFixed));			
	fix.applySvg();											// 4) fix svg
}

// get ui & events
var source = document.getElementById("source");
var mode = document.getElementById("mode");
var always = document.getElementById("always");
source.onchange = test;
mode.onchange = test;
always.onchange = test;

var original = document.getElementById("original");
var final = document.getElementById("final");
var originalDot = document.getElementById("originalDot");
var finalDot = document.getElementById("finalDot");
var finalSvgReplace = document.getElementById("finalSvgReplace");
var errorMessage = document.getElementById("error");
var urlMessage = document.getElementById("url");

// init list of sources
for (var sourceName in dots) {
	var option = document.createElement("option");
	option.text = sourceName;
	source.add(option);
}
source.selectedIndex=0;
var debug=false; // general debug ?

// run first
test();

var fix;
function test() {
	// apply config
	var cfgSource 	= source.options[source.selectedIndex].value;		
	var cfgMode 	= mode.options[mode.selectedIndex].value;
	var cfgAlways 	= always.checked;
	var child;

	// remove previous
	child = original.children[0];
	if (child) original.removeChild(child)
	child = final.children[0];
	if (child) final.removeChild(child)
	finalDot.textContent = "";
	originalDot.textContent = "";
	finalSvgReplace.innerHTML = "";
	errorMessage.textContent= "";
	urlMessage.removeAttribute("href")
	urlMessage.text="";

	// run it !
	if (debug)
		console.log(`test, source:"${cfgSource}", mode:${cfgMode}, always: ${cfgAlways}`);
	// 1)
	if (debug)
		console.log("1) config");
	var dot = dots[cfgSource].dot;
	var url = dots[cfgSource].url;
	if (url) {
		urlMessage.href= url;
		urlMessage.text="(url)";
	}
	if (debug)
		console.log("dot", dot);
	originalDot.textContent = dot;

	// 2)
	if (debug)
		console.log("2) render original");
	var svgOriginal = dot2Svg(dot);
	original.appendChild(createNodeHtml(svgOriginal));

	// 3)
	if (debug)
		console.log("3) parse");
	var dom = dotParse(dot);
	if (debug)
		console.log("dom", dom);

	// 4)
	if (debug)
		console.log("4) apply fix on dot parsed");
	fix = new GraphvizUnicodeFix;
	fix.fixVizAscii = parseInt(cfgMode);
	fix.fixVizAsciiAlways = cfgAlways;
	var id = 0;
	labelChange = function(label, isHTML) {
		id++;
		if (debug)
			console.log("labelChange", label, "isHtml", isHTML, "id", id);
		//return label;
		var out = fix.parse(label, "id" + id, isHTML);
		if (debug)
			console.log("=>", out);
		return {out: out, id: id};
	}
		
	//var dotFixed = dotSerialize(dom);
	var dotFixed = dotSerialize(dom, labelChange);
	if (debug)
		console.log("svg node to fix", fix.nodeFix);
	finalDot.textContent = dotFixed;
	finalSvgReplace.innerHTML = fix.resumeNodeFix();
	if (debug)
		console.log("dotFixed", dotFixed);

	// 5)
	if (debug)
		console.log("5) render final");
	var svgFixed = dot2Svg(dotFixed);
	final.appendChild(createNodeHtml(svgFixed));

	// 6)
	if (debug)
		console.log("6) apply fix on svg");
	fix.applySvg();
}