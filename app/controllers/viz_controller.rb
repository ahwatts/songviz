class VizController < ApplicationController
  def song
    if params[:path].blank?
      redirect_to root_path
      return
    end

    if !request.path_parameters.keys.include?(:path)
      dirname = File.dirname(params[:path])
      if dirname =~ /^\./
        dirname = ""
      else
        dirname = dirname + "/"
      end
      basename = File.basename(params[:path], File.extname(params[:path]))
      logger.debug("Dirname = #{dirname.inspect}")
      logger.debug("Basename = #{basename.inspect}")
      redirect_to viz_song_path(:path => "#{dirname}#{basename}.html")
      return
    end

    @song_path = valid_song_path(params[:path])

    if @song_path.nil?
      not_found
    else
      @song_path = @song_path.relative_path_from(Rails.application.song_base_path)
    end
  end

  alias_method :song2, :song
  alias_method :song3, :song
end
