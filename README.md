# fixWebGraphvizAscii

[![License MIT](https://img.shields.io/npm/l/@aduh95/viz.js.svg)](https://github.com/aduh95/viz.js/blob/master/LICENCE)

**Permit web graphviz rendering on full Unicode**

![teaser](https://user-images.githubusercontent.com/59834740/114241795-2fa22e00-9960-11eb-8766-7ff18bfe19e1.png)

> For the moment, the different ports of graphviz on the web all have the same default: 
> it incorrectly calculates the dimensions of elements which are not ASCII !
> (ie. https://github.com/aduh95/viz.js/issues/10)

Until that is resolved, here is a workaround. It works well but consumes more computing time.

# Algorithm:
1) calculate the dimensions of all ASCII characters
2) parse the DOT format and replace the labels with the closest combination of ASCII characters of the same size
3) display SVG with modified DOT
4) replace with original characters

![cat debug](https://user-images.githubusercontent.com/59834740/114245224-6bd88d00-9966-11eb-926c-bddac9aeba7e.png)

# Limitation:
90% of https://graphviz.org/Gallery/ work fine.

Except:
- attributes: fontname, fontsize, labelfont, xlabel (not taken into account)
- attribute: xlabel (working but without the fix)
- shape = record or Mrecord (not recognized)
- the concept "port" (not checked)

# How to use it ?
Watch release/test-with-fix.html

```javascript
var id = 0;
var fix = new GraphvizUnicodeFix;	

// 1) parse original dot
var dom = dotParse(dot);

// 2) create a fixed dot (serialize with encoding label)
var dotFixed = dotSerialize(dom, (label, isHTML) => {	
  id++;
  return {
    id: id,
    out: fix.parse(label, "id" + id, isHTML)
  };
});

// 3) show svg with fixed dot
var svgFixed = dot2Svg(dotFixed);						
document.body.appendChild(createNodeHtml(svgFixed));

// 4) fix svg
fix.applySvg();											
```
