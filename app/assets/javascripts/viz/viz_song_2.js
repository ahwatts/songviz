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
      var song_path = elem.attr("data-song-path");
      var sanitized_song_path = song_path.replace(new RegExp("[^A-Za-z0-9]", "g"), "").toLowerCase();
      var sound = window.soundManager.createSound({
        id: "sound_song_" + sanitized_song_path,
        url: "/music/" + song_path,
        whileplaying: function() {
          eq_data = this.eqData;
        }
      });
      elem.data("sound", sound);
      sound.play();
    });

    $("a[data-song-path][data-song-action=stop]").click(function(event) {
      event.preventDefault();
      var elem = $(this);
      var song_path = elem.attr("data-song-path");
      var play_elem = $("a[data-song-path='" + song_path + "'][data-song-action=play]");
      var sound = play_elem.data("sound");
      if (sound) {
        sound.destruct();
      }
      play_elem.data("sound", null);
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
  }

  function createShader(type, source) {
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
  }

  function createProgram(vertex, fragment) {
    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var log = gl.getProgramInfoLog(program);
      alert("Shader program failed to link: " + log);
      console.error("Shader program failed to link: " + log);
      gl.deleteProgram(program);
      program = null;
    }
    return program;
  }

  function createPlaneGeometry(dims, min, refs) {
    var i, j, k, x, y;

    var positions = new Float32Array((refs.x+1)*(refs.y+1)*3);
    for (i = 0; i < refs.x + 1; ++i) {
      x = i*(dims.width / refs.x) + min.x;
      for (j = 0; j < refs.y + 1; ++j) {
        k = (i*(refs.y + 1) + j)*3;
        y = j*(dims.height / refs.y) + min.y;
        positions[k] = x;
        positions[k+1] = y;
        positions[k+2] = 0.0;
      }
    }

    var indices = new Uint16Array(refs.x*refs.y*6);
    for (i = 0; i < refs.x; ++i) {
      for (j = 0; j < refs.y; ++j) {
        // index into indices
        l = (i * refs.y + j)*6;

        // index into positions
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

    var position_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    var index_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return {
      "positions": position_buffer,
      "indices": index_buffer,
      "count": indices.length
    };
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

    var program = createProgram(
      createShader(gl.VERTEX_SHADER, $("#viz_container").data("vertex-shader-source")),
      createShader(gl.FRAGMENT_SHADER, $("#viz_container").data("fragment-shader-source")));
    gl.useProgram(program);
    var u_projection = gl.getUniformLocation(program, "uProjection");
    var u_model_view = gl.getUniformLocation(program, "uModelView");
    var a_position = gl.getAttribLocation(program, "aPosition");

    var square = createPlaneGeometry(
      { width: 512.0, height: 512.0 },
      { x: -256.0, y: -256.0 },
      { x: 2, y: 3 });

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

      gl.uniformMatrix4fv(u_projection, false, projection);
      gl.uniformMatrix4fv(u_model_view, false, model_view);

      gl.bindBuffer(gl.ARRAY_BUFFER, square.positions);
      gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_position);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, square.indices);
      gl.drawElements(gl.TRIANGLES, square.count, gl.UNSIGNED_SHORT, 0);

      gl.flush();
    };

    var update = function() {
      var refresh = 30; // msec

      window.setTimeout(update, refresh);
      square_rotation = square_rotation + (2*Math.PI / 10000)*refresh;
      if (square_rotation > 2*Math.PI) { square_rotation = square_rotation - 2*Math.PI; }
      window.requestAnimFrame(render, canvas.get(0));
    };

    update();
  }

  $(document).ready(function() {
    loadShaderSource();
    delayedInit();
  });
})(jQuery);
