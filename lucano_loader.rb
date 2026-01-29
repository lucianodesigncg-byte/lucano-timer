
require 'sketchup.rb'
require 'extensions.rb'

module LucanoDesigner
  unless file_loaded?(__FILE__)
    path = File.join(File.dirname(__FILE__), 'lucano_pro', 'main.rb')
    ex = SketchupExtension.new('Lucano Timer IA', path)
    ex.description = 'Gestão de tempo e produtividade com IA para SketchUp.'
    ex.version     = '14.5.0'
    ex.creator     = 'Lucano Designer3d'
    Sketchup.register_extension(ex, true)
    file_loaded(__FILE__)
  end
end
