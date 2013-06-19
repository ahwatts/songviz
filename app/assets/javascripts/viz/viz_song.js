// -*- mode: js -*-
//= require 'soundmanager2'
//= require 'three'

(function($) {
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
      var last_log = new Date();
      var sound = window.soundManager.createSound({
        id: "sound_song_" + sanitized_song_path,
        url: "/music/" + song_path,
        whileplaying: function() {
          var now = new Date();
          if (now - last_log > 2000) {
            last_log = now;
          }
        }
      });
      elem.data("sound", sound);
      sound.play();});

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

  function delayedInit() {
    if (!shaderSourcesLoaded()) {
      setTimeout(delayedInit, 50);
      return;
    }

    initSoundManager();
    initControls();

    var viz_container = $("#viz_container");
    var wnd = $(window);
    var renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setClearColor(0x000000, 1.0);
    renderer.setSize(wnd.innerWidth(), wnd.innerHeight());

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
          aColor: { type: "v4", value: [] }
        }
      })
    );
    graph.name = "grpah";
    graph.position = new THREE.Vector3(0, 0.5, 0);

    var scene = new THREE.Scene();
    scene.add(camera);
    scene.add(graph);

    var canvas = $(renderer.domElement);
    canvas.css({ position: "absolute", top: "0px" });
    viz_container.append(renderer.domElement);

    var update = function() {
      setTimeout(function() { window.requestAnimationFrame(update); }, 32);

      graph.geometry.computeBoundingBox();
      var b = graph.geometry.boundingBox;
      var max = new THREE.Vector3(Math.max(Math.abs(b.min.x), Math.abs(b.max.x)),
                                  Math.max(Math.abs(b.min.y), Math.abs(b.max.y)),
                                  Math.max(Math.abs(b.min.z), Math.abs(b.max.z)));
      for (var i = 0; i < graph.geometry.vertices.length; ++i) {
        var v = graph.geometry.vertices[i];
        var noise = (Math.random() - 0.5) / 50.0;
        graph.material.attributes.aColor.value[i] =
          new THREE.Vector4(Math.abs(v.x / max.x) + noise, 0.0, 1.0,
                            Math.abs(v.y / max.y) + noise, 0.0, 1.0,
                            Math.abs(v.z / max.z) + noise, 0.0, 1.0,
                            1.0);
      }
      graph.material.attributes.aColor.needsUpdate = true;

      renderer.render(scene, camera);
    };

    update();
  }

  $(document).ready(function() {
    loadShaderSource();
    delayedInit();
  });
})(jQuery);
