# Province Model

This document captures the shared province-facing interfaces and contracts used by the editor.

## Core Model

```mermaid
classDiagram
    class Province {
      +number id
      +ProvinceColor color
      +ProvinceType type
      +boolean isCoastal
      +string terrain
      +string continent
    }

    class Continent {
      +string codeName
      +number position
    }

    class TerrainCategory {
      +string codeName
      +Color color
    }

    Province --> Continent : continent(codeName)
    Province --> TerrainCategory : terrain(codeName)
```

## Catalog Model

```mermaid
classDiagram
    class ProvinceCatalogEntry {
      +ProvinceCatalogEntryKey key
      +number|null id
      +number|null color
      +ProvinceType|null type
      +boolean|null isCoastal
      +string|null terrain
      +string|null continent
      +boolean canonical
      +ProvinceCatalogSourceKind[] sources
      +ProvinceCatalogMapPresence mapPresence
      +Province? definition
      +ProvinceBitmapFact? bitmapFact
    }

    class ProvinceBitmapFact {
      +number color
      +number pixelCount
      +bounds
    }

    class ProvinceBitmapFacts {
      +number[] colors
      +Map~number, ProvinceBitmapFact~ byColor
    }

    class Province {
      +number id
      +ProvinceColor color
      +ProvinceType type
      +boolean isCoastal
      +string terrain
      +string continent
    }

    ProvinceCatalogEntry --> Province : definition
    ProvinceCatalogEntry --> ProvinceBitmapFact : bitmapFact
    ProvinceBitmapFacts --> ProvinceBitmapFact : byColor
```

## Editing Model

```mermaid
classDiagram
    class BmpOnlyEntry {
      +string guid
      +ProvinceColor color
    }

    class FieldEdit {
      +field-edit kind
      +string changeId
      +number provinceId
      +Partial~Province~ patch
      +Province original
    }

    class BmpReplacement {
      +bmp-replacement kind
      +string changeId
      +number provinceId
      +string bmpGuid
      +ProvinceColor bmpColor
      +Province original
    }

    class NewProvince {
      +new-province kind
      +string changeId
      +string bmpGuid
      +ProvinceColor bmpColor
      +number assignedId
    }

    class PendingChange {
      <<union>>
    }

    class BmpAssignmentAction {
      <<union>>
      replace(targetId)
      register(assignedId)
    }

    class BmpAssignment {
      <<union>>
      replace(targetId)
      register(assignedId)
    }

    FieldEdit --> Province : original
    BmpReplacement --> Province : original
    PendingChange <|-- FieldEdit
    PendingChange <|-- BmpReplacement
    PendingChange <|-- NewProvince
```

## Validation Model

```mermaid
classDiagram
    class ProvinceValidationSnapshot {
      +ProvinceCatalogEntry[] catalog
      +Map~ProvinceCatalogEntryKey, ProvinceCatalogEntry~ catalogByKey
      +Map~string, TerrainCategory~ terrains
      +Map~string, Continent~ continents
    }

    class ProvinceValidationIssue {
      +string code
      +ProvinceValidationSeverity severity
      +ProvinceCatalogEntryKey provinceKey
      +number|null provinceId
      +string message
    }

    class ProvinceValidationResult {
      +ProvinceValidationPhase phase
      +ProvinceValidationIssue[] issues
      +summary
    }

    class ProvinceValidator {
      +string id
      +ProvinceValidationPhase phase
      +validate(snapshot, province?) ProvinceValidationIssue[]
    }

    class ProvinceCatalogEntry {
      +ProvinceCatalogEntryKey key
    }

    class TerrainCategory {
      +string codeName
    }

    class Continent {
      +string codeName
    }

    ProvinceValidationSnapshot --> ProvinceCatalogEntry : catalog
    ProvinceValidationSnapshot --> TerrainCategory : terrains
    ProvinceValidationSnapshot --> Continent : continents
    ProvinceValidationResult --> ProvinceValidationIssue : issues
    ProvinceValidationIssue --> ProvinceCatalogEntry : provinceKey
    ProvinceValidator --> ProvinceValidationSnapshot : validates
```

## IPC / API Contract

```mermaid
classDiagram
    class MapDataSnapshot {
      +Continent[] continents
      +Province[] provinces
      +ProvinceCatalogEntry[] provinceCatalog
      +TerrainCategory[] terrains
      +string provincesImageB64
    }

    class MapChangedEvent {
      +string projectId
      +type: continents|definitions|terrain|image|states|strategicRegions
      +data
    }

    class "ApiContract.map" as ApiContractMap {
      +load(projectId) Promise~MapDataSnapshot~
      +save(projectId, provinces, continents) Promise~void~
      +loadStates(projectId) Promise~void~
      +loadStrategicRegions(projectId) Promise~void~
      +onChanged(callback) unsubscribe
    }

    class Province {
      +number id
    }

    class Continent {
      +string codeName
    }

    class ProvinceCatalogEntry {
      +ProvinceCatalogEntryKey key
    }

    class TerrainCategory {
      +string codeName
    }

    ApiContractMap --> MapDataSnapshot : load()
    ApiContractMap --> Province : save(provinces)
    ApiContractMap --> Continent : save(continents)
    MapDataSnapshot --> Province : provinces
    MapDataSnapshot --> ProvinceCatalogEntry : provinceCatalog
    MapDataSnapshot --> TerrainCategory : terrains
    MapDataSnapshot --> Continent : continents
```
