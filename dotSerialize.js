/*
	Regual Expression to reconise if a graphviz label need dquote
	exclude impossible char:
		\x00		// 0 	// "\0"
		\x20-\x2F   // 32-47 	// " " ... "/"  
		\x3A-\x40 	// 58-64 	// ":" ... "@"	 
		\x5B-\x5E	// 91-94	// "[" ... "^"
		\x60		// 96		// "`" 
		\x7B-\x7E	// 123-126	// "{" ... "~"	
*/

var erDSHNorm = /^(([0-9]+)|([^0-9\x00\x20-\x2F\x3A-\x40\x5B-\x5E\x60\x7B-\x7E][^\x00\x20-\x2F\x3A-\x40\x5B-\x5E\x60\x7B-\x7E]*))$/i;
// var erDSHNorm = /^(([0-9]+)|([a-z_][a-z0-9_]*))$/i;  // simple but not working on unicode ex.: "écharde []" is valide

// for graphviz, add quotes if needed
function normLabel(label) {	
	if (erDSHNorm.test(label)) 
		return label; // a word only		
	return '"' + label + '"';
}

class DotSerializeHelper {
	constructor() {
		this.type = "";
	}
	
	run(data) {
		var item, res = "";
		this.level = 0;
		this.emptyNodes = {};
		this.nodeLabel = false; // todo: have to be a stack. adding on block & resoterd after
		for (var i in data) {
			item = data[i];
			res += this.item(item);
		}
		return res;
	}

/*	// callback apply on every label found to permit possible change
	labelChange(label) {
		return label; // return original
		//return "BEGIN_" + label + "_END"; // return with prefix&postfix
	}
*/
	attr(attrs, id) {
		var list = attrs.attr_list;
		var res = "";
		var haveLabel = false;
		if (list) {
			var value;
			var first = true;
			var isHTML;
			var notEmpty = list.length | attrs.target == "edge"; // because "edge" without params need to have "[]"
			if (notEmpty) 
				res += " [";
			for (var attr of list) {
				if (first) 
					 first = false;
				else res += ", "; 
				value = "";
				switch (attr.type) {
					case 'attr':
						switch (attr.id) {
							case "style":
								// not visible ?
								if (attr.eq.indexOf("invis") != -1) 
									this.removeEmptyNode(id);
								break;
							case "label":
								haveLabel = true;
								isHTML = typeof(attr.eq) == "object";
								if (attrs.target=="node") {
									this.nodeLabel = true;
									if (debug) {
										console.log("nodeLabel", this.nodeLabel);
									}
								}
								if (this.labelChange) {
									var label;								
									if (!isHTML) {
										label = attr.eq;
										label = htmlEntityToString(label);
									}
									else {
										label = attr.eq.value;
										label = htmlEntityNorm(label);
									}
									this.removeEmptyNode(id);
									var lc = this.labelChange(label, isHTML);
									label = lc.out;
									if (!isHTML) 
										 attr.eq = label;
									else attr.eq.value = label;
									res += "class=id" + lc.id + ", ";
								} 
								break;
						}					
						res += attr.id + "=";
						switch (typeof(attr.eq)) {
						case 'number': 
						case 'boolean':
							value = attr.eq;
							break;
						case 'object':
							if (attr.eq.html) // always on 
								value = "<" + attr.eq.value + ">";
							break;
						case 'string':						
							attr.eq = attr.eq.replace(/\"/g,"\\\""); // because text can be 'coucou "toi"' => 'coucou \\\"toi\\\"'
							//console.log("value", attr.eq);
							value = normLabel(attr.eq);
							break;
						}
						break;
					default:
						console.error("unknown attr type: " + attr.type);
				}
				res += value;
			}
			if (notEmpty) 
				res += "]";
		}
		if (!haveLabel)
			this.addEmptyNode(id);
		return res;
	}
	
	indent() {
		return "\t".repeat(this.level);
	}
		
	addEmptyNode(id) {
		if (debug)
			console.log("addEmptyNode", id, this.nodeLabel, this.emptyNodes[id]);
		if (id === undefined) return;
		if (!this.emptyNodes[id]) 
			this.emptyNodes[id] = this.nodeLabel? -1 : 1;
	}

	removeEmptyNode(id) {
		if (debug)
			console.log("removeEmptyNode", id, this.emptyNodes[id]);
		if (id === undefined) return;
		this.emptyNodes[id] = -1;
	}

	item(item) {
		var res = "";
		//console.log("item", item);
		switch (item.type) {
			case 'graph':
				this.connector = " -- ";
			case 'digraph':
				if (!this.connector) 
					 this.connector = " -> ";
			case 'subgraph':
				this.type = item.type;
				if (item.strict)
					res += "strict ";
				res += this.indent() + item.type + " ";
				if (item.id !== undefined) res += item.id + " ";
				res += "{\n";
				break;
			//case 'edgeRHS': // cluster
			case 'edge_stmt': 
				res += this.indent();
				var first = true;
				for (var attr of item.edge_list) {
					if (first)
						 first = false;
					else res += this.connector;					
					// todo: parse type=="node_id" because can have attr.port
					this.addEmptyNode(attr.id);
					res += normLabel(attr.id);
				}
				res += this.attr(item) + "\n";
				break;
			case 'node_stmt': 
				res += this.indent() + normLabel(item.node_id.id) + this.attr(item, item.node_id.id) + "\n";
				break;
				
			case 'attr_stmt':
				res += this.indent() + normLabel(item.target) + this.attr(item) + "\n";
				break;
				
			default:
				console.error("unknown type: " + item.type);
		}
		var child;
		this.level ++;
		for (var c in item.children) {
			child = item.children[c];
			res += this.item(child);
		}
		this.level --;
		switch (item.type) {
			case 'digraph':
			case 'graph':
				if (!this.level) 
					res += this.completNode();
			
			case 'subgraph':
				res += this.indent() + "}\n";
				break;
		}
		return res;
	}

	// add missing node without definition
	completNode() {		
		if (debug)
			console.log("un-labeled nodes:", this.emptyNodes);
		if (!this.labelChange) return; // nothing to do
		var res = "";
		var lc;
		for (var node_id in this.emptyNodes) {
			if (this.emptyNodes[node_id] == 1) { 
				// a node with empty label 		
				lc = this.labelChange(node_id, false);
				res += `\t${normLabel(node_id)} [class=id${lc.id}, label=${normLabel(lc.out)}]\n`;				
			}
		}
		return res;
	}
}

function dotSerialize(data, labelChange) {
	var helper = new DotSerializeHelper;
	if (labelChange) 
		helper.labelChange = labelChange;
	return helper.run(data);
}

var dotParse = peg$parse;