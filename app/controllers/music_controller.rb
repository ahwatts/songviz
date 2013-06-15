class MusicController < ApplicationController
  def serve_song
    if params[:path].blank?
      not_found && return
    end

    @song_path = (Rails.application.song_base_path + params[:path]).expand_path
    logger.debug(@song_path.relative_path_from(Rails.application.song_base_path).inspect)
    logger.debug(params[:format].inspect)

    render :text => ""
  end
end
