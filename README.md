OpenLayersMap para Adianti Framework

**Componente** para criação de mapas interativos usando a biblioteca **OpenLayers** dentro do **Framework Adianti**. O objetivo é abstrair completamente a complexidade do JavaScript, permitindo que você controle todas as funcionalidades do mapa diretamente com código PHP.

---

## 📦 Instalação

Adicione o repositório e instale o pacote via Composer:

```bash
composer config repositories.openlayers vcs https://github.com/marcelonees/openlayersadianti
composer require marcelonees/plugins @dev
```

> **Importante**: O componente está em desenvolvimento ativo. Para a versão mais recente, utilize o branch `dev-main`.

---

## 🚀 Uso Básico

```php
use MarceloNees\Plugins\OpenLayers\OpenLayersMap;

// Parâmetros: latitude, longitude, zoom inicial, tipo de tile ('osm' por padrão)
$map = new OpenLayersMap(-26.504104, -49.0904928, 12);
$map->setSize('100%', '400px');

// Configurações básicas
$map->setShouldShowPopup(false);
$map->setShouldUpdateCoords(false);
$map->setShouldAddPin(false);

// Exibe o mapa
$map->show();
```

---

## ⚙️ Principais Funcionalidades

### 1. Gerenciamento de Highlight (Destaque de Features)

O componente permite controlar dinamicamente o destaque (highlight) de features vindas de um servidor WFS.

**Configuração Inicial:**
```php
// Desabilitar highlight (padrão é habilitado)
$map->setHighlightEnabled(false);

// Configurar camada e fonte de dados
$map->setHighlightLayer('view_territorio_censo');
$map->setHighlightMinZoom(15);
$map->setHighlightWfsUrl('https://geo.jaraguadosul.sc.gov.br/gs/geoserver-main/PMJS/wms');
```

**Controle em Tempo de Execução (JavaScript):**
```javascript
// Ativar/Desativar
GeoMapApp.setHighlightEnabled(true);

// Alterar camada
GeoMapApp.setHighlightLayer('nova_camada');

// Configurar múltiplas opções
GeoMapApp.configureHighlight({
    enabled: true,
    layerName: 'view_lote',
    minZoom: 14,
    wfsUrl: 'https://outro-servidor/wms'
});

// Obter configuração atual
var config = GeoMapApp.getHighlightConfig();
console.log(config);
```

**Funções Globais para Highlight:**
```javascript
// Disponível globalmente
window.setHighlightEnabled(true);
window.setHighlightLayer('view_territorio_censo');
window.setHighlightMinZoom(15);
window.setHighlightWfsUrl('https://.../wms');
window.configureHighlight({ enabled: false });
window.getHighlightConfig();
```

### 2. Adição de Camadas

Suporte a diversos tipos de camadas: `tile` (OSM), `xyz`, `wms` e `vector`.

```php
// Camada WMS
$map->addLayer('lim_municipal', [
    'type'      => 'wms',
    'title'     => 'Limite Municipal',
    'url'       => 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-main/PMJS/wms',
    'params'    => ['LAYERS' => 'lim_municipal'],
    'visible'   => true,
    'opacity'   => 1.0
]);

// Camada XYZ (tiles)
$map->addLayer('google_satellite', [
    'type'      => 'xyz',
    'title'     => 'Google Satellite',
    'url'       => 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    'maxZoom'   => 22,
    'visible'   => false,
    'opacity'   => 1.0
]);

// Camada OSM (padrão)
$map->addLayer('osm', [
    'type'      => 'tile',
    'title'     => 'OpenStreetMap',
    'visible'   => true
]);

// Remover camada
$map->removeLayer('nome_da_camada');
```

### 3. Adição de Marcadores

```php
// Adiciona um marcador simples
$map->addMarker(-26.504104, -49.0904928, 'Meu Ponto');

// Adiciona múltiplos marcadores via JSON
$json = '[
    {"lat": -26.504104, "lng": -49.0904928, "description": "Ponto 1"},
    {"lat": -26.505000, "lng": -49.091500, "description": "Ponto 2"}
]';
$map->addJsonMarker($json);

// Adiciona marcador imediato (para contextos estáticos)
$map->addMarkerImmediate(-26.504104, -49.0904928, 'Ponto Rápido');
```

### 4. Persistência de Configurações

Salve e restaure o estado do mapa (camadas visíveis, posição, zoom, etc.):

```php
// Define um campo hidden para armazenar a configuração
$map->setConfigField('map_config');

// Restaura a configuração a partir de dados salvos
$map->setRestoreConfig($dadosConfiguracao);

// Restaura com delay (útil para carregamento de página)
$map->restoreConfig($dadosConfiguracao, 1000);

// Salva a configuração atual via JavaScript
$map->saveConfig();
```

### 5. Controle de Camadas

Interface visual para o usuário gerenciar a visibilidade e opacidade das camadas:

```php
// Ativa o controle de camadas (padrão: ativo)
$map->setShowLayerControl(true);

// Mostra ou oculta completamente o controle
$map->toggleLayerControl();

// Alterna a visibilidade do controle (recolher/expandir)
$map->setShowLayerControl(false);
```

### 6. Interação com Geometrias

**Destacar e Voar para uma Geometria:**
```php
// Destaca uma geometria e centraliza o mapa nela
$geoJson = '{"type":"Polygon","coordinates":[[[-49.09,-26.50],[-49.08,-26.50],[-49.08,-26.51],[-49.09,-26.51],[-49.09,-26.50]]]}';
$map->HighlightAndFlyToGeom($geoJson, 15);
```

**Apenas Destacar (sem voo):**
```php
$map->HighlightGeom($geoJson, 10);
```

**Limpar o Destaque:**
```php
$map->clearGeomSource();
```

### 7. Edição de Geometria

```php
// Ativa modo de edição com uma geometria inicial
$geoJson = '{"type":"Polygon","coordinates":[[[-49.09,-26.50],[-49.08,-26.50],[-49.08,-26.51],[-49.09,-26.51],[-49.09,-26.50]]]}';
$map->enableGeometryEditing($geoJson);

// Obtém a geometria editada
$geometriaEditada = $map->getEditedGeometry();
```

### 8. Mapa de Calor (Heatmap)

```php
$pontos = [
    [-49.1, -26.5, 10],  // longitude, latitude, intensidade
    [-49.2, -26.6, 20],
    [-49.15, -26.55, 15]
];

// Configurações personalizadas
$configHeatmap = [
    'radius' => 20,
    'blur' => 20,
    'gradient' => ['#00f', '#0ff', '#0f0', '#ff0', '#f00'],
    'minOpacity' => 0.2
];

$map->addHeatmap($pontos, $configHeatmap);

// Remove todos os heatmaps
$map->clearHeatmaps();
```

### 9. Ferramentas de Desenho

```php
// Desenha um círculo
$map->DrawCircleOnLonLat(
    -49.0904928,    // longitude
    -26.504104,     // latitude
    300,            // raio em metros
    'rgba(255,0,0,1)',       // cor da borda
    'rgba(255,0,0,0.2)'      // cor do preenchimento
);
```

### 10. Configuração de Popups

```php
// Define classe e método para gerar popups
$map->setPopupClassName('MeuPopupClass');
$map->setPopupMethod('gerarPopup');

// Controla comportamento do popup
$map->setShouldShowPopup(true);
$map->setShouldUpdateCoords(true);
$map->setShouldAddPin(true);

// Exibe popup customizado
$map->showPopup('<h3>Meu Popup</h3><p>Conteúdo do popup</p>');
```

### 11. Controle de Estilos

```php
// Configura cores do highlight
$map->configStroke(
    'rgba(149,31,212,1)',    // cor da borda
    'rgba(149,31,212,0.20)'  // cor do preenchimento
);
```

---

## 🧩 API JavaScript (GeoMapApp)

Além das funcionalidades via PHP, o componente expõe um objeto global `GeoMapApp` para controle avançado no front-end.

### Métodos Principais

| Método | Descrição | Exemplo |
|--------|-----------|---------|
| `GeoMapApp.init(config)` | Inicializa o mapa com as configurações fornecidas | `GeoMapApp.init({ target: 'map', center: { lat: -26.5, lng: -49.09 }, zoom: 12 })` |
| `GeoMapApp.addLayer(name, config)` | Adiciona uma camada dinamicamente | `GeoMapApp.addLayer('nova', { type: 'wms', url: '...' })` |
| `GeoMapApp.removeLayer(name)` | Remove uma camada | `GeoMapApp.removeLayer('nome')` |
| `GeoMapApp.addPin(marker)` | Adiciona um marcador | `GeoMapApp.addPin({ lat: -26.5, lng: -49.09, label: 'Ponto' })` |
| `GeoMapApp.flyTo(location, zoom)` | Anima o mapa até uma localização | `GeoMapApp.flyTo([-49.09, -26.50], 15)` |
| `GeoMapApp.highlightGeometry(geom)` | Destaca uma geometria no mapa | `GeoMapApp.highlightGeometry(geoJson)` |
| `GeoMapApp.clearHighlight()` | Limpa todos os destaques | `GeoMapApp.clearHighlight()` |
| `GeoMapApp.getMap()` | Retorna a instância do mapa OpenLayers | `var map = GeoMapApp.getMap()` |
| `GeoMapApp.getLayers()` | Retorna todas as camadas | `var layers = GeoMapApp.getLayers()` |
| `GeoMapApp.saveConfig()` | Salva a configuração atual | `GeoMapApp.saveConfig()` |
| `GeoMapApp.restoreConfig(config)` | Restaura configuração | `GeoMapApp.restoreConfig(dados)` |
| `GeoMapApp.toggleLayerControl()` | Alterna controle de camadas | `GeoMapApp.toggleLayerControl()` |

### Controle de Highlight (JavaScript)

```javascript
// Métodos dedicados
GeoMapApp.setHighlightEnabled(true);
GeoMapApp.setHighlightLayer('view_territorio_censo');
GeoMapApp.setHighlightMinZoom(15);
GeoMapApp.setHighlightWfsUrl('https://.../wms');
GeoMapApp.configureHighlight({ 
    enabled: false, 
    layerName: 'nova_camada' 
});
GeoMapApp.getHighlightConfig(); // Obtém configuração atual
```

### Funções Globais (window)

Para uso sem o objeto principal, funções `window.*` estão disponíveis:

```javascript
// Highlight
window.setHighlightEnabled(true);
window.setHighlightLayer('view_territorio_censo');
window.setHighlightMinZoom(15);
window.setHighlightWfsUrl('https://.../wms');
window.configureHighlight({ enabled: false });
window.getHighlightConfig();

// Geometrias
window.HighlightGeom(geoJson);
window.HighlightAndFlyToGeom(geoJson, 18);
window.clearGeomSource();

// Desenho
window.DrawCircleOnLonLat(-49.09, -26.50, 300, '#FF0000', 'rgba(255,0,0,0.1)');

// Utilitários
window.configStroke('rgba(149,31,212,1)', 'rgba(149,31,212,0.20)');
window.limparOverlays();
```

---

## 📝 Exemplos Completos

### Exemplo 1: Mapa Básico com Camadas

```php
<?php
use MarceloNees\Plugins\OpenLayers\OpenLayersMap;

// Criação do mapa
$map = new OpenLayersMap(-26.504104, -49.0904928, 12);
$map->setSize('100%', '600px');

// Desabilita interações padrão
$map->setShouldShowPopup(false);
$map->setShouldUpdateCoords(false);
$map->setShouldAddPin(false);

// Configura highlight
$map->setHighlightEnabled(false);

// Adiciona camadas
$map->addLayer('osm', [
    'type' => 'tile', 
    'title' => 'OpenStreetMap'
]);

$map->addLayer('satelite', [
    'type' => 'xyz',
    'title' => 'Satélite',
    'url' => 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    'maxZoom' => 22,
    'visible' => false
]);

$map->addLayer('limites', [
    'type' => 'wms',
    'title' => 'Limites Municipais',
    'url' => 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-main/PMJS/wms',
    'params' => ['LAYERS' => 'lim_municipal'],
    'visible' => true
]);

// Adiciona marcador
$map->addMarker(-26.504104, -49.0904928, 'Ponto Central');

// Exibe o mapa
$map->show();
?>
```

### Exemplo 2: Mapa com Persistência de Configuração

```php
<?php
use MarceloNees\Plugins\OpenLayers\OpenLayersMap;

class MeuForm extends TPage
{
    private $map;
    private $configData;
    
    public function __construct()
    {
        parent::__construct();
        
        // Recupera configuração salva
        $this->configData = $this->getMapConfig();
        
        // Cria mapa
        $this->map = new OpenLayersMap(-26.504104, -49.0904928, 12);
        $this->map->setSize('100%', '500px');
        
        // Configura campo de persistência
        $this->map->setConfigField('map_config');
        
        // Configura highlight
        $this->map->setHighlightEnabled(false);
        
        // Adiciona camadas
        $this->map->addLayer('osm', ['type' => 'tile', 'title' => 'OSM']);
        $this->map->addLayer('google_satellite', [
            'type' => 'xyz',
            'title' => 'Google Satélite',
            'url' => 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
        ]);
        
        // Restaura configuração se existir
        if ($this->configData) {
            $this->map->setRestoreConfig($this->configData);
        }
        
        // Campo hidden para armazenar configuração
        $input = new TEntry('map_config');
        $input->setSize('100%', '0px');
        $input->style = 'display: none';
        
        // Monta o painel
        $panel = new TPanel();
        $panel->add($this->map);
        $panel->add($input);
        
        parent::add($panel);
    }
    
    private function getMapConfig()
    {
        // Recupera do banco de dados ou sessão
        return TSession::getValue('map_config');
    }
}
?>
```

### Exemplo 3: Mapa com Heatmap e Edição

```php
<?php
use MarceloNees\Plugins\OpenLayers\OpenLayersMap;

// Cria mapa
$map = new OpenLayersMap(-26.504104, -49.0904928, 13);
$map->setSize('100%', '700px');

// Dados para heatmap
$pontos = [];
foreach ($dados as $row) {
    $pontos[] = [(float)$row->longitude, (float)$row->latitude, (int)$row->intensidade];
}

// Adiciona heatmap
$map->addHeatmap($pontos, [
    'radius' => 15,
    'blur' => 15,
    'gradient' => ['#00f', '#0ff', '#0f0', '#ff0', '#f00']
]);

// Ativa edição de geometria
$map->enableGeometryEditing();

// Adiciona botões de ação
$btnSalvar = new TButton('salvar');
$btnSalvar->setAction(new TAction([$this, 'onSaveGeometry']), 'Salvar');

$map->show();
?>
```

---

## 🔧 Configurações Avançadas

### Propriedades Disponíveis

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `lat` | float | -26.504104 | Latitude central do mapa |
| `lng` | float | -49.0904928 | Longitude central do mapa |
| `z` | int | 15 | Zoom inicial |
| `width` | string | '100%' | Largura do mapa |
| `height` | string | '500px' | Altura do mapa |
| `highlightEnabled` | bool | true | Habilita/desabilita highlight |
| `highlightLayerName` | string | 'view_territorio_censo' | Camada WFS para highlight |
| `highlightMinZoom` | int | 15 | Zoom mínimo para ativar highlight |
| `highlightWfsUrl` | string | 'https://geo.jaraguadosul.sc.gov.br/gs/geoserver-main/PMJS/wms' | URL do servidor WFS |
| `showLayerControl` | bool | true | Exibe controle de camadas |
| `shouldUpdateCoords` | bool | true | Atualiza coordenadas ao clicar |
| `shouldAddPin` | bool | true | Adiciona marcador ao clicar |
| `shouldShowPopup` | bool | false | Mostra popup ao clicar |

### Métodos Disponíveis

#### Configuração
- `setSize($width, $height)`
- `setWidth($width)`
- `setHeight($height)`
- `setConfigField($fieldId)`
- `setShowLayerControl($show)`
- `setRestoreConfig($configData)`
- `restoreConfig($configData, $delay)`
- `saveConfig()`
- `toggleLayerControl()`

#### Highlight
- `setHighlightEnabled($enabled)`
- `setHighlightLayer($layerName)`
- `setHighlightMinZoom($minZoom)`
- `setHighlightWfsUrl($url)`
- `configureHighlight($options)`

#### Camadas
- `addLayer($name, $config)`
- `removeLayer($name)`
- `addLayerImmediate($name, $config)`

#### Marcadores
- `addMarker($lat, $lng, $label)`
- `addMarkerImmediate($lat, $lng, $label)`
- `addJsonMarker($json)`

#### Geometrias
- `HighlightAndFlyToGeom($geom, $z)`
- `HighlightGeom($geom, $z)`
- `clearGeomSource()`
- `configStroke($strokeColor, $fillColor)`

#### Popup
- `setPopupClassName($className)`
- `setPopupMethod($method)`
- `setShouldUpdateCoords($update)`
- `setShouldAddPin($addPin)`
- `setShouldShowPopup($showPopup)`
- `showPopup($text)`

#### Edição
- `enableGeometryEditing($geom)`
- `getEditedGeometry()`

#### Heatmap
- `addHeatmap($points, $config)`
- `clearHeatmaps()`

#### Desenho
- `DrawCircleOnLonLat($lon, $lat, $radius, $strokeColor, $fillColor)`

#### Utilitários
- `parseGeoJson($geom)`
- `parseAllGeometries($geom)`
- `centroidOfGeom($geom)`
- `addStreetView()`
- `remStreetView()`

---

## 🚨 Status do Projeto

> **Aviso:** Este componente está em desenvolvimento ativo. Novas funcionalidades e correções são adicionadas frequentemente. Embora funcional, recomendamos testes extensivos antes de utilizar em produção.

---

## 📚 Referências

- **Repositório:** [github.com/marcelonees/openlayersadianti](https://github.com/marcelonees/openlayersadianti)
- **Framework Adianti:** [adianti.com.br](https://adianti.com.br)
- **OpenLayers:** [openlayers.org](https://openlayers.org)
- **Documentação API:** [openlayers.org/en/latest/apidoc](https://openlayers.org/en/latest/apidoc/)

---

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Abrir **issues** reportando bugs ou sugerindo melhorias
2. Enviar **pull requests** com correções ou novas funcionalidades
3. Melhorar a **documentação**

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 📞 Suporte

Para dúvidas ou suporte:
- **GitHub Issues:** [github.com/marcelonees/openlayersadianti/issues](https://github.com/marcelonees/openlayersadianti/issues)
- **Autor:** Marcelo Barreto Nees
- **Email:** marcelo.linux@gmail.com

---

**Última atualização:** 14 de Agosto de 2026
**Versão:** 1.5