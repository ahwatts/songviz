class VizController < ApplicationController
  def song
    @song_path = params[:path]
    if !File.exist?(@song_path)
      not_found
      return
    end
  end
end
