class MusicController < ApplicationController
  def serve_song
    if params[:path].blank?
      not_found
      return
    end

    @song_path = valid_song_path(params[:path])

    if @song_path.nil?
      not_found
      return
    end

    respond_to do |format|
      format.mp3 { send_file(@song_path.to_s) }
      format.ogg { send_file(@song_path.to_s) }
    end
  end
end
