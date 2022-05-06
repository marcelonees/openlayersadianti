# openlayersadianti

A intenção da criação deste componente é abstrair o JavaScript da biblioteca Open Layers para que o programador possa se dedicar à programação do seu sistema usando apenas o PHP e as funções do Framework Adianti.

Instalação:

```bash
composer config repositories.openlayers vcs https://github.com/marcelonees/openlayersadianti
composer require marcelonees/plugins @dev
composer require marcelonees/plugins dev-main
```

Uso:

```php
use MarceloNees\Plugins\OpenLayers\OpenLayersMap;

$lat = "-26.5064867";
$lng = "-49.0904928";
$zoom = "10";

$map = new OpenLayersMap($lat, $lng, $zoom, 'osm');
$map->setSize('100%', '300px');
```

# Este projeto está em estágio "embrionário".

## !!!!Não recomendado para produção!!!!
