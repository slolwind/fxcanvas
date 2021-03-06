/*
 * Flash-powered rendering backend
 *
 * Copyright (c) 2010 Evgen Burzak <buzzilo at gmail.moc>
 * Released under the MIT/X License
 */

/*
   In Internet Explorer is used FlashVars property of the flash object as command buffer.

   The trick is to using fscommand() for queries and FlashVars as command buffer 
   instead of ExternalInterface. This required less cpu power to make 
   asynchronous javascript-flash bridge.
   As of down side you should use wrapper ctx.invoke() for getting values from flash
   (e.g. CanvasPixelArray or TextMetrics).
   Note: trick works in IE only.
*/
$Unit(__PATH__, __FILE__, function(unit, root, glob){

  unit.Import(
    "buz.fxcanvas.*", 
    "buz.util.*"
  );

  // Create a dummy canvas element so that IE will allow canvas elements to be
  // recognized.
  root.createElement("canvas"); 

  // setup default canvas style
  root.createStyleSheet().cssText =
    "canvas{display:inline-block;width:300px;height:150px;}";

  unit.Package("buz.fxcanvas.backend", function(group) {

    var slice = Array.prototype.slice, 
        last = function () { return this[this.length - 1]; };

    // index in __canvasElement array
    unit.lastCanvasID = 0;
    unit.pageUUID = (+(new Date)).toString(36);

    /***********************************\\//***********************************/ 
    /***************************** // } .IE. { // *****************************/ 

    // HTMLCanvasElement stub
    unit._HTMLCanvasElement = {
      "prototype" : {
        "getContext" : function(contextId) {
          return this.__getContext(contextId);
        },
        "__getContext" : function(contextId) {
          return contextId === "2d" ? this.__fx_context_2d : null;
        },
        "getBackend" : function(backendId) {
          return backendId === "2d" ? this.__fx_context_2d._backend : null;
        },

        // Returns canvas shot in `data` URI format.
        // Note: data URI not supported in IE less than 8 natively, 
        // but it can be drawn on canvas element.
        "toDataURL" : function(type) {
          var args = arguments, 
              qual = args.length == 3 ? parseFloat(args[args.length-2]) : 0,
              dataHandler = args[args.length-1],
              backend = this.getBackend("2d");

          var _type
          if(typeof type === "string") {
            _type = type.toLowerCase();
            switch (_type) {
              case 'image/png':
              case 'image/jpeg':
              case 'image/svg+xml':
                break;
              default:
                dataHandler("data:,");
                return;
            }
          }
          else {
            _type = 'image/png'
          }

          backend._invoke(["toDataURL", _type, qual, dataHandler]);
          return null
        },

        // Assets loaders
        //
        "loadImages" : function() {
          if (!arguments.length) return;

          var args = slice.call(arguments, 0),
              backend = this.getBackend("2d"),
              canvas = this;

          // if src is in base64 format, it will newer loaded in IE,
          // so masking image object and call onload() immediatly
          var arg = args.pop(), 
              tag = arg.tagName ? arg.tagName.toUpperCase() : "IMG", 
              type = 0,
              src,
              isDataURI = false,
              image;

          if(tag == "IMG") 
            type = 0, 
            src = typeof arg == "object" ? arg.src : arg,
            id = typeof arg == "object" ? arg.id : null,
            isDataURI = src.substr(0, 4).toLowerCase() == "data",
            image = isDataURI ? {
                nodeType:1, 
                tagName:"img", 
                readyState:"complete", 
                width:0, 
                height:0
            } : new Image();
          else if (tag == "CANVAS") 
            type = 1, image = arg;
          else if (tag == "VIDEO") 
            type = 2;

          //trace("loadImage()", type, src)

          // if image is canvas or video element
          if (isDataURI || type == 1) {
            if(isDataURI)
              image.src = src;
            backend._invoke(["_loadImage", type, image, function(data)
            {
              if(type == 0) {
                image.width = data.width
                image.height = data.height
              }
              
              if (typeof canvas.onload == "function")
                canvas.onload(image);

              if (args.length)
                canvas.loadImages.apply(canvas, args);

            }]);
          }
          // if URL image
          else {
            if(id) image.id = id
            image.onload = function () {
              backend._invoke(["_loadImage", type, image, function(data)
              {
                if (typeof canvas.onload == "function") {
                  canvas.onload(image);
                }
                if (args.length)
                  canvas.loadImages.apply(canvas, args);
              }]);
            };
            // load in browser (image will be cached and instantly loaded by flash)
            image.src = src;
          }
        },
        "loadFonts" : function() {
          // todo
        },
        "loadVideos" : function() {
          // todo
        }
      },
      "toString" : function(){return "[object HTMLCanvasElement]"},
      "__w3c_fake" : true
    };

    // serialized commands
    // GCC will using them as macro variables
    //
    // ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'#-()#^~!@.,/
    var com_beginPath = "A",
        com_moveTo = "B",
        com_lineTo = "C",
      com_quadraticCurveTo = "D",
        com_bezierCurveTo = "E",
        com_arc = "F",
        com_arcTo = "G",
        com_rect = "H",
        com_stroke = "I",
        com_fill = "J",
        com_closePath = "K",
        com_save = "L",
        com_restore = "M",
        com_fillStyle = "N",
        com_strokeStyle = "O",
        com_clearRect = "P",
        com_fillRect = "Q",
        com_strokeRect = "R",
        com_drawImage = "S",
        com_scale = "T",
        com_rotate = "U",
        com_translate = "V",
        com_transform = "W",
        com_setTransform = "X",
        com_shadOffX = "Y",
        com_shadOffY = "Z",
        com_shadBlur = "a",
        com_shadColor = "b",
        com_lineWidth = "c",
        com_lineCap = "d",
        com_lineJoin = "e",
        com_miterLimit = "f",
        com_crLinGrad = "h",
        com_crRadGrad = "i",
        com_globA = "j",
        com_globCO = "k",
        com_getImageData = "l",
        com_measureText = "m",
        com_isPointInPath = "n",
        com_putImageData = "o",
        com_drawFocusRing = "p",
        com_addColorStop = "q",
        com_createPattern = "r",
        com_fillText = "s",
        com_strokeText = "t",
        com_font = "u",
        com_textAlign = "v",
        com_textBaseline = "w",
        com_clip = "x",
        com_resize = "y",
        com_idle = "z",
        com_endQueue = "'",
        com_ready = "#",
        com_onframe = "-",
        com_dummy = ")",
        com_toDataURL = "(",
        com__loadImage = "$",
        com__lockBitmap = "*",
        com__unlockBitmap = "+",
        com_event = "^",
        com_invoke = "~",
        com_except = "!",
        com_frameDuration = "@",
        com_viewImage = ".",
        com_saveImage = ",",
        com_path      = "/";

    var swf_version = "9,0,0,0";

    var argEnd = "\x01";

    function escapeArgString(str) {
      function replaceSpecialChar(match){
        if (match == "%")
          return "%25";
        else if (match == "&")
          return "%26";
        else if (match == "=")
          return "%3D";
        else if (match == "+")
          return "%2B";
      }
      return str.replace(/[%&=\+]/g, replaceSpecialChar);
    };

    /**
     *  Flash rendering backend
     **/
    group.FlashRenderingBackend2D = function(canvas) {

      var ctx = this; 
          
      this["canvas"] = canvas;

      this["_stack"] = [];
      this["_buf"] = [];
      // queue of invoked commands 
      this["_queue"] = [];
      this["_ext"] = canvas.__fx_context_2d;

      this.transformMatrix = null;

      // internal methods
      //

      this["_resize"] = function(newWidth, newHeight) {
        //trace('_resize', newWidth, newHeight)
        this._stack[this._stack.length] = [
          com_resize, parseInt(newWidth), parseInt(newHeight), ""
        ].join(argEnd)
      };

      this["_setup"] = function (flashObject, frameDuration) {
        this._flobject = flashObject;
        // saved _frameDuration
        this._fdur = null;
        this._frameDuration = frameDuration;

      }
      this["_init"] = function() {
        this._flobject.FlashVars = [com_ready, "1"].join("=");
        if (unit.config.idleInterval)
          idleId = setInterval(idleInterval, unit.config.idleInterval);
      };

      // idle interval prevent high CPU load in some cases,
      // it puts flash to sleep after some period of inactivity
      //
      var idleId = null;
      this._idle = false;
      this._writeCount = 0;

      //
      var date = new Date
      function idleInterval () {
        //trace("writes", ctx.canvas.id, ctx._writeCount)
        if (ctx._idle) return
        if (!ctx._writeCount) {
          ctx._flobject.FlashVars = "l=0&c=" + com_idle
          //date = new Date - date
          //console.log("idle " + idleId + ", " + date)
          ctx._idle = true
        } else {
          ctx._writeCount = 0
        }
      };

      this["_onframe"] = function () 
      {
        if (!this._stack.length) {
          this._flobject.FlashVars = "l=0&c=";
          return
        }
        if (this._fdur != this._frameDuration) {
          this._fdur = this._frameDuration;
          this._stack[this._stack.length] = [
            com_frameDuration, this._fdur, ""
          ].join(argEnd)
        }
        this._stack[this._stack.length] = com_endQueue;
        var i = 0;
        this._buf[i++] = "l=";
        this._buf[i++] = this._stack.length;
        this._buf[i++] = "&c=";
        this._buf[i++] = this._stack.join("");
        
        this._flobject.FlashVars = this._buf.join("");
        this._stack = [];
        this._buf = [];

        this._idle = false
        this._writeCount++
      };

      this["_clear"] = function () {
        this._stack = [];
        this._buf = [];
        this._flobject = null;
        clearInterval(idleId);
      };

      this["_stateStack"] = [];

      var lastStyleId=0;
      this["_getStyleId"] = function (style) {
        var styleId = "s" + (lastStyleId++);
        return styleId;
      };
    };

    // 
    //
    group.FlashRenderingBackend2D.prototype = {

      // back-reference to the canvas
      "canvas": null,

      // rects
      //

      "clearRect": function (x, y, width, height) {
        this._stack[this._stack.length] = [
          com_clearRect, x, y, width, height, ""
        ].join(argEnd)
      },

      "fillRect": function (x, y, width, height) {
        this._setCompositing();
        this._setShadows();
        this._setFillStyle();

        this._stack[this._stack.length] = [
          com_fillRect, x, y, width, height, ""
        ].join(argEnd)
      },

      "strokeRect": function (x, y, width, height) {
        this._setCompositing();
        this._setShadows();
        this._setStrokeStyle();
        this._setLineStyles();

        this._stack[this._stack.length] = [
          com_strokeRect, x, y, width, height, ""
        ].join(argEnd)
      },

      // path API
      //

      "beginPath": function () {
        this._setTransformMatrix();

        this._stack[this._stack.length] = com_beginPath
      },

      "closePath": function () {
        this._stack[this._stack.length] = com_closePath;
      },

      "moveTo": function (x, y) {
        this._stack[this._stack.length] = [
          com_moveTo, x, y, ""
        ].join(argEnd)
      },

      "lineTo": function (x, y) {
        this._stack[this._stack.length] = [
          com_lineTo, x, y, ""
        ].join(argEnd)
      },

      "quadraticCurveTo": function(cpx, cpy, x, y) {
        this._stack[this._stack.length] = [
          com_quadraticCurveTo, cpx, cpy, x, y, ""
        ].join(argEnd)
      },

      "bezierCurveTo": function(cp1x, cp1y, cp2x, cp2y, x, y) {
        this._stack[this._stack.length] = [
          com_bezierCurveTo, cp1x, cp1y, cp2x, cp2y, x, y, ""
        ].join(argEnd)
      },

      "arcTo": function(x1, y1, x2, y2, radius) {
        if (radius < 0) unit.throwException("INDEX_SIZE_ERR")
        this._stack[this._stack.length] = [
          com_arcTo, x1, y1, x2, y2, radius, ""
        ].join(argEnd)
      },

      "rect": function (x, y, width, height){
        this._stack[this._stack.length] = [
          com_rect, x, y, width, height, ""
        ].join(argEnd)
      },

      "arc": function (x, y, radius, startAngle, endAngle, anticlockwise) {
        if (radius < 0) unit.throwException("INDEX_SIZE_ERR")
        this._stack[this._stack.length] = [
        com_arc, x, y, radius, startAngle, endAngle, 
        anticlockwise || anticlockwise === undefined ? "1" : "0", ""
        ].join(argEnd)
      },

      "fill": function () {
        this._setCompositing();
        this._setShadows();
        this._setFillStyle();

        this._stack[this._stack.length] = com_fill;
      },

      "stroke": function () {
        this._setCompositing();
        this._setShadows();
        this._setStrokeStyle();
        this._setLineStyles();

        this._stack[this._stack.length] = com_stroke;
      },

      "clip": function() {
        this._stack[this._stack.length] = com_clip;
      },

      "isPointInPath": function(x, y) {
        this._stack[this._stack.length] = [
          com_isPointInPath, x, y, ""
        ].join(argEnd)
        return false;
      },

      // reserved for the future
      "isPointInPathBounds": function(x, y) {
      },

      // reserved for the future
      "getPathBounds": function() {
      },

      // extended path api

      "appendPath": function(_path) {
        this._stack[this._stack.length] = _path
      },

      // focus management
      //

      // boolean drawFocusRing(in Element element, in float xCaret, in float yCaret, in optional boolean canDrawCustom);
      "drawFocusRing": function(el, xc, yc, cust) {
      },

      // drawing images
      //

      "drawImage": function(image, sx, sy, sw, sh, dx, dy, dw, dh) {
        // The first argument is HTMLImageElement, HTMLCanvasElement or
        // HTMLVideoElement. 

        var target = this, argc = arguments.length;

        if (sx + sw < 1 || sy + sh < 1)
          unit.throwException("INDEX_SIZE_ERR");

        if (dx + dw < 1 || dy + dh < 1)
          unit.throwException("INDEX_SIZE_ERR");

        assertImageIsValid(image)

        this._setCompositing();
        this._setShadows();

        var imageId = image._imageId

        this._stack[this._stack.length] = [
          com_drawImage, argc, imageId, sx, sy,
          argc >= 5 ? [ sw, sh ].join(argEnd) : "",
          argc == 9 ? [ dx, dy, dw, dh ].join(argEnd) : "", ""
        ].join(argEnd)
      },

      // pixel manipulation
      //

      "createImageData": function() {
        if (arguments.length > 1) {
          if (!(isFinite(arguments[0]) && isFinite(arguments[0])))
            unit.throwException('NOT_SUPPORTED_ERR');
          if (!(arguments[0] && arguments[0]))
            unit.throwException('INDEX_SIZE_ERR');
          return new unit.ImageData(arguments[0], arguments[1])
        } else {
          if (!arguments[0])
            unit.throwException('NOT_SUPPORTED_ERR');
          return new unit.ImageData(arguments[0])
        }
      },

      "getImageData": function(rect, sy, sw, sh) {
        var sx;
        if(arguments.length == 1) // first argument is rectangle
          sx = rect.x,
          sy = rect.y,
          sw = rect.width,
          sh = rect.height;
        else
          sx = rect;

        if (!(isFinite(sx) && isFinite(sy) && isFinite(sw) && isFinite(sh)))
          unit.throwException('NOT_SUPPORTED_ERR');
        if (!(sw && sh))
          unit.throwException('INDEX_SIZE_ERR');

        this._stack[this._stack.length] = [
          com_getImageData, sx, sy, sw, sh, ""
        ].join(argEnd)
      },

      "putImageData": function(imageData, dx, dy, dirtyX, dirtyY, dirtyWidth, dirtyHeight) 
      {
        unit.assertImageDataIsValid(imageData);

        var proxyObject = {
          data: imageData.__useCache ? imageData.__cachedData || [] : [] ,
          toString: function () {return this.data.join("")}
        };

        if(!imageData.__useCache || 
            (imageData.__useCache && !proxyObject.data.length))
        {
          var m = [];

          // precalculate mask for bad chars
          //
          for (var i=0; i<256; i++) {
            switch (i) {
              case 0:  // \x00
              case 37: // %
              case 38: // &
              case 43: // +
              case 61: // =
                  m[i] = 1;
                  break;
              default:
                  m[i] = 0;
            }
          }

          for(var i=0; i<imageData.data.length; i++) 
          {
            var pix = imageData.data[i],
                red = pix >> 24 & 0xFF,
                green = pix >> 16 & 0xFF,
                blue = pix >> 8 & 0xFF,
                alpha = pix & 0xFF,
                mask_red = m[red] << 1,
                mask_green = m[green] << 2,
                mask_blue = m[blue] << 3,
                mask_alpha = m[alpha] << 4;

                proxyObject.data[i] = String.fromCharCode( 
                                mask_red + mask_green + mask_blue + mask_alpha + 1,
                                red ^ mask_red, 
                                green ^ mask_green, 
                                blue ^ mask_blue, 
                                alpha ^ mask_alpha );
          }

          if(imageData.__useCache)
            imageData.__cachedData = proxyObject.data
        }
          

        if (!(isFinite(dx) && isFinite(dy)))
          unit.throwException('NOT_SUPPORTED_ERR');

        this._stack[this._stack.length] = [
          com_putImageData, 
          arguments.length, 
          imageData.width, 
          imageData.height, 
          proxyObject, 
          dx, dy, ""
        ].join(argEnd)
        
        if (arguments.length > 3) {

          if (!(isFinite(arguments[1]) && isFinite(arguments[2]) && isFinite(arguments[3]) || 
                isFinite(arguments[4]) && isFinite(arguments[5]) && isFinite(arguments[6])))
            unit.throwException('NOT_SUPPORTED_ERR');

          this._stack[this._stack.length] = [
            dirtyX, dirtyY, dirtyWidth, dirtyHeight, ""
          ].join(argEnd)
        }
      },

      // gradients and patterns
      //

      "createLinearGradient": function (x0, y0, x1, y1) {
        var grad = new unit._CanvasGradient(this);
        this._stack[this._stack.length] = [
          com_crLinGrad, grad.id, x0, y0, x1, y1, ""
        ].join(argEnd)
        return grad ;
      },

      "createRadialGradient": function (x0, y0, r0, x1, y1, r1) {
        var grad = new unit._CanvasGradient(this);
        this._stack[this._stack.length] = [
          com_crRadGrad, grad.id, x0, y0, r0, x1, y1, r1, ""
        ].join(argEnd)
        return grad ; 
      },

      "createPattern": function (image, repetition) {
        // The first argument can be HTMLImageElement, HTMLCanvasElement or
        // HTMLVideoElement. 
        assertImageIsValid(image)
        switch (repetition) {
          case 'repeat':
          case undefined:
          case null:
          case '':
            repetition = 'repeat';
            break
          case 'repeat-x':
          case 'repeat-y':
          case 'no-repeat':
            // passed
            break;
          default:
            unit.throwException('SYNTAX_ERR');
        }
        var patt = new unit._CanvasPattern(this);
        this._stack[this._stack.length] = [
          com_createPattern, patt.id, image._imageId, repetition, ""
        ].join(argEnd)
        return patt;
      },

      // transformations (default transform is the identity matrix)
      //

      "scale": function(x, y) {
        this._stack[this._stack.length] = [
          com_scale, x, y, ""
        ].join(argEnd)
      },

      "rotate": function(angle) {
        this._stack[this._stack.length] = [
          com_rotate, angle, ""
        ].join(argEnd)
      },

      "translate": function(tx, ty) {
        this._stack[this._stack.length] = [
          com_translate, tx, ty, ""
        ].join(argEnd)
      },

      "transform": function(m11, m12, m21, m22, tx, ty) {
        this._stack[this._stack.length] = [
          com_transform, m11, m12, m21, m22, tx, ty, ""
        ].join(argEnd)
      },

      "setTransform": function(m11, m12, m21, m22, tx, ty) {
        this._stack[this._stack.length] = [
          com_setTransform, m11, m12, m21, m22, tx, ty, ""
        ].join(argEnd)
      },

      // state
      //

      "save": function () { 
        // apply all properties
        this._setCompositing();
        this._setShadows();
        this._setStrokeStyle();
        this._setFillStyle();
        this._setLineStyles();
        this._setFontStyles();

        this._stateStack.push({ // push state on state stack
          "globalAlpha": this.globalAlpha,
          "globalCompositeOperation": this.globalCompositeOperation,
          "strokeStyle": this.strokeStyle,
          "fillStyle": this.fillStyle,
          "lineWidth": this.lineWidth,
          "lineCap": this.lineCap,
          "lineJoin": this.lineJoin,
          "miterLimit": this.miterLimit,
          "shadowOffsetX": this.shadowOffsetX,
          "shadowOffsetY": this.shadowOffsetY,
          "shadowBlur": this.shadowBlur,
          "shadowColor": this.shadowColor,
          "font": this.font,
          "textAlign": this.textAlign,
          "textBaseline": this.textBaseline
        });

        this._stack[this._stack.length] = com_save;
      },

      "restore": function () { // pop state stack and restore state
        if (this._stateStack.length > 0) {
          var state = this._stateStack.pop();
          this.globalAlpha = state.globalAlpha;
          this.globalCompositeOperation = state.globalCompositeOperation;
          this.strokeStyle = state.strokeStyle;
          this.fillStyle = state.fillStyle;
          this.lineWidth = state.lineWidth;
          this.lineCap = state.lineCap;
          this.lineJoin = state.lineJoin;
          this.miterLimit = state.miterLimit;
          this.shadowOffsetX = state.shadowOffsetX;
          this.shadowOffsetY = state.shadowOffsetY;
          this.shadowBlur = state.shadowBlur;
          this.shadowColor = state.shadowColor;
          this.font = state.font;
          this.textAlign = state.textAlign;
          this.textBaseline = state.textBaseline;
        }

        this._stack[this._stack.length] = com_restore;
      },

      // text
      //

      "font": unit.defProp.font,
      "textAlign": unit.defProp.textAlign,
      "textBaseline": unit.defProp.textBaseline,

      "fillText": function(text, x, y, maxWidth) {
        this._setCompositing();
        this._setShadows();
        this._setFillStyle();
        this._setFontStyles();

        // maxWidth should be Infinity value
        this._stack[this._stack.length] = [
          com_fillText, text, x, y, maxWidth == undefined ? 0xffffffff : maxWidth, ""
        ].join(argEnd)
      },

      "strokeText": function(text, x, y, maxWidth) {
        this._setCompositing();
        this._setShadows();
        this._setStrokeStyle();
        this._setLineStyles();
        this._setFontStyles();

        // maxWidth should be Infinity value
        this._stack[this._stack.length] = [
          com_strokeText, text, x, y, maxWidth == undefined ? 0xffffffff : maxWidth, ""
        ].join(argEnd)
      },

      "measureText": function(text) {
        this._stack[this._stack.length] = [
          com_measureText, text, ""
        ].join(argEnd)
      },

      // line caps/joins
      //

      "lineWidth": unit.defProp.lineWidth,
      "lineCap": unit.defProp.lineCap,
      "lineJoin": unit.defProp.lineJoin,
      "miterLimit": unit.defProp.miterLimit,

      // colors and styles
      //

      "strokeStyle": unit.defProp.strokeStyle,
      "fillStyle": unit.defProp.fillStyle,

      // compositing
      //

      "globalAlpha": unit.defProp.globalAlpha,
      "globalCompositeOperation": unit.defProp.globalCompositeOperation,

      // shadows
      //

      "shadowOffsetX": unit.defProp.shadowOffsetX,
      "shadowOffsetY": unit.defProp.shadowOffsetY,
      "shadowBlur": unit.defProp.shadowBlur,
      "shadowColor": unit.defProp.shadowColor,

      // dump canvas data
      //

      "toDataURL" : function(type, qual) {
        this._stack[this._stack.length] = [
          com_toDataURL, type, isFinite(qual) && qual || 0, ""
        ].join(argEnd)
      },

      // internals

      "_loadImage" : function(type, image) {
        var elementId = 0;
        // not load the same image twice, except canvas and video element,
        // which are dynamic graphics
        var images = this.canvas._images
        if(type == 0)
          if(image._imageId > -1 && images[image._imageId] === image)
            return; 

        if(type > 0) { // canvas and video element
          elementId = image.__id 
        }

        // set imageId and add it into images stack
        image._imageId = images.length;
        this.canvas._images.push(image);

        //trace("_loadImage()", [this.canvas.id, type, elementId, image._imageId,  image.src])
        this._stack[this._stack.length] = [
          com__loadImage,
          type,
          elementId,
          image._imageId,
          image.src ? escapeArgString(image.src) : "none", ""
        ].join(argEnd)
      },

      // fxCanvas is using asynchronous communications with flash, it means
      // that you have to pass some frames, till value returned.
      "_invoke" : function(_args) {
        var args = slice.call(_args, 1, _args.length-1),
            invokedCmd = _args[0],
            dataHandler = last.call(_args);

        //trace("_invoke()", this.canvas.id, invokedCmd, this._queue.length)
        this._stack[this._stack.length] = [
          com_invoke, this._queue.length, invokedCmd, ""
        ].join(argEnd)

        // ... and wait until data arrived
        //
        this._queue[this._queue.length] = [invokedCmd, dataHandler];

        // apply command
        //
        this[invokedCmd].apply(this, args)
      },

      "_ondata" : function (proxy, cmd, func) {
        var data;
        switch (cmd) {
          case "toDataURL":
            data = proxy.args;
            break;
          case "isPointInPath":
            data = proxy.args == "1" ? true : false;
            break;
          case "measureText":
            var args = proxy.args.split(argEnd)
            // args is [width, height, ascent, descent]
            data = new unit._TextMetrics( Number(args[0]), 
                                          Number(args[1]),
                                          Number(args[2]),
                                          Number(args[3]));
            break;
          case "getImageData":
            // proxy.args must be header(5) + data(width * height * 5)
            //
            var header = this._decodePixel(proxy, 0),
                a = header & 0xFF ,
                r = header >> 24 & 0xFF,
                g = header >> 16 & 0xFF,
                b = header >> 8 & 0xFF,
                width = ((a << 8) + r),
                height = ((g << 8) + b);

            var imageData = new Array(width * height);
            for (var i=0; i<imageData.length; i++) {
              imageData[i] = this._decodePixel(proxy, 5+(i*5));
            }
            data = new unit.ImageData(width, height, imageData);
            break;
          case "_loadImage":
            var imgInfo = proxy.args.split(argEnd);
            data = {
              type : imgInfo[0],
              width : imgInfo[1],
              height : imgInfo[2],
              url : imgInfo[3]
            }
            break;
          case "putImageData":
          default:
            data = null;
        }

        // call command handler
        //
        func.call(this._ext, data);
      },

      "_decodePixel" : function (proxy, ofs) {
        var mask  = proxy.args.charCodeAt(ofs),
            red   = proxy.args.charCodeAt(ofs+1) ^ (mask & 0x2), 
            green = proxy.args.charCodeAt(ofs+2) ^ (mask & 0x4), 
            blue  = proxy.args.charCodeAt(ofs+3) ^ (mask & 0x8), 
            alpha = proxy.args.charCodeAt(ofs+4) ^ (mask & 0x10);

        return (red << 24) + (green << 16) + (blue << 8) + alpha;
      },

      // dummy  command
      //
      "dummy" :  function () {
          this._stack[this._stack.length] = com_dummy;
      },
      
      // save and view canvas shot
      //
      "_viewImage" :  function () { 
        this._stack[this._stack.length] = com_viewImage; 
      },
      "_saveImage" :  function () { 
        this._stack[this._stack.length] = com_saveImage; 
      },

      // apply transformMatrix
      //
      "_setTransformMatrix" : function () {
        return // not implemented yet
        this._stack[this._stack.length] = [
            com_setTransform, this._ext.transformMatrix._dump(), ""
        ].join(argEnd)
      },

      // line caps/joins
      //
      "_setLineStyles" : function () {
        this.lineWidth = this._ext.lineWidth;
        this.lineCap = this._ext.lineCap;
        this.lineJoin = this._ext.lineJoin;
        this.miterLimit = this._ext.miterLimit;

        this._stack[this._stack.length] = [
          com_lineWidth, this.lineWidth, 
          com_lineCap, this.lineCap, 
          com_lineJoin, this.lineJoin, 
          com_miterLimit, this.miterLimit, ""
        ].join(argEnd)
      },

      // Fills
      //
      "_setFillStyle" : function () {
        this.fillStyle = this._ext.fillStyle;
        var style = this.fillStyle.id || this.fillStyle.replace(/%/g, "%25");

        this._stack[this._stack.length] = [
          com_fillStyle, style, ""
        ].join(argEnd)
      },


      // styles
      //
      "_setStrokeStyle" : function () {
        this.strokeStyle = this._ext.strokeStyle;
        var style = this.strokeStyle.id || this.strokeStyle.replace(/%/g, "%25");
        this._stack[this._stack.length] = [
          com_strokeStyle, style, ""
        ].join(argEnd)
      },

      // Compositing
      //
      "_setCompositing" : function () {
        this.globalAlpha = this._ext.globalAlpha;
        this.globalCompositeOperation = this._ext.globalCompositeOperation;

        this._stack[this._stack.length] = [
          com_globA, this.globalAlpha,
          com_globCO, this.globalCompositeOperation, ""
        ].join(argEnd)
      },

      // Shadows
      //
      "_setShadows" : function () {
        return // not implement yet

        this.shadowOffsetX = this._ext.shadowOffsetX;
        this.shadowOffsetY = this._ext.shadowOffsetY;
        this.shadowBlur = this._ext.shadowBlur;
        this.shadowColor = this._ext.shadowColor;

        this._stack[this._stack.length] = [
          com_shadOffX, this.shadowOffsetX,
          com_shadOffY, this.shadowOffsetY, 
          com_shadBlur, this.shadowBlur, 
          com_shadColor, this.shadowColor, ""
        ].join(argEnd)
      },

      // Fonts
      //
      // @fixme: The font size is not always in "px"
      // fixme: working style parser
      "_setFontStyles" : function () 
      {
        // update font style only if it neccecary
        //if(this.font != this._ext.font) {
        //}

        /*
        var style;
        try {
          this._flobject.style.font = this._ext.font;
          style = this._flobject.currentStyle;
          this._fontStyle = [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(" ");
        } catch (e) {}
        */
        
        this.font = this._ext.font;
        this.textAlign = this._ext.textAlign;
        this.textBaseline = this._ext.textBaseline;

        this._stack[this._stack.length] = [
          com_font, this.font, 
          com_textAlign, this.textAlign,
          com_textBaseline, this.textBaseline, ""
        ].join(argEnd)
      },

      "_lockBitmap" : function () {
        this._stack[this._stack.length] = com__lockBitmap;
      },

      "_unlockBitmap" : function () {
        this._stack[this._stack.length] = com__unlockBitmap;
      }
    };

    unit._CanvasGradient = function(ctx) {
      this.ctx  = ctx
      this.id   = ctx._getStyleId(this);
    };

    unit._CanvasGradient.prototype = {
      "addColorStop": function(offset, color) {
        this.ctx._stack[this.ctx._stack.length] = [
          com_addColorStop, this.id, offset, color, ""
        ].join(argEnd)
      }
    };

    unit._CanvasPattern = function(ctx) {
      this.ctx = ctx
      this.id  = ctx._getStyleId(this);
    };

    unit._TextMetrics = function(width, height, ascent, descent) {
      this.width = width;
      this.height = height;
      this.ascent = ascent; 
      this.descent = descent;
    };

    /*
     * ... sorry, I cannot write the code and lyrics at the same time ...
     */

    unit.extendContext = function() {
      // todo
    };

    unit.initialize = function() {
      var nodes, canvas;

      unit.swf_url = unit.config.script_path + "fxcanvas.swf";

      // cache SWF data so that object is interactive upon writing
      var req = new ActiveXObject("Microsoft.XMLHTTP");
      req.open("GET", unit.swf_url, false);
      req.send(null);

      nodes = document.getElementsByTagName("canvas");
      for (var i=0; i<nodes.length; i++) {
        canvas = nodes[i]
        unit.initElement(canvas)
        unit.object.extend(canvas, unit._HTMLCanvasElement.prototype);
      }
    };

    var defaultWidth = 300, defaultHeight = 150;

    // Init routine splitting into two steps, as canvas attributes 
    // can be added after createElement(), so then it may generate
    // troubles with canvas size
    //
    // This is first step ...
    //
    unit.initElement = function(canvas) 
    {
      // exit, if somehow the element was initialized prior to
      if (canvas.getContext) return;

      // set canvas ID firstly to properly element loading
      var canvasID = unit.lastCanvasID++;
      __canvasElement[canvasID] = canvas;
      __canvasElement[canvasID].__id = canvasID;

      var canvasWidth, canvasHeight;

      // initialize flash object on the next tick
      setTimeout(function(){
        unit.initFlash(canvas, canvasID, canvasWidth, canvasHeight)
      }, 1)

      var params = unit.getCanvasParams(canvas);
      // set canvas events handlers from node attributes before 
      // it will be added in script 
      //
      canvas.onload = params.onload;
      canvas.oncanvasframe = params.oncanvasframe;
      canvas.oncanvasresize = params.oncanvasresize;
      // set implicit size of the canvas or defaults
      canvas.width = params.width || defaultWidth
      canvas.height = params.height || defaultHeight
      if (!params.id) canvas.id = unit.getCanvasUUID();

      canvasWidth = canvas.width, canvasHeight = canvas.height;

      // initialize external/extended canvas context
      var ext = canvas.__fx_context_2d = new unit.extCanvasRenderingContext2D(canvas, null);
      ext._backend = new group.FlashRenderingBackend2D(canvas);

      // proxy object
      //
      canvas._data = {
        args : "",
        data : "",
        toString : function () {
          return this.data;
        }
      };

      // array of preloaded images
      //
      canvas._images = new Array();

      // mimic standards behavior
      w3c(canvas);

      // flash commands handler
      canvas._fscmd = function (cmd) 
      {
        var backend = this.getBackend("2d");

        // if cmd is number, it means that arrived data for this queue id
        if(cmd > -1) 
        {
          var dataHandler = backend._queue[cmd]
          backend._ondata(this._data, dataHandler[0], dataHandler[1])
          // clear queue item
          backend._queue[cmd] = null
        } 
        else if (cmd == com_ready) 
        {
          backend._init();
        } 
        else if (cmd == com_event) 
        {
          if(this._data.args == "2") // CanvasEvent.RESIZE
            if(canvas.oncanvasresize) this.oncanvasresize()
        } 
        else if (cmd == com_except) 
        {
          unit.throwError(this._data.args)
        } 
        //else if (cmd == 'focus') { }
        else if (cmd == com_dummy) { }
        else
          unit.throwError("Unknown command " + cmd)

        // todo rendering time
        var drawTime = 0
        // call frame handler if there is one
        if (this.oncanvasframe) this.oncanvasframe(drawTime)

        backend._onframe();
      };

      return canvas;
    };

    var defaultCanvasWidth = "300px", defaultCanvasHeight = "150px"

    // Second step,
    // this will initialize and add flash object to the canvas container
    //
    unit.initFlash = function(canvas, canvasID, initWidth, initHeight) 
    {
      width = canvas.width, height = canvas.height

      // set canvas styled width and height prior to, or it will be limited to
      // the defaults ...

      // Calculate implicit size of the canvas, it may be set in page styles,
      // and as result canvas  will be distorted.
      //
      // todo width and height may be in em's, pt's and so on ...
      var cur_st = canvas.currentStyle
      
      var stageWidth = width, stageHeight = height

      // I'm not sure how flash resizing actually works ... 
      // i get to it by trial and errors ...

      if(cur_st && cur_st.width != defaultCanvasWidth){
        stageWidth = parseInt(cur_st.width)
      }
      if(cur_st && cur_st.height != defaultCanvasHeight){
        stageHeight = parseInt(cur_st.height)
      }
      
      var frameDuration = Math.abs(parseInt(canvas.frameDuration || unit.config.frameDuration));

      var viewImageURL = unit.config.viewImageURL.substr(0, 4) === "http" ? 
                            unit.config.viewImageURL : unit.config.script_path + unit.config.viewImageURL;
      var saveAsURL = unit.config.saveAsURL.substr(0, 4) === "http" ? 
                        unit.config.saveAsURL : unit.config.script_path + unit.config.saveAsURL;

      var host_addr = location.protocol + "//" + location.hostname;
      if( location.port ) host_addr += ":" + location.port
      //trace("initFlash", canvasID, frameDuration, [width, height], cur_st && cur_st.width, cur_st && cur_st.height)

      var initVars = [
            width,
            height, 
            stageWidth,
            stageHeight,
            frameDuration,
            canvasID, 
            unit.pageUUID,
            escapeArgString(host_addr), 
            escapeArgString(viewImageURL), 
            escapeArgString(saveAsURL),
            escapeArgString(unit.config.imageProxy) 
      ].join(argEnd);

      // note, 100% width and height makes drawing  slowed
      // todo append canvas fallback where flash is not installed
      //
      var flobject = ['<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000"',
        '  width="',width,'" height="',height,'"',
        '  id="__fx_canvas_',canvasID,'">',
        '<param name="allowScriptAccess" value="always">',
        '<param name="movie" value="',unit.swf_url,'">',
        '<param name="quality" value="high">',
        '<param name="menu" value="false">',
        '<param name="wmode" value="transparent">',
        '<param name="scale" value="noscale">',
        '<param name="FlashVars" value="c=',initVars,'">',
        '</object>', 
        "<script id=__fscmd_hdlr_",canvasID," event=FSCommand(cmd,args) for=__fx_canvas_",canvasID,">",
            "if(__canvasElement){",
               "__canvasElement[",canvasID,"]._data.args=args;",
               "__canvasElement[",canvasID,"]._fscmd(cmd);}","<\/script>"].join("");

      canvas.innerHTML = flobject;
      var flashObject = canvas.firstChild;

      if(cur_st && cur_st.width != defaultCanvasWidth){
        flashObject.style.width = cur_st.width;
      }
      if(cur_st && cur_st.height != defaultCanvasHeight){
        flashObject.style.height = cur_st.height;
      }

      // Important!
      canvas.style.width = width + "px"
      canvas.style.height = height + "px"

      // call oncanvasresize if current dim deffer from inits
      if(initWidth != width || initHeight != height) {
        if(canvas.oncanvasresize)
          canvas.oncanvasresize()
      }

      // setup backend
      canvas.getBackend("2d")._setup(flashObject, frameDuration)

      var contextMenuEntryHandler = {
        "view" : function () {
          canvas.getBackend("2d")._viewImage();
        },
        "save_as" : function () {
          canvas.getBackend("2d")._saveImage();
        },
        "about" : function () {
          window.location = unit.config.projectURL;
        },
        "about_flash" : function () {
          window.location = "http://www.adobe.com";
        }
      };

      if (unit.config.contextMenu)
        canvas.contextMenu = new unit.ContextMenu(unit.config.contextMenu, contextMenuEntryHandler);
      else
        canvas.contextMenu = null

      // cursor style should be changed on flash element,
      // setting canvas.style.cursor will not giving any effect
      flashObject.style.cursor = 'default'

      // freeing (right-) click event on canvas and get rid of 
      // flashes context menu 
      //
      canvas._onContextMenu = function (evt) {
        if (canvas.contextMenu)
          canvas.contextMenu.show(evt.x, evt.y);
        return false;
      };
      canvas._onMouseDown = function (evt) {
        flashObject.focus();
      };
      canvas._onCanvasEnter = function() { 
        //trace('enter canvas')
        flashObject.style.cursor = canvas.style.cursor
        canvas.setCapture(true);
        //canvas._captured = true
        if(!canvas.contextMenu) return
        document.attachEvent("oncontextmenu", canvas._onContextMenu);
        document.attachEvent("onmousedown", canvas._onMouseDown);
      };
      canvas._onCanvasLeave = function() { 
        //trace('leave canvas')
        flashObject.style.cursor = 'none'
        canvas.releaseCapture(); 
        //canvas._captured = false
        if(!canvas.contextMenu) return
        document.detachEvent("oncontextmenu", canvas._onContextMenu);
        document.detachEvent("onmousedown", canvas._onMouseDown);
      };

      // todo (maybe impossible) return focus to html element, not flash,
      // after switching active window

      /*
      function onDocumentEnter () {
        trace('enter document')
        if(canvas._captured)
          canvas._onCanvasEnter()
      }

      function onDocumentLeave () {
        trace('leave document')
        if(canvas._captured)
          canvas._onCanvasLeave()
      }

      document.attachEvent("onfocusin", onDocumentEnter)
      document.attachEvent("onfocusout", onDocumentLeave)
      */

      canvas.attachEvent("onmouseenter", canvas._onCanvasEnter);
      canvas.attachEvent("onmouseleave", canvas._onCanvasLeave);

      // do not use inline function because that will leak memory
      canvas.attachEvent("onpropertychange", unit.onPropertyChange);
      flashObject.attachEvent("onfocus", unit.onFocus);

      // we're almost ready ..
    };

    function resizeCanvas (canvas) {
      //trace('resizeCanvas()', canvas.width, canvas.height, resizeCanvas.oldWidth, resizeCanvas.oldHeight)
      var backend = canvas.getBackend("2d"); 
      // reflects standard behavior
      backend._resize(canvas.width, canvas.height);
      resizeCanvas.oldWidth = canvas.width
      resizeCanvas.oldHeight = canvas.height
    }

    unit.onPropertyChange = function(event) {
      var prop = event.propertyName, canvas, backend;
      switch(prop) {
        case "width": 
        case "height": 
        case "frameDuration": 
        case "style.cursor":
        case "style.width":
        case "style.height":
          canvas = event.srcElement; 
          backend = canvas.getBackend("2d"); 
      }
      if (prop == "width" || prop == "height") {
        var value = parseInt(canvas[prop]);
        if (isNaN(value) || value < 0) {
          value = (prop == "width") ? 300 : 150;
        }
        backend._flobject[prop] = value
        //canvas.style[prop] = value + "px"
        // call resizeCanvas() by interval to handle both width and height values
        clearTimeout(canvas._resizeIntId)
        //trace('onPropertyChange()', prop, value)
        canvas._resizeIntId = setTimeout(function(){
            resizeCanvas(canvas)
        }, 1)
      } else if (prop == "frameDuration") {
        var dur = Math.abs(parseInt(canvas.frameDuration));
        backend._frameDuration = dur;
        //trace('onPropertyChange()', 'frameDuration', dur )
      } else if (prop == "style.cursor") {
        backend._flobject.style.cursor = canvas.style.cursor
      // todo convert implicit size into real dimension
      } else if (prop == "style.width") {
        //trace('onPropertyChange()', 'style.width', canvas.style.width )
        //backend._flobject.width = parseInt(canvas.style.width)
        backend._flobject.style.width = canvas.style.width
      } else if (prop == "style.height") {
        //trace('onPropertyChange()', 'style.height', canvas.style.height )
        //backend._flobject.height = parseInt(canvas.style.height)
        backend._flobject.style.height = canvas.style.height
      }
    };

    unit.onFocus = function(event) {
      // forward the event to the parent
      var swf = event.srcElement, canvas = swf.parentNode;
      swf.blur();
      canvas.focus();
    };

    unit.onUnload = function() {
      window.detachEvent("onbeforeunload", unit.onUnload);

      for (var i=0, len=window.__canvasElement.length; i<len; i++) {
        var canvas = window.__canvasElement[i], 
            backend = canvas.getBackend("2d"), 
            flashObject = backend._flobject, 
            prop;

        // clean up the function references 
        for (prop in canvas) 
          if (typeof canvas[prop] === "function") 
            canvas[prop] = null;

        canvas._data = null;

        // remove event listeners
        canvas.detachEvent("onpropertychange", unit.onPropertyChange);
        try{
          canvas.detachEvent("onmouseenter", canvas._onCanvasEnter);
          canvas.detachEvent("onmouseleave", canvas._onCanvasLeave);
          flashObject.detachEvent("onfocus", unit.onFocus);
          document.detachEvent("onmousedown", canvas._onMouseDown);
          document.detachEvent("oncontextmenu", canvas._onContextMenu);
        }catch(e){}

        // clear idle intervals
        backend._clear();
      };

      // delete exported symbols
      //
      window["CanvasRenderingContext2D"] = null;
      window["CanvasGradient"]           = null;
      window["CanvasPattern"]            = null;
      window["TextMetrics"]              = null;
      window["HTMLCanvasElement"]        = null;
      window["DOMException"]             = null;
      window["__canvasElement"]          = null;
    };

    // see  IEshim.js
    //
    unit._HTMLCanvasElement.__IElementConstructor = function (canvas) {
      return unit.initElement(canvas);
    };

    var assertImageIsValid = function(img) {
      var validNodes = {IMG: true, CANVAS: true};
      var tagName = (img && img.tagName && img.tagName.toUpperCase()) || null;

      if (!img || img.nodeType != 1 || !tagName) {
        unit.throwException('TYPE_MISMATCH_ERR');
      }
      if (! (tagName in validNodes)) {
        unit.throwException('TYPE_MISMATCH_ERR');
      }
      if (img.readyState != 'complete') {
        unit.throwException('INVALID_STATE_ERR');
      }
      if (tagName === "IMG" && !('_imageId' in img)) {
        unit.throwException('INVALID_STATE_ERR');
      }
    }

    window["HTMLCanvasElement"]        = unit._HTMLCanvasElement;
    window["CanvasRenderingContext2D"] = group.FlashRenderingBackend2D;
    window["CanvasGradient"]   = unit._CanvasGradient;
    window["CanvasPattern"]    = unit._CanvasPattern;
    window["TextMetrics"]      = unit._TextMetrics;
    window["DOMException"]     = unit.DOMException;
    window["__canvasElement"]  = [];

    group.extendContext = unit.extendContext
    group.initialize = unit.initialize
    group.initElement = unit.initElement

    // prevent IE6 memory leaks
    window.attachEvent("onbeforeunload", unit.onUnload);

  });
});
