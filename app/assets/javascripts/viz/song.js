// -*- mode: js -*-
//= require 'soundmanager2'
//= require 'three'

(function($) {
  var eq_data = null;

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
      runVisualization();
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
      $("#viz_container").data("stopVisualization", true);
    });
  }

  function loadShaderSource() {
    var viz = $("#viz_container");

    $.get("/assets/viz/song_vertex.glsl", function(data) {
      viz.data("vertex-shader-source", data);
    });
    $.get("/assets/viz/song_fragment.glsl", function(data) {
      viz.data("fragment-shader-source", data);
    });
  }

  function shaderSourcesLoaded() {
    var viz = $("#viz_container");
    return viz.data("vertex-shader-source") !== undefined &&
      viz.data("fragment-shader-source") !== undefined;
  }

  function runVisualization() {
    var viz_container = $("#viz_container");
    var body = $("body");
    var wnd = $(window);

    viz_container.data("stopVisualization", false);

    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setClearColor(0x000000, 1.0);
    renderer.setSize(body.innerWidth(), wnd.innerHeight());

    var camera = new THREE.PerspectiveCamera(45.0, renderer.domElement.width / renderer.domElement.height, 0.1, 10000.0);
    camera.position = new THREE.Vector3(0, 0, 500);
    camera.up = new THREE.Vector3(0, 1, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    var graph = new THREE.Mesh(
      new THREE.CubeGeometry(256, 1, 2, 256, 1, 2),
      new THREE.ShaderMaterial({
        vertexShader: viz_container.data("vertex-shader-source"),
        fragmentShader: viz_container.data("fragment-shader-source"),
        attributes: {
          amplitude: { type: "f", value: [] }
        }
      })
    );
    graph.name = "grpah";
    graph.position = new THREE.Vector3(0, 0, 0);
    graph.rotation = new THREE.Vector3(0, 0, 0);
    graph.rotationAutoUpdate = true;

    var scene = new THREE.Scene();
    scene.add(camera);
    scene.add(graph);

    var canvas = $(renderer.domElement);
    canvas.css({ position: "fixed", top: "5px", left: "5px", "z-index": -1 });
    viz_container.append(renderer.domElement);

    var update = function() {
      var viz_container = $("#viz_container");
      var t = new Date() - start;

      if (viz_container.data("stopVisualization") === true) {
        scene.remove(graph);
        graph.geometry.dispose();
        graph.material.dispose();
        viz_container.empty();
      } else if (viz_container.data("stopVisualization") !== true) {
        setTimeout(function() { window.requestAnimationFrame(update); }, 47);
      }

      for (var i = 0; i < graph.geometry.vertices.length; ++i) {
        var v = graph.geometry.vertices[i];
        var j = Math.round(v.x) + 127;
        var side = j < 256 ? "left" : "right";
        if (eq_data !== null) {
          graph.material.attributes.amplitude.value[i] = eq_data[side][j];
        }
      }
      graph.material.attributes.amplitude.needsUpdate = true;
      graph.rotation.y = t * Math.PI / 5000;
      if (graph.rotation.y > 2*Math.PI) {
        graph.rotation.y = graph.rotation.y - 2*Math.PI;
      }

      renderer.render(scene, camera);
    };     

    var start = new Date();
    update();
  }

  function delayedInit() {
    if (!shaderSourcesLoaded()) {
      setTimeout(delayedInit, 50);
      return;
    }

    initSoundManager();
    initControls();
  }

  $(document).ready(function() {
    loadShaderSource();
    delayedInit();
  });
})(jQuery);
