# -*- encoding: utf-8; mode: ruby; -*-
# This file is used by Rack-based servers to start the application.

require ::File.expand_path('../config/environment', __FILE__)
run Songviz::Application
