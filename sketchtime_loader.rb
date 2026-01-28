
require 'sketchup.rb'
require 'extensions.rb'

module SketchTimePlugin
  unless file_loaded?(__FILE__)
    # Caminho para o arquivo principal dentro da subpasta
    path = File.join(File.dirname(__FILE__), 'sketchtime_pro', 'main.rb')
    
    extension = SketchupExtension.new('SketchTime Pro Tracker', path)
    extension.description = 'Controle profissional de tempo e orçamentos com suporte a IA.'
    extension.version     = '2.0.0'
    extension.creator     = 'SketchTime Team'
    Sketchup.register_extension(extension, true)
    
    file_loaded(__FILE__)
  end
end
