//= require 'soundmanager2'

(function($) {
  $(document).ready(function() {
    var viz = $("#viz");
    var wnd = $(window);
    var body = $("body");

    // Set the viz area to be everything that isn't already taken up.
    viz.height(wnd.innerHeight() -
               viz.position().top -
               parseInt(body.css("margin"), 10));

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
            console.debug(this.eqData);
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
  });
})(jQuery);
