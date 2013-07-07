// -*- mode: js -*-
//= require 'soundmanager2'
//= require 'webgl-utils'
//= require 'gl-matrix'

(function($) {
  var gl = null;

  function initSoundManager() {
    // Initialize sm2.
    window.soundManager.setup({
      url: "/flash/sm2/",
      flashVersion: 9,
      flash9Options: {
        usePeakData: true,
        useWaveformData: true,
        useEQData: true
      }
    });
  }

  function initControls() {
    $("a[data-song-path][data-song-action=play]").click(function(event) {
      event.preventDefault();
      var elem = $(this);
      var canvas = $("canvas#viz");
      var song_path = elem.attr("data-song-path");
      var sanitized_song_path = song_path.replace(new RegExp("[^A-Za-z0-9]", "g"), "_").toLowerCase();
      var sound = window.soundManager.createSound({
        id: "sound_song_" + sanitized_song_path,
        url: "/music/" + song_path,
        whileplaying: function() {
          canvas.data("eq-data", this.eqData);
          canvas.data("waveform-data", this.waveformData);
        }
      });
      elem.data("sound", sound);
      sound.play();
      canvas.data("stopVisualization", false);
      startAnimation();
    });

    $("a[data-song-path][data-song-action=stop]").click(function(event) {
      event.preventDefault();
      var elem = $(this);
      var canvas = $("canvas#viz");
      var song_path = elem.attr("data-song-path");
      var play_elem = $("a[data-song-path='" + song_path + "'][data-song-action=play]");
      var sound = play_elem.data("sound");
      if (sound) {
        sound.destruct();
      }
      play_elem.data("sound", null);
      canvas.data("stopVisualization", true);
    });
  }

  function loadShaderSource() {
    var viz_container = $("#viz_container");

    $.get("/assets/viz/song2_vertex.glsl", function(data) {
      viz_container.data("vertex-shader-source", data);
    });
    $.get("/assets/viz/song2_fragment.glsl", function(data) {
      viz_container.data("fragment-shader-source", data);
    });
  }

  function shaderSourcesLoaded() {
    var viz_container = $("#viz_container");
    return viz_container.data("vertex-shader-source") !== undefined &&
      viz_container.data("fragment-shader-source") !== undefined;
  }

  function clearScreen() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.flush();
  }

  function initGL() {
    var canvas = $("canvas#viz");
    gl = WebGLUtils.setupWebGL(canvas.get(0));
    canvas.css({
      position: "fixed",
      top: "5px",
      left: "5px",
      "z-index": -1
    });

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.viewport(0, 0, canvas.innerWidth(), canvas.innerHeight());
    clearScreen();
  }

  function createShaderProgram(sources) {
    var createShader = function(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        var log = gl.getShaderInfoLog(shader);
        alert("Shader failed to compile: " + log);
        console.error("Shader failed to compile: " + log + "\n" + "Shader source:\n" + source);
        gl.deleteShader(shader);
        shader = null;
      }
      return shader;
    };

    var createProgram = function(vertexShader, fragmentShader) {
      var program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        var log = gl.getProgramInfoLog(program);
        alert("Shader program failed to link: " + log);
        console.error("Shader program failed to link: " + log);
        gl.deleteProgram(program);
        program = null;
      }
      return program;
    };

    var program = createProgram(
      createShader(gl.VERTEX_SHADER, sources.vertexSource),
      createShader(gl.FRAGMENT_SHADER, sources.fragmentSource)
    );

    var attributes = {}, uniforms = {}, n_attrs, n_unis, i, info;
    n_attrs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    n_unis = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

    for (i = 0; i < n_attrs; ++i) {
      info = gl.getActiveAttrib(program, i);
      attributes[info.name] = gl.getAttribLocation(program, info.name);
    }
    for (i = 0; i < n_unis; ++i) {
      info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }

    return {
      "program": program,
      "attributes": attributes,
      "uniforms": uniforms,
      "destroy": function() {
        gl.useProgram(null);
        if (gl.isProgram(program)) {
          var shaders = gl.getAttachedShaders(program);
          for (var i = 0; i < shaders.length; ++i) {
            var s = shaders[i];
            if (gl.isShader(s)) {
              gl.detachShader(program, s);
              gl.deleteShader(s);
            }
          }
          gl.deleteProgram(program);
        }
      }
    };
  }

  function createPlaneGeometry(options) {
    var i, j, k, x, y;
    var dims = { width: options.width, height: options.height };
    var min = { x: options.left, y: options.bottom };
    var refs = { x: options.xRefinements, y: options.yRefinements };
    var vertex_width = 5;

    var attribute_data = new Float32Array((refs.x+1)*(refs.y+1)*vertex_width);
    for (i = 0; i < refs.x + 1; ++i) {
      x = i*(dims.width / refs.x) + min.x;
      for (j = 0; j < refs.y + 1; ++j) {
        k = (i*(refs.y + 1) + j)*vertex_width;
        y = j*(dims.height / refs.y) + min.y;

        // Position.
        attribute_data[k] = x;
        attribute_data[k+1] = y;
        attribute_data[k+2] = 0.0;

        // Texture coordinates.
        attribute_data[k+3] = (y - min.y) / dims.height;
        attribute_data[k+4] = (x - min.x) / dims.width;
      }
    }

    var indices = new Uint16Array(refs.x*refs.y*6);
    for (i = 0; i < refs.x; ++i) {
      for (j = 0; j < refs.y; ++j) {
        // index into indices
        l = (i * refs.y + j)*6;

        // index into attribute_data
        k = i * (refs.y + 1) + j;

        // upper triangle
        indices[l+0] = k;
        indices[l+1] = k + refs.y + 2;
        indices[l+2] = k + 1;

        // lower triangle
        indices[l+3] = k;
        indices[l+4] = k + refs.y + 1;
        indices[l+5] = k + refs.y + 2;
      }
    }

    var attribute_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, attribute_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, attribute_data, gl.STATIC_DRAW);

    var index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return {
      "attributes": attribute_buffer,
      "positionOffset": 0,
      "texCoordOffset": 3,
      "vertexWidth": 5,
      "indices": index_buffer,
      "count": indices.length,
      "destroy": function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        if (gl.isBuffer(attribute_buffer)) { gl.deleteBuffer(attribute_buffer); }
        if (gl.isBuffer(index_buffer)) { gl.deleteBuffer(index_buffer); }
      }
    };
  }

  function createAmplitudeTexture() {
    var canvas = $("canvas#viz");
    var width = 256;
    var height = 3;
    var amplitudes = new Uint8Array(width*height);
    var texture = null;
    var i;

    for (i = 0; i < width; ++i) {
      amplitudes[i]         = 127.5*Math.cos(i*2*Math.PI/(width - 1)) + 127.5;
      amplitudes[width+i]   = 0;
      amplitudes[2*width+i] = 127.5*Math.sin(i*2*Math.PI/(width - 1)) + 127.5;
    }

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,    // target
      0,                // level
      gl.ALPHA,         // internal format
      width,            // width
      height,           // height
      0,                // border
      gl.ALPHA,         // format
      gl.UNSIGNED_BYTE, // type
      amplitudes        // data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return {
      "texture": texture,
      "update": function() {
        var i, eq_data = canvas.data("eq-data");
        if (eq_data === undefined) { return; }
        for (i = 0; i < 256; ++i) {
          amplitudes[i] = Math.floor(eq_data.left[i] * 255.99);
        }
        for (i = 0; i < 256; ++i) {
          amplitudes[2*width+i] = Math.floor(eq_data.right[i] * 255.99);
        }
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,    // target
          0,                // level
          gl.ALPHA,         // internal format
          width,            // width
          height,           // height
          0,                // border
          gl.ALPHA,         // format
          gl.UNSIGNED_BYTE, // type
          amplitudes        // data
        );
      }
    };
  }

  function startAnimation() {
    var canvas = $("canvas#viz");

    var shader = createShaderProgram({
      vertexSource: $("#viz_container").data("vertex-shader-source"),
      fragmentSource: $("#viz_container").data("fragment-shader-source")
    });
    var square = createPlaneGeometry({
      width: 512.0, height: 512.0,
      left: -256.0, bottom: -256.0,
      xRefinements: 2, yRefinements: 256
    });
    var amplitudes = createAmplitudeTexture();

    gl.useProgram(shader.program);

    var square_position = vec3.create();
    var square_rotation = 0.0;
    var projection = mat4.create();
    var base_model_view = mat4.create();

    mat4.perspective(projection,
                     Math.PI / 4.0,                              // vertical fov
                     canvas.innerWidth() / canvas.innerHeight(), // aspect
                     600.0,                                      // near bound
                     1600.0);                                    // far bound
    mat4.lookAt(base_model_view,
                [ 0.0, 0.0, 1000.0 ],  // viewer
                [ 0.0, 0.0,    0.0 ],  // looking at
                [ 0.0, 1.0,    0.0 ]); // up

    var render = function() {
      // Clear the screen.
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Draw the square.
      var model_view = mat4.clone(base_model_view);
      mat4.rotateY(model_view, model_view, square_rotation);

      gl.uniformMatrix4fv(shader.uniforms.uProjection, false, projection);
      gl.uniformMatrix4fv(shader.uniforms.uModelView, false, model_view);

      gl.bindTexture(gl.TEXTURE_2D, amplitudes.texture);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(shader.uniforms.uAmplitudes, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, square.attributes);
      gl.vertexAttribPointer(
        shader.attributes.aPosition,       // attribute location
        3,                                 // components per attribute
        gl.FLOAT,                          // component type
        false,                             // normalized
        square.vertexWidth*Float32Array.BYTES_PER_ELEMENT,     // stride (in bytes)
        square.positionOffset*Float32Array.BYTES_PER_ELEMENT); // offset (in bytes)        
      gl.enableVertexAttribArray(shader.attributes.aPosition);
      gl.vertexAttribPointer(
        shader.attributes.aTexCoord,       // attribute location
        2,                                 // components per attribute
        gl.FLOAT,                          // component type
        false,                             // normalized
        square.vertexWidth*Float32Array.BYTES_PER_ELEMENT,     // stride (in bytes)
        square.texCoordOffset*Float32Array.BYTES_PER_ELEMENT); // offset (in bytes)
      gl.enableVertexAttribArray(shader.attributes.aTexCoord);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square.indices);
      gl.drawElements(gl.TRIANGLES, square.count, gl.UNSIGNED_SHORT, 0);

      gl.flush();
    };

    var update = function() {
      var refresh = 30; // msec

      if (canvas.data("stopVisualization") === true) {
        // shader.destroy();
        // square.destroy();
        clearScreen();
        return;
      } else {
        window.setTimeout(update, refresh);
      }
      
      square_rotation = square_rotation + (2*Math.PI / 10000)*refresh;
      if (square_rotation > 2*Math.PI) { square_rotation = square_rotation - 2*Math.PI; }
      amplitudes.update();
      window.requestAnimFrame(render, canvas.get(0));
    };

    update();
  }

  function delayedInit() {
    if (!shaderSourcesLoaded()) {
      setTimeout(delayedInit, 50);
      return;
    }

    var canvas = $("canvas#viz");
    var body = $("body");
    var wnd = $(window);
    canvas.attr({
      width: body.innerWidth(),
      height: wnd.innerHeight()
    });

    initSoundManager();
    initControls();
    initGL();
  }

  $(document).ready(function() {
    loadShaderSource();
    delayedInit();
  });
})(jQuery);
