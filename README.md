# openlayersadianti
Criar mapa utilizando o Open Layers através de classe em php, com localização atual (gps), adição de pontos, centralização de todos pontos na tela, etc.

Instalação:

```bash
composer config repositories.openlayers vcs https://github.com/marcelonees/openlayersadianti
composer require marcelonees/plugins @dev
composer require marcelonees/plugins dev-main
```

Uso:

```php
use MarceloNees\Plugins\OpenLayers\OpenLayersMap;

$lat = "-16.5064867";
$lng = "-39.0904928";
$zoom = "10";

$map = new OpenLayersMap($lat, $lng, $zoom, 'osm');
$map->setSize('100%', '400');
$map = $map->show();
```

# Este projeto está em estágio "embrionário".

## !!!!Não recomendado para produção!!!!
