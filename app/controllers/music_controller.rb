class MusicController < ApplicationController
  def serve_song
    if params[:path].blank?
      not_found
      return
    end

    @song_path = (Rails.application.song_base_path + "#{params[:path]}").expand_path

    if @song_path.relative_path_from(Rails.application.song_base_path).to_s =~ /\.\./
      not_found
      return
    end

    @song_path = @song_path.dirname + (@song_path.basename.to_s + ".mp3")

    if !@song_path.exist?
      not_found
      return
    end

    respond_to do |format|
      format.mp3 { send_file(@song_path.to_s) }
    end
  end
end
