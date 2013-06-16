class ApplicationController < ActionController::Base
  protect_from_forgery

  protected

  def not_found
    fail ActionController::RoutingError.new("Not found")
  end

  def valid_song_path(path)
    song_path = (Rails.application.song_base_path + params[:path]).expand_path

    if song_path.relative_path_from(Rails.application.song_base_path).to_s =~ /\.\./
      logger.error("Outside path detected: #{song_path.inspect}")
      return nil
    end

    song_path = song_path.dirname + (song_path.basename.to_s + ".mp3")

    if !song_path.exist?
      logger.error("Song path does not exist: #{song_path.inspect}")
      return nil
    end

    song_path
  end
end
