
require 'sketchup.rb'

module SketchTimePlugin
  module Main
    def self.show_dialog
      options = {
        :dialog_title => "SketchTime Pro",
        :preferences_key => "com.sketchtime.tracker",
        :scrollable => true,
        :resizable => true,
        :width => 400,
        :height => 700,
        :style => UI::HtmlDialog::STYLE_DIALOG
      }
      @dialog = UI::HtmlDialog.new(options)
      html_path = File.join(__dir__, 'index.html')
      @dialog.set_file(html_path)
      @dialog.show
    end
  end
end
