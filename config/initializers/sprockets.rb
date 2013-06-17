# Get the Sprockets environment.
env = Rails.application.assets

env.append_path(Rails.root.join("app", "assets", "shaders"))
env.register_mime_type("text/x-glsl-shader", ".glsl")
