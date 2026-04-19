import { useEffect, useMemo } from 'react'
import { useMapDataStore } from '../../infra/store/mapDataStore'
import { useProvinceValidationStore } from '../../infra/store/provinceValidationStore'
import { provinceValidators } from '../../infra/validation/provinceValidators'
import { runProvinceValidation, type ProvinceValidationSnapshot } from '../../../../shared/provinceValidation'

export function useProvinceValidation(): void {
  const baseProvinceCatalog = useMapDataStore((s) => s.baseProvinceCatalog)
  const provinceCatalog = useMapDataStore((s) => s.provinceCatalog)
  const terrains = useMapDataStore((s) => s.terrains)
  const continents = useMapDataStore((s) => s.continents)
  const provinceBitmapStatus = useMapDataStore((s) => s.provinceBitmapStatus)
  const setResult = useProvinceValidationStore((s) => s.setResult)
  const clear = useProvinceValidationStore((s) => s.clear)

  const metadataSnapshot = useMemo<ProvinceValidationSnapshot>(() => ({
    catalog: baseProvinceCatalog,
    terrains,
    continents
  }), [baseProvinceCatalog, continents, terrains])

  const fullSnapshot = useMemo<ProvinceValidationSnapshot>(() => ({
    catalog: provinceCatalog,
    terrains,
    continents
  }), [continents, provinceCatalog, terrains])

  useEffect(() => {
    const result = runProvinceValidation(metadataSnapshot, provinceValidators, 'metadata')
    setResult(result)
  }, [metadataSnapshot, setResult])

  useEffect(() => {
    if (provinceBitmapStatus !== 'ready') return
    const metadataResult = runProvinceValidation(fullSnapshot, provinceValidators, 'metadata')
    const fullResult = runProvinceValidation(fullSnapshot, provinceValidators, 'full')
    setResult({
      phase: 'full',
      issues: [...metadataResult.issues, ...fullResult.issues],
      summary: {
        infoCount: metadataResult.summary.infoCount + fullResult.summary.infoCount,
        warningCount: metadataResult.summary.warningCount + fullResult.summary.warningCount,
        errorCount: metadataResult.summary.errorCount + fullResult.summary.errorCount
      }
    })
  }, [fullSnapshot, provinceBitmapStatus, setResult])

  useEffect(() => clear, [clear])
}
