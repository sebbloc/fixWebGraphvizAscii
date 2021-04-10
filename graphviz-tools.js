// Graphviz tools 

// check if ascii only
function isAscii(source) {
	for (var letter of source) {
		if (letter.charCodeAt(0) > 127) return false;
	}
	return true;
}

// create a node from XML code
// /!\ a node have to exist on begin & end ex.: <div><a>coucou</a></div>
function createNodeXml(xml) {			
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(xml, "text/xml");
	return xmlDoc.children[0]; // xml
}

// create a node from HTML code
function createNodeHtml(html) {			
	var parser = new DOMParser();
	var xmlDoc = parser.parseFromString(html, "text/html");
	return xmlDoc.children[0].children[1].children[0]; // html/[head, body]
}

var erBR = /<BR\/>/i;
var erBN = /\n|\\n/;

/*
	viz.js workaround fix of unicode size letter detection:
	1) on DOT format: 
		compute equivalent of unicode width letters 
		to ascii (mostly with 'M' letter)

	2) on svg generated: 
		back to original unicode			
*/
class GraphvizUnicodeFix {
	constructor(options) {
		if (!options) {
			options = { 
				font: "Helvetica,sans-serif",
				size: 20 ,
				fixVizAscii: 1, // 0: only apply normalization, 1: apply, 2: for debug
				fixVizAsciiAlways: true, // todo false: not working yet
			};
		}
		
		// create shadow span for testing size of text
		this.uiTest = document.createElement("span");
		var style = this.uiTest.style;
		style.position = "absolute";
		style.top = "-100px";
		style.fontFamily = options.font;
		style.fontSize = options.size;
		//this.uiTest.id="sizeTextTest"; // for the next call
		document.body.append(this.uiTest);

		this.widthAscii = {};
		this.widthMin = 10000;
		this.widthMax = 0;
		this.debug = false;
		this.reset();
		this.fixVizAscii = options.fixVizAscii;
		this.fixVizAsciiAlways = options.fixVizAsciiAlways;
		
		// compute reference
		var samples = 50; // min 10-100  100=>21 50=>18 49=>2846 45=>3373 40=>3373 30=>3373 20=> 10=>
		for (var asciiCode=33; asciiCode<127; asciiCode++) {
			var letter = String.fromCharCode(asciiCode);
			// exception list
			switch (letter) {
				case '\\':
				case "'":
				case '"':
				case "`":
				case " ":
					continue;
			}
			var w = this.width(letter.repeat(samples));
			w /= samples;
			if (!this.widthAscii[w]) this.widthAscii[w] = letter;
		}
		
		// get min max size
		for (var w in this.widthAscii) {
			w = parseFloat(w);
			if (w < this.widthMin) this.widthMin = w;
			if (w > this.widthMax) this.widthMax = w;
		}
		
		// compute 'M' reference
		this.widthM = this.width("M".repeat(samples));
		this.widthM /= samples;
		
		if (this.debug) console.log("widthAscii", this.widthAscii); // for debug
	
		// have ordered values
		this.widthKeys = [];
		for (var w in this.widthAscii) 
			this.widthKeys.push(parseFloat(w));
		this.widthKeys.sort((a, b) => a-b);
	}
	
	//graphviz_unicode_fix
	reset() {
		this.nodeFix = {};	// list of (classId) => oldLabel
	}
	
	cloneData() {
		return cloneObject(this.nodeFix);
	}

/*
	parseTest() {
		this.parse("coucou", "id1");
		this.parse("coucou\\ntoi", "id2");
		this.parse("coucou<BR/>toi", "id3", true);
		this.parse("coucou<BR/><FONT a='1'>toi</FONT>", "id4", true);
		this.parse("coucou<BR/><FONT a='1'>toi<BR/>donc</FONT>", "id5", true);
		this.parse("<TABLE><TD>a</TD><TD></TD></TABLE>", "id6", true);
		this.parse("<TABLE><TD>a</TD><TD>b<BR/>c</TD></TABLE>", "id7", true);
		this.parse("<TABLE><TD>a</TD><TD>b<BR/><FONT d='1'>c</FONT>d</TD></TABLE>", "id8", true);
		this.parse(`<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="1"><TR><TD TOOLTIP="Constellation" href="javascript:menuItem({source:'Constellation'})"  BORDER="0" FIXEDSIZE="TRUE" HEIGHT="30" WIDTH="30"><IMG SRC="/media/ui.svg#default-photo" SCALE="TRUE"/></TD><TD><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="1"><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Constellation" href="javascript:menuItem({source:'Constellation'})" >Constellation</TD></TR><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Constelación" href="javascript:menuItem({source:'Constellation'})" ><FONT color="#d3d3d3">Constelación</FONT></TD></TR></TABLE></TD></TR><TR><TD COLSPAN="2" COLOR="#0000001F" SIDES="T" BORDER="1"></TD></TR><TR><TD TOOLTIP="Machine pneumatique" href="javascript:menuItem({source:'Machine pneumatique'})"  BORDER="0" FIXEDSIZE="TRUE" HEIGHT="30" WIDTH="30"><IMG SRC="/media/ui.svg#default-photo" SCALE="TRUE"/></TD><TD><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="1"><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Machine pneumatique" href="javascript:menuItem({source:'Machine pneumatique'})" >Machine<BR/>pneumatique</TD></TR><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Antlia" href="javascript:menuItem({source:'Machine pneumatique'})" ><FONT color="#d3d3d3">Antlia</FONT></TD></TR></TABLE></TD></TR><TR><TD COLSPAN="2" COLOR="#0000001F" SIDES="T" BORDER="1"></TD></TR><TR><TD TOOLTIP="Hydre (constellation)" href="javascript:menuItem({source:'Hydre (constellation)'})"  BORDER="0" FIXEDSIZE="TRUE" HEIGHT="30" WIDTH="30"><IMG SRC="/media/ui.svg#default-photo" SCALE="TRUE"/></TD><TD><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="1"><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Hydre (constellation)" href="javascript:menuItem({source:'Hydre (constellation)'})" >Hydre<BR/>(constellation)</TD></TR><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Hidra (constelación)" href="javascript:menuItem({source:'Hydre (constellation)'})" ><FONT color="#d3d3d3">Hidra<BR/>(constelación)</FONT></TD></TR></TABLE></TD></TR><TR><TD COLSPAN="2" COLOR="#0000001F" SIDES="T" BORDER="1"></TD></TR><TR><TD TOOLTIP="Union astronomique internationale" href="javascript:menuItem({source:'Union astronomique internationale'})"  BORDER="0" FIXEDSIZE="TRUE" HEIGHT="30" WIDTH="30"><IMG SRC="/media/ui.svg#default-photo" SCALE="TRUE"/></TD><TD><TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="1"><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Union astronomique internationale" href="javascript:menuItem({source:'Union astronomique internationale'})" >Union astronomique<BR/>internationale</TD></TR><TR><TD ALIGN="LEFT" BALIGN="LEFT" TOOLTIP="Unión Astronómica Internacional" href="javascript:menuItem({source:'Union astronomique internationale'})" ><FONT color="#d3d3d3">Unión Astronómica<BR/>Internacional</FONT></TD></TR></TABLE></TD></TR></TABLE>`, "id9", true);
	}
*/
	
	/*
		Alternative of xmlNode.outerHTML (xml.childNodes[0].outerHTML or new XMLSerializer().serializeToString(xml))
		Change:
		- remove empty tag TD optimisation ("<TD></TD>" => "<TD/>")
	*/
	outerHTML(xml) {
		var node = xml.childNodes[0];
		this.outerHTMLNode(node);
		var out = node.outerHTML;
		//console.log("out", out);
		out = out.replace(/<FAKE_TAG\/>/g, "")
		//console.log("out", out);
		return out;		
	}

	// find the TD empty and add a fake tag => TD can't anymore optimized
	outerHTMLNode(node) {
		if (node.tagName == "TD" && !node.nodeValue && !node.childNodes.length) {
			node.appendChild(createNodeXml("<FAKE_TAG/>"));
		} else {
			for (var n of node.childNodes) {
				this.outerHTMLNode(n);
			}
		}
	}
			
	/*
		todo: optim, if !asHtml => not need DOMParser, see parseLabelText
		todo: this.content => this.lines 
	*/
	parse(html, id, asHtml) {
		//return html;
		//console.log("=====================");
		//console.log(`in: "${html}"`);
		if (!this.fixVizAscii) 
			return html;
		if (debug)
			console.log(`html: "${html}", id:"${id}"`);
		if (!asHtml) {
			if (html == "") 
				return "";
			var w;
			var out = "";
			var first = true;
			this.content = html.split(erBN);			
			for (var line of this.content) {
				if (this.fixVizAsciiAlways || !isAscii(line)) {
					if (first)
						 first = false;
					else out +="\\n";
					w = this.width(line);
					line = this.code(w);
					out += line;
				}
			}
			this.nodeFix[id] = this.content; 
			return out;
		}			
		html = "<P>" + html + "</P>"; 
	
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(html, "text/xml");
		if (debug)
			console.log("xmlDoc", xmlDoc);
		this.level = 1;
		this.id = id;
		this.parseNode(xmlDoc.childNodes[0]);
		out = this.outerHTML(xmlDoc);
		out = out.slice(3,-4); // remove initial tag "P"
		if (out == "<>") out = '""';
		//console.log(`out: "${out}"`);
		return out;
	}

	parseNode(node, save=true) {
		var debug = false;
		var prefix = "| ".repeat(this.level);
		this.level ++;
		if (save) this.content = [];
		var w;
		for (var n of node.childNodes) {
			if (n.tagName && debug)
				console.log(prefix + "#" + n.tagName);
		/*
			switch (n.tagName.toUpperCase()) {
				case 'BR':
					content += "\\n";
					break;
				case 'FONT':
					content += this.parseNode(n, false);
					continue;
				case 'TABLE':
					break;
			}			
			if (n.getAttribute && n.getAttribute("href")) {
			}
		*/
			if (n.nodeValue) {
				if (debug) console.log(prefix + n.nodeValue);
				this.content.push(n.nodeValue);
				if (this.fixVizAsciiAlways || !isAscii(n.nodeValue)) {
					w = this.width(n.nodeValue);
					n.nodeValue = this.code(w);
				}
			}
			this.parseNode(n, false);
		}
		if (this.content.length && save) {
			if (this.fixVizAsciiAlways || !isAscii(this.content)) {
				this.nodeFix[this.id] = this.content;
			}
		}
		this.level --;
	}

	resumeNodeFix() {
		var out = "";
		for (var node in this.nodeFix) {
			if (out) out += "<br>";
			out += `@${node}\t=> ${this.nodeFix[node].join(" | ")}`;
		}
		return out;
	}
	
	/* 
		apply svg transform from text original
		
		ex analyse DOM from #edges #main:		
		// 1) node
		<g id="a_node6">
			<a ...>
				...
				<text ...>Kodak</text>
				<text ...>argentic</text>
			</a>
		</g>
		labels["Kodak\nargentic"] = "a_node6";
		
		// 2) node (multi)
		<g id="a_node2">
			<a ...>
				...
				<text fill="white">Film (métrage)</text>
				<text fill="#d3d3d3">Film stock</text>
				<text fill="#add8e6">Película</text>
				<text fill="#add8e6">de cine</text>
			</a>
		</g>		
		labels["Film (métrage)\nFilm stock\nPelícula\nde cine"] = "a_node2";
		
		// 3) group
		<g id="a_node7">
			<a ...>
				...
				<g id="a_node7_0">
					<a ...>
						<image ...></image>
					</a>
				</g>
				<g id="a_node7_1">
					<a ...>
						<text ...>Film</text>
					</a>
				</g>
				<g id="a_node7_2">
					<a ...>
						<image ...></image>
					</a>
				</g>
				<g id="a_node7_3">
					<a ...>
						<text ...>Magasin</text>
						<text ...>(caméra)</text>
					</a>
				</g>
			</a>
		</g>
		labels["Film"] = "a_node7_1";
		labels["Magasin\n(caméra)"] = "a_node7_3";
		
		// 4) group (multi)
		<g id="a_node7">
			<a ...>
				...
				<g id="a_node7_64">
					<a ...>
						<image ...></image>
					</a>
				</g>
				<g id="a_node7_65">
					<a ...>
						<text ...>Film</text>
					</a>
				</g>
				<g id="a_node7_66">
					<a ...>
						<text ....>Film</text>
						<text ....>(disambiguation)</text>
					</a>
				</g>
				...
				<g id="a_node7_67">
					<a ...>
						<image ...></image>
					</a>
				</g>
				<g id="a_node7_68">
					<a ...>
						<text ...>Magasin</text>
						<text ...>(caméra)</text>
					</a>
				</g>
				<g id="a_node7_69">
					<a ...>
						<text ...>Camera</text>
						<text ...>magazine</text>
					</a>
				</g>
			</a>
		</g>
		labels["Film"] = "a_node7_65"
		labels["Film\n(disambiguation)"] = "a_node7_66"
		labels["Camera\n(caméra)"] = "a_node7_68"
		labels["Camera\nmagazine"] = "a_node7_69"

		// 5) edge label (!straight)
		<g id="a_edge10-label">
			<a ...>
				<text ...>Pellicule négative</text>
				<text ...>noir et blanc</text>
			</a>
		</g>		
		labels["Pellicule négative\nnoir et blanc"] = "a_edge10-label"
		
		// 6) edge label (straight)
		<g id="a_edge5">
			<a ...>
				<linearGradient ...>
					...
				</linearGradient>				
				...
				<text ...>
					<textPath ...>Le format standard des films</textPath>
				</text>
			</a>
		</g>
		labels["Le format standard des films"] = "a_edge5"		
	*/		
	applySvg(nodeFix) {
		if (this.fixVizAscii != true) return;
		//console.log("applySvg");
		//return; // test without apply
		if (!nodeFix) nodeFix = this.nodeFix;
		//console.log(nodeFix);
		var label, lines, i, items, item;
		for (var key in nodeFix) {
			//console.log("key & label", key, label);
			label = nodeFix[key];			
			lines = label;
			items = document.getElementsByClassName(key);
			for (item of items) {
				if (debug)
					console.log("key", key, lines, item);
				if (!item) {
					console.error(`applySvg: could find class='${key}'`);
					continue;
				}
				var texts = item.getElementsByTagName("text");

				for (i=0; i < lines.length; i++) {
					texts[i].textContent = lines[i];
				}
			}
		}
	}

	// return width representation of patern 
	width(patern) {
		if (patern == " ") {
			return this.width("M M") - this.widthM * 2;
		}
		this.uiTest.textContent = patern;
		var w = this.uiTest.offsetWidth;
		if (this.debug) console.log("patern", patern, w);
		return w;
	}

	/* 
		create equivalent of 'M' width with:
		- M*time+letter (if big)
		- letter 		(if small)

		ex.:
		for (i=0;i<100;i++) 
			console.log(vuf.code(i));
					19	W		37	MW		55	MMW		73	MMMW	91	MMMMW
					20	|m		38	M|m		56	MM|m	74	MMM|m	92	MMMM|m
					21	|%		39	M|%		57	MM|%	75	MMM|%	93	MMMM|%
		4	|		22	M|		40	MM|		58	MMM|	76	MMMM|	94	MMMMM|
		5	.		23	M.		41	MM.		59	MMM.	77	MMMM.	95	MMMMM.
		6	i		24	Mi		42	MMi		60	MMMi	78	MMMMi	96	MMMMMi
		7	f		25	Mf		43	MMf		61	MMMf	79	MMMMf	97	MMMMMf
		8	s		26	Ms		44	MMs		62	MMMs	80	MMMMs	98	MMMMMs
		9	a		27	Ma		45	MMa		63	MMMa	81	MMMMa	99	MMMMMa
		10	b		28	Mb		46	MMb		64	MMMb	82	MMMMb	
		11	F		29	MF		47	MMF		65	MMMF	83	MMMMF	
		12	E		30	ME		48	MME		66	MMME	84	MMMME	
		13	B		31	MB		49	MMB		67	MMMB	85	MMMMB	
		14	w		32	Mw		50	MMw		68	MMMw	86	MMMMw	
		15 	|F		33	M|F		51	MM|F	69	MMM|F	87	MMMM|F	
		16	m		34	Mm		52	MMm		70	MMMm	88	MMMMm	
		17	%		35	M%		53	MM%		71	MMM%	89	MMMM%	
		18	M		36	MM		54	MMM		72	MMMM	90	MMMMM	
	*/
	code(size) {			
		if (size <= this.widthMax)
			return this.closest(size); // 1 letter representation
		else {
			var nbM = Math.round(size / this.widthM);
			size -= nbM * this.widthM;
			var minW = "";
			if (size < this.widthMin) {
				nbM--;
				size += this.widthM;
				if (size > this.widthMax) {
					// add smallest
					minW = this.widthAscii[this.widthMin]; 
					size -= this.widthMin;
				}
			}
			return "M".repeat(nbM) + minW + this.closest(size); 
		}
	}
	
	/*
		return closest letter with size 
		ex.: 
		// y => 10, ~ => 10.8
		vuf.closest(10.1); // => y
		vuf.closest(10.7); // => ~
		
		todo: faster by dicho (but it's realy limitated value there)
		https://stackabuse.com/binary-search-in-javascript/
	*/
	closest(size) {
		var eq = this.widthAscii[size];
		if (eq) return eq;
		var wOld = 0;
		var w;
		for (w of this.widthKeys) {
			if (w > size) {
				if (!wOld) return this.widthAscii[w];
				if (size-wOld < w-size) 
					 return this.widthAscii[wOld];
				else return this.widthAscii[w];
			}
			wOld = w;
		}
		return this.widthAscii[w];
	}
	
	/* 
		check results, return max difference
		for 4-1000: no pb 
		for 4-2000: nb big diff: 380  diff max: 2  @ size= 1093
		for 4-5000: nb big diff: 3359 diff max: 5  @ size= 4287
	*/
	check() {
		var diffMax = 0;
		var sizeMax = -1;
		var nbDiffBig = 0;
		for (var size=4; size<5000; size++) {
			var coded = this.code(size);
			var w = this.width(coded);
			var diff = Math.abs(size-w);
			if (diff > diffMax) {
				diffMax = diff;
				sizeMax = size;
			}
			if (diff >= 2) {
				console.log("=> diff:", diff, "@ size=", size);
				nbDiffBig ++;
			}
			if (this.debug) console.log(size, w, coded);
		}
		console.log("=> nb big diff:", nbDiffBig," diff max:", diffMax, " @ size=", sizeMax);
		return diffMax;
	}
}

var htmlEntityByName = {
	nbsp:160,	iexcl:161,	cent: 162,	pound:163,	curren:164,	yen:165,
	brvbar:166, sect:167,	uml:168,	copy:169,	ordf:170,	laquo:171,
	not:172,	shy:173,	reg:174,	macr:175,	deg:176,	plusmn:177,
	"sup2":178,	"sup3":179,	acute:180,	micro:181,	para:182,	middot:183,
	cedil:184,	"sup1":185,	ordm:186,	raquo:187,	"frac14":188,"frac12":189,
	"frac34":190,iquest:191,Agrave:192,	Aacute:193,	Acirc:194,	Atilde:195,
	Auml:196,	Aring:197,	AElig:198,	Ccedil:199,	Egrave:200,	Eacute:201,
	Ecirc:202,	Euml:203,	Igrave:204,	Iacute:205,	Icirc:206,	Iuml:207,
	ETH:208,	Ntilde:209,	Ograve:210,	Oacute:211,	Ocirc:212,	Otilde:213,
	Ouml:214,	times:215,	Oslash:216,	Ugrave:217,	Uacute:218,	Ucirc:219,
	Uuml:220,	Yacute:221,	THORN:222,	szlig:223,	agrave:224,	aacute:225,
	acirc:226,	atilde:227,	auml:228,	aring:229,	aelig:230,	ccedil:231,
	egrave:232,	eacute:233,	ecirc:234,	euml:235,	igrave:236,	iacute:237,
	icirc:238,	iuml:239,	eth:240,	ntilde:241,	ograve:242,	oacute:243,
	ocirc:244,	otilde:245,	ouml:246,	divide:247,	oslash:248,	ugrave:249,
	uacute:250,	ucirc:251,	uuml:252,	yacute:253,	thorn:254,	yuml:255,
	fnof:402,	Alpha:913,	Beta:914,	Gamma:915,	Delta:916,	Epsilon:917,
	Zeta:918,	Eta:919,	Theta:920,	Iota:921,	Kappa:922,	Lambda:923,
	Mu:924,		Nu:925,		Xi:926,		Omicron:927,Pi:928,		Rho:929,
	Sigma:931,	Tau:932,	Upsilon:933,Phi:934,	Chi:935,	Psi:936,
	Omega:937,	alpha:945,	beta:946,	gamma:947,	delta:948,	epsilon:949,
	zeta:950,	eta:951,	theta:952,	iota:953,	kappa:954,	lambda:955,
	mu:956,		nu:957,		xi:958,		omicron:959,pi:960,		rho:961,
	sigmaf:962,	sigma:963,	tau:964,	upsilon:965,phi:966,	chi:967,
	psi:968,	omega:969,	thetasym:977,upsih:978,	piv:982,	bull:8226,
	hellip:8230,prime:8242,	Prime:8243,	oline:8254,	frasl:8260,	weierp:8472,
	image:8465,	real:8476,	trade:8482,	alefsym:8501,larr:8592,	uarr:8593,
	rarr:8594,	darr:8595,	harr:8596,	crarr:8629,	lArr:8656,	uArr:8657,
	rArr:8658,	dArr:8659,	hArr:8660,	forall:8704,part:8706,	exist:8707,
	empty:8709,	nabla:8711,	isin:8712,	notin:8713,	ni:8715,	prod:8719,
	sum:8721,	minus:8722,	lowast:8727,radic:8730,	prop:8733,	infin:8734,
	ang:8736,	and:8743,	or:8744,	cap:8745,	cup:8746,	int:8747,
	"there4":8756,sim:8764,	cong:8773,	asymp:8776,	ne:8800,	equiv:8801,
	le:8804,	ge:8805,	sub:8834,	sup:8835,	nsub:8836,	sube:8838,
	supe:8839,	oplus:8853,	otimes:8855,perp:8869,	sdot:8901,	lceil:8968,
	rceil:8969,	lfloor:8970,rfloor:8971,lang:9001,	rang:9002,	loz:9674,
	spades:9824,clubs:9827,	hearts:9829,diams:9830,	quot:34,	amp:38,
	lt:60,		gt:62,		OElig:338,	oelig:339,	Scaron:352,	scaron:353,
	Yuml:376,	circ:710,	tilde:732,	ensp:8194,	emsp:8195,	thinsp:8201,
	zwnj:8204,	zwj:8205,	lrm:8206,	rlm:8207,	ndash:8211,	mdash:8212,
	lsquo:8216,	rsquo:8217,	sbquo:8218,	ldquo:8220,	rdquo:8221,	bdquo:8222,
	dagger:8224,Dagger:8225,permil:8240,lsaquo:8249,rsaquo:8250,euro:8364
};

var htmlEntityByCode = {};

function htmlEntityPrefetch() {
	if (htmlEntityByCode.length) return;
	for (var name in htmlEntityByName) {
		//console.log(name);
		htmlEntityByCode[htmlEntityByName[name]]=name;
	}
	//console.log("htmlEntityByCode", htmlEntityByCode);
}

var erHtmlEntity = /&((#[0-9]+)|([a-zA-Z][a-zA-Z0-9]*));/g;

/*
	transform html entities to unicode 
	ex.: "AT&amp;T" => "AT&T"
	ex.: "100$ => 1000&yen;" => "100$ => 1000¥"
	https://www.w3.org/TR/html401/sgml/entities.html
*/
function htmlEntityToString(html) {
	return html.replace(erHtmlEntity, function(matching, name) {
		//console.log(`match: "${matching}", name: "${name}"`);	
		var code;
		if (name[0] == "#") 
			 code = parseInt(name.substr(1));
		else code = htmlEntityByName[name];
		if (code)
			name = String.fromCharCode(code); 
		return name;
	});
}

/*
	transform text to html entities
	ex.: "AT&T" => "AT&amp;T" => 
	ex.: "100$ => 1000¥" => "100$ =&gt; 1000&yen;"
	https://www.w3.org/TR/html401/sgml/entities.html
*/
function htmlEntityFromString(html, asCode=true) {
	var out = "";
	var entity;
	var code;
	htmlEntityPrefetch();
	for (var i=0;i <html.length; i++) {
		code = html.charCodeAt(i);
		entity = htmlEntityByCode[code];
		if (entity != null) {
			if (asCode)
				 out += "&#" + code + ";";
			else out += "&" + entity + ";";
		}
		else out += html[i];
	}
	return out;
}

function htmlEntityAmpFromString(html) {
	var out = "";
	var entity;
	var code;
	htmlEntityPrefetch();
	for (var i=0;i <html.length; i++) {
		code = html.charCodeAt(i);
		entity = htmlEntityByCode[code];
		switch (entity) {
			case "amp":
			//case "lt":
			//case "gt":
				out += "&" + entity + ";";
				break;
			default:
				out += html[i];
		}
	/*
		if (entity == "amp") 
			 out += "&" + entity + ";";		
		else out += html[i];
	*/
	}
	return out;
}

function htmlEntityNorm(html) {
	html = htmlEntityToString(html);
	html = htmlEntityAmpFromString(html);
	//html = htmlEntityFromString(html);
	return html;
}

function htmlEntityTest() {
	var res1 = htmlEntityToString("A=&#65; and &=&amp; ~=&tilde; and & alone");
	//console.log("htmlEntityToString", res1);
	var expected = "A=A and &=& ~=˜ and & alone";
	if (res1 != expected) return false;
	var res2 = htmlEntityFromString(expected, false);
	//console.log("htmlEntityFromString", res2);
	var expected2 = "A=A and &amp;=&amp; ~=&tilde; and &amp; alone";
	if (res2 != expected2) return false;
	return true;
}
