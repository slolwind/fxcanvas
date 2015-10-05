[![](http://burzak.com/proj/fxcanvas/docs/images/fxcanvas.png)](http://burzak.com/proj/fxcanvas/)

## Intro ##

fxCanvas is an implementation of the HTML5 Canvas element for Internet Explorer (two-dimensional graphics only).

## Requirements ##

  * Flash player 9+ on Internet Explorer (some versions from 10.1 branch does not work properly, see [Issue 5](http://code.google.com/p/fxcanvas/issues/detail?id=5))
  * Internet Explorer 5.5+ (IE9 does not supported at this moment)

## Contents ##

  * [Usage](#Usage.md)
  * [Compatibility](#Compatibility.md)
  * [Extended features](#Extended_features.md)
  * [Known bugs](#Known_bugs.md)
  * [Demos and examples](#Demos_and_examples.md)
  * [Applications](#Applications.md)
  * [Download and source](#Download_and_source.md)
  * [References](#References.md)
  * [Related projects](#Related_projects.md)
  * [TODO](#Volunteers_wanted!_Couple_of_impossible_tasks_are_there_(TODO):.md)
  * [Bugs and feedbacks](#Bugs_and_feedbacks.md)
  * [News](#What's_up.md)

## Usage ##

Download [package](http://code.google.com/p/fxcanvas/downloads/detail?name=fxcanvas-0.2(beta4)-supersonic.zip), unzip it into a public directory on the server and then paste in head section of the page following tags:

```
<head>
  <script type="text/javascript" src="/public/path/jooscript.js"></script>
  <script type="text/javascript" src="/public/path/fxcanvas.js"></script>
  <!--[if IE]><script type="text/javascript" src="/public/path/flash_backend.js"></script><![endif]-->
  <comment><script type="text/javascript" src="/public/path/canvas_backend.js"></script></comment>
</head>
```

If you are not familiar with Canvas API, it may be useful to read this:
<ul>
<li><a href='https://developer.mozilla.org/en/HTML/Canvas'>Canvas tutorial on Mozzila.org</a></li>
<li><a href='http://dev.opera.com/articles/view/html-5-canvas-the-basics/'>... on dev.Opera.com</a></li>
</ul>

**New!** Images and text are now [clipable](http://burzak.com/proj/fxcanvas/tests/test_clip.html).

fxCanvas also works properly with `data:` URIs in Internet Explorer.
[Example](http://burzak.com/proj/fxcanvas/tests/image_data_example.html).

## Compatibility ##

fxCanvas supports almost all the Canvas features.  The differences is in:

**Invoke command and chaining operations**

Context commands are keeping in a buffer before they will be applyed (IE only), so that to get values you have to use method `invoke()`:

```
<script type="text/javascript">
    var cv = document.getElementById("cv");
    var ctx = cv.getContext("2d");
    ctx.setFillStyle("#ff0")
        .setStrokeStyle("#0ff")
        .strokeRect(10, 20, 30, 30)
        .fillRect(30, 40, 50, 50)
        .invoke("getImageData", 0, 0, cv.width, cv.height, function (imageData) {
            // ... processing image data
        });
</script>
```

**Images**

Prior to using images you have to preload them:

```
<script type="text/javascript">
    var cv = document.getElementById("cv");
    var ctx = cv.getContext("2d");
    var image_src = "sample.jpg";
    cv.onload = function(img) {
        if (img.src.indexOf(image_src) > -1) {
            ctx.drawImage(img, 10, 10);
        }
    }
    cv.loadImages(image_src /* ... img1, img2, ... imgX */);
</script>
```

**Image data array**

We cannot use canvas image data as it declared in specs, because of IE using extremely ineffective memory manager so it may eats all available memory in some circumstances. So that fxCanvas is using slightly different image data format.

Take a look at example:

```
<script type="text/javascript">
    var cv = document.getElementById("cv");
    var ctx = cv.getContext("2d");
    ctx.invoke("getImageData", 0, 0, cv.width, cv.height, function(buf) {
        for (var i = 0; i < cv.width*cv.width; i++) {
             var pixelValue = buf.data[i], // pixel value is 32-bit integer
                 red = pixelValue >> 24 & 0xFF,
                 green = pixelValue >> 16 & 0xFF,
                 blue = pixelValue >> 8 & 0xFF,
                 alpha = pixelValue & 0xFF;
             // 
             // exchange color channels
             buf.data[ofs] = (blue << 24) + (red << 16) + (green << 8) + alpha;
        }
        ctx.invoke("putImageData", buf, 0, 0, function(){
            // ... print out the buffer after the operation will be completed
            console.log("Image data dump:" + buf); 
        }
    });
</script>
```

Further explanation can be founded [here](http://burzak.com/proj/fxcanvas/tests/data-structure-comparison.html).

**isPointInPath()**

`isPointInPath()` in Internet Explorer returns `true` if point in bounding box of the path. To get accurate results, use `ctx.invoke("isPointInPath", x, y, ...)`.

**toDataURL()**

To get canvas shot you have to call the function with data handler:

```
<script type="text/javascript">
    var cv = document.getElementById("cv");
    var type = "image/jpeg", quality = .4; // quality is optional argument
    cv.toDataURL(type, quality, function (png_data) {
        // draw slice of the canvas on the same canvas at top right corner
        var ctx = this.getContext("2d");
        this.onload = function (img) {
            ctx.drawImage(img, 0, 0, cv.width - 100, 0, 100, 100);
        }
        this.loadImages(png_data);
    });
</script>
```

Possible types: `image/png`, `image/jpeg`, ~~`image/svg+xml`~~.

**How-to create Canvas element in script**

The simpliest way to dynamically create canvas element is:

```
<script type="text/javascript">
    var cv = document.createElement("canvas");
    cv.width = 200;
    cv.height = 100;
    document.body.appendChild(cv);
    // ...
</script>
```

Note that if fxCanvas lib is loaded then in newly created elements will be using extended context by default.
To disable this behavior and manually initialize extended context, use following code:

```
<script type="text/javascript">
    $Import("buz.fxcanvas");
    // don't forget to disable fxCanvas before page content will loaded
    fxcanvas.config.enable = false;
    window.onload = function(){
        var cv = document.createElement("canvas");
        fxcanvas.initElement(cv)
        // ...
    }
</script>
```

**Context and Backend**

There are a few two-dimensional Canvas contexts: first is extended context `canvas.getContext("2d")`, second is original context `canvas.getBackend("2d")`. Use last one if you want native drawing speed.

**Composite operations**

Only `source-over` and `lighter` are supported.

**Handling canvas resize event**

There is a specific problem with canvas resizing due to asynchronous nature. You cannot draw graphics right after the canvas was resizing or it will be clear. As a solution I've added `oncanvasresize` event which is fired when canvas will be ready after resize. Note that `oncanvasresize` will not be triggered if the dimensions is the same or  is changed style property.

```
<script type="text/javascript">
  ctx.canvas.width = 400
  ctx.canvas.height = 300
  ctx.oncanvasresize = function(){
    ctx.beginPath();
    ctx.arc(75,75,50,0,Math.PI*2,true);
    ctx.stroke()
  }
</script>
```

**Text API**

<a href='Hidden comment: 
Текст АПИ - это самая кастрированная часть. Во-первых, трансформированный текст выглядит "покорябанным", во-вторых не поддерживается метод strokeText(). Зато measureText() возвращает значения width, height, ascent и descent (только там, где используется флеш).
'></a>

Text API is the most weak part. First is that transformed text looks awkward. Second is not supported method `strokeText()`. But `measureText()` returns even four values: width, height, ascent and descent (only for flash backend).

```
<script type="text/javascript">
  ctx.font = "35px Arial"
  ctx.invoke("measureText", "abc", function(dim){
    trace(dim.width, dim.height, dim.ascent, dim.descent)
  })
</script>
```

The things may change when I add a brand new text renderer.

## Extended features ##

Extended context (global `extCanvasRenderingContext2D`) provides some new useful features for developers .

**Animation**

There are two ways to making animation on Canvas. First case is using `setInterval()`, second case is using `oncanvasframe` event:

```
<script type="text/javascript">
    var ctx = document.getElementById("cv").getContext("2d");
    /*
     * variant one
     */
    setInterval(function() {
        // ... draw frame here
    }, 1000);
    /*
     * variant two
     */
    ctx.canvas.frameDuration = 10; // in microseconds
    ctx.canvas.oncanvasframe = function(){ // frame event handler will fired with interval in 10ms
        // ... draw frame here
    };
    // Warning: animations with complex graphics and tiny frameDuration value may hang on the browser!
</script>
```

Using `oncanvasframe` event is strongly encouraged, as in Internet Explorer animation running on `setInterval()` will show incorrect frame rate. Besides in modern browsers (e.g. Firefox 4) animation will be play smoother on frame event (technically: synced with display refresh frame rate).

Note: `oncanvasframe` event is non-standard extension.

Default `frameDuration` is 100ms.

**Canvas Path**

<a href='Hidden comment: 
Начиная с версии 0.2 в fxCanvas предложен новый экспериментальный метод рисования сложных кривых. Для этого добавлен специальный интерфейс CanvasPath, который позволяет разработчику создавать список из сегментов, а затем применять его в контексте холста. Это позволяет быстро рисовать даже очень сложные кривые за счет кеширования. Кеширование используется только в IE, так что в остальных браузерах использование CanvasPath не даст выиграша в производительности.
'></a>

Starting from version 0.2 is introduced a new experimental method for drawing complex curves. For that was added special interface `CanvasPath`, which allow developers to create array of path segments. It make fast drawings in IE even with complicated curves thanks to caching algorithm.  In other browsers using `CanvasPath` will not give performance gain. To use this feature set `ctx._useCanvasPath` or `fxcanvas.config.useCanvasPath` as `true`. By default `useCanvasPath` is `false`.

A very generic example:

```
<script type="text/javascript">
    var cv = document.createElement("canvas");
    var ctx = cv.getContext("2d")
    var longPath = ctx.createPath()
    longPath.moveTo(0, 0)
    for(var i=0; i<1000; i++) {
      longPath.lineTo(i, i)
    }
    ctx.beginPath()
    ctx.appendPath(longPath)
    ctx.stroke()
    ctx.rotate(90*Math.PI/180)
    ctx.beginPath()
    ctx.appendPath(longPath)
    ctx.stroke()
</script>
```

**Path bounds**

There are some new methods and properties:

  * method `isPointInPathBounds(x, y) : boolean`
  * method `getPathBounds() : Rectangle`
  * `transformMatrix` property

Internally they are used as replacement for `isPointInPath` in IE. To use these methods in another browsers other than IE, set `ctx._tracePathBounds` or `fxcanvas.config.tracePathBounds` property as `true`. By default `tracePathBounds` is `true` for IE and `false` for others.

These methods are available even if the flash is disabled.

```
<script type="text/javascript">
  ctx.beginPath()
  ctx.rect(100, 100, 50, 50)
  var bounds = ctx.getPathBounds()
  trace(bounds.x, bounds.y, bounds.width, bounds.height)
  // will output 100 100 50 50
</script>
```

**Basic geometry**

<a href='Hidden comment: 
ДжуСкрипт предоставляет некоторые базовые геометрические примитивы, такие как Точка, Треугольних, Матрица2р которые можно использовать с методами расширенного контекста.

Например
'></a>

JooScript provides some basic geometry primitives such as Point, Rectangle and Matrix2d. They can be used within extended context:

```
<script type="text/javascript">
  $Import("geom.*")
  var p0 = new Point(10,10)
  var p1 = new Point(100,100)
  var rect = new Rectangle(20,10,300,300)
  var pointer = {x: 123, y: 45}
  ctx.beginPath()
  ctx.moveTo(p0)
  ctx.vectorTo(p1)
  ctx.rect(rect)
  ctx.stroke()
  if( ctx.isPointInPath(pointer) ) {
      // ...
  }
</script>
```

Extended context also has `transformMatrix` property which is a 3x2 transformation matrix. It is available only if `tracePathBounds` is on.

For futher info refer to [JooScript docs](http://burzak.com/proj/jooscript-basics/).

## Known bugs ##

  * Sometime if user switching from Internet Explorer window to another desktop window, canvas element have lost focus, after that mouse events will not be triggered. He must click somewhere on a page (not on the canvas element!) to restore events. Workaround for this bug seems to be either impossible or very hard to code.
  * Dynamic canvas resize may not working properly with `setInterval`. Use `oncanvasresize` event as workaround. [Here is](http://burzak.com/proj/fxcanvas/tests/explorercanvas.googlecode.com/examples/example3.html) an example.
  * In IE canvas element will be disabled if HTML page is loaded from local filesystem.

## Demos and examples ##

  * [Drawarea](http://burzak.com/proj/fxcanvas/tests/drawarea.html)
  * [Colorize image](http://burzak.com/proj/fxcanvas/demo/colorize.html)
  * [Example of using image data](http://burzak.com/proj/fxcanvas/tests/image_data_example.html)
  * [Interferoplasma](http://burzak.com/proj/fxcanvas/demo/plasma.html)
  * [Watercolor](http://burzak.com/proj/fxcanvas/demo/watercolor.html)
  * [all demos](http://burzak.com/proj/fxcanvas/demo/index.html)...
  * [all tests and examples](http://burzak.com/proj/fxcanvas/tests/index.html)...

<a href='Hidden comment: 
* [http://burzak.com/proj/fxcanvas/demo/cakejs/examples/canvas.html CAKE]
'></a>

## Applications ##

  * [DrawForm](http://burzak.com/proj/drawform/) is a graphical input form for web-pages

## Download and source ##

[Download zip](http://code.google.com/p/fxcanvas/downloads/detail?name=fxcanvas-0.2(beta4)-supersonic.zip) or [grab fresh trunk from SVN repo](http://code.google.com/p/fxcanvas/source/checkout).

## References ##

  * [WHATWG Canvas spec](http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html).
  * fxCanvas is a fork of [flashcanvas](http://code.google.com/p/flashcanvas/).
  * [FlashCanvas Pro](http://flashcanvas.net) offers commercial support.

## Related projects ##

  * [Web Forkers](http://code.google.com/p/web-forkers/), is a [Web Workers](http://www.whatwg.org/specs/web-workers/current-work/) fake for IE and other browsers.
  * [JooScript basics](http://burzak.com/proj/jooscript-basics/) is a JavaScript library used for building complex web-apps.
  * [SVG Web](http://code.google.com/p/svgweb/), is a JS lib which provides SVG support on many browsers, including Internet Explorer, Firefox, and Safari.

## Volunteers wanted! Couple of impossible tasks are there (TODO): ##

  * ~~rewrite Cubic Bezier Curves approximation algorithm;~~
  * ~~rewrite arc drawing algorithm (see [this bug](http://burzak.com/proj/fxcanvas/tests/canvas-rounded-corners.html));~~
  * ~~stroke to path conversion (=> patterns on strokes, strokeText() etc..) - seems to be impossible, required a  new low level rendering system~~ ;
  * ~~fix `isPointInPath()`~~;
  * improve text API;
  * improve drawImage: ~~`drawImage(canvasElement, ...)`~~, `drawImage(videoElement, ...)`;
  * translation from Canvas to SVG and vice versa, `toDataURL("image/xml+svg")`;
  * composite operations;
  * shadows;

## Bugs and feedbacks ##

  * [Issue tracker](http://code.google.com/p/fxcanvas/issues/list)
  * [Discussion group](http://groups.google.com/group/fxcanvas)

## What's up ##

### fxCanvas 0.2 - Super Sonic ###

<p>
<img src='http://burzak.com/proj/fxcanvas/docs/images/super_sonic.gif' />
</p>

> <strong>Beta 4 (2011-02-05)</strong>

> It seems basic Canvas API is implemented. I wonder is it ready for production?

  * `jooscript.js` is updated to the latest beta with bright shiny new features.
  * `oncanvasframe` now based on new approach from Mozzila: `mozRequestAnimationFrame` which gives pretty smooth playback for animations and games. Great introduction to `mozRequestAnimationFrame` [is here](http://nokarma.org/2010/02/02/javascript-game-development-the-game-loop/).
  * Added demo [Watercolor](http://burzak.com/proj/fxcanvas/demo/watercolor.html).
  * (IE) Method `canvas.loadImage` renamed to `loadImages` as it handle multiple arguments.
  * (IE) Fixed my mistake in load queue.
  * (IE) [Tangent approximation](http://www.timotheegroleau.com/Flash/articles/cubic_bezier_in_flash.htm)  was replaced with Fixed MidPoint approach. In most cases end-users will not see any differences between two approaches (bezier curve will be wrong on extremal arguments only), but Fixed MidPoint algorithm will works a lot faster especially with complex graphic with tons of cubic bezier curves.
  * (IE) In the same time was refactored arcs drawing method. And it became faster too.
  * (IE) Now unexpected arguments will [raise an exception](http://burzak.com/proj/fxcanvas/tests/test_exceptions.html).
  * (IE) Now URLs with ports are supported ([issue 6](http://code.google.com/p/fxcanvas/issues/detail?id=6)).
  * (IE) Implemented accurate method `isPointInPath` (via `ctx.invoke("isPointInPath", x, y, ...)`).

<a href='Hidden comment: 
* Added [http://burzak.com/proj/fxcanvas/demo/cakejs/examples/canvas.html CAKE demo].
'></a>

> <strong>Beta 3 (2010-12-25)</strong>

> <p>There are a lot of constructive changes and only a few new features.</p>

  * Added demo [Colorize image](http://burzak.com/proj/fxcanvas/demo/colorize.html).
  * Added demo [Interferoplasma](http://burzak.com/proj/fxcanvas/demo/plasma.html).
  * In Firefox 4 will be used new [typed arrays](https://cvs.khronos.org/svn/repos/registry/trunk/public/webgl/doc/spec/TypedArray-spec.html) for ImageData.
  * (IE) Added [distorted canvas resizing](http://burzak.com/proj/fxcanvas/tests/test_distorted_canvas_resize.html).
  * (IE) Added `oncanvasresize` event. [Example](http://burzak.com/proj/fxcanvas/tests/explorercanvas.googlecode.com/examples/example3.html).
  * (IE) Fixed other bugs.

> <strong>Beta 2 (2010-12-06)</strong>

  * `onframe` attribute renamed to `oncanvasframe`.
  * Fixed `frameDuration` property for canvas backend.
  * (IE) Fixed [canvas cursor style](http://burzak.com/proj/fxcanvas/tests/test_cursor_style.html).
  * (IE) Fixed canvas.loadImage() for [series of images](http://burzak.com/proj/fxcanvas/tests/developer.mozilla.org/samples/canvas-tutorial/3_4_canvas_gallery.html).
  * (IE) Fixed [canvas resizing](http://burzak.com/proj/fxcanvas/tests/explorercanvas.googlecode.com/testcases/resizing.html).

> <strong>Beta 1 (2010-11-12)</strong>

  * Changed image data format, now it is array with length = image width `x` height where element is pixel value encoded in 32-bit integer. [Data structure comparison](http://burzak.com/proj/fxcanvas/tests/data-structure-comparison.html).
  * Experimental implementation of reusable Canvas path.
  * (IE) Images and text are now [clipable](http://burzak.com/proj/fxcanvas/tests/test_clip.html).
  * (IE) Improved Canvas Text API.
  * (IE) Rewritten initialization routine.
  * (IE) Some optimizations in Flash backend.
  * (IE) Basic implementation of method `drawImage([Canvas element], ...)`.
  * (IE) Now it is possible to draw image from another domain via proxy script (required PHP and cURL).